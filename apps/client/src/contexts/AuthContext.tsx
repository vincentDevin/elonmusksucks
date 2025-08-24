// Rollback: Remove refreshUserData call from login/logout handlers
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import {
  login as loginApi,
  register as registerApi,
  refresh as refreshApi,
  logout as logoutApi,
  me as meApi,
  getBalance as getBalanceApi,
} from '../api/auth';
import type { User } from '../api/auth';
import type { ReactNode } from 'react';
import { setAccessToken, setAuthFailureCallback, setTokenRefreshCallback } from '../api/axios';
import { socket } from '../lib/socket';

interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUserBalance: () => Promise<void>;
  clearAuth: () => void; // For use by axios interceptor
  onUserDataRefresh?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onUserDataRefresh, setOnUserDataRefresh] = useState<(() => Promise<void>) | undefined>();

  // Refresh token and load current user on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await refreshApi();
        setToken(token);
        setAccessToken(token);
        const currentUser = await meApi();
        setUser(currentUser);
      } catch {
        setToken(null);
        setAccessToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Login user and load profile
  const login = useCallback(
    async (email: string, password: string) => {
      const token = await loginApi({ email, password });
      setToken(token);
      setAccessToken(token);
      const currentUser = await meApi();
      setUser(currentUser);
      if (onUserDataRefresh) {
        await onUserDataRefresh();
      }
    },
    [onUserDataRefresh],
  );

  // Register user (does not auto-login)
  const register = useCallback(async (name: string, email: string, password: string) => {
    await registerApi({ name, email, password });
    setToken(null);
    setAccessToken('');
    setUser(null);
  }, []);

  // Logout and clear all user/auth state
  const logout = useCallback(async () => {
    await logoutApi();
    setToken(null);
    setAccessToken('');
    setUser(null);
  }, []);

  // Manually refresh user profile
  const refreshUser = useCallback(async () => {
    const currentUser = await meApi();
    setUser(currentUser);
  }, []);

  // Refresh only user balance without affecting auth state
  const refreshUserBalance = useCallback(async () => {
    try {
      if (!user?.id) return;
      const balanceData = await getBalanceApi();
      // Only update the balance, preserve other user data and avoid token refresh
      // Convert string to number since server returns muskBucks as string
      setUser((prevUser) =>
        prevUser ? { ...prevUser, muskBucks: parseInt(balanceData.muskBucks) } : null,
      );
    } catch (error) {
      // Silently fail for balance refresh to avoid breaking other functionality
      console.warn('Failed to refresh user balance:', error);
    }
  }, [user?.id]);

  // Clear auth state without making API call (used by axios interceptor)
  const clearAuth = useCallback(() => {
    setToken(null);
    setAccessToken('');
    setUser(null);
  }, []);

  // Handle token refresh from axios interceptor
  const handleTokenRefresh = useCallback((newToken: string) => {
    setToken(newToken);
    // Note: setAccessToken is already called by the interceptor
  }, []);

  // Register callbacks with axios
  useEffect(() => {
    setAuthFailureCallback(clearAuth);
    setTokenRefreshCallback(handleTokenRefresh);
    return () => {
      setAuthFailureCallback(null);
      setTokenRefreshCallback(null);
    };
  }, [clearAuth, handleTokenRefresh]);

  // Listen for balance-affecting events to update user balance in real-time
  useEffect(() => {
    if (!user?.id || !socket) return;

    // Only refresh balance when user navigates back to the app (not during gameplay)
    const handleVisibilityChange = () => {
      if (!document.hidden && !window.location.pathname.includes('/pong')) {
        // User returned to the app and is NOT on pong page, safe to refresh balance
        setTimeout(() => refreshUserBalance(), 1000); // Small delay to ensure any transactions are complete
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleUserBalanceUpdate = (data: { userId: number; newBalance: number }) => {
      // Only update if this balance change belongs to the current user
      if (data.userId === user.id) {
        setUser((prevUser) => (prevUser ? { ...prevUser, muskBucks: data.newBalance } : null));
      }
    };

    const handleBetPlaced = (betData: { user?: { id: number }; amount?: number }) => {
      // Only refresh if this bet belongs to the current user
      if (betData.user?.id === user.id) {
        // Optimistic update - subtract bet amount immediately
        if (betData.amount && user.muskBucks >= betData.amount) {
          setUser((prevUser) =>
            prevUser
              ? {
                  ...prevUser,
                  muskBucks: prevUser.muskBucks - betData.amount!,
                }
              : null,
          );
        }
        // Also refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handleParlayPlaced = (parlayData: { user?: { id: number }; amount?: number }) => {
      // Only refresh if this parlay belongs to the current user
      if (parlayData.user?.id === user.id) {
        // Optimistic update - subtract parlay amount immediately
        if (parlayData.amount && user.muskBucks >= parlayData.amount) {
          setUser((prevUser) =>
            prevUser
              ? {
                  ...prevUser,
                  muskBucks: prevUser.muskBucks - parlayData.amount!,
                }
              : null,
          );
        }
        // Also refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handleBetResolved = (data: { userId: number; payout?: number; amount?: number }) => {
      // Handle bet resolution payouts
      if (data.userId === user.id && data.payout) {
        setUser((prevUser) =>
          prevUser
            ? {
                ...prevUser,
                muskBucks: prevUser.muskBucks + data.payout!,
              }
            : null,
        );
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handleParlayResolved = (data: { userId: number; payout?: number }) => {
      // Handle parlay resolution payouts
      if (data.userId === user.id && data.payout) {
        setUser((prevUser) =>
          prevUser
            ? {
                ...prevUser,
                muskBucks: prevUser.muskBucks + data.payout!,
              }
            : null,
        );
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handlePongWager = (data: { userId: number; amount: number }) => {
      // Handle pong wager deduction (when games start)
      if (data.userId === user.id) {
        setUser((prevUser) =>
          prevUser
            ? {
                ...prevUser,
                muskBucks: prevUser.muskBucks - data.amount,
              }
            : null,
        );
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handlePongPayout = (data: { userId: number; payout: number }) => {
      // Handle pong game payouts (when games end)
      if (data.userId === user.id) {
        setUser((prevUser) =>
          prevUser
            ? {
                ...prevUser,
                muskBucks: prevUser.muskBucks + data.payout,
              }
            : null,
        );
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    // Listen for various balance-affecting events
    socket.on('userBalanceUpdate', handleUserBalanceUpdate);
    socket.on('betPlaced', handleBetPlaced);
    socket.on('parlayPlaced', handleParlayPlaced);
    socket.on('betResolved', handleBetResolved);
    socket.on('parlayResolved', handleParlayResolved);
    socket.on('pongWager', handlePongWager);
    socket.on('pongPayout', handlePongPayout);

    return () => {
      socket.off('userBalanceUpdate', handleUserBalanceUpdate);
      socket.off('betPlaced', handleBetPlaced);
      socket.off('parlayPlaced', handleParlayPlaced);
      socket.off('betResolved', handleBetResolved);
      socket.off('parlayResolved', handleParlayResolved);
      socket.off('pongWager', handlePongWager);
      socket.off('pongPayout', handlePongPayout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, user?.muskBucks, refreshUser, refreshUserBalance]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        refreshUserBalance,
        clearAuth,
        onUserDataRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Hook to access auth context */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
