// apps/client/src/hooks/useLeaderboardEvents.ts
// -----------------------------------------------------------------------------
// Leaderboard events integration with real-time rank updates and achievements
// Handles rank changes, position milestones, comebacks, and leaderboard data
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '../types/events';

// Rank update interface
export interface RankUpdate {
  id: string;
  type: 'rank_change' | 'milestone' | 'comeback' | 'position_reached';
  title: string;
  description: string;
  newRank?: number;
  previousRank?: number;
  position?: number;
  category: 'all_time' | 'daily' | 'weekly' | 'monthly';
  improvement: boolean;
  timestamp: string;
  celebrationLevel: 'low' | 'medium' | 'high';
  badge?: {
    icon: string;
    color: string;
    label: string;
  };
}

// Leaderboard entry interface
export interface LeaderboardEntry {
  userId: number;
  userName: string;
  userAvatar?: string;
  rank: number;
  score: number;
  change: number; // Rank change from previous period
  trend: 'up' | 'down' | 'stable';
  badges: string[];
  isCurrentUser: boolean;
}

// Leaderboard data interface
export interface LeaderboardData {
  allTime?: LeaderboardEntry[];
  daily?: LeaderboardEntry[];
  weekly?: LeaderboardEntry[];
  monthly?: LeaderboardEntry[];
  lastUpdated: string;
}

// User ranking info
export interface UserRanking {
  allTime: { rank: number; total: number; percentile: number };
  daily: { rank: number; total: number; percentile: number };
  weekly: { rank: number; total: number; percentile: number };
  monthly: { rank: number; total: number; percentile: number };
  highestRank: { rank: number; category: string; achievedAt: string };
  biggestClimb: { positions: number; category: string; achievedAt: string };
}

