// Rollback: Remove refreshUserData call from login/logout handlers
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  useOptimistic,
  startTransition,
  type ReactNode,
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
import { setAccessToken, setAuthFailureCallback, setTokenRefreshCallback } from '../api/axios';
import { useEventBusCore } from './EventBusCoreContext';
import { useSocket } from './SocketContext';
import {
  REDIS_CHANNELS,
  type BalanceUpdatePayload,
  type BetPlacedPayload,
  type ParlayPlacedPayload,
  type BetResolvedPayload,
  type ParlayResolvedPayload,
  type PongWagerPayload,
  type PongPayoutPayload,
} from '@ems/types';

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
  const { subscribe } = useEventBusCore();
  const socket = useSocket();
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
          // Optimistically subtract bet amount (muskBucks is string, convert to number for math)
          return {
            ...current,
            muskBucks: String(Math.max(0, Number(current.muskBucks) - action.payload.amount)),
          };
        case 'parlay':
          // Optimistically subtract parlay amount (muskBucks is string, convert to number for math)
          return {
            ...current,
            muskBucks: String(Math.max(0, Number(current.muskBucks) - action.payload.amount)),
          };
        case 'payout':
          // Optimistically add payout amount (muskBucks is string, convert to number for math)
          return {
            ...current,
            muskBucks: String(Number(current.muskBucks) + action.payload.amount),
          };
        case 'refresh':
          // Set exact balance from server (not optimistic)
          return {
            ...current,
            muskBucks: String(action.payload.newBalance),
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
      // Update base user balance (not optimistic) - muskBucks stays as string
      setBaseUser((prevUser) =>
        prevUser ? { ...prevUser, muskBucks: balanceData.muskBucks } : null,
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

  // Handle socket authentication when token changes
  useEffect(() => {
    if (socket) {
      socket.auth = accessToken ? { token: accessToken } : {};
      // Reconnect with new auth if socket is already connected
      if (socket.connected) {
        socket.disconnect();
        socket.connect();
      }
    }
  }, [socket, accessToken]);

  // Listen for balance-affecting events to update user balance in real-time using EventBusCore
  useEffect(() => {
    if (!user?.id) return;

    // Only refresh balance when user navigates back to the app (not during gameplay)
    const handleVisibilityChange = () => {
      if (!document.hidden && !window.location.pathname.includes('/pong')) {
        // User returned to the app and is NOT on pong page, safe to refresh balance
        setTimeout(() => refreshUserBalance(), 1000); // Small delay to ensure any transactions are complete
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // EventBusCore subscriptions - properly typed with new payload interfaces
    const unsubscribers = [
      // Balance updates
      subscribe(REDIS_CHANNELS.BALANCE_UPDATE, (data: BalanceUpdatePayload) => {
        if (data.userId === user.id) {
          startTransition(() => {
            optimisticUpdateUser({
              type: 'refresh',
              payload: { newBalance: data.newBalance },
            });
          });
        }
      }),

      // Bet placed events
      subscribe(REDIS_CHANNELS.BET_PLACED, (data: BetPlacedPayload) => {
        // BetPlacedPayload has userId in the wrapper
        if (data.userId === user.id) {
          console.log('[Auth] Bet placed by user, refreshing balance');
          refreshUser();
        }
      }),

      // Parlay placed events
      subscribe(REDIS_CHANNELS.PARLAY_PLACED, (data: ParlayPlacedPayload) => {
        if (data.userId === user.id) {
          console.log('[Auth] Parlay placed by user, refreshing balance');
          refreshUser();
        }
      }),

      // Bet resolved events
      subscribe(REDIS_CHANNELS.BET_RESOLVED, (data: BetResolvedPayload) => {
        if (data.userId === user.id) {
          console.log('[Auth] Bet resolved for user, refreshing balance');
          if (data.won && data.payout) {
            startTransition(() => {
              optimisticUpdateUser({
                type: 'payout',
                payload: { amount: data.payout! },
              });
            });
          }
          refreshUser();
        }
      }),

      // Parlay resolved events
      subscribe(REDIS_CHANNELS.PARLAY_RESOLVED, (data: ParlayResolvedPayload) => {
        if (data.userId === user.id) {
          console.log('[Auth] Parlay resolved for user, refreshing balance');
          if (data.won && data.payout) {
            startTransition(() => {
              optimisticUpdateUser({
                type: 'payout',
                payload: { amount: data.payout! },
              });
            });
          }
          refreshUser();
        }
      }),

      // Pong wager events
      subscribe(REDIS_CHANNELS.PONG_WAGER, (data: PongWagerPayload) => {
        if (data.userId === user.id) {
          console.log('[Auth] Pong wager placed by user');
          startTransition(() => {
            optimisticUpdateUser({
              type: 'bet',
              payload: { amount: data.amount },
            });
          });
          refreshUser();
        }
      }),

      // Pong payout events
      subscribe(REDIS_CHANNELS.PONG_PAYOUT, (data: PongPayoutPayload) => {
        if (data.userId === user.id) {
          console.log('[Auth] Pong payout received by user');
          startTransition(() => {
            optimisticUpdateUser({
              type: 'payout',
              payload: { amount: data.payout },
            });
          });
          refreshUser();
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, subscribe, refreshUser, refreshUserBalance, optimisticUpdateUser]);

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
