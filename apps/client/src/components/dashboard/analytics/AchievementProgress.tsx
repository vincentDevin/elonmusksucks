// apps/client/src/components/dashboard/analytics/AchievementProgress.tsx
import { useState, memo, useMemo } from 'react';
import { useAchievements } from '../../../contexts/AchievementContext';
import { useAchievementTheme } from '../../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../../theme/utils/achievement-colors';

interface AchievementProgressProps {
  className?: string;
}

const AchievementProgress = memo(function AchievementProgress({
  className = '',
}: AchievementProgressProps) {
  const [showAll, setShowAll] = useState(false);
  const {
    achievements: progressToNext,
    recentAchievements: recentBadges,
    totalBadges,
    totalAvailable,
    completionRate,
    loading,
  } = useAchievements();
  const { getRarityClasses, getCategoryIcon, utils } = useAchievementTheme();

  const achievements = {
    recentBadges,
    progressToNext,
    totalBadges,
    totalAvailable,
    completionRate,
  };

  // Memoize achievement categorization to avoid recalculation
  const achievementCategories = useMemo(() => {
    const completed = achievements.progressToNext.filter((a) => a.isCompleted);
    const inProgress = achievements.progressToNext.filter((a) => !a.isCompleted && a.progress > 0);
    const available = achievements.progressToNext.filter((a) => !a.isCompleted && a.progress === 0);
    const upcoming = [...inProgress, ...available.slice(0, 5)];

    return {
      completed,
      inProgress,
      available,
      upcoming,
    };
  }, [achievements.progressToNext]);

  const displayedProgress = showAll
    ? achievementCategories.upcoming
    : achievementCategories.upcoming.slice(0, 3);

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-success';
    if (progress >= 70) return 'bg-warning';
    if (progress >= 50) return 'bg-error';
    return 'bg-primary';
  };

  // Using theme-aware getCategoryIcon from hook

  // Theme-aware rarity styling function with enhanced visual flair
  const getRarityColor = (rarity: string) => {
    if (!utils.isValidRarity(rarity)) {
      const commonClasses = getRarityClasses('common');
      return `${commonClasses.leftBorder} bg-surface border border-muted`;
    }
    const rarityClasses = getRarityClasses(rarity as AchievementRarity);
    const rarityEffects = {
      common: '',
      uncommon: 'hover:shadow-green-100/30',
      rare: 'hover:shadow-blue-100/30 hover:border-blue-200',
      legendary: 'hover:shadow-yellow-100/40 hover:border-yellow-200 relative',
      epic: 'hover:shadow-purple-100/40 hover:border-purple-200',
      secret: 'hover:shadow-pink-100/30 hover:border-pink-200',
      shame: 'hover:shadow-red-100/30',
    };
    return `${rarityClasses.leftBorder} bg-surface border border-muted ${rarityEffects[rarity as AchievementRarity] || ''} transition-all duration-200`;
  };

  const getCategoryBadgeStyle = (category: string) => {
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
      categoryColors[category as keyof typeof categoryColors] ||
      'bg-gray-50 text-gray-600 border-gray-100'
    );
  };

  const getRarityGlow = (rarity: string) => {
    const glowEffects = {
      legendary: 'drop-shadow-[0_0_4px_rgba(251,191,36,0.2)]',
      epic: 'drop-shadow-[0_0_3px_rgba(147,51,234,0.2)]',
      secret: 'drop-shadow-[0_0_3px_rgba(236,72,153,0.2)]',
    };
    return glowEffects[rarity as keyof typeof glowEffects] || '';
  };

  // Show loading state if we're fetching data independently
  if (loading) {
    return (
      <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            🏆 Achievements
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-tertiary">Loading achievements...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-background/50 rounded-xl p-4 border border-muted ${className} hover:shadow-md transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-content mb-3 flex items-center">
          🏅 Achievement Progress
        </h3>
        <div className="text-sm text-tertiary">{achievements.totalBadges} unlocked</div>
      </div>

      {/* Recent Achievements */}
      {achievements.recentBadges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-content mb-2">🎉 Recently Unlocked</h4>
          <div className="space-y-2">
            {achievements.recentBadges.map((achievement: any) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border-l-4 ${getRarityColor(achievement.rarity || 'common')} hover:shadow-sm transition-all duration-200`}
                title={achievement.description}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-xl ${getRarityGlow(achievement.rarity)} flex-shrink-0`}>
                    <div className="transform hover:scale-110 transition-transform duration-200">
                      {getCategoryIcon(achievement.category || '')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-content text-sm truncate">
                        {achievement.title || achievement.name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${utils.isValidRarity(achievement.rarity || 'common') ? getRarityClasses(achievement.rarity as AchievementRarity).badge : getRarityClasses('common').badge}`}
                      >
                        {achievement.rarity || 'common'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full border font-medium ${getCategoryBadgeStyle(achievement.category || '')} flex-shrink-0`}
                      >
                        {achievement.category || 'general'}
                      </span>
                      <span className="text-tertiary">
                        {new Date(
                          achievement.completedAt || achievement.awardedAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Achievement Cards */}
      <div>
        {displayedProgress.length === 0 &&
        achievementCategories.completed.length === achievements.progressToNext.length ? (
          <div className="text-center py-8 text-tertiary">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-sm font-medium">All achievements completed!</p>
            <p className="text-xs mt-1">You're a legend! 🎉</p>
          </div>
        ) : displayedProgress.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-sm font-medium">Start your journey!</p>
            <p className="text-xs mt-1">Place your first bet to begin unlocking achievements</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedProgress.map((progress) => {
              const progressPercent = Math.min(
                (progress.progress / progress.targetValue) * 100,
                100,
              );
              const isStarted = progress.progress > 0;
              const rarity = progress.rarity || 'common';

              return (
                <div
                  key={progress.id}
                  className={`p-4 rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200 ${getRarityColor(rarity)}`}
                >
                  {/* Header: Icon, Title, and Category */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`text-2xl ${getRarityGlow(rarity)} flex-shrink-0`}>
                      <div className="transform hover:scale-110 transition-transform duration-200">
                        {getCategoryIcon(progress.category)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-content leading-tight text-sm truncate">
                          {progress.title || progress.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-bold capitalize border ${getCategoryBadgeStyle(progress.category)} shadow-sm flex-shrink-0`}
                        >
                          {progress.category}
                        </span>
                      </div>
                      <p className="text-xs text-tertiary leading-tight mb-2">
                        {progress.description}
                      </p>

                      {/* Progress Info */}
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium text-content">
                          {progress.progress.toLocaleString()}/
                          {progress.targetValue.toLocaleString()}
                        </span>
                        <span className="font-bold text-content">
                          {progressPercent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${getProgressColor(progressPercent)} rounded-full h-2 transition-all duration-700 ease-out`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Messages */}
                  {progressPercent >= 90 && !progress.isCompleted && (
                    <div className="text-xs text-success font-medium flex items-center gap-1 bg-success/10 px-2 py-1 rounded border border-success/20">
                      ⚡ Almost unlocked!{' '}
                      {(progress.targetValue - progress.progress).toLocaleString()} more to go!
                    </div>
                  )}

                  {!isStarted && (
                    <div className="text-xs text-tertiary flex items-center gap-1 bg-muted/20 px-2 py-1 rounded">
                      💡{' '}
                      {progress.category === 'betting'
                        ? 'Place a bet to start progress'
                        : progress.category === 'leaderboard'
                          ? 'Win bets to climb the rankings'
                          : progress.category === 'chat'
                            ? 'Join the conversation in chat'
                            : progress.category === 'participation'
                              ? 'Stay active on the platform'
                              : 'Complete related actions to unlock'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Show More/Less Toggle */}
      {achievementCategories.upcoming.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors w-full text-center py-2 hover:bg-surface rounded-lg"
        >
          {showAll
            ? '⬆️ Show Less'
            : `⬇️ Show ${achievementCategories.upcoming.length - 3} More Achievements`}
        </button>
      )}

      {/* Overall Progress */}
      <div className="mt-4 pt-3 border-t border-muted">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-tertiary flex items-center gap-1">🏆 Overall Progress</span>
          <span className="font-semibold text-content">
            {achievementCategories.completed.length}/
            {achievements.totalAvailable || achievements.progressToNext.length}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-tertiary mb-2">
          <span>{achievementCategories.completed.length} completed</span>
          <span>{(achievements.completionRate * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-3 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(achievements.completionRate * 100, 100)}%` }}
          />
        </div>
        {achievementCategories.completed.length > 0 && (
          <div className="text-xs text-success font-medium mt-2 text-center">
            🎉 Keep it up! You're doing great!
          </div>
        )}
      </div>
    </div>
  );
});

export default AchievementProgress;
