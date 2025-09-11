// apps/client/src/hooks/useSocialEvents.ts
// -----------------------------------------------------------------------------
// Social events integration with real-time notifications and social interactions
// Handles follows, post reactions, comments, emoji usage, thread participation
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBus } from '../contexts/EventBusContext';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '../types/events';

// Social notification interface
export interface SocialNotification {
  id: string;
  type: 'follow' | 'reaction' | 'comment' | 'mention' | 'emoji' | 'thread_participation';
  title: string;
  description?: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    postId?: number;
    postPreview?: string;
    reaction?: string;
    emoji?: string;
    commentPreview?: string;
    threadId?: number;
  };
}

// Social activity interface
export interface SocialActivity {
  id: string;
  type: 'new_follower' | 'post_liked' | 'comment_received' | 'mentioned' | 'emoji_reaction';
  actor: {
    id: number;
    name: string;
    avatar?: string;
  };
  target?: {
    type: 'post' | 'comment' | 'prediction';
    id: number;
    preview: string;
  };
  timestamp: string;
  isNew: boolean;
}

// Social metrics interface
export interface SocialMetrics {
  totalFollowers: number;
  totalFollowing: number;
  postsCreated: number;
  commentsReceived: number;
  reactionsReceived: number;
  emojisUsed: number;
  threadParticipations: number;
  weeklyGrowth: {
    followers: number;
    interactions: number;
  };
}

