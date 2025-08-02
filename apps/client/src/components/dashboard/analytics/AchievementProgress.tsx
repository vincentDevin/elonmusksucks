// apps/client/src/components/dashboard/analytics/AchievementProgress.tsx
import { useState } from 'react';
import type { EnhancedUserStats } from '../../../hooks/useEnhancedUserStats';

interface AchievementProgressProps {
  stats: EnhancedUserStats;
  className?: string;
}

export default function AchievementProgress({ stats, className = '' }: AchievementProgressProps) {
  const [showAll, setShowAll] = useState(false);
  const { achievements } = stats;

  const displayedProgress = showAll
    ? achievements.progressToNext
    : achievements.progressToNext.slice(0, 3);

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-orange-500';
    return 'bg-primary';
  };

  const getCategoryIcon = (id: string) => {
    if (id.includes('rank')) return '🏆';
    if (id.includes('streak')) return '🔥';
    if (id.includes('profit')) return '💰';
    if (id.includes('volume')) return '📊';
    if (id.includes('prediction')) return '🎯';
    return '🏅';
  };

  return (
    <div className={`bg-background/50 rounded-xl p-4 border border-muted ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-content flex items-center">🏅 Achievement Progress</h3>
        <div className="text-sm text-tertiary">{achievements.totalBadges} earned</div>
      </div>

      {/* Recent Badges */}
      {achievements.recentBadges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-content mb-2">Recent Badges</h4>
          <div className="flex space-x-2">
            {achievements.recentBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center p-2 bg-surface rounded-lg border border-muted min-w-[60px]"
                title={badge.description}
              >
                <div className="text-lg mb-1">🏅</div>
                <div className="text-xs text-center text-tertiary font-medium leading-tight">
                  {badge.name.split(' ').slice(0, 2).join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-3">
        {displayedProgress.length === 0 ? (
          <div className="text-center py-4 text-tertiary">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-sm">All achievements completed!</p>
          </div>
        ) : (
          displayedProgress.map((progress) => {
            const progressPercent = (progress.progress / progress.target) * 100;

            return (
              <div key={progress.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCategoryIcon(progress.id)}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-content">{progress.title}</div>
                      <div className="text-xs text-tertiary">{progress.description}</div>
                    </div>
                  </div>
                  <div className="text-sm text-tertiary">
                    {progress.progress}/{progress.target}
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`${getProgressColor(progressPercent)} rounded-full h-2 transition-all duration-500`}
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>

                {progressPercent >= 90 && !progress.isCompleted && (
                  <div className="text-xs text-green-500 font-medium">
                    🎉 Almost there! Just {progress.target - progress.progress} more to go!
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Show More/Less Toggle */}
      {achievements.progressToNext.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors w-full text-center"
        >
          {showAll ? 'Show Less' : `Show ${achievements.progressToNext.length - 3} More`}
        </button>
      )}

      {/* Overall Progress */}
      <div className="mt-4 pt-3 border-t border-muted">
        <div className="flex items-center justify-between text-sm">
          <span className="text-tertiary">Overall Completion</span>
          <span className="font-medium text-content">
            {(achievements.completionRate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="mt-2 w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${achievements.completionRate * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
