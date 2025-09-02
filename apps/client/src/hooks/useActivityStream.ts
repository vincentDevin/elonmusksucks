// apps/client/src/hooks/useActivityStream.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

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
    | 'achievement_unlocked'
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

// Achievement progress tracking interfaces
export interface AchievementProgress {
  achievementId: number;
  achievementName: string;
  achievementSlug: string;
  progress: number;
  targetValue: number;
  percentage: number;
  category: string;
  rarity: string;
  lastUpdated: string;
}

export interface AchievementCelebration {
  achievement: {
    id: number;
    name: string;
    title: string;
    description: string;
    category: string;
    rarity: string;
    iconUrl?: string;
  };
  progress: number;
  progressMax: number;
  unlockedAt: string;
  isVisible: boolean;
}

export interface ActivityStreamState {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  filters: ActivityFilter;
  achievementProgress: Map<number, AchievementProgress>;
  activeCelebrations: AchievementCelebration[];
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
  achievement_unlocked: '🏅',
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
  achievement_unlocked: 'text-yellow-500',
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
    achievementProgress: new Map<number, AchievementProgress>(),
    activeCelebrations: [],
  });

  // Initialize activity stream from Socket.IO only
  const initializeActivityStream = useCallback(() => {
    if (!socket) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    // Request initial activity data via socket
    socket.emit('activity:request', {
      limit: 50,
      userId: user?.id,
      includePersonal: true,
      includeSocial: true,
      includePlatform: true,
    });
  }, [socket, user?.id]);

  // Handle initial activity stream response
  const handleActivityResponse = useCallback(
    (activities: any[]) => {
      const processedActivities: ActivityItem[] = activities.map((activity) => {
        const isPersonal = activity.userId === user?.id;

        return {
          id: activity.id || `activity_${Date.now()}_${Math.random()}`,
          type: activity.type || 'friend_activity',
          title: activity.title || 'Activity Update',
          description: activity.description || '',
          timestamp: activity.timestamp || new Date().toISOString(),
          userId: activity.userId,
          userName: activity.userName || activity.user?.name,
          userAvatar: activity.userAvatar || activity.user?.avatarUrl,
          amount: activity.amount,
          predictionId: activity.predictionId,
          predictionTitle: activity.predictionTitle || activity.prediction?.title,
          category: activity.category,
          metadata: activity.metadata || {},
          isPersonal,
          priority: activity.priority || 'medium',
          icon: ACTIVITY_ICONS[activity.type as keyof typeof ACTIVITY_ICONS] || '📋',
          color: ACTIVITY_COLORS[activity.type as keyof typeof ACTIVITY_COLORS] || 'text-gray-500',
        };
      });

      setState((prev) => ({
        ...prev,
        activities: processedActivities,
        loading: false,
        hasMore: false, // No pagination for real-time data
      }));
    },
    [user?.id],
  );

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
            type: 'achievement_unlocked',
            title: isPersonal
              ? 'Achievement unlocked!'
              : `${data.user?.username || 'Someone'} unlocked an achievement`,
            description: `${data.title}: ${data.description}`,
            timestamp: now,
            userId: data.userId || data.user?.id,
            userName: data.user?.username,
            userAvatar: data.user?.avatarUrl,
            metadata: { achievementId: data.id, category: data.category },
            isPersonal,
            priority: 'high',
            icon: ACTIVITY_ICONS.achievement_unlocked,
            color: ACTIVITY_COLORS.achievement_unlocked,
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

  // Listen for real-time events and initial data
  // Rollback: Remove handler stability fixes and revert to inline handlers
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

    // Stable handlers for inline events to ensure proper cleanup
    const handleBigBetAlert = (data: any) => {
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
    };

    const handlePredictionTrending = (data: any) => {
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
    };

    const handleActivityError = (error: any) => {
      console.error('[activity-stream] Socket error:', error);
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to load activity stream',
        loading: false,
      }));
    };

    // Achievement progress and celebration handlers
    const achievementProgressHandler = (data: any) => {
      console.log('[achievement-progress] Progress update:', data);

      if (!data.achievementId || data.userId !== user?.id) return;

      const progressUpdate: AchievementProgress = {
        achievementId: data.achievementId,
        achievementName: data.achievementName || data.achievement?.name || 'Unknown Achievement',
        achievementSlug: data.achievementSlug || data.achievement?.slug || 'unknown',
        progress: data.progress || 0,
        targetValue: data.targetValue || data.achievement?.targetValue || 1,
        percentage: data.percentage || (data.progress / (data.targetValue || 1)) * 100,
        category: data.category || data.achievement?.category || 'general',
        rarity: data.rarity || data.achievement?.rarity || 'common',
        lastUpdated: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        achievementProgress: new Map(prev.achievementProgress).set(
          data.achievementId,
          progressUpdate,
        ),
      }));
    };

    const achievementCelebrationHandler = (data: any) => {
      console.log('[achievement-celebration] Celebration triggered:', data);

      if (!data.achievement || data.userId !== user?.id) return;

      const celebration: AchievementCelebration = {
        achievement: {
          id: data.achievement.id,
          name: data.achievement.name,
          title: data.achievement.title || data.achievement.name,
          description: data.achievement.description || '',
          category: data.achievement.category || 'general',
          rarity: data.achievement.rarity || 'common',
          iconUrl: data.achievement.iconUrl,
        },
        progress: data.progress || data.achievement.targetValue || 1,
        progressMax: data.progressMax || data.achievement.targetValue || 1,
        unlockedAt: data.unlockedAt || new Date().toISOString(),
        isVisible: true,
      };

      setState((prev) => ({
        ...prev,
        activeCelebrations: [celebration, ...prev.activeCelebrations.slice(0, 4)], // Keep max 5 celebrations
      }));

      // Auto-hide celebration after 8 seconds
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          activeCelebrations: prev.activeCelebrations.filter((c) => c !== celebration),
        }));
      }, 8000);
    };

    const achievementBatchUnlockedHandler = (data: any) => {
      console.log('[achievement-batch] Batch unlock:', data);

      if (!data.achievements || !Array.isArray(data.achievements) || data.userId !== user?.id)
        return;

      // Handle multiple achievements unlocked at once
      data.achievements.forEach((achievement: any, index: number) => {
        setTimeout(() => {
          achievementCelebrationHandler({
            achievement,
            userId: data.userId,
            progress: achievement.targetValue || 1,
            progressMax: achievement.targetValue || 1,
            unlockedAt: new Date().toISOString(),
          });
        }, index * 2000); // Stagger celebrations by 2 seconds
      });
    };

    // Mention notification handler
    const mentionReceivedHandler = (data: any) => {
      console.log('[mention-received] Mention notification:', data);

      // Only show for current user
      if (!user?.id || data.mentionedUserId !== user.id) return;

      const activity: ActivityItem = {
        id: `mention_${data.mentionId}_${Date.now()}`,
        type: 'friend_activity', // Using existing type for mention notifications
        title: `@${data.authorName} mentioned you`,
        description: data.content,
        timestamp: data.createdAt,
        userId: data.authorId,
        userName: data.authorName,
        userAvatar: data.authorAvatar,
        metadata: {
          postId: data.postId,
          mentionId: data.mentionId,
          type: 'mention',
        },
        isPersonal: true,
        priority: 'medium',
        icon: '@',
        color: 'text-blue-400',
      };

      setState((prev) => ({
        ...prev,
        activities: [activity, ...prev.activities].slice(0, 100),
      }));
    };

    // Store handlers for cleanup
    const betPlacedHandler = handleActivity('betPlaced');
    const betResolvedHandler = handleActivity('betResolved');
    const parlayPlacedHandler = handleActivity('parlayPlaced');
    const parlayResolvedHandler = handleActivity('parlayResolved');
    const predictionCreatedHandler = handleActivity('predictionCreated');
    const predictionResolvedHandler = handleActivity('predictionResolved');
    const achievementUnlockedHandler = handleActivity('achievementUnlocked');
    const leaderboardRankChangeHandler = handleActivity('leaderboard:rankChange');
    const activityUpdateHandler = handleActivity('activityUpdate');

    // Handle initial activity stream response
    socket.on('activity:response', handleActivityResponse);

    // Handle connection events
    socket.on('connect', initializeActivityStream);
    socket.on('reconnect', initializeActivityStream);

    // Real-time activity events with enhanced data
    socket.on('bet:placed', betPlacedHandler);
    socket.on('bet:resolved', betResolvedHandler);
    socket.on('parlay:placed', parlayPlacedHandler);
    socket.on('parlay:resolved', parlayResolvedHandler);
    socket.on('prediction:created', predictionCreatedHandler);
    socket.on('prediction:resolved', predictionResolvedHandler);
    socket.on('achievement:unlocked', achievementUnlockedHandler);
    socket.on('achievement:progress', achievementProgressHandler);
    socket.on('achievement:celebration', achievementCelebrationHandler);
    socket.on('achievement:batch_unlocked', achievementBatchUnlockedHandler);
    socket.on('mention:received', mentionReceivedHandler);
    socket.on('leaderboard:rankChange', leaderboardRankChangeHandler);
    socket.on('activity:update', activityUpdateHandler);

    // Platform-wide events (filtered by relevance)
    socket.on('bigBetAlert', handleBigBetAlert);
    socket.on('predictionTrending', handlePredictionTrending);

    // Handle errors
    socket.on('activity:error', handleActivityError);

    // Initialize if already connected
    if (socket.connected) {
      initializeActivityStream();
    }

    return () => {
      // Clean up with same handler references
      socket.off('activity:response', handleActivityResponse);
      socket.off('connect', initializeActivityStream);
      socket.off('reconnect', initializeActivityStream);
      socket.off('bet:placed', betPlacedHandler);
      socket.off('bet:resolved', betResolvedHandler);
      socket.off('parlay:placed', parlayPlacedHandler);
      socket.off('parlay:resolved', parlayResolvedHandler);
      socket.off('prediction:created', predictionCreatedHandler);
      socket.off('prediction:resolved', predictionResolvedHandler);
      socket.off('achievement:unlocked', achievementUnlockedHandler);
      socket.off('achievement:progress', achievementProgressHandler);
      socket.off('achievement:celebration', achievementCelebrationHandler);
      socket.off('achievement:batch_unlocked', achievementBatchUnlockedHandler);
      socket.off('mention:received', mentionReceivedHandler);
      socket.off('leaderboard:rankChange', leaderboardRankChangeHandler);
      socket.off('activity:update', activityUpdateHandler);
      socket.off('bigBetAlert', handleBigBetAlert);
      socket.off('predictionTrending', handlePredictionTrending);
      socket.off('activity:error', handleActivityError);
    };
  }, [socket, createActivityFromEvent, handleActivityResponse, initializeActivityStream]);

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

  // Load more activities (simplified for real-time data)
  const loadMore = useCallback(() => {
    // No more pagination needed for real-time data
    // Could request more historical data if needed
    console.log("[activity-stream] Load more requested - real-time data doesn't need pagination");
  }, []);

  // Refresh activities
  const refresh = useCallback(() => {
    if (socket) {
      initializeActivityStream();
    }
  }, [socket, initializeActivityStream]);

  // Helper functions for achievement management
  const dismissCelebration = useCallback((celebrationId: string) => {
    setState((prev) => ({
      ...prev,
      activeCelebrations: prev.activeCelebrations.filter(
        (c) => `${c.achievement.id}-${c.unlockedAt}` !== celebrationId,
      ),
    }));
  }, []);

  const getAchievementProgress = useCallback(
    (achievementId: number): AchievementProgress | null => {
      return state.achievementProgress.get(achievementId) || null;
    },
    [state.achievementProgress],
  );

  return {
    activities: filteredActivities,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    filters: state.filters,
    updateFilters,
    loadMore,
    refresh,
    // Achievement progress and celebration features
    achievementProgress: Array.from(state.achievementProgress.values()),
    activeCelebrations: state.activeCelebrations,
    dismissCelebration,
    getAchievementProgress,
  };
}