export function useSocialEvents() {
  const { subscribe } = useEventBus();
  const { user } = useAuth();
  const [socialNotifications, setSocialNotifications] = useState<SocialNotification[]>([]);
  const [socialActivity, setSocialActivity] = useState<SocialActivity[]>([]);
  const [metrics, setMetrics] = useState<SocialMetrics>({
    totalFollowers: 0,
    totalFollowing: 0,
    postsCreated: 0,
    commentsReceived: 0,
    reactionsReceived: 0,
    emojisUsed: 0,
    threadParticipations: 0,
    weeklyGrowth: {
      followers: 0,
      interactions: 0,
    },
  });

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setSocialNotifications((prev) =>
      prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setSocialNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, []);

  // Clear notification
  const clearNotification = useCallback((notificationId: string) => {
    setSocialNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
  }, []);

  // Add notification helper
  const addNotification = useCallback((notification: Omit<SocialNotification, 'id' | 'read'>) => {
    const notificationWithId: SocialNotification = {
      ...notification,
      id: `${notification.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
    };

    setSocialNotifications((prev) => [notificationWithId, ...prev.slice(0, 49)]); // Keep max 50 notifications
  }, []);

  // Add activity helper
  const addActivity = useCallback((activity: Omit<SocialActivity, 'id' | 'isNew'>) => {
    const activityWithId: SocialActivity = {
      ...activity,
      id: `${activity.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isNew: true,
    };

    setSocialActivity((prev) => [activityWithId, ...prev.slice(0, 99)]); // Keep max 100 activities
  }, []);

  // Update metrics helper
  const updateMetrics = useCallback((updates: Partial<SocialMetrics>) => {
    setMetrics((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      // User follow notifications
      subscribe(REDIS_CHANNELS.USER_FOLLOWED, (payload: any) => {
        if (payload.followedUserId === user.id) {
          console.log('[SocialEvents] User followed:', payload);

          addNotification({
            type: 'follow',
            title: `${payload.followerName} followed you!`,
            description: 'Check out their profile and predictions',
            userId: payload.followerId,
            userName: payload.followerName,
            userAvatar: payload.followerAvatar,
            timestamp: payload.timestamp,
            actionUrl: `/profile/${payload.followerId}`,
          });

          addActivity({
            type: 'new_follower',
            actor: {
              id: payload.followerId,
              name: payload.followerName,
              avatar: payload.followerAvatar,
            },
            timestamp: payload.timestamp,
          });

          // Update metrics
          updateMetrics({
            totalFollowers: metrics.totalFollowers + 1,
            weeklyGrowth: {
              ...metrics.weeklyGrowth,
              followers: metrics.weeklyGrowth.followers + 1,
            },
          });
        }
      }),

      // Post reactions
      subscribe(REDIS_CHANNELS.POST_REACTION, (payload: any) => {
        if (payload.postOwnerId === user.id && payload.userId !== user.id) {
          console.log('[SocialEvents] Post reaction:', payload);

          addNotification({
            type: 'reaction',
            title: `${payload.userName} reacted to your post`,
            description: `${payload.reaction} on "${payload.postPreview}"`,
            userId: payload.userId,
            userName: payload.userName,
            userAvatar: payload.userAvatar,
            timestamp: payload.timestamp,
            actionUrl: `/posts/${payload.postId}`,
            metadata: {
              postId: payload.postId,
              postPreview: payload.postPreview,
              reaction: payload.reaction,
            },
          });

          addActivity({
            type: 'post_liked',
            actor: {
              id: payload.userId,
              name: payload.userName,
              avatar: payload.userAvatar,
            },
            target: {
              type: 'post',
              id: payload.postId,
              preview: payload.postPreview,
            },
            timestamp: payload.timestamp,
          });

          // Update metrics
          updateMetrics({
            reactionsReceived: metrics.reactionsReceived + 1,
            weeklyGrowth: {
              ...metrics.weeklyGrowth,
              interactions: metrics.weeklyGrowth.interactions + 1,
            },
          });
        }
      }),

      // Comment notifications
      subscribe(REDIS_CHANNELS.COMMENT_CREATED, (payload: any) => {
        if (payload.postOwnerId === user.id && payload.commenterId !== user.id) {
          console.log('[SocialEvents] Comment created:', payload);

          addNotification({
            type: 'comment',
            title: `${payload.commenterName} commented on your post`,
            description: payload.commentPreview,
            userId: payload.commenterId,
            userName: payload.commenterName,
            userAvatar: payload.commenterAvatar,
            timestamp: payload.timestamp,
            actionUrl: `/posts/${payload.postId}#comment-${payload.commentId}`,
            metadata: {
              postId: payload.postId,
              commentPreview: payload.commentPreview,
            },
          });

          addActivity({
            type: 'comment_received',
            actor: {
              id: payload.commenterId,
              name: payload.commenterName,
              avatar: payload.commenterAvatar,
            },
            target: {
              type: 'post',
              id: payload.postId,
              preview: payload.postPreview || 'your post',
            },
            timestamp: payload.timestamp,
          });

          // Update metrics
          updateMetrics({
            commentsReceived: metrics.commentsReceived + 1,
            weeklyGrowth: {
              ...metrics.weeklyGrowth,
              interactions: metrics.weeklyGrowth.interactions + 1,
            },
          });
        }
      }),

      // Emoji usage tracking
      subscribe(REDIS_CHANNELS.EMOJI_USED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[SocialEvents] Emoji used:', payload);

          // Update metrics only
          updateMetrics({
            emojisUsed: metrics.emojisUsed + 1,
          });
        }
      }),

      // Thread participation
      subscribe(REDIS_CHANNELS.THREAD_PARTICIPATION, (payload: any) => {
        if (payload.participantId === user.id) {
          console.log('[SocialEvents] Thread participation:', payload);

          // Update metrics
          updateMetrics({
            threadParticipations: metrics.threadParticipations + 1,
          });
        }

        // Notify if someone participated in a thread the user is involved in
        if (payload.threadOwnerId === user.id && payload.participantId !== user.id) {
          addNotification({
            type: 'thread_participation',
            title: `${payload.participantName} joined your discussion`,
            description: `New activity in "${payload.threadTitle}"`,
            userId: payload.participantId,
            userName: payload.participantName,
            userAvatar: payload.participantAvatar,
            timestamp: payload.timestamp,
            actionUrl: `/threads/${payload.threadId}`,
            metadata: {
              threadId: payload.threadId,
            },
          });
        }
      }),

      // Post creation tracking (for user's own posts)
      subscribe(REDIS_CHANNELS.POST_CREATED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[SocialEvents] Post created by user:', payload);

          // Update metrics
          updateMetrics({
            postsCreated: metrics.postsCreated + 1,
          });
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, subscribe, addNotification, addActivity, updateMetrics, metrics]);

  // Get unread notification count
  const unreadCount = socialNotifications.filter((notif) => !notif.read).length;

  // Get recent activity (last 24 hours)
  const recentActivity = socialActivity.filter((activity) => {
    const activityTime = new Date(activity.timestamp).getTime();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return activityTime > dayAgo;
  });

  return {
    socialNotifications,
    socialActivity,
    recentActivity,
    metrics,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification, // For manual testing/debugging
  };
}
