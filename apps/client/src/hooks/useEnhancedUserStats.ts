// apps/client/src/hooks/useEnhancedUserStats.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useMyBets, useMyParlays, useMyPredictions } from './useMeStubs';
import { useEnhancedLeaderboard } from './useEnhancedLeaderboard';
import api from '../api/axios';

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
  title: string;
  description: string;
  progress: number;
  target: number;
  isCompleted: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string;
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

export interface EnhancedUserStats {
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
    | 'achievement_earned'
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

export function useEnhancedUserStats() {
  const { user } = useAuth();
  const socket = useSocket();
  const myBets = useMyBets();
  const myParlays = useMyParlays();
  const myPredictions = useMyPredictions();
  const leaderboard = useEnhancedLeaderboard('all-time', { enableAchievements: true });

  const [stats, setStats] = useState<EnhancedUserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Fetch enhanced user statistics
  const fetchEnhancedStats = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Try enhanced stats endpoint first, fallback to basic stats
      const [enhancedStatsResponse, activityResponse, achievementsResponse] = await Promise.all([
        api
          .get(`/api/users/${user.id}/enhanced-stats`)
          .catch(() => api.get(`/api/users/${user.id}/stats`).catch(() => ({ data: null }))),
        api.get(`/api/users/${user.id}/activity`).catch(() => ({ data: [] })),
        api.get(`/api/users/${user.id}/achievements`).catch(() => ({ data: [] })),
      ]);

      // Calculate enhanced stats from available data
      const activeBetsValue = myBets.data?.reduce((sum, bet) => sum + bet.amount, 0) || 0;
      const activeParlaysValue =
        myParlays.data?.reduce((sum, parlay) => sum + parlay.amount, 0) || 0;
      const potentialWinnings =
        myParlays.data?.reduce((sum, parlay) => sum + parlay.potentialPayout, 0) || 0;
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

      const enhancedStats: EnhancedUserStats = {
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
          recentBadges: [], // TODO: Implement recent badges from backend
          progressToNext: achievementsResponse.data || [],
          totalBadges: achievementsResponse.data?.filter((a: any) => a.isCompleted).length || 0,
          completionRate:
            achievementsResponse.data?.length > 0
              ? achievementsResponse.data.filter((a: any) => a.isCompleted).length /
                achievementsResponse.data.length
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

      setStats(enhancedStats);
      setRecentActivity(activityResponse.data || []);
    } catch (err: unknown) {
      console.error('Failed to fetch enhanced user stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stats';
      setError(errorMessage);

      // Fallback to basic stats from existing hooks
      const fallbackStats = createFallbackStats();
      setStats(fallbackStats);
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    myBets.data,
    myParlays.data,
    myPredictions.data,
    leaderboard.userRank,
    leaderboard.stats,
  ]);

  // Create fallback stats from existing data
  const createFallbackStats = useCallback((): EnhancedUserStats => {
    const totalBets = myBets.data?.length || 0;
    const activeBetsValue = myBets.data?.reduce((sum, bet) => sum + bet.amount, 0) || 0;
    const activeParlaysValue = myParlays.data?.reduce((sum, parlay) => sum + parlay.amount, 0) || 0;
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
          myParlays.data?.reduce((sum, parlay) => sum + parlay.potentialPayout, 0) || 0,
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

  // Listen for real-time updates
  useEffect(() => {
    if (!user?.id || !socket) return;

    const handleStatsUpdate = (data: any) => {
      console.log('[useEnhancedUserStats] Received stats:update', data);
      if (data.userId === user.id) {
        fetchEnhancedStats();
      }
    };

    const handleStatsRefresh = (data: any) => {
      console.log('[useEnhancedUserStats] Received stats:refresh', data);
      if (data.userId === user.id) {
        fetchEnhancedStats();
      }
    };

    const handleUserStatsUpdate = (data: any) => {
      console.log('[useEnhancedUserStats] Received user:stats_update', data);
      if (data.userId === user.id) {
        fetchEnhancedStats();
      }
    };

    const handleRankingChange = (data: any) => {
      console.log('[useEnhancedUserStats] Received ranking:change', data);
      if (data.userId === user.id) {
        fetchEnhancedStats();
      }
    };

    const handleAchievementUnlocked = (data: any) => {
      console.log('[useEnhancedUserStats] Received achievement:unlocked', data);
      if (data.userId === user.id || data.achievement?.userId === user.id) {
        // Add to recent activity
        const achievement = data.achievement || data;
        const newActivity: ActivityItem = {
          id: `achievement_${Date.now()}`,
          type: 'achievement_earned',
          title: 'Achievement Unlocked!',
          description: achievement.title || achievement.name || 'New achievement',
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: { achievement },
        };
        setRecentActivity((prev) => [newActivity, ...prev].slice(0, 10));

        // Refresh full stats
        fetchEnhancedStats();
      }
    };

    // Listen to new event names from backend
    socket.on('stats:update', handleStatsUpdate);
    socket.on('stats:refresh', handleStatsRefresh);
    socket.on('user:stats_update', handleUserStatsUpdate);
    socket.on('ranking:change', handleRankingChange);
    socket.on('achievement:unlocked', handleAchievementUnlocked);

    // Keep some legacy events for backward compatibility
    socket.on('betPlaced', () => fetchEnhancedStats());
    socket.on('betResolved', () => fetchEnhancedStats());

    return () => {
      socket.off('stats:update', handleStatsUpdate);
      socket.off('stats:refresh', handleStatsRefresh);
      socket.off('user:stats_update', handleUserStatsUpdate);
      socket.off('ranking:change', handleRankingChange);
      socket.off('achievement:unlocked', handleAchievementUnlocked);
      socket.off('betPlaced');
      socket.off('betResolved');
    };
  }, [user?.id, socket, fetchEnhancedStats]);

  // Initial fetch
  useEffect(() => {
    fetchEnhancedStats();
  }, [fetchEnhancedStats]);

  return {
    stats,
    loading,
    error,
    recentActivity,
    quickActions,
    smartInsights,
    refresh: fetchEnhancedStats,
  };
}

// Helper functions
function calculateApprovalRate(predictions: any[]): number {
  if (predictions.length === 0) return 0;
  const approved = predictions.filter((p) => p.approved).length;
  return approved / predictions.length;
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
