// apps/client/src/hooks/useActivityStream.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

export interface ActivityItem {
  id: string;
  type:
    | 'bet_placed'
    | 'bet_won'
    | 'bet_lost'
    | 'parlay_placed'
    | 'parlay_won'
    | 'parlay_lost'
    | 'prediction_created'
    | 'prediction_resolved'
    | 'achievement_earned'
    | 'rank_changed'
    | 'big_bet'
    | 'big_win'
    | 'friend_activity'
    | 'trending_prediction'
    | 'hot_market';
  title: string;
  description: string;
  timestamp: string;
  userId?: number;
  userName?: string;
  userAvatar?: string;
  amount?: number;
  predictionId?: number;
  predictionTitle?: string;
  category?: string;
  metadata?: Record<string, any>;
  isPersonal: boolean;
  priority: 'low' | 'medium' | 'high';
  icon: string;
  color: string;
}

export interface ActivityFilter {
  types: ActivityItem['type'][];
  timeframe: 'all' | '1h' | '6h' | '24h' | '7d';
  showPersonal: boolean;
  showSocial: boolean;
  showPlatform: boolean;
}

export interface ActivityStreamState {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  filters: ActivityFilter;
}

const ACTIVITY_ICONS: Record<ActivityItem['type'], string> = {
  bet_placed: '🎯',
  bet_won: '🎉',
  bet_lost: '😞',
  parlay_placed: '🎰',
  parlay_won: '💰',
  parlay_lost: '💸',
  prediction_created: '📊',
  prediction_resolved: '✅',
  achievement_earned: '🏅',
  rank_changed: '📈',
  big_bet: '🐋',
  big_win: '💎',
  friend_activity: '👥',
  trending_prediction: '🔥',
  hot_market: '⚡',
};

const ACTIVITY_COLORS: Record<ActivityItem['type'], string> = {
  bet_placed: 'text-blue-500',
  bet_won: 'text-green-500',
  bet_lost: 'text-red-500',
  parlay_placed: 'text-purple-500',
  parlay_won: 'text-green-600',
  parlay_lost: 'text-red-600',
  prediction_created: 'text-indigo-500',
  prediction_resolved: 'text-teal-500',
  achievement_earned: 'text-yellow-500',
  rank_changed: 'text-orange-500',
  big_bet: 'text-blue-600',
  big_win: 'text-emerald-500',
  friend_activity: 'text-pink-500',
  trending_prediction: 'text-red-400',
  hot_market: 'text-yellow-400',
};

