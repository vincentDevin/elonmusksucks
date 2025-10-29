// apps/client/src/hooks/useEnhancedLeaderboard.ts
// Rollback: Remove debouncing and restore direct socket handlers
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { debounce } from '../lib/debouncer';
import { REDIS_CHANNELS, SOCKET_EVENTS, type PublicLeaderboardEntry } from '@ems/types';
import {
  getTopAllTimePaginated,
  getTopDailyPaginated,
  getUserRank,
  getLeaderboardStats,
} from '../api/leaderboard';
import type {
  PaginatedLeaderboardResponse,
  UserRankResponse,
  LeaderboardStatsResponse,
  LeaderboardQueryParams,
} from '@ems/types';

export type LeaderboardPeriod = 'all-time' | 'daily';
export type LeaderboardMetric = 'profit' | 'winRate' | 'volume' | 'roi';

// Enhanced interfaces for Phase 3
export interface RankChange {
  userId: number;
  oldRank: number;
  newRank: number;
  change: number;
  timestamp: Date;
}

export interface Achievement {
  id: string;
  userId: number;
  type: 'rank_milestone' | 'streak' | 'profit' | 'volume';
  title: string;
  description: string;
  timestamp: Date;
  isNew: boolean;
}

export interface LeaderboardState {
  data: PublicLeaderboardEntry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalCount: number;
  };
  userRank: UserRankResponse | null;
  stats: LeaderboardStatsResponse | null;
  recentChanges: RankChange[];
  achievements: Achievement[];
  loading: boolean;
  error: Error | null;
}

