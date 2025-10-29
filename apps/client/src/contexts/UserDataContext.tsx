// UserDataContext with hydration guard to prevent redundant API calls on navigation
// PERFORMANCE FIX: Prevents 3 API calls (stats, achievements, activities) on every Dashboard mount
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useEventBusCore } from './EventBusCoreContext';
import { useVisibilityGuard } from '../lib/visibilityGuard';
import { REDIS_CHANNELS, type StatsUpdatePayload, type BalanceUpdatePayload } from '@ems/types';
import { refetchLogger, RefetchReasons } from '../lib/refetchLogger';
import api from '../api/axios';

interface UserDataState {
  stats: any | null;
  achievements: any[] | null;
  activities: any[] | null;
  balance: number | null;
  loading: boolean;
  error: string | null;
  isHydrated: boolean;
}

interface UserDataContextType extends UserDataState {
  refreshUserData: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// Storage keys for caching
const STORAGE_KEYS = {
  USER_DATA: 'ems_user_data',
  HAS_INITIALIZED: 'ems_user_data_initialized',
  TIMESTAMP: 'ems_user_data_timestamp',
} as const;

// Cache expiry time (3 minutes for user data)
const CACHE_EXPIRY_MS = 3 * 60 * 1000;

// Helper functions for browser storage
const getStoredUserData = (userId?: number): Partial<UserDataState> => {
  try {
    if (!userId) return {};

    const stored = sessionStorage.getItem(`${STORAGE_KEYS.USER_DATA}_${userId}`);
    const timestamp = sessionStorage.getItem(`${STORAGE_KEYS.TIMESTAMP}_${userId}`);

    if (!stored || !timestamp) return {};

    // Check if cache is expired
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_EXPIRY_MS) {
      clearStoredUserData(userId);
      return {};
    }

    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to load stored user data:', error);
    return {};
  }
};

const getStoredHasInitialized = (userId?: number): boolean => {
  try {
    if (!userId) return false;

    const timestamp = sessionStorage.getItem(`${STORAGE_KEYS.TIMESTAMP}_${userId}`);
    if (!timestamp) return false;

    // Check if cache is expired
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_EXPIRY_MS) {
      clearStoredUserData(userId);
      return false;
    }

    return sessionStorage.getItem(`${STORAGE_KEYS.HAS_INITIALIZED}_${userId}`) === 'true';
  } catch (error) {
    return false;
  }
};

const storeUserData = (userId: number, data: Partial<UserDataState>) => {
  try {
    sessionStorage.setItem(`${STORAGE_KEYS.USER_DATA}_${userId}`, JSON.stringify(data));
    sessionStorage.setItem(`${STORAGE_KEYS.HAS_INITIALIZED}_${userId}`, 'true');
    sessionStorage.setItem(`${STORAGE_KEYS.TIMESTAMP}_${userId}`, Date.now().toString());
  } catch (error) {
    console.warn('Failed to store user data:', error);
  }
};