export function useActivityStream() {
  const socket = useSocket();
  const { user } = useAuth();

  const [state, setState] = useState<ActivityStreamState>({
    activities: [],
    loading: false,
    error: null,
    hasMore: true,
    filters: {
      types: [],
      timeframe: '24h',
      showPersonal: true,
      showSocial: true,
      showPlatform: true,
    },
  });

  // Fetch initial activity stream
  const fetchActivities = useCallback(
    async (offset = 0, limit = 20) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Use existing user activity endpoint as fallback
        let activities: ActivityItem[] = [];

        if (user?.id) {
          try {
            const response = await api.get(`/api/users/${user.id}/activity`);
            activities = (response.data || [])
              .slice(offset, offset + limit)
              .map((_activity: unknown, index: number) => ({
                id: `activity_${index}_${Date.now()}`,
                type: 'friend_activity' as const,
                title: 'Recent Activity',
                description: 'Activity from your account',
                timestamp: new Date(Date.now() - index * 60000).toISOString(),
                userId: user.id,
                userName: user.name,
                isPersonal: true,
                priority: 'low' as const,
                icon: ACTIVITY_ICONS.friend_activity,
                color: ACTIVITY_COLORS.friend_activity,
              }));
          } catch {
            // If that fails, create some mock activities
            activities = generateMockActivities(offset, limit);
          }
        } else {
          activities = generateMockActivities(offset, limit);
        }

        setState((prev) => ({
          ...prev,
          activities: offset === 0 ? activities : [...prev.activities, ...activities],
          hasMore: activities.length === limit, // Simple pagination logic
          loading: false,
        }));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load activity stream';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      }
    },
    [state.filters, user?.id],
  );

  // Generate mock activities for demo purposes
  const generateMockActivities = useCallback(
    (offset: number, limit: number): ActivityItem[] => {
      const mockTypes: ActivityItem['type'][] = [
        'bet_placed',
        'prediction_created',
        'achievement_earned',
        'rank_changed',
        'trending_prediction',
      ];

      const activities: ActivityItem[] = [];
      for (let i = 0; i < limit; i++) {
        const type = mockTypes[Math.floor(Math.random() * mockTypes.length)];
        const timeAgo = (offset + i) * 5 + Math.random() * 10; // Minutes ago

        activities.push({
          id: `mock_${offset + i}_${Date.now()}`,
          type,
          title: getMockTitle(type),
          description: getMockDescription(type),
          timestamp: new Date(Date.now() - timeAgo * 60000).toISOString(),
          userId: user?.id,
          userName: user?.name,
          amount: type.includes('bet') ? Math.floor(Math.random() * 500) + 50 : undefined,
          isPersonal: Math.random() > 0.3,
          priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
          icon: ACTIVITY_ICONS[type],
          color: ACTIVITY_COLORS[type],
        });
      }

      return activities;
    },
    [user?.id, user?.name],
  );

  const getMockTitle = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'bet_placed':
        return 'New bet placed';
      case 'prediction_created':
        return 'Prediction created';
      case 'achievement_earned':
        return 'Achievement unlocked!';
      case 'rank_changed':
        return 'Rank updated';
      case 'trending_prediction':
        return 'Prediction trending';
      default:
        return 'Activity update';
    }
  };

  const getMockDescription = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'bet_placed':
        return 'Someone placed a bet on a popular prediction';
      case 'prediction_created':
        return 'A new prediction was created in Technology';
      case 'achievement_earned':
        return 'Earned the "Consistent Trader" badge';
      case 'rank_changed':
        return 'Your leaderboard position improved';
      case 'trending_prediction':
        return 'High activity prediction gaining momentum';
      default:
        return 'Platform activity update';
    }
  };

  // Create activity item from real-time event
  const createActivityFromEvent = useCallback(
    (eventType: string, data: any): ActivityItem | null => {
      if (!data) return null;

      const now = new Date().toISOString();
      const isPersonal = data.userId === user?.id || data.user?.id === user?.id;

      switch (eventType) {
        case 'betPlaced':
          return {
            id: `bet_${data.id}_${Date.now()}`,
            type: 'bet_placed',
            title: isPersonal
              ? 'You placed a bet!'
              : `${data.user?.username || 'Someone'} placed a bet`,
            description: `${data.amount}🪙 on "${data.prediction?.title || 'a prediction'}"`,
            timestamp: now,
            userId: data.userId || data.user?.id,
            userName: data.user?.username,
            userAvatar: data.user?.avatarUrl,
            amount: data.amount,
            predictionId: data.predictionId,
            predictionTitle: data.prediction?.title,
            category: data.prediction?.category,
            metadata: { betId: data.id, odds: data.odds },
            isPersonal,
            priority: data.amount > 500 ? 'high' : data.amount > 100 ? 'medium' : 'low',
            icon: ACTIVITY_ICONS.bet_placed,
            color: ACTIVITY_COLORS.bet_placed,
          };

        case 'parlayPlaced':
          return {
            id: `parlay_${data.id}_${Date.now()}`,
            type: 'parlay_placed',
            title: isPersonal
              ? 'You placed a parlay!'
              : `${data.user?.username || 'Someone'} placed a parlay`,
            description: `${data.amount}🪙 on ${data.legCount || 0} legs (${data.combinedOdds?.toFixed(2) || '?'}× odds)`,
            timestamp: now,
            userId: data.userId || data.user?.id,
            userName: data.user?.username,
            userAvatar: data.user?.avatarUrl,
            amount: data.amount,
            metadata: {
              parlayId: data.id,
              legCount: data.legCount,
              combinedOdds: data.combinedOdds,
              potentialPayout: data.potentialPayout,
            },
            isPersonal,
            priority: data.amount > 1000 ? 'high' : data.amount > 200 ? 'medium' : 'low',
            icon: ACTIVITY_ICONS.parlay_placed,
            color: ACTIVITY_COLORS.parlay_placed,
          };

        case 'predictionCreated':
          return {
            id: `prediction_${data.id}_${Date.now()}`,
            type: 'prediction_created',
            title: isPersonal
              ? 'You created a prediction!'
              : `${data.creator?.username || 'Someone'} created a prediction`,
            description: `"${data.title}" in ${data.category}`,
            timestamp: now,
            userId: data.creatorId || data.creator?.id,
            userName: data.creator?.username,
            userAvatar: data.creator?.avatarUrl,
            predictionId: data.id,
            predictionTitle: data.title,
            category: data.category,
            metadata: { type: data.type, expiresAt: data.expiresAt },
            isPersonal,
            priority: 'medium',
            icon: ACTIVITY_ICONS.prediction_created,
            color: ACTIVITY_COLORS.prediction_created,
          };

        case 'achievementUnlocked':
          return {
            id: `achievement_${data.id}_${Date.now()}`,
            type: 'achievement_earned',
            title: isPersonal
              ? 'Achievement unlocked!'
              : `${data.user?.username || 'Someone'} earned an achievement`,
            description: `${data.title}: ${data.description}`,
            timestamp: now,
            userId: data.userId || data.user?.id,
            userName: data.user?.username,
            userAvatar: data.user?.avatarUrl,
            metadata: { achievementId: data.id, category: data.category },
            isPersonal,
            priority: 'high',
            icon: ACTIVITY_ICONS.achievement_earned,
            color: ACTIVITY_COLORS.achievement_earned,
          };

        case 'leaderboard:rankChange':
          if (!isPersonal) return null; // Only show personal rank changes
          return {
            id: `rank_${data.userId}_${Date.now()}`,
            type: 'rank_changed',
            title: 'Your rank changed!',
            description: `Moved from #${data.oldRank} to #${data.newRank}`,
            timestamp: now,
            userId: data.userId,
            metadata: { oldRank: data.oldRank, newRank: data.newRank, change: data.change },
            isPersonal: true,
            priority: 'high',
            icon: ACTIVITY_ICONS.rank_changed,
            color: ACTIVITY_COLORS.rank_changed,
          };

        default:
          return null;
      }
    },
    [user?.id],
  );

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return;

    const handleActivity = (eventType: string) => (data: any) => {
      const activity = createActivityFromEvent(eventType, data);
      if (activity) {
        setState((prev) => ({
          ...prev,
          activities: [activity, ...prev.activities].slice(0, 100), // Keep only latest 100
        }));
      }
    };

    // Personal activity events
    socket.on('betPlaced', handleActivity('betPlaced'));
    socket.on('parlayPlaced', handleActivity('parlayPlaced'));
    socket.on('predictionCreated', handleActivity('predictionCreated'));
    socket.on('achievementUnlocked', handleActivity('achievementUnlocked'));
    socket.on('leaderboard:rankChange', handleActivity('leaderboard:rankChange'));

    // Platform-wide events (filtered by relevance)
    socket.on('bigBetAlert', (data: any) => {
      if (data.amount >= 1000) {
        // Only show really big bets
        const activity = createActivityFromEvent('betPlaced', { ...data, type: 'big_bet' });
        if (activity) {
          activity.type = 'big_bet';
          activity.icon = ACTIVITY_ICONS.big_bet;
          activity.color = ACTIVITY_COLORS.big_bet;
          activity.priority = 'high';
          setState((prev) => ({
            ...prev,
            activities: [activity, ...prev.activities].slice(0, 100),
          }));
        }
      }
    });

    socket.on('predictionTrending', (data: any) => {
      const activity: ActivityItem = {
        id: `trending_${data.id}_${Date.now()}`,
        type: 'trending_prediction',
        title: 'Prediction trending!',
        description: `"${data.title}" is getting lots of bets`,
        timestamp: new Date().toISOString(),
        predictionId: data.id,
        predictionTitle: data.title,
        category: data.category,
        metadata: { bettingVelocity: data.bettingVelocity },
        isPersonal: false,
        priority: 'medium',
        icon: ACTIVITY_ICONS.trending_prediction,
        color: ACTIVITY_COLORS.trending_prediction,
      };

      setState((prev) => ({
        ...prev,
        activities: [activity, ...prev.activities].slice(0, 100),
      }));
    });

    return () => {
      socket.off('betPlaced');
      socket.off('parlayPlaced');
      socket.off('predictionCreated');
      socket.off('achievementUnlocked');
      socket.off('leaderboard:rankChange');
      socket.off('bigBetAlert');
      socket.off('predictionTrending');
    };
  }, [socket, createActivityFromEvent]);

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    let filtered = state.activities;

    // Type filter
    if (state.filters.types.length > 0) {
      filtered = filtered.filter((activity) => state.filters.types.includes(activity.type));
    }

    // Category filters
    if (!state.filters.showPersonal) {
      filtered = filtered.filter((activity) => !activity.isPersonal);
    }
    if (!state.filters.showSocial) {
      filtered = filtered.filter(
        (activity) =>
          activity.type !== 'friend_activity' && (!activity.userId || activity.isPersonal),
      );
    }
    if (!state.filters.showPlatform) {
      filtered = filtered.filter(
        (activity) =>
          activity.isPersonal ||
          ['friend_activity', 'bet_placed', 'parlay_placed', 'prediction_created'].includes(
            activity.type,
          ),
      );
    }

    // Time filter
    if (state.filters.timeframe !== 'all') {
      const now = Date.now();
      const timeframeLimits = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      const limit = timeframeLimits[state.filters.timeframe];
      if (limit) {
        filtered = filtered.filter(
          (activity) => now - new Date(activity.timestamp).getTime() <= limit,
        );
      }
    }

    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [state.activities, state.filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ActivityFilter>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  // Load more activities
  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading) return;
    fetchActivities(state.activities.length);
  }, [state.hasMore, state.loading, state.activities.length, fetchActivities]);

  // Refresh activities
  const refresh = useCallback(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(0);
  }, []);

  // Refresh when filters change
  useEffect(() => {
    fetchActivities(0);
  }, [state.filters]);

  return {
    activities: filteredActivities,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    filters: state.filters,
    updateFilters,
    loadMore,
    refresh,
  };
}