export function useLeaderboard(
  period: LeaderboardPeriod = 'all-time',
  options: {
    limit?: number;
    metric?: LeaderboardMetric;
    trackRankChanges?: boolean;
    enableAchievements?: boolean;
  } = {},
) {
  const socket = useSocket();
  const { user } = useAuth();
  const {
    limit = 25,
    metric = 'profit',
    trackRankChanges = true,
    enableAchievements = true,
  } = options;

  const [state, setState] = useState<LeaderboardState>({
    data: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      totalCount: 0,
    },
    userRank: null,
    stats: null,
    recentChanges: [],
    achievements: [],
    loading: false,
    error: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const previousDataRef = useRef<PublicLeaderboardEntry[]>([]);
  const achievementTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch leaderboard data with pagination
  const fetchLeaderboard = useCallback(
    async (page: number = 1, force = false) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const query: LeaderboardQueryParams = {
          limit,
          offset: (page - 1) * limit,
          metric,
        };

        const result: PaginatedLeaderboardResponse =
          period === 'all-time'
            ? await getTopAllTimePaginated(query)
            : await getTopDailyPaginated(query);

        // Track rank changes if enabled
        let rankChanges: RankChange[] = [];
        if (trackRankChanges && previousDataRef.current.length > 0) {
          rankChanges = detectRankChanges(previousDataRef.current, result.entries);
        }

        setState((prev) => ({
          ...prev,
          data: result.entries,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
            totalCount: result.totalCount,
          },
          recentChanges: [...prev.recentChanges, ...rankChanges].slice(-50), // Keep last 50 changes
          loading: false,
        }));

        previousDataRef.current = result.entries;
      } catch (err: any) {
        setState((prev) => ({ ...prev, error: err, loading: false }));
      }
    },
    [period, limit, metric, trackRankChanges],
  );

  // Fetch user-specific data
  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      const [userRankData, statsData] = await Promise.all([
        getUserRank(user.id, period === 'all-time' ? 'allTime' : 'daily'),
        getLeaderboardStats(),
      ]);

      setState((prev) => ({
        ...prev,
        userRank: userRankData,
        stats: statsData,
      }));
    } catch (err: any) {
      console.warn('[leaderboard] Failed to fetch user data:', err);
    }
  }, [user, period]);

  // Detect rank changes between leaderboard updates
  const detectRankChanges = useCallback(
    (oldData: PublicLeaderboardEntry[], newData: PublicLeaderboardEntry[]): RankChange[] => {
      const changes: RankChange[] = [];
      const oldRanks = new Map(oldData.map((entry, index) => [entry.userId, index + 1]));

      newData.forEach((entry, newIndex) => {
        const newRank = newIndex + 1;
        const oldRank = oldRanks.get(entry.userId);

        if (oldRank && oldRank !== newRank) {
          changes.push({
            userId: entry.userId,
            oldRank,
            newRank,
            change: oldRank - newRank, // Positive = moved up, negative = moved down
            timestamp: new Date(),
          });
        }
      });

      return changes;
    },
    [],
  );

  // Generate achievements based on rank changes and milestones
  const generateAchievements = useCallback(
    (changes: RankChange[]): Achievement[] => {
      if (!enableAchievements) return [];

      const achievements: Achievement[] = [];
      const timestamp = new Date();

      changes.forEach((change) => {
        // Rank milestone achievements
        if (change.newRank <= 10 && change.oldRank > 10) {
          achievements.push({
            id: `top10_${change.userId}_${timestamp.getTime()}`,
            userId: change.userId,
            type: 'rank_milestone',
            title: '🏆 Top 10!',
            description: `You've reached the top 10 leaderboard!`,
            timestamp,
            isNew: true,
          });
        }

        if (change.newRank <= 3 && change.oldRank > 3) {
          achievements.push({
            id: `podium_${change.userId}_${timestamp.getTime()}`,
            userId: change.userId,
            type: 'rank_milestone',
            title: '🥉 Podium Finish!',
            description: `You're on the podium - top 3!`,
            timestamp,
            isNew: true,
          });
        }

        if (change.newRank === 1 && change.oldRank > 1) {
          achievements.push({
            id: `first_${change.userId}_${timestamp.getTime()}`,
            userId: change.userId,
            type: 'rank_milestone',
            title: '👑 #1 Leader!',
            description: `You've reached the top of the leaderboard!`,
            timestamp,
            isNew: true,
          });
        }
      });

      return achievements;
    },
    [enableAchievements],
  );

  // Page navigation functions
  const nextPage = useCallback(() => {
    if (state.pagination.hasNextPage) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchLeaderboard(newPage);
    }
  }, [currentPage, state.pagination.hasNextPage, fetchLeaderboard]);

  const prevPage = useCallback(() => {
    if (state.pagination.hasPrevPage) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchLeaderboard(newPage);
    }
  }, [currentPage, state.pagination.hasPrevPage, fetchLeaderboard]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= state.pagination.totalPages) {
        setCurrentPage(page);
        fetchLeaderboard(page);
      }
    },
    [state.pagination.totalPages, fetchLeaderboard],
  );

  // Clear achievement notifications
  const clearAchievements = useCallback(() => {
    setState((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) => ({ ...a, isNew: false })),
    }));
  }, []);

  // Initial fetch and re-fetch on parameter change
  useEffect(() => {
    setCurrentPage(1);
    fetchLeaderboard(1);
    fetchUserData();
  }, [fetchLeaderboard, fetchUserData]);

  // Debounced update function to batch rapid socket updates
  const debouncedUpdate = useCallback(
    debounce(() => {
      fetchLeaderboard(currentPage, true);
    }, 500),
    [fetchLeaderboard, currentPage],
  );

  // Real-time updates via Socket.IO with debounced refresh
  useEffect(() => {
    const handleAllTime = (entries: PublicLeaderboardEntry[]) => {
      console.log('[useEnhancedLeaderboard] All-time update (debounced):', entries);
      if (period === 'all-time') debouncedUpdate();
    };

    const handleDaily = (entries: PublicLeaderboardEntry[]) => {
      console.log('[useEnhancedLeaderboard] Daily update (debounced):', entries);
      if (period === 'daily') debouncedUpdate();
    };

    // Enhanced Socket.IO events for individual rank changes
    const handleRankChange = (data: {
      userId: number;
      oldRank: number;
      newRank: number;
      metric: string;
    }) => {
      console.log('[useEnhancedLeaderboard] Rank change (debounced):', data);
      debouncedUpdate();
    };

    socket.on(SOCKET_EVENTS.LEADERBOARD_ALL_TIME, handleAllTime);
    socket.on(SOCKET_EVENTS.LEADERBOARD_DAILY, handleDaily);
    socket.on(REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE, handleRankChange);

    return () => {
      socket.off(SOCKET_EVENTS.LEADERBOARD_ALL_TIME, handleAllTime);
      socket.off(SOCKET_EVENTS.LEADERBOARD_DAILY, handleDaily);
      socket.off(REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE, handleRankChange);

      // Cancel any pending debounced updates
      debouncedUpdate.cancel();

      if (achievementTimeoutRef.current) {
        clearTimeout(achievementTimeoutRef.current);
      }
    };
  }, [
    socket,
    period,
    currentPage,
    state.data,
    trackRankChanges,
    detectRankChanges,
    generateAchievements,
    clearAchievements,
    debouncedUpdate,
  ]);

  return {
    ...state,
    currentPage,
    // Actions
    nextPage,
    prevPage,
    goToPage,
    refresh: () => fetchLeaderboard(currentPage),
    refreshUserData: fetchUserData,
    clearAchievements,
  };
}
