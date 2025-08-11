// apps/client/src/components/dashboard/analytics/AchievementProgress.tsx
import { useState, memo, useMemo } from 'react';
import type { EnhancedUserStats } from '../../../hooks/useEnhancedUserStats';

interface AchievementProgressProps {
  stats: EnhancedUserStats;
  className?: string;
}

const AchievementProgress = memo(function AchievementProgress({
  stats,
  className = '',
}: AchievementProgressProps) {
  const [showAll, setShowAll] = useState(false);
  const { achievements } = stats;

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
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-orange-500';
    return 'bg-primary';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'betting':
        return '💰';
      case 'leaderboard':
        return '🏆';
      case 'chat':
        return '💬';
      case 'participation':
        return '🎯';
      case 'secret':
        return '🔮';
      case 'shame':
        return '😱';
      default:
        return '🏅';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'border-l-purple-500 bg-purple-50/50';
      case 'rare':
        return 'border-l-blue-500 bg-blue-50/50';
      case 'uncommon':
        return 'border-l-green-500 bg-green-50/50';
      case 'secret':
        return 'border-l-indigo-500 bg-indigo-50/50';
      case 'shame':
        return 'border-l-red-500 bg-red-50/50';
      default:
        return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  return (
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-content flex items-center">🏅 Achievement Progress</h3>
        <div className="text-sm text-tertiary">{achievements.totalBadges} earned</div>
      </div>

      {/* Recent Achievements */}
      {achievements.recentBadges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-content mb-2">🎉 Recently Unlocked</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {achievements.recentBadges.map((achievement: any) => (
              <div
                key={achievement.id}
                className={`flex flex-col items-center p-3 rounded-lg border-l-4 min-w-[80px] flex-shrink-0 ${getRarityColor(achievement.rarity || 'common')}`}
                title={achievement.description}
              >
                <div className="text-xl mb-1">{getCategoryIcon(achievement.category || '')}</div>
                <div className="text-xs text-center text-content font-medium leading-tight">
                  {achievement.title?.split(' ').slice(0, 2).join(' ') ||
                    achievement.name?.split(' ').slice(0, 2).join(' ')}
                </div>
                <div className="text-xs text-tertiary mt-1">
                  {new Date(achievement.completedAt || achievement.awardedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-3">
        {displayedProgress.length === 0 &&
        achievementCategories.completed.length === achievements.progressToNext.length ? (
          <div className="text-center py-6 text-tertiary">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-medium">All achievements completed!</p>
            <p className="text-xs mt-1">You're a legend! 🎉</p>
          </div>
        ) : displayedProgress.length === 0 ? (
          <div className="text-center py-6 text-tertiary">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm font-medium">Start your journey!</p>
            <p className="text-xs mt-1">Place your first bet to begin unlocking achievements</p>
          </div>
        ) : (
          displayedProgress.map((progress) => {
            const progressPercent = Math.min((progress.progress / progress.targetValue) * 100, 100);
            const isStarted = progress.progress > 0;

            return (
              <div
                key={progress.id}
                className={`p-3 rounded-lg border-l-4 ${getRarityColor(progress.achievement?.rarity || 'common')} hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getCategoryIcon(progress.category)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-content">
                        {progress.title || progress.name}
                      </div>
                      <div className="text-xs text-tertiary mt-1">{progress.description}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-surface rounded-full border text-tertiary capitalize">
                          {progress.achievement?.rarity || 'common'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-surface rounded-full border text-tertiary capitalize">
                          {progress.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-content">
                      {progress.progress.toLocaleString()}/{progress.targetValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-tertiary mt-1">{progressPercent.toFixed(0)}%</div>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`${getProgressColor(progressPercent)} rounded-full h-2 transition-all duration-700 ease-out`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {progressPercent >= 90 && !progress.isCompleted && (
                  <div className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                    ⚡ Almost unlocked!{' '}
                    {(progress.targetValue - progress.progress).toLocaleString()} more to go!
                  </div>
                )}

                {!isStarted && (
                  <div className="text-xs text-tertiary mt-2 flex items-center gap-1">
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
          })
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
          <div className="text-xs text-green-600 font-medium mt-2 text-center">
            🎉 Keep it up! You're doing great!
          </div>
        )}
      </div>
    </div>
  );
});

export default AchievementProgress;
