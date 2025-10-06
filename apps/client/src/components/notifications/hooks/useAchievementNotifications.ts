// Achievement notification event handler
import { useCallback } from 'react';
import { useSocketEvent } from '../../../contexts/EventBusCoreContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationSystem } from '../NotificationContext';
import { REDIS_CHANNELS, type AchievementUnlockedPayload } from '@ems/types';

export function useAchievementNotifications() {
  const { user } = useAuth();
  const { addNotification } = useNotificationSystem();

  // Handle general achievement unlocked events
  const handleAchievementUnlocked = useCallback(
    (payload: AchievementUnlockedPayload) => {
      // Security: Only show achievements for the current user
      if (!user || payload.userId !== user.id) return;

      const { achievement } = payload;

      addNotification(
        'achievement',
        'Achievement Unlocked! 🎉',
        `${achievement.title}: ${achievement.description}`,
        {
          priority: 'high',
          duration: 12000, // 12 seconds for achievements
          data: payload,
        },
      );
    },
    [user, addNotification],
  );

  // Subscribe to achievement events via EventBusCore
  useSocketEvent(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, handleAchievementUnlocked);
}
