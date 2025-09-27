// apps/client/src/components/dashboard/AchievementManager/AchievementCard.tsx
import { memo, useState } from 'react';
import { useAchievementTheme } from '../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../theme/utils/achievement-colors';

interface Achievement {
  id: string;
  achievementId?: number;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity?: string;
  progress?: number;
  targetValue?: number;
  isCompleted?: boolean;
  completedAt?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  viewMode: 'grid' | 'list';
  isPinned?: boolean;
  isRecent?: boolean;
  showProgress?: boolean;
  highlightProgress?: boolean;
  onTogglePin?: (achievementId: string) => void;
}

const AchievementCard = memo(function AchievementCard({
  achievement,
  viewMode,
  isPinned = false,
  isRecent = false,
  showProgress = false,
  highlightProgress = false,
  onTogglePin,
}: AchievementCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { getRarityClasses, getCategoryIcon, utils } = useAchievementTheme();

  const {
    id,
    name,
    title,
    description,
    category,
    rarity = 'common',
    progress = 0,
    targetValue = 1,
    isCompleted = false,
    completedAt,
  } = achievement;

  const progressPercent = targetValue > 0 ? Math.min((progress / targetValue) * 100, 100) : 0;
  const isStarted = progress > 0;

  // Get theme-aware styling
  const rarityClasses = utils.isValidRarity(rarity)
    ? getRarityClasses(rarity as AchievementRarity)
    : getRarityClasses('common');

  const categoryIcon = getCategoryIcon(category || '');

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-success';
    if (percent >= 70) return 'bg-warning';
    if (percent >= 50) return 'bg-error';
    return 'bg-primary';
  };

  const getCategoryBadgeStyle = (cat: string) => {
    const categoryColors = {
      betting: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      pong: 'bg-orange-50 text-orange-600 border-orange-100',
      leaderboard: 'bg-yellow-50 text-yellow-600 border-yellow-100',
      chat: 'bg-blue-50 text-blue-600 border-blue-100',
      prediction: 'bg-purple-50 text-purple-600 border-purple-100',
      participation: 'bg-green-50 text-green-600 border-green-100',
      event: 'bg-pink-50 text-pink-600 border-pink-100',
      secret: 'bg-gray-50 text-gray-600 border-gray-100',
      shame: 'bg-red-50 text-red-600 border-red-100',
    };
    return (
      categoryColors[cat as keyof typeof categoryColors] ||
      'bg-gray-50 text-gray-600 border-gray-100'
    );
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin(id.toString());
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-4 p-4 rounded-lg border-l-4 ${rarityClasses.leftBorder} bg-surface border border-muted hover:shadow-md transition-all duration-200 cursor-pointer`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{categoryIcon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold text-content text-sm truncate">{title || name}</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rarityClasses.badge}`}>
                {rarity}
              </span>
              {onTogglePin && (
                <button
                  onClick={handlePinToggle}
                  className={`p-1 rounded transition-colors ${
                    isPinned ? 'text-yellow-500' : 'text-tertiary hover:text-content'
                  }`}
                  title={isPinned ? 'Unpin' : 'Pin achievement'}
                >
                  📌
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-tertiary mb-2 line-clamp-1">{description}</p>

          {showProgress && !isCompleted && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-content font-medium">
                {progress.toLocaleString()}/{targetValue.toLocaleString()}
              </span>
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={`${getProgressColor(progressPercent)} rounded-full h-1.5 transition-all duration-500`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-tertiary">{progressPercent.toFixed(0)}%</span>
            </div>
          )}

          {isCompleted && completedAt && (
            <div className="text-xs text-success">
              ✅ Completed {new Date(completedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Category badge */}
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeStyle(category)} flex-shrink-0`}
        >
          {category}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={`p-4 rounded-lg border-2 ${rarityClasses.leftBorder} bg-surface border-muted hover:shadow-lg transition-all duration-200 cursor-pointer relative ${
        highlightProgress && progressPercent >= 90 ? 'ring-2 ring-success/50' : ''
      }`}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Header with pin button */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl flex-shrink-0">{categoryIcon}</div>
        <div className="flex items-center gap-1">
          {isRecent && (
            <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full font-medium">
              New!
            </span>
          )}
          {onTogglePin && (
            <button
              onClick={handlePinToggle}
              className={`p-1 rounded transition-colors ${
                isPinned ? 'text-yellow-500' : 'text-tertiary hover:text-content'
              }`}
              title={isPinned ? 'Unpin' : 'Pin achievement'}
            >
              📌
            </button>
          )}
        </div>
      </div>

      {/* Title and Rarity */}
      <div className="mb-2">
        <h3 className="font-bold text-content text-sm leading-tight mb-1 line-clamp-2">
          {title || name}
        </h3>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${rarityClasses.badge}`}
        >
          {rarity}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-tertiary leading-tight mb-3 line-clamp-2">{description}</p>

      {/* Progress section */}
      {showProgress && !isCompleted && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-content">
              {progress.toLocaleString()}/{targetValue.toLocaleString()}
            </span>
            <span
              className={`font-bold ${highlightProgress && progressPercent >= 90 ? 'text-success' : 'text-content'}`}
            >
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`${getProgressColor(progressPercent)} rounded-full h-2 transition-all duration-700 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {highlightProgress && progressPercent >= 90 && (
            <div className="text-xs text-success font-medium mt-1 flex items-center gap-1">
              ⚡ Almost there! {(targetValue - progress).toLocaleString()} more to go!
            </div>
          )}
        </div>
      )}

      {/* Completion status */}
      {isCompleted && (
        <div className="mb-3">
          <div className="text-xs text-success font-medium flex items-center gap-1">
            ✅ Completed
          </div>
          {completedAt && (
            <div className="text-xs text-tertiary mt-1">
              {new Date(completedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Category badge */}
      <div className="flex items-center justify-between">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryBadgeStyle(category)}`}
        >
          {category}
        </span>

        {!isStarted && !isCompleted && <span className="text-xs text-tertiary">🔒 Locked</span>}
      </div>

      {/* Hover hint */}
      <div className="text-xs text-tertiary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Click for details
      </div>
    </div>
  );
});

export default AchievementCard;
