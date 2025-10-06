// Pong event notification handlers (Elo, tier changes, achievements)
import { useCallback } from 'react';
import { useSocketEvent } from '../../../contexts/EventBusCoreContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationSystem } from '../NotificationContext';
import { REDIS_CHANNELS } from '@ems/types';

interface PongEloUpdatePayload {
  userId: number;
  oldRating: number;
  newRating: number;
  change: number;
  tier: string;
  matchId: string;
}

interface PongTierChangePayload {
  userId: number;
  oldTier: string;
  newTier: string;
  eloRating: number;
  isPromotion: boolean;
}

interface PongAchievementPayload {
  userId: number;
  achievementId: string;
  title: string;
  description: string;
  type: 'pong_streak' | 'pong_skill' | 'pong_earnings' | 'pong_milestone';
}

const TIER_EMOJIS: Record<string, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
  DIAMOND: '💎',
  MASTER: '👑',
  GRANDMASTER: '🏆',
};

export function usePongNotifications() {
  const { user } = useAuth();
  const { addNotification } = useNotificationSystem();

  // Handle Pong Elo updates
  const handlePongEloUpdate = useCallback(
    (payload: PongEloUpdatePayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification(
        'pong-elo',
        'Elo Update',
        '', // Message handled by PongNotificationToast
        {
          priority: payload.change > 0 ? 'high' : 'normal',
          duration: 8000,
          data: payload,
        },
      );
    },
    [user, addNotification],
  );

  // Handle Pong tier changes
  const handlePongTierChange = useCallback(
    (payload: PongTierChangePayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification(
        'pong-tier',
        'Tier Promotion!',
        '', // Message handled by PongNotificationToast
        {
          priority: 'high',
          duration: 12000,
          data: payload,
        },
      );
    },
    [user, addNotification],
  );

  // Handle Pong-specific achievements
  const handlePongAchievement = useCallback(
    (payload: PongAchievementPayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification(
        'pong-achievement',
        'Pong Achievement!',
        '', // Message handled by PongNotificationToast
        {
          priority: 'high',
          duration: 12000,
          data: payload,
        },
      );
    },
    [user, addNotification],
  );

  // Subscribe to Pong events via EventBusCore
  useSocketEvent(REDIS_CHANNELS.PONG_ELO_UPDATE, handlePongEloUpdate);
  useSocketEvent(REDIS_CHANNELS.PONG_TIER_CHANGE, handlePongTierChange);
  useSocketEvent(REDIS_CHANNELS.PONG_ACHIEVEMENT_UNLOCKED, handlePongAchievement);
}