export function useLeaderboardEvents() {
  const { subscribe } = useEventBusCore();
  const { user } = useAuth();
  const [rankUpdates, setRankUpdates] = useState<RankUpdate[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    lastUpdated: new Date().toISOString(),
  });
  const [userRanking, setUserRanking] = useState<UserRanking>({
    allTime: { rank: 0, total: 0, percentile: 0 },
    daily: { rank: 0, total: 0, percentile: 0 },
    weekly: { rank: 0, total: 0, percentile: 0 },
    monthly: { rank: 0, total: 0, percentile: 0 },
    highestRank: { rank: 0, category: '', achievedAt: '' },
    biggestClimb: { positions: 0, category: '', achievedAt: '' },
  });

  // Clear rank update
  const clearRankUpdate = useCallback((updateId: string) => {
    setRankUpdates((prev) => prev.filter((update) => update.id !== updateId));
  }, []);

  // Clear all rank updates
  const clearAllRankUpdates = useCallback(() => {
    setRankUpdates([]);
  }, []);

  // Add rank update helper
  const addRankUpdate = useCallback((update: Omit<RankUpdate, 'id'>) => {
    const updateWithId: RankUpdate = {
      ...update,
      id: `${update.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setRankUpdates((prev) => [updateWithId, ...prev.slice(0, 19)]); // Keep max 20 updates
  }, []);

  // Get celebration level based on rank improvement
  const getCelebrationLevel = useCallback(
    (rankChange: number, category: string): 'low' | 'medium' | 'high' => {
      if (category === 'all_time') {
        if (rankChange >= 100) return 'high';
        if (rankChange >= 20) return 'medium';
        return 'low';
      } else {
        if (rankChange >= 50) return 'high';
        if (rankChange >= 10) return 'medium';
        return 'low';
      }
    },
    [],
  );

  // Get rank badge based on position
  const getRankBadge = useCallback((rank: number, category: string) => {
    if (rank === 1) {
      return { icon: '👑', color: 'gold', label: `#1 ${category}` };
    } else if (rank <= 3) {
      return { icon: '🥉', color: 'bronze', label: `Top 3 ${category}` };
    } else if (rank <= 10) {
      return { icon: '🏆', color: 'blue', label: `Top 10 ${category}` };
    } else if (rank <= 100) {
      return { icon: '⭐', color: 'purple', label: `Top 100 ${category}` };
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      // Personal rank updates
      subscribe(REDIS_CHANNELS.LEADERBOARD_RANK_UPDATE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[LeaderboardEvents] Rank update:', payload);

          const improvement = payload.newRank < payload.previousRank;
          const rankChange = Math.abs(payload.newRank - payload.previousRank);
          const celebrationLevel = getCelebrationLevel(rankChange, payload.category);

          addRankUpdate({
            type: 'rank_change',
            title: `Rank Update: #${payload.newRank}`,
            description: improvement
              ? `🚀 You climbed ${rankChange} positions in ${payload.category} rankings!`
              : `📉 You dropped ${rankChange} positions in ${payload.category} rankings`,
            newRank: payload.newRank,
            previousRank: payload.previousRank,
            category: payload.category,
            improvement,
            timestamp: payload.timestamp,
            celebrationLevel,
            badge: getRankBadge(payload.newRank, payload.category),
          });

          // Update user ranking
          setUserRanking((prev) => ({
            ...prev,
            [payload.category]: {
              rank: payload.newRank,
              total: payload.totalUsers || prev[payload.category as keyof UserRanking].total,
              percentile: Math.round((1 - payload.newRank / (payload.totalUsers || 1000)) * 100),
            },
            // Update highest rank if this is better
            highestRank:
              payload.newRank < prev.highestRank.rank
                ? {
                    rank: payload.newRank,
                    category: payload.category,
                    achievedAt: payload.timestamp,
                  }
                : prev.highestRank,
            // Update biggest climb if this is bigger
            biggestClimb:
              improvement && rankChange > prev.biggestClimb.positions
                ? {
                    positions: rankChange,
                    category: payload.category,
                    achievedAt: payload.timestamp,
                  }
                : prev.biggestClimb,
          }));
        }
      }),

      // Rank change notifications (broader updates)
      subscribe(REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[LeaderboardEvents] Rank change:', payload);
          // Similar to rank update but might have different payload structure
        }
      }),

      // Leaderboard position milestones
      subscribe(REDIS_CHANNELS.LEADERBOARD_POSITION_REACHED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[LeaderboardEvents] Position milestone:', payload);

          addRankUpdate({
            type: 'milestone',
            title: `🎯 Top ${payload.position} Achievement!`,
            description: `Incredible! You've reached the top ${payload.position} on the ${payload.category} leaderboard!`,
            position: payload.position,
            category: payload.category,
            improvement: true,
            timestamp: payload.timestamp,
            celebrationLevel:
              payload.position <= 10 ? 'high' : payload.position <= 50 ? 'medium' : 'low',
            badge: getRankBadge(payload.position, payload.category),
          });
        }
      }),

      // Leaderboard milestone achievements
      subscribe(REDIS_CHANNELS.LEADERBOARD_MILESTONE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[LeaderboardEvents] Leaderboard milestone:', payload);

          addRankUpdate({
            type: 'milestone',
            title: `🏆 ${payload.milestoneType} Milestone!`,
            description: payload.description || `You've achieved a significant milestone!`,
            category: payload.category || 'all_time',
            improvement: true,
            timestamp: payload.timestamp,
            celebrationLevel: 'high',
            badge: { icon: '🏆', color: 'gold', label: payload.milestoneType },
          });
        }
      }),

      // Major comeback achievements
      subscribe(REDIS_CHANNELS.LEADERBOARD_COMEBACK_MAJOR, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[LeaderboardEvents] Major comeback:', payload);

          addRankUpdate({
            type: 'comeback',
            title: `🔥 Epic Comeback!`,
            description: `Phenomenal recovery! You've climbed ${payload.positionsGained} positions in the ${payload.category} leaderboard!`,
            newRank: payload.newRank,
            previousRank: payload.previousRank,
            category: payload.category,
            improvement: true,
            timestamp: payload.timestamp,
            celebrationLevel: 'high',
            badge: { icon: '🔥', color: 'red', label: 'Comeback King' },
          });
        }
      }),

      // Moderate comeback achievements
      subscribe(REDIS_CHANNELS.LEADERBOARD_COMEBACK_MODERATE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[LeaderboardEvents] Moderate comeback:', payload);

          addRankUpdate({
            type: 'comeback',
            title: `📈 Nice Comeback!`,
            description: `Great recovery! You've improved your position in the ${payload.category} leaderboard!`,
            newRank: payload.newRank,
            previousRank: payload.previousRank,
            category: payload.category,
            improvement: true,
            timestamp: payload.timestamp,
            celebrationLevel: 'medium',
            badge: { icon: '📈', color: 'green', label: 'Rising Star' },
          });
        }
      }),

      // Live leaderboard updates (all-time)
      subscribe(REDIS_CHANNELS.LEADERBOARD_ALL_TIME, (payload: any) => {
        console.log('[LeaderboardEvents] All-time leaderboard update:', payload);

        setLeaderboardData((prev) => ({
          ...prev,
          allTime: payload.leaderboard?.map((entry: any, index: number) => ({
            userId: entry.userId,
            userName: entry.userName,
            userAvatar: entry.userAvatar,
            rank: index + 1,
            score: entry.score,
            change: entry.rankChange || 0,
            trend: entry.rankChange > 0 ? 'up' : entry.rankChange < 0 ? 'down' : 'stable',
            badges: entry.badges || [],
            isCurrentUser: entry.userId === user?.id,
          })),
          lastUpdated: payload.timestamp || new Date().toISOString(),
        }));
      }),

      // Live leaderboard updates (daily)
      subscribe(REDIS_CHANNELS.LEADERBOARD_DAILY, (payload: any) => {
        console.log('[LeaderboardEvents] Daily leaderboard update:', payload);

        setLeaderboardData((prev) => ({
          ...prev,
          daily: payload.leaderboard?.map((entry: any, index: number) => ({
            userId: entry.userId,
            userName: entry.userName,
            userAvatar: entry.userAvatar,
            rank: index + 1,
            score: entry.score,
            change: entry.rankChange || 0,
            trend: entry.rankChange > 0 ? 'up' : entry.rankChange < 0 ? 'down' : 'stable',
            badges: entry.badges || [],
            isCurrentUser: entry.userId === user?.id,
          })),
          lastUpdated: payload.timestamp || new Date().toISOString(),
        }));
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, subscribe, addRankUpdate, getCelebrationLevel, getRankBadge]);

  // Get user's current position in each category
  const getCurrentPosition = useCallback(
    (category: keyof LeaderboardData) => {
      const data = leaderboardData[category];
      if (!data || !user) return null;

      const userEntry = data.find((entry) => entry.userId === user.id);
      return userEntry ? userEntry.rank : null;
    },
    [leaderboardData, user],
  );

  // Get top performers in a category
  const getTopPerformers = useCallback(
    (category: keyof LeaderboardData, limit: number = 10) => {
      const data = leaderboardData[category];
      return data ? data.slice(0, limit) : [];
    },
    [leaderboardData],
  );

  return {
    rankUpdates,
    leaderboardData,
    userRanking,
    clearRankUpdate,
    clearAllRankUpdates,
    getCurrentPosition,
    getTopPerformers,
    addRankUpdate, // For manual testing/debugging
  };
}
