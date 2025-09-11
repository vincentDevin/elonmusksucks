// Rollback: Remove refreshUserData call from login/logout handlers
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useOptimistic,
  startTransition,
} from 'react';
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
  const [baseUser, setBaseUser] = useState<User | null>(null);
  const [user, optimisticUpdateUser] = useOptimistic(
    baseUser,
    (
      current: User | null,
      action: { type: 'bet' | 'parlay' | 'payout' | 'refresh'; payload: any },
    ) => {
      if (!current) return current;

      switch (action.type) {
        case 'bet':
          // Optimistically subtract bet amount
          return {
            ...current,
            muskBucks: Math.max(0, current.muskBucks - action.payload.amount),
          };
        case 'parlay':
          // Optimistically subtract parlay amount
          return {
            ...current,
            muskBucks: Math.max(0, current.muskBucks - action.payload.amount),
          };
        case 'payout':
          // Optimistically add payout amount
          return {
            ...current,
            muskBucks: current.muskBucks + action.payload.amount,
          };
        case 'refresh':
          // Set exact balance from server (not optimistic)
          return {
            ...current,
            muskBucks: action.payload.newBalance,
          };
        default:
          return current;
      }
    },
  );
  const [loading, setLoading] = useState(true);
  const [onUserDataRefresh] = useState<(() => Promise<void>) | undefined>();

  // Refresh token and load current user on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await refreshApi();
        setToken(token);
        setAccessToken(token);
        const currentUser = await meApi();
        setBaseUser(currentUser);
      } catch (error) {
        setToken(null);
        setAccessToken('');
        setBaseUser(null);

        // If we're on a protected route and refresh fails, redirect to public home
        const currentPath = window.location.pathname;
        if (
          !currentPath.includes('/login') &&
          !currentPath.includes('/register') &&
          !currentPath.includes('/public')
        ) {
          window.location.href = '/public';
        }
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
      setBaseUser(currentUser);
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
    setBaseUser(null);
  }, []);

  // Logout and clear all user/auth state
  const logout = useCallback(async () => {
    await logoutApi();
    setToken(null);
    setAccessToken('');
    setBaseUser(null);
  }, []);

  // Manually refresh user profile
  const refreshUser = useCallback(async () => {
    const currentUser = await meApi();
    setBaseUser(currentUser);
  }, []);

  // Refresh only user balance without affecting auth state
  const refreshUserBalance = useCallback(async () => {
    try {
      if (!user?.id) return;
      const balanceData = await getBalanceApi();
      // Update base user balance (not optimistic)
      setBaseUser((prevUser) =>
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
    setBaseUser(null);
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
        // Use React 19's useOptimistic for balance refresh
        startTransition(() => {
          optimisticUpdateUser({
            type: 'refresh',
            payload: { newBalance: data.newBalance },
          });
        });
      }
    };

    const handleBetPlaced = (betData: { user?: { id: number }; amount?: number }) => {
      // Only update if this bet belongs to the current user
      if (betData.user?.id === user.id && betData.amount) {
        // Use React 19's useOptimistic for immediate balance update
        startTransition(() => {
          optimisticUpdateUser({
            type: 'bet',
            payload: { amount: betData.amount },
          });
        });
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handleParlayPlaced = (parlayData: { user?: { id: number }; amount?: number }) => {
      // Only update if this parlay belongs to the current user
      if (parlayData.user?.id === user.id && parlayData.amount) {
        // Use React 19's useOptimistic for immediate balance update
        startTransition(() => {
          optimisticUpdateUser({
            type: 'parlay',
            payload: { amount: parlayData.amount },
          });
        });
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handleBetResolved = (data: { userId: number; payout?: number; amount?: number }) => {
      // Handle bet resolution payouts
      if (data.userId === user.id && data.payout) {
        // Use React 19's useOptimistic for immediate payout update
        startTransition(() => {
          optimisticUpdateUser({
            type: 'payout',
            payload: { amount: data.payout },
          });
        });
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handleParlayResolved = (data: { userId: number; payout?: number }) => {
      // Handle parlay resolution payouts
      if (data.userId === user.id && data.payout) {
        // Use React 19's useOptimistic for immediate payout update
        startTransition(() => {
          optimisticUpdateUser({
            type: 'payout',
            payload: { amount: data.payout },
          });
        });
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handlePongWager = (data: { userId: number; amount: number }) => {
      // Handle pong wager deduction (when games start)
      if (data.userId === user.id) {
        // Use React 19's useOptimistic for immediate wager deduction
        startTransition(() => {
          optimisticUpdateUser({
            type: 'bet',
            payload: { amount: data.amount },
          });
        });
        // Refresh from server to ensure accuracy
        refreshUser();
      }
    };

    const handlePongPayout = (data: { userId: number; payout: number }) => {
      // Handle pong game payouts (when games end)
      if (data.userId === user.id) {
        // Use React 19's useOptimistic for immediate payout update
        startTransition(() => {
          optimisticUpdateUser({
            type: 'payout',
            payload: { amount: data.payout },
          });
        });
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
  }, [user?.id, user?.muskBucks, refreshUser, refreshUserBalance, optimisticUpdateUser]);

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
