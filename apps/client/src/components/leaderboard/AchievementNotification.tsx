// apps/client/src/components/leaderboard/AchievementNotification.tsx
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TrophyIcon, FireIcon, ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';
import type { Achievement } from '../../hooks/useEnhancedLeaderboard';

interface AchievementNotificationProps {
  achievements: Achievement[];
  onClear: () => void;
}

export default function AchievementNotification({
  achievements,
  onClear,
}: AchievementNotificationProps) {
  const [visibleAchievements, setVisibleAchievements] = useState<Achievement[]>([]);
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show new achievements
    const newAchievements = achievements.filter((a) => a.isNew);
    if (newAchievements.length > 0) {
      setVisibleAchievements((prev) => [...prev, ...newAchievements]);
    }
  }, [achievements]);

  const getAchievementIcon = (type: Achievement['type']) => {
    switch (type) {
      case 'rank_milestone':
        return <TrophyIcon className="w-6 h-6 text-yellow-400" />;
      case 'streak':
        return <FireIcon className="w-6 h-6 text-orange-400" />;
      case 'volume':
        return <ChartBarIcon className="w-6 h-6 text-blue-400" />;
      case 'profit':
        return <CurrencyDollarIcon className="w-6 h-6 text-green-400" />;
      default:
        return <TrophyIcon className="w-6 h-6 text-yellow-400" />;
    }
  };

  const getAchievementColor = (type: Achievement['type']) => {
    switch (type) {
      case 'rank_milestone':
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-400/50';
      case 'streak':
        return 'from-orange-500/20 to-red-600/20 border-orange-400/50';
      case 'volume':
        return 'from-blue-500/20 to-blue-600/20 border-blue-400/50';
      case 'profit':
        return 'from-green-500/20 to-green-600/20 border-green-400/50';
      default:
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-400/50';
    }
  };

  const dismissAchievement = (achievementId: string) => {
    setAnimatingOut((prev) => new Set(prev).add(achievementId));

    setTimeout(() => {
      setVisibleAchievements((prev) => prev.filter((a) => a.id !== achievementId));
      setAnimatingOut((prev) => {
        const newSet = new Set(prev);
        newSet.delete(achievementId);
        return newSet;
      });
    }, 300);
  };

  const clearAll = () => {
    const allIds = visibleAchievements.map((a) => a.id);
    setAnimatingOut(new Set(allIds));

    setTimeout(() => {
      setVisibleAchievements([]);
      setAnimatingOut(new Set());
      onClear();
    }, 300);
  };

  if (visibleAchievements.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Clear all button */}
      {visibleAchievements.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="text-xs bg-surface/80 hover:bg-surface text-tertiary hover:text-content px-2 py-1 rounded-full transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Achievement cards */}
      {visibleAchievements.map((achievement) => (
        <div
          key={achievement.id}
          className={`
            transform transition-all duration-300 ease-out
            ${
              animatingOut.has(achievement.id)
                ? 'translate-x-full opacity-0 scale-95'
                : 'translate-x-0 opacity-100 scale-100 animate-bounce'
            }
          `}
        >
          <div
            className={`
            relative bg-gradient-to-r rounded-lg border p-4 shadow-lg backdrop-blur-sm
            ${getAchievementColor(achievement.type)}
          `}
          >
            {/* Dismiss button */}
            <button
              onClick={() => dismissAchievement(achievement.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>

            {/* Achievement content */}
            <div className="flex items-start space-x-3 pr-6">
              {/* Icon */}
              <div className="flex-shrink-0 p-2 bg-surface/20 rounded-full">
                {getAchievementIcon(achievement.type)}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm mb-1">{achievement.title}</h3>
                <p className="text-gray-200 text-xs leading-relaxed">{achievement.description}</p>
                <p className="text-gray-400 text-xs mt-2">
                  {achievement.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Celebration animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
              <div className="absolute top-4 right-8 w-1 h-1 bg-white rounded-full animate-pulse" />
              <div
                className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-bounce"
                style={{ animationDelay: '0.5s' }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Auto-dismiss notification */}
      <div className="text-center">
        <p className="text-xs text-tertiary">Achievements auto-clear in 5 seconds</p>
      </div>
    </div>
  );
}