const clearStoredUserData = (userId: number) => {
  try {
    sessionStorage.removeItem(`${STORAGE_KEYS.USER_DATA}_${userId}`);
    sessionStorage.removeItem(`${STORAGE_KEYS.HAS_INITIALIZED}_${userId}`);
    sessionStorage.removeItem(`${STORAGE_KEYS.TIMESTAMP}_${userId}`);
  } catch (error) {
    console.warn('Failed to clear stored user data:', error);
  }
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { subscribe } = useEventBusCore();
  const isAuthenticated = !!user;
  const { shouldRefresh, updateLastFetch } = useVisibilityGuard(3 * 60 * 1000); // 3 minutes

  // Initialize state with cached data if available
  const cachedData = user?.id ? getStoredUserData(user.id) : {};
  const hasInitialized = user?.id ? getStoredHasInitialized(user.id) : false;

  const [state, setState] = useState<UserDataState>({
    stats: cachedData.stats || null,
    achievements: cachedData.achievements || null,
    activities: cachedData.activities || null,
    balance: cachedData.balance || null,
    loading: false,
    error: null,
    isHydrated: hasInitialized,
  });

  const refreshUserData = useCallback(
    async (reason: string = RefetchReasons.MANUAL_REFRESH) => {
      if (!user?.id || !isAuthenticated) {
        setState((prev) => ({
          ...prev,
          stats: null,
          achievements: null,
          activities: null,
          balance: null,
          isHydrated: false,
        }));
        return;
      }

      // Log the refetch for debugging
      refetchLogger.log({
        context: 'UserDataContext',
        endpoint: '/api/users/{id}/stats+achievements+activities',
        reason,
        userId: user.id,
        metadata: {
          isHydrated: state.isHydrated,
          cacheValid: getStoredHasInitialized(user.id),
          timestamp: sessionStorage.getItem(`${STORAGE_KEYS.TIMESTAMP}_${user.id}`),
        },
      });

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Make required API calls first
        const [statsRes, achievementsRes] = await Promise.all([
          api.get(`/api/users/${user.id}/stats`),
          api.get(`/api/users/${user.id}/achievements`),
        ]);

        // Try to get activities, but handle 404 gracefully
        let activitiesData = null;
        try {
          const activitiesRes = await api.get(`/api/users/${user.id}/activities?limit=20`);
          activitiesData = activitiesRes.data;
        } catch (activitiesError) {
          console.warn('Activities endpoint not available:', activitiesError);
          activitiesData = []; // Default to empty array
        }

        const newData = {
          stats: statsRes.data,
          achievements: achievementsRes.data,
          activities: activitiesData,
          balance: statsRes.data?.balance || 0,
          loading: false,
          isHydrated: true,
        };

        setState((prev) => ({
          ...prev,
          ...newData,
        }));

        // Store data in cache
        storeUserData(user.id, newData);
        updateLastFetch();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load user data',
          isHydrated: false,
        }));
      }
    },
    [user?.id],
  ); // FIXED: Removed isAuthenticated to prevent circular dependency with state.isHydrated

  useEffect(() => {
    if (!user?.id) return;

    // Hydration guard: prevent refetches if already hydrated for this user
    if (state.isHydrated && !shouldRefresh) {
      return; // Skip refetch - already have fresh data for this user
    }

    // Fetch data if:
    // 1. Not yet hydrated for this user, OR
    // 2. shouldRefresh is true (tab became visible after being hidden)
    if (!state.isHydrated) {
      refreshUserData(RefetchReasons.HYDRATION_GUARD);
    } else if (shouldRefresh()) {
      refreshUserData(RefetchReasons.TAB_VISIBLE);
    }
  }, [user?.id, state.isHydrated, shouldRefresh]); // FIXED: Removed refreshUserData from dependencies to prevent infinite loop

  // Reset hydration state when user changes
  useEffect(() => {
    if (!user?.id) {
      // User logged out - clear everything
      setState((prev) => ({
        ...prev,
        isHydrated: false,
        stats: null,
        achievements: null,
        activities: null,
        balance: null,
      }));
      return;
    }

    // User changed or logged in - check cache first
    const cachedData = getStoredUserData(user.id);
    const hasValidCache = getStoredHasInitialized(user.id);

    if (Object.keys(cachedData).length > 0 && hasValidCache) {
      // We have valid cached data - use it and mark as hydrated
      setState((prev) => ({
        ...prev,
        ...cachedData,
        isHydrated: true, // Mark as hydrated to prevent immediate refetch
      }));
    } else {
      // No valid cache - reset state and let hydration guard handle the fetch
      setState((prev) => ({
        ...prev,
        isHydrated: false,
        stats: null,
        achievements: null,
        activities: null,
        balance: null,
      }));
    }
  }, [user?.id]);

  // Real-time user stats updates to replace manual refetches
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribe(
      REDIS_CHANNELS.USER_STATS_UPDATE,
      (payload: StatsUpdatePayload) => {
        // Only process if this stats update is for the current user
        if (payload.userId !== user.id) return;

        console.log('[UserDataContext] Received real-time stats update:', payload);

        // Update stats in state with real-time data
        setState((prev) => {
          const updatedStats = {
            ...prev.stats,
            ...payload.stats, // Merge any provided stats
          };

          // Apply incremental changes if provided
          if (payload.changes) {
            if (payload.changes.totalBets !== undefined) {
              updatedStats.totalBets = payload.changes.totalBets;
            }
            if (payload.changes.winRate !== undefined) {
              updatedStats.winRate = payload.changes.winRate;
            }
            if (payload.changes.profit !== undefined) {
              updatedStats.totalWinnings =
                (updatedStats.totalWinnings || 0) + payload.changes.profit;
            }
            if (payload.changes.streak !== undefined) {
              updatedStats.currentStreak = payload.changes.streak;
            }
          }

          const newState = {
            ...prev,
            stats: updatedStats,
            // Update balance if provided in stats
            balance: payload.stats?.totalWinnings || prev.balance,
          };

          // Store updated data in cache
          if (user?.id) {
            storeUserData(user.id, newState);
          }

          return newState;
        });
      },
      { priority: 'normal' }, // Normal priority for stats updates
    );

    return unsubscribe;
  }, [user?.id, subscribe]);

  // Real-time balance updates (from bets, payouts, etc.)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribe(
      REDIS_CHANNELS.BALANCE_UPDATE,
      (payload: BalanceUpdatePayload) => {
        // Only process if this balance update is for the current user
        if (payload.userId !== user.id) return;

        console.log('[UserDataContext] Received real-time balance update:', payload);

        // Update balance in state
        setState((prev) => {
          const newState = {
            ...prev,
            balance: payload.newBalance,
            // Also update stats if they contain balance info
            stats: prev.stats
              ? {
                  ...prev.stats,
                  balance: payload.newBalance,
                  totalWinnings: payload.newBalance,
                }
              : prev.stats,
          };

          // Store updated data in cache
          if (user?.id) {
            storeUserData(user.id, newState);
          }

          return newState;
        });
      },
      { priority: 'high' }, // High priority for balance updates (financial data)
    );

    return unsubscribe;
  }, [user?.id, subscribe]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...state,
      refreshUserData,
    }),
    [state, refreshUserData],
  );

  return <UserDataContext.Provider value={contextValue}>{children}</UserDataContext.Provider>;
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

export default UserDataContext;
