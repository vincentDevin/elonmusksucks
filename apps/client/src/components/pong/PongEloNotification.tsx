import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  StarIcon,
  FireIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface EloUpdateEvent {
  userId: number;
  oldElo: number;
  newElo: number;
  change: number;
  newTier: string;
  matchId: string;
  skillComponent?: number;
  economyComponent?: number;
}

interface TierChangeEvent {
  userId: number;
  oldTier: string;
  newTier: string;
  newElo: number;
}

interface PongAchievementEvent {
  userId: number;
  achievementId: string;
  title: string;
  description: string;
  type: 'pong_streak' | 'pong_skill' | 'pong_earnings' | 'pong_milestone';
}

interface NotificationData extends EloUpdateEvent {
  type: 'elo-update' | 'tier-change' | 'achievement';
  tierChange?: TierChangeEvent;
  achievement?: PongAchievementEvent;
  timestamp: number;
  id: string;
}

const TIER_COLORS = {
  BRONZE: 'from-muted to-tertiary',
  SILVER: 'from-surface to-content',
  GOLD: 'from-accent/50 to-accent',
  PLATINUM: 'from-success/50 to-success',
  DIAMOND: 'from-primary/50 to-primary',
  MASTER: 'from-error/50 to-error',
  GRANDMASTER: 'from-accent/70 to-accent',
};

const TIER_EMOJIS = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
  DIAMOND: '💎',
  MASTER: '👑',
  GRANDMASTER: '🏆',
};

const ACHIEVEMENT_COLORS = {
  pong_streak: 'from-warning/20 to-error/20 border-warning/50',
  pong_skill: 'from-primary/20 to-primary/20 border-primary/50',
  pong_earnings: 'from-success/20 to-success/20 border-success/50',
  pong_milestone: 'from-accent/20 to-accent/20 border-accent/50',
};

const getAchievementIcon = (type: PongAchievementEvent['type']) => {
  switch (type) {
    case 'pong_streak':
      return <FireIcon className="w-5 h-5 text-warning" />;
    case 'pong_skill':
      return <ChartBarIcon className="w-5 h-5 text-primary" />;
    case 'pong_earnings':
      return <StarIcon className="w-5 h-5 text-success" />;
    case 'pong_milestone':
      return <TrophyIcon className="w-5 h-5 text-accent" />;
    default:
      return <TrophyIcon className="w-5 h-5 text-accent" />;
  }
};

