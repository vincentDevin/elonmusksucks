// apps/client/src/components/dashboard/analytics/AchievementProgress.tsx
import { useState, memo, useMemo } from 'react';
import { useAchievements } from '../../../contexts/AchievementContext';

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
        return 'border-l-accent bg-surface border border-muted';
      case 'rare':
        return 'border-l-primary bg-surface border border-muted';
      case 'uncommon':
        return 'border-l-success bg-surface border border-muted';
      case 'secret':
        return 'border-l-info bg-surface border border-muted';
      case 'shame':
        return 'border-l-error bg-surface border border-muted';
      default:
        return 'border-l-muted bg-surface border border-muted';
    }
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
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
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
                className={`p-3 rounded-lg border-l-4 ${getRarityColor('common')} hover:shadow-sm transition-shadow`}
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
                          common
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
                  <div className="text-xs text-success font-medium mt-2 flex items-center gap-1">
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
          <div className="text-xs text-success font-medium mt-2 text-center">
            🎉 Keep it up! You're doing great!
          </div>
        )}
      </div>
    </div>
  );
});

export default AchievementProgress;
