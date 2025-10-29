import { useState, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAchievements } from '../../contexts/AchievementContext';
import type { ComponentAchievement } from '../../utils/achievementDataTransform';
import AchievementCard from '../achievements/AchievementCard';

interface ProfileAchievementsProps {
  achievements?: ComponentAchievement[];
  embedded?: boolean;
}

function ProfileAchievementsComponent({
  achievements: propAchievements,
  embedded = false,
}: ProfileAchievementsProps) {
  const { achievements, loading } = useAchievements();

  const [expanded, setExpanded] = useState(false);
  const [pinnedAchievementId, setPinnedAchievementId] = useState<string | null>(null);

  // Create merged achievement data (like AchievementManager does)
  const mergedAchievements = useMemo(() => {
    const contextAchievements = achievements || [];

    // ALWAYS use context achievements if they're available and complete
    // The context has the full data with user progress (130 items vs 22 props)
    if (contextAchievements.length > (propAchievements?.length || 0)) {
      // Context has more complete data, use it
      return contextAchievements;
    }

    if (!propAchievements) {
      // No props, use context
      return contextAchievements;
    }

    // Other user profile - merge context achievements with their progress from props
    return contextAchievements.map((contextAch) => {
      const userProgress = propAchievements.find(
        (p) => (p.achievementId || p.id) === (contextAch.achievementId || contextAch.id),
      );

      if (userProgress) {
        // User has this achievement with their progress
        return userProgress;
      } else {
        // User doesn't have progress on this achievement - show as locked
        return {
          ...contextAch,
          isCompleted: false,
          progress: 0,
          completedAt: undefined,
        };
      }
    });
  }, [achievements, propAchievements]);

  // Use merged data for both display and stats
  const displayAchievements = mergedAchievements;

  // Calculate stats using the merged achievement data
  const stats = useMemo(() => {
    const categoryStats: Record<string, { total: number; completed: number }> = {};
    const rarityStats: Record<string, { total: number; completed: number }> = {};

    mergedAchievements.forEach((achievement) => {
      const category = achievement.category || 'general';
      const rarity = achievement.rarity;

      // Category stats
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, completed: 0 };
      }
      categoryStats[category].total++;
      if (achievement.isCompleted) {
        categoryStats[category].completed++;
      }

      // Rarity stats
      if (!rarityStats[rarity]) {
        rarityStats[rarity] = { total: 0, completed: 0 };
      }
      rarityStats[rarity].total++;
      if (achievement.isCompleted) {
        rarityStats[rarity].completed++;
      }
    });

    // Find rarest completed achievement
    const completedAchievements = mergedAchievements.filter((a) => a.isCompleted);
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret', 'shame'];
    const rarestAchievement = completedAchievements.sort((a, b) => {
      const aRarityIndex = rarityOrder.indexOf(a.rarity);
      const bRarityIndex = rarityOrder.indexOf(b.rarity);
      return bRarityIndex - aRarityIndex;
    })[0];

    return { categoryStats, rarityStats, rarestAchievement };
  }, [mergedAchievements]);

  const displayAchievement = useMemo(() => {
    const completedAchievements = displayAchievements.filter((a) => a.isCompleted);

    if (pinnedAchievementId) {
      const pinned = completedAchievements.find((a) => a.id === pinnedAchievementId);
      if (pinned) return pinned;
    }

    return stats.rarestAchievement || completedAchievements[0] || null;
  }, [displayAchievements, pinnedAchievementId, stats.rarestAchievement]);

  // Memoize sorted completed achievements for virtualized list
  const sortedCompletedAchievements = useMemo(() => {
    return displayAchievements
      .filter((a) => a.isCompleted)
      .sort((a, b) => {
        const rarityOrder = { legendary: 0, rare: 1, uncommon: 2, common: 3, shame: 4 };
        const aRarity = rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 5;
        const bRarity = rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 5;
        if (aRarity !== bRarity) return aRarity - bRarity;
        return new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime();
      });
  }, [displayAchievements]);

  if (loading && !propAchievements) {
    return (
      <div
        className={`${embedded ? '' : 'bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg'}`}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-tertiary">Loading achievements...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? '' : 'bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-content flex items-center gap-2">
          🏆 Achievements
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <span className="text-sm font-medium">{expanded ? 'Collapse' : 'Expand'}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Overall Progress (like AchievementManager) */}
      <div className="bg-background/50 rounded-lg p-4 border border-muted mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-content">Overall Progress</span>
          <span className="text-lg font-bold text-primary">
            {Math.round(
              (displayAchievements.filter((a) => a.isCompleted).length /
                Math.max(displayAchievements.length, 1)) *
                100,
            )}
            %
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-2 transition-all duration-700"
            style={{
              width: `${(displayAchievements.filter((a) => a.isCompleted).length / Math.max(displayAchievements.length, 1)) * 100}%`,
            }}
          />
        </div>
        <div className="text-xs text-tertiary text-center">
          {displayAchievements.filter((a) => a.isCompleted).length} of {displayAchievements.length}{' '}
          achievements unlocked
        </div>
      </div>

      {/* Rarity Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {['legendary', 'rare', 'uncommon', 'common'].map((rarity) => {
          const rarityData = stats.rarityStats[rarity] || { total: 0, completed: 0 };
          const colors = {
            legendary: 'text-amber-500',
            rare: 'text-purple-500',
            uncommon: 'text-blue-500',
            common: 'text-gray-500',
          };
          const icons = {
            legendary: '🏆',
            rare: '💎',
            uncommon: '⭐',
            common: '📖',
          };

          return (
            <div
              key={rarity}
              className="text-center bg-background/50 rounded-lg p-3 border border-muted"
            >
              <div className={`text-lg font-bold ${colors[rarity as keyof typeof colors]}`}>
                {rarityData.completed}/{rarityData.total}
              </div>
              <div className="text-xs text-tertiary">
                {icons[rarity as keyof typeof icons]}{' '}
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Featured Achievement - collapsed view */}
      {!expanded && displayAchievement && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-tertiary flex items-center gap-1">
              <span>{pinnedAchievementId ? '📌' : '✨'}</span>
              {pinnedAchievementId ? 'Pinned Achievement' : 'Featured Achievement'}
            </h4>
            {pinnedAchievementId && (
              <button
                onClick={() => setPinnedAchievementId(null)}
                className="text-xs text-tertiary hover:text-content transition-colors"
              >
                Unpin
              </button>
            )}
          </div>
          <AchievementCard
            achievement={displayAchievement}
            viewMode="list"
            isRecent={!pinnedAchievementId}
            showProgress={false}
            onTogglePin={(achievementId) => {
              setPinnedAchievementId(pinnedAchievementId === achievementId ? null : achievementId);
            }}
            isPinned={pinnedAchievementId === displayAchievement.id}
          />
        </div>
      )}

      {/* Expanded view - unlocked achievements only with virtualization */}
      {expanded && (
        <>
          {sortedCompletedAchievements.length > 0 ? (
            <List
              height={Math.min(sortedCompletedAchievements.length * 100, 600)}
              itemCount={sortedCompletedAchievements.length}
              itemSize={100}
              width="100%"
              itemData={{
                achievements: sortedCompletedAchievements,
                pinnedAchievementId,
                setPinnedAchievementId,
              }}
            >
              {({ index, style, data }) => {
                const achievement = data.achievements[index];
                return (
                  <div style={style} className="pb-3">
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      viewMode="list"
                      showProgress={false}
                      onTogglePin={(achievementId) => {
                        data.setPinnedAchievementId(
                          data.pinnedAchievementId === achievementId ? null : achievementId,
                        );
                      }}
                      isPinned={data.pinnedAchievementId === achievement.id}
                    />
                  </div>
                );
              }}
            </List>
          ) : (
            <div className="text-center py-8 text-tertiary">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-sm font-medium">No achievements unlocked yet</p>
              <p className="text-xs mt-1">Start engaging to unlock your first achievements!</p>
            </div>
          )}
        </>
      )}

      {/* Empty state for collapsed view */}
      {!expanded && !displayAchievement && displayAchievements.length === 0 && (
        <div className="text-center py-6 text-tertiary">
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm font-medium">No achievements unlocked yet</p>
          <p className="text-xs mt-1">Start betting and engaging to earn achievements!</p>
        </div>
      )}
    </div>
  );
}

// Memoize to prevent expensive re-calculations of 130+ achievements
// Only re-render if achievements array actually changes (by reference)
export const ProfileAchievements = memo(ProfileAchievementsComponent, (prevProps, nextProps) => {
  return (
    prevProps.achievements === nextProps.achievements && prevProps.embedded === nextProps.embedded
  );
});