export default function PongEloNotification() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !user) return;

    // Listen for Elo updates
    const handleEloUpdate = (data: EloUpdateEvent) => {
      // Only show notifications for the current user
      if (data.userId !== user.id) return;

      const notification: NotificationData = {
        ...data,
        type: 'elo-update',
        timestamp: Date.now(),
        id: `elo-${data.matchId}-${Date.now()}`,
      };

      setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    };

    // Listen for tier changes
    const handleTierChange = (data: TierChangeEvent) => {
      // Only show notifications for the current user
      if (data.userId !== user.id) return;

      // Find the most recent Elo update to combine with tier change
      setNotifications((prev) => {
        const latest = prev[0];
        if (latest && latest.type === 'elo-update' && Date.now() - latest.timestamp < 5000) {
          // Combine with recent Elo update
          const combined: NotificationData = {
            ...latest,
            tierChange: data,
          };
          return [combined, ...prev.slice(1)];
        } else {
          // Create standalone tier change notification
          const notification: NotificationData = {
            userId: data.userId,
            oldElo: data.newElo,
            newElo: data.newElo,
            change: 0,
            newTier: data.newTier,
            matchId: 'tier-change',
            type: 'tier-change',
            tierChange: data,
            timestamp: Date.now(),
            id: `tier-${data.userId}-${Date.now()}`,
          };
          return [notification, ...prev.slice(0, 4)];
        }
      });
    };

    // Listen for Pong achievements
    const handlePongAchievement = (data: PongAchievementEvent) => {
      // Only show notifications for the current user
      if (data.userId !== user.id) return;

      const notification: NotificationData = {
        userId: data.userId,
        oldElo: 0,
        newElo: 0,
        change: 0,
        newTier: '',
        matchId: 'achievement',
        type: 'achievement',
        achievement: data,
        timestamp: Date.now(),
        id: `achievement-${data.achievementId}-${Date.now()}`,
      };

      setNotifications((prev) => [notification, ...prev.slice(0, 4)]);
    };

    socket.on('pong:elo:update', handleEloUpdate);
    socket.on('pong:tier:change', handleTierChange);
    socket.on('pong:achievement:unlocked', handlePongAchievement);

    return () => {
      socket.off('pong:elo:update', handleEloUpdate);
      socket.off('pong:tier:change', handleTierChange);
      socket.off('pong:achievement:unlocked', handlePongAchievement);
    };
  }, [socket, user]);

  // Auto-dismiss notifications after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications((prev) =>
        prev.filter((notification) => Date.now() - notification.timestamp < 10000),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto bg-surface border border-accent/20 rounded-xl shadow-lg p-4 max-w-sm animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {notification.type === 'achievement' ? (
                getAchievementIcon(notification.achievement?.type || 'pong_milestone')
              ) : (
                <TrophyIcon className="w-5 h-5 text-blue-500" />
              )}
              <span className="font-medium text-content text-sm">
                {notification.type === 'achievement'
                  ? 'Pong Achievement!'
                  : notification.tierChange
                    ? 'Tier Promotion!'
                    : 'Elo Update'}
              </span>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="text-tertiary hover:text-content transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Achievement */}
          {notification.type === 'achievement' && notification.achievement && (
            <div
              className={`mb-3 p-3 bg-gradient-to-r rounded-lg border ${
                ACHIEVEMENT_COLORS[notification.achievement.type] ||
                ACHIEVEMENT_COLORS.pong_milestone
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 p-2 bg-surface/20 rounded-full">
                  {getAchievementIcon(notification.achievement.type)}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm mb-1">
                    {notification.achievement.title}
                  </div>
                  <div className="text-white/80 text-xs">
                    {notification.achievement.description}
                  </div>
                </div>
              </div>
              {/* Achievement celebration effects */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                <div className="absolute top-4 right-8 w-1 h-1 bg-white rounded-full animate-pulse" />
                <div
                  className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce"
                  style={{ animationDelay: '0.5s' }}
                />
              </div>
            </div>
          )}

          {/* Tier Change */}
          {notification.tierChange && (
            <div className="mb-3 p-3 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg border border-yellow-300">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {TIER_EMOJIS[notification.tierChange.newTier as keyof typeof TIER_EMOJIS] || '🏆'}
                </div>
                <div>
                  <div className="font-bold text-yellow-800">
                    {notification.tierChange.oldTier} → {notification.tierChange.newTier}
                  </div>
                  <div className="text-xs text-yellow-700">You've been promoted! 🎉</div>
                </div>
              </div>
            </div>
          )}

          {/* Elo Change */}
          {notification.type !== 'achievement' && notification.change !== 0 && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {notification.change > 0 ? (
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm text-tertiary">Rating Change</span>
              </div>
              <div
                className={`font-bold text-lg ${
                  notification.change > 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {notification.change > 0 ? '+' : ''}
                {notification.change}
              </div>
            </div>
          )}

          {/* New Elo */}
          {notification.type !== 'achievement' && notification.newElo > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-tertiary">New Rating</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-blue-500 text-lg">{notification.newElo}</span>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${
                    TIER_COLORS[notification.newTier as keyof typeof TIER_COLORS] ||
                    TIER_COLORS.SILVER
                  }`}
                >
                  {notification.newTier}
                </div>
              </div>
            </div>
          )}

          {/* Breakdown */}
          {notification.type !== 'achievement' &&
            (notification.skillComponent !== undefined ||
              notification.economyComponent !== undefined) && (
              <div className="text-xs text-tertiary space-y-1">
                {notification.skillComponent !== undefined && (
                  <div className="flex justify-between">
                    <span>Skill Component:</span>
                    <span
                      className={
                        notification.skillComponent >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {notification.skillComponent >= 0 ? '+' : ''}
                      {notification.skillComponent}
                    </span>
                  </div>
                )}
                {notification.economyComponent !== undefined && (
                  <div className="flex justify-between">
                    <span>Economy Component:</span>
                    <span
                      className={
                        notification.economyComponent >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {notification.economyComponent >= 0 ? '+' : ''}
                      {notification.economyComponent}
                    </span>
                  </div>
                )}
              </div>
            )}

          {/* Footer */}
          <div className="pt-2 border-t border-accent/20 mt-3">
            <div className="text-xs text-tertiary flex items-center justify-between">
              <span>
                {notification.type === 'achievement' ? 'Achievement unlocked' : 'Match completed'}
              </span>
              <span>{new Date(notification.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mini version for embedding in other components
export function PongEloMiniNotification() {
  const [lastUpdate, setLastUpdate] = useState<EloUpdateEvent | null>(null);
  const [show, setShow] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !user) return;

    const handleEloUpdate = (data: EloUpdateEvent) => {
      if (data.userId !== user.id) return;

      setLastUpdate(data);
      setShow(true);

      // Auto-hide after 5 seconds
      setTimeout(() => setShow(false), 5000);
    };

    socket.on('pong:elo:update', handleEloUpdate);

    return () => {
      socket.off('pong:elo:update', handleEloUpdate);
    };
  }, [socket, user]);

  if (!show || !lastUpdate) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center space-x-3">
        <TrophyIcon className="w-5 h-5 text-blue-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-800">
            Elo Updated: {lastUpdate.oldElo} → {lastUpdate.newElo}
          </div>
          <div
            className={`text-xs font-bold ${
              lastUpdate.change > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {lastUpdate.change > 0 ? '+' : ''}
            {lastUpdate.change} points
          </div>
        </div>
        <button onClick={() => setShow(false)} className="text-blue-400 hover:text-blue-600">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
