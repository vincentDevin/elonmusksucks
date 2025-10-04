// apps/client/src/hooks/useEnhancedUserStats.ts
// Rollback: Restore any types in socket handlers and error handling
import { useUserData } from '../contexts/UserDataContext';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type StatsUpdatePayload } from '@ems/types';
import { useAuth } from '../contexts/AuthContext';
import { useVisibilityGuard } from '../lib/visibilityGuard';
import { useSocket } from '../contexts/SocketContext';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { REDIS_CHANNELS } from '@ems/types';
import { useMyBets, useMyParlays, useMyPredictions } from './useMeStubs';
import { useLeaderboard } from './useLeaderboard';
import { createAbortableRequest } from '../api/axios';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

export interface CategoryAccuracy {
  category: string;
  accuracy: number;
  totalBets: number;
  wins: number;
}

export interface Streak {
  type: 'win' | 'lose';
  count: number;
  isActive: boolean;
}

export interface AchievementProgress {
  id: string;
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Badge {
  id: string;
  name: string;
  title: string;
  description: string;
  iconUrl?: string | null;
  completedAt: string;
  category: string;
}

export interface CategoryStats {
  category: string;
  betCount: number;
  winRate: number;
  profitLoss: number;
  avgBetSize: number;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface UserStats {
  performance: {
    totalBets: number;
    winRate: number;
    profitLoss: number;
    accuracyByCategory: CategoryAccuracy[];
    currentStreak: Streak;
    bestCategory: string;
    totalWagered: number;
    avgBetSize: number;
  };
  portfolio: {
    activeBetsValue: number;
    activeParlaysValue: number;
    pendingPredictions: number;
    approvalRate: number;
    totalPortfolioValue: number;
    potentialWinnings: number;
  };
  ranking: {
    currentPosition: number;
    positionChange: number;
    percentile: number;
    nextMilestone: { rank: number; requirement: string } | null;
  };
  achievements: {
    recentBadges: Badge[];
    progressToNext: AchievementProgress[];
    totalBadges: number;
    totalAvailable: number;
    completionRate: number;
  };
  trends: {
    weeklyBettingVolume: TrendData[];
    monthlyProfitLoss: TrendData[];
    categoryEngagement: CategoryStats[];
    recentActivity: ActivityItem[];
  };
}

export interface ActivityItem {
  id: string;
  type:
    | 'bet_placed'
    | 'bet_won'
    | 'bet_lost'
    | 'prediction_created'
    | 'achievement_unlocked'
    | 'rank_changed';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  variant: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
}

export function useUserStats() {
  const { user } = useAuth();
  const socket = useSocket();
  const myBets = useMyBets();
  const myParlays = useMyParlays();
  const myPredictions = useMyPredictions();
  const leaderboard = useLeaderboard('all-time', { enableAchievements: true });

  const { shouldRefresh, updateLastFetch } = useVisibilityGuard(5 * 60 * 1000); // 5 minutes

  // Use centralized user data instead of individual fetches
  const userData = useUserData();
  if (userData.stats && userData.achievements && userData.activities) {
    return { ...userData, enhancedStats: userData.stats };
  }

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Rollback: Remove AbortController ref and revert to original request handling
  const abortControllerRef = useRef<ReturnType<typeof createAbortableRequest> | null>(null);

  // Fetch enhanced user statistics with advanced caching and abort support
  const fetchEnhancedStats = useCallback(
    async (force = false) => {
      if (!user?.id) return;

      // Skip refresh if tab was hidden and data isn't stale
      if (!force && !shouldRefresh()) {
        return;
      }

      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Check cache first unless forcing refresh
      const cacheKey = CACHE_KEYS.USER_STATS(user.id);
      if (!force) {
        const cachedStats = cache.get<UserStats>(cacheKey);
        if (cachedStats) {
          setStats(cachedStats);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      // Create new abortable request
      const request = createAbortableRequest();
      abortControllerRef.current = request;

      try {
        // These 6 parallel API calls with AbortController support
        // Requests will be cancelled if component unmounts or new request starts
        const [
          enhancedStatsResponse,
          activityResponse,
          achievementsResponse,
          recentAchievementsResponse,
          allAchievementsResponse,
        ] = await Promise.all([
          request
            .get(`/api/users/${user.id}/enhanced-stats`)
            .catch(() => request.get(`/api/users/${user.id}/stats`).catch(() => ({ data: null }))),
          request.get(`/api/users/${user.id}/activity`).catch(() => ({ data: [] })),
          request.get(`/api/users/${user.id}/achievements`).catch((err) => {
            // Only log non-cancellation errors
            if (err.name !== 'CanceledError') {
              console.error('Failed to fetch user achievements:', err);
            }
            return { data: [] };
          }),
          request.get(`/api/users/${user.id}/achievements/recent?limit=5`).catch((err) => {
            // Only log non-cancellation errors
            if (err.name !== 'CanceledError') {
              console.error('Failed to fetch recent achievements:', err);
            }
            return { data: [] };
          }),
          request.get('/api/users/achievements/all').catch((err) => {
            // Only log non-cancellation errors
            if (err.name !== 'CanceledError') {
              console.error('Failed to fetch all achievements:', err);
            }
            return { data: [] };
          }),
        ]);

        // Calculate enhanced stats from available data
        const activeBetsValue =
          myBets.data?.reduce((sum, bet) => sum + Number(bet.amount || 0), 0) || 0;
        const activeParlaysValue =
          myParlays.data?.reduce((sum, parlay) => sum + Number(parlay.amount || 0), 0) || 0;
        const potentialWinnings =
          myParlays.data?.reduce((sum, parlay) => sum + Number(parlay.potentialPayout || 0), 0) ||
          0;
        const pendingPredictions = myPredictions.data?.filter((p) => !p.approved).length || 0;
        const approvalRate = calculateApprovalRate(myPredictions.data || []);

        // Extract performance data from enhanced stats or calculate from current data
        const baseStats = enhancedStatsResponse.data;
        const totalBets = baseStats?.totalBets || myBets.data?.length || 0;
        const winRate = baseStats?.winRate || 0; // Default to 0 if no data
        const profitLoss = baseStats?.profitLoss || baseStats?.netProfit || 0;
        const totalWagered = baseStats?.totalWagered || activeBetsValue;

        // Use server category accuracy data or empty array if not available
        const accuracyByCategory: CategoryAccuracy[] = baseStats?.categoryAccuracy || [];

        // Ensure wins are calculated if not provided
        accuracyByCategory.forEach((cat) => {
          if (!cat.wins) {
            cat.wins = Math.floor(cat.totalBets * cat.accuracy);
          }
        });

        const bestCategory =
          accuracyByCategory.length > 0
            ? accuracyByCategory.reduce((best, current) =>
                current.accuracy > best.accuracy ? current : best,
              ).category
            : 'N/A';

        // Generate empty trend data if not available from server
        const generateTrendData = (_baseValue: number, _points: number = 7): TrendData[] => {
          return []; // Return empty array instead of mock data
        };

        const enhancedStats: UserStats = {
          performance: {
            totalBets,
            winRate,
            profitLoss,
            accuracyByCategory,
            currentStreak: baseStats?.currentStreak || {
              type: 'win',
              count: 0,
              isActive: false,
            },
            bestCategory,
            totalWagered,
            avgBetSize: baseStats?.avgBetSize || (totalBets > 0 ? totalWagered / totalBets : 0),
          },
          portfolio: {
            activeBetsValue,
            activeParlaysValue,
            pendingPredictions,
            approvalRate,
            totalPortfolioValue: activeBetsValue + activeParlaysValue,
            potentialWinnings,
          },
          ranking: {
            currentPosition: baseStats?.ranking?.rank || 0,
            positionChange: baseStats?.ranking?.change || 0,
            percentile:
              baseStats?.ranking?.percentile ||
              calculatePercentile(
                baseStats?.ranking?.rank || 0,
                leaderboard.stats?.totalUsers || 1000,
              ),
            nextMilestone: calculateNextMilestone(baseStats?.ranking?.rank || 0),
          },
          achievements: {
            recentBadges: recentAchievementsResponse.data || [],
            progressToNext: achievementsResponse.data || [],
            totalBadges:
              achievementsResponse.data?.filter((a: { isCompleted?: boolean }) => a.isCompleted)
                .length || 0,
            totalAvailable: allAchievementsResponse.data?.length || 0,
            completionRate:
              allAchievementsResponse.data?.length > 0
                ? (achievementsResponse.data?.filter(
                    (a: { isCompleted?: boolean }) => a.isCompleted,
                  ).length || 0) / allAchievementsResponse.data.length
                : 0,
          },
          trends: {
            weeklyBettingVolume: baseStats?.weeklyVolume || generateTrendData(activeBetsValue / 7),
            monthlyProfitLoss: baseStats?.monthlyProfitLoss || generateTrendData(profitLoss / 30),
            categoryEngagement:
              baseStats?.categoryStats ||
              accuracyByCategory.map((cat) => ({
                category: cat.category,
                betCount: cat.totalBets,
                winRate: cat.accuracy,
                profitLoss: cat.totalBets * 50 * (cat.accuracy - 0.5),
                avgBetSize: 50,
              })),
            recentActivity: activityResponse.data?.slice(0, 10) || [],
          },
        };

        // Cache the stats with appropriate TTL
        cache.set(cacheKey, enhancedStats, CACHE_TTL.SHORT);

        // Also cache individual components with longer TTLs
        cache.set(
          CACHE_KEYS.USER_ACHIEVEMENTS(user.id),
          achievementsResponse.data || [],
          CACHE_TTL.MEDIUM,
        );
        cache.set(
          CACHE_KEYS.USER_RECENT_ACHIEVEMENTS(user.id),
          recentAchievementsResponse.data || [],
          CACHE_TTL.MEDIUM,
        );

        setStats(enhancedStats);
        setRecentActivity(activityResponse.data || []);
        updateLastFetch();
      } catch (err: unknown) {
        // Don't set error state if request was aborted (component unmounted)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        console.error('Failed to fetch enhanced user stats:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load stats';
        setError(errorMessage);

        // Fallback to basic stats from existing hooks
        const fallbackStats = createFallbackStats();
        setStats(fallbackStats);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      user?.id,
      shouldRefresh,
      updateLastFetch,
      myBets.data,
      myParlays.data,
      myPredictions.data,
      leaderboard.userRank,
      leaderboard.stats,
    ],
  );

  // Create fallback stats from existing data
  const createFallbackStats = useCallback((): UserStats => {
    const totalBets = myBets.data?.length || 0;
    const activeBetsValue =
      myBets.data?.reduce((sum, bet) => sum + Number(bet.amount || 0), 0) || 0;
    const activeParlaysValue =
      myParlays.data?.reduce((sum, parlay) => sum + Number(parlay.amount || 0), 0) || 0;
    const pendingPredictions = myPredictions.data?.filter((p) => !p.approved).length || 0;

    return {
      performance: {
        totalBets,
        winRate: 0,
        profitLoss: 0,
        accuracyByCategory: [],
        currentStreak: { type: 'win', count: 0, isActive: false },
        bestCategory: 'General',
        totalWagered: activeBetsValue,
        avgBetSize: totalBets > 0 ? activeBetsValue / totalBets : 0,
      },
      portfolio: {
        activeBetsValue,
        activeParlaysValue,
        pendingPredictions,
        approvalRate: calculateApprovalRate(myPredictions.data || []),
        totalPortfolioValue: activeBetsValue + activeParlaysValue,
        potentialWinnings:
          myParlays.data?.reduce((sum, parlay) => sum + Number(parlay.potentialPayout || 0), 0) ||
          0,
      },
      ranking: {
        currentPosition: 0,
        positionChange: 0,
        percentile: 50,
        nextMilestone: null,
      },
      achievements: {
        recentBadges: [],
        progressToNext: [],
        totalBadges: 0,
        totalAvailable: 0,
        completionRate: 0,
      },
      trends: {
        weeklyBettingVolume: [],
        monthlyProfitLoss: [],
        categoryEngagement: [],
        recentActivity: [],
      },
    };
  }, [myBets.data, myParlays.data, myPredictions.data, leaderboard.userRank]);

  // Quick actions based on user state
  const quickActions = useMemo((): QuickAction[] => {
    const actions: QuickAction[] = [
      {
        id: 'create_prediction',
        label: 'Create Prediction',
        icon: '📊',
        action: () => (window.location.href = '/create-prediction'),
        variant: 'primary',
      },
    ];

    // Add conditional actions based on portfolio state
    if (stats?.portfolio.activeBetsValue && stats.portfolio.activeBetsValue > 0) {
      actions.push({
        id: 'view_portfolio',
        label: 'View Portfolio',
        icon: '💼',
        action: () => (window.location.href = '/portfolio'),
        variant: 'secondary',
      });
    }

    if (stats?.portfolio.potentialWinnings && stats.portfolio.potentialWinnings > 100) {
      actions.push({
        id: 'cash_out',
        label: 'Cash Out Available',
        icon: '💵',
        action: () => (window.location.href = '/cashout'),
        variant: 'success',
      });
    }

    return actions;
  }, [stats]);

  // Smart insights based on user data
  const smartInsights = useMemo((): string[] => {
    if (!stats) return [];

    const insights: string[] = [];

    // Streak insights
    if (stats.performance.currentStreak.isActive && stats.performance.currentStreak.count >= 3) {
      insights.push(
        `You're on a ${stats.performance.currentStreak.count}-bet ${stats.performance.currentStreak.type}ning streak!`,
      );
    }

    // Performance insights
    if (stats.performance.winRate > 70) {
      insights.push(`Excellent win rate of ${(stats.performance.winRate * 100).toFixed(1)}%!`);
    } else if (stats.performance.winRate > 50) {
      insights.push(
        `Solid ${(stats.performance.winRate * 100).toFixed(1)}% win rate - keep it up!`,
      );
    }

    // Category insights
    if (stats.performance.bestCategory && stats.performance.accuracyByCategory.length > 0) {
      const bestCat = stats.performance.accuracyByCategory.find(
        (c) => c.category === stats.performance.bestCategory,
      );
      if (bestCat && bestCat.accuracy > 60) {
        insights.push(
          `Your ${stats.performance.bestCategory} predictions are ${(bestCat.accuracy * 100).toFixed(0)}% accurate`,
        );
      }
    }

    // Ranking insights
    if (stats.ranking.positionChange > 0) {
      insights.push(`You've moved up ${stats.ranking.positionChange} ranks recently!`);
    }

    return insights.slice(0, 3); // Limit to 3 insights
  }, [stats]);

  // Rollback: Remove useCallback wrappers and revert to inline handlers
  // Stable socket handlers using useCallback to prevent recreation
  const handleStatsUpdate = useCallback(
    (data: StatsUpdatePayload) => {
      console.log('[useEnhancedUserStats] Received stats:update', data);
      if (data.userId === user?.id) {
        fetchEnhancedStats(true);
      }
    },
    [user?.id, fetchEnhancedStats],
  );

  const handleStatsRefresh = useCallback(
    (data: unknown) => {
      console.log('[useEnhancedUserStats] Received stats:refresh', data);
      if (
        typeof data === 'object' &&
        data &&
        'userId' in data &&
        (data as { userId?: number }).userId === user?.id
      ) {
        fetchEnhancedStats(true);
      }
    },
    [user?.id, fetchEnhancedStats],
  );

  const handleUserStatsUpdate = useCallback(
    (data: { userId?: number }) => {
      console.log('[useEnhancedUserStats] Received user:stats_update', data);
      if (data.userId === user?.id) {
        fetchEnhancedStats(true);
      }
    },
    [user?.id, fetchEnhancedStats],
  );

  const handleRankingChange = useCallback(
    (data: StatsUpdatePayload) => {
      console.log('[useEnhancedUserStats] Received ranking:change', data);
      if (data.userId === user?.id) {
        fetchEnhancedStats(true);
      }
    },
    [user?.id, fetchEnhancedStats],
  );

  const handleAchievementUnlocked = useCallback(
    (data: StatsUpdatePayload) => {
      console.log('[useEnhancedUserStats] Received achievement:unlocked', data);
      if (data.userId === user?.id) {
        // Add to recent activity
        const achievement: any = data.achievements || data;
        const newActivity: ActivityItem = {
          id: `achievement_${Date.now()}`,
          type: 'achievement_unlocked',
          title: 'Achievement Unlocked!',
          description: achievement?.title || achievement?.name || 'New achievement',
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: { achievement },
        };
        setRecentActivity((prev) => [newActivity, ...prev].slice(0, 10));

        // Refresh full stats
        fetchEnhancedStats();
      }
    },
    [user?.id, fetchEnhancedStats],
  );

  const handleBetEvent = useCallback(() => {
    fetchEnhancedStats(true);
  }, [fetchEnhancedStats]);

  // Get EventBusCore for centralized event handling
  const { subscribe } = useEventBusCore();

  // Listen for real-time updates with stable handlers
  useEffect(() => {
    if (!user?.id || !socket) return;

    // Listen to new event names from backend
    socket.on('stats:updated', handleStatsUpdate);
    socket.on('stats:refresh', handleStatsRefresh);
    socket.on('user:stats_update', handleUserStatsUpdate);
    socket.on('ranking:changed', handleRankingChange);
    socket.on('achievement:unlocked', handleAchievementUnlocked);

    // MIGRATED: Convert legacy direct socket events to EventBusCore
    const unsubscribers = [
      subscribe(REDIS_CHANNELS.BET_PLACED, handleBetEvent),
      subscribe(REDIS_CHANNELS.BET_RESOLVED, handleBetEvent),
    ];

    return () => {
      socket.off('stats:updated', handleStatsUpdate);
      socket.off('stats:refresh', handleStatsRefresh);
      socket.off('user:stats_update', handleUserStatsUpdate);
      socket.off('ranking:changed', handleRankingChange);
      socket.off('achievement:unlocked', handleAchievementUnlocked);
      // EventBusCore subscriptions cleanup
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [
    socket,
    user?.id,
    handleStatsUpdate,
    handleStatsRefresh,
    handleUserStatsUpdate,
    handleRankingChange,
    handleAchievementUnlocked,
    handleBetEvent,
  ]);

  // Initial fetch with cache check
  useEffect(() => {
    if (!user?.id) return;

    // Check if we already have cached data
    const cachedStats = cache.get<UserStats>(CACHE_KEYS.USER_STATS(user.id));
    if (!cachedStats) {
      fetchEnhancedStats();
    } else {
      setStats(cachedStats);
      setLoading(false);
    }
  }, [user?.id, fetchEnhancedStats]);

  // Cleanup: abort any pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    stats,
    loading,
    error,
    recentActivity,
    quickActions,
    smartInsights,
    refresh: () => fetchEnhancedStats(true),
  };
}

// Helper functions
function calculateApprovalRate(predictions: { approved: boolean }[]): number {
  if (predictions.length === 0) return 0;
  const approvedCount = predictions.filter((p) => p.approved).length;
  return approvedCount / predictions.length;
}

function calculatePercentile(rank: number, totalUsers: number): number {
  if (totalUsers <= 1 || rank <= 0) return 50;
  return Math.round((1 - (rank - 1) / totalUsers) * 100);
}

function calculateNextMilestone(currentRank: number): { rank: number; requirement: string } | null {
  if (currentRank <= 0) return { rank: 100, requirement: 'Join the top 100' };
  if (currentRank > 100) return { rank: 100, requirement: 'Break into top 100' };
  if (currentRank > 50) return { rank: 50, requirement: 'Reach top 50' };
  if (currentRank > 25) return { rank: 25, requirement: 'Enter top 25' };
  if (currentRank > 10) return { rank: 10, requirement: 'Make it to top 10' };
  if (currentRank > 3) return { rank: 3, requirement: 'Reach the podium' };
  if (currentRank > 1) return { rank: 1, requirement: 'Become #1' };
  return null;
}
