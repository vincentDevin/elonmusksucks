import { useEffect, useState } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  StarIcon,
  FireIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { Notification } from './types';

interface PongNotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
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

const getAchievementIcon = (type: string) => {
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

export function PongNotificationToast({ notification, onDismiss }: PongNotificationToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const dismissible = notification.dismissible !== false;
  const data = notification.data || {};

  return (
    <div
      className={`
        pointer-events-auto bg-surface border border-accent/20 rounded-xl shadow-lg p-4 max-w-sm
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-in slide-in-from-right
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {notification.type === 'pong-achievement' ? (
            getAchievementIcon(data.type || 'pong_milestone')
          ) : notification.type === 'pong-tier' ? (
            <StarIcon className="w-5 h-5 text-accent" />
          ) : (
            <TrophyIcon className="w-5 h-5 text-blue-500" />
          )}
          <span className="font-medium text-content text-sm">{notification.title}</span>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-tertiary hover:text-content transition-colors"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pong Achievement */}
      {notification.type === 'pong-achievement' && (
        <div
          className={`mb-3 p-3 bg-gradient-to-r rounded-lg border ${
            ACHIEVEMENT_COLORS[data.type as keyof typeof ACHIEVEMENT_COLORS] ||
            ACHIEVEMENT_COLORS.pong_milestone
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-2 bg-surface/20 rounded-full">
              {getAchievementIcon(data.type)}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white text-sm mb-1">{data.title}</div>
              <div className="text-white/80 text-xs">{data.description}</div>
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
      {notification.type === 'pong-tier' && (
        <div className="mb-3 p-3 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg border border-yellow-300">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {TIER_EMOJIS[data.newTier as keyof typeof TIER_EMOJIS] || '🏆'}
            </div>
            <div>
              <div className="font-bold text-yellow-800">
                {data.oldTier} → {data.newTier}
              </div>
              <div className="text-xs text-yellow-700">
                {data.isPromotion ? "You've been promoted! 🎉" : 'Tier changed'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Elo Change */}
      {notification.type === 'pong-elo' && data.change !== undefined && data.change !== 0 && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {data.change > 0 ? (
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-tertiary">Rating Change</span>
          </div>
          <div
            className={`font-bold text-lg ${data.change > 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {data.change > 0 ? '+' : ''}
            {data.change}
          </div>
        </div>
      )}

      {/* New Elo */}
      {notification.type === 'pong-elo' && data.newRating && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-tertiary">New Rating</span>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-blue-500 text-lg">{data.newRating}</span>
            <div
              className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${
                TIER_COLORS[data.tier as keyof typeof TIER_COLORS] || TIER_COLORS.SILVER
              }`}
            >
              {data.tier}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown (for future use if skill/economy components are added) */}
      {notification.type === 'pong-elo' &&
        (data.skillComponent !== undefined || data.economyComponent !== undefined) && (
          <div className="text-xs text-tertiary space-y-1 mb-3">
            {data.skillComponent !== undefined && (
              <div className="flex justify-between">
                <span>Skill Component:</span>
                <span className={data.skillComponent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.skillComponent >= 0 ? '+' : ''}
                  {data.skillComponent}
                </span>
              </div>
            )}
            {data.economyComponent !== undefined && (
              <div className="flex justify-between">
                <span>Economy Component:</span>
                <span className={data.economyComponent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {data.economyComponent >= 0 ? '+' : ''}
                  {data.economyComponent}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Footer */}
      <div className="pt-2 border-t border-accent/20 mt-3">
        <div className="text-xs text-tertiary flex items-center justify-between">
          <span>
            {notification.type === 'pong-achievement' ? 'Achievement unlocked' : 'Match completed'}
          </span>
          <span>{new Date(notification.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
