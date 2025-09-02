// apps/client/src/components/dashboard/AchievementManager/ProgressView.tsx
import { memo } from 'react';
import AchievementCard from './AchievementCard';

interface Achievement {
  id: string;
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity?: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

interface RecentAchievement {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  iconUrl?: string | null;
  completedAt: string;
}

interface AchievementCategories {
  completed: Achievement[];
  inProgress: Achievement[];
  locked: Achievement[];
  all: Achievement[];
}

interface FilterState {
  categories: string[];
  rarities: any[];
  status: ('completed' | 'in-progress' | 'locked')[];
  searchQuery: string;
}

interface ProgressViewProps {
  achievements: AchievementCategories;
  recentAchievements: RecentAchievement[];
  pinnedAchievements: string[];
  onTogglePin: (achievementId: string) => void;
  viewMode: 'grid' | 'list';
  categoryStats: Record<string, { total: number; completed: number }>;
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
}

const ProgressView = memo(function ProgressView({
  achievements,
  recentAchievements,
  pinnedAchievements,
  onTogglePin,
  viewMode,
  categoryStats,
  filters,
  onFiltersChange,
}: ProgressViewProps) {
  const pinnedItems = achievements.all.filter((a) => pinnedAchievements.includes(a.id.toString()));

  const closeToCompletion = achievements.inProgress
    .filter((a) => a.progress / a.targetValue >= 0.75)
    .sort((a, b) => b.progress / b.targetValue - a.progress / a.targetValue)
    .slice(0, 6);

  const recentlyStarted = achievements.inProgress
    .filter((a) => a.progress / a.targetValue < 0.25 && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);

  const gridClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
      : 'space-y-3';

  const categoryIcons: Record<string, string> = {
    betting: '🎯',
    pong: '🏓',
    leaderboard: '🏆',
    chat: '💬',
    prediction: '🔮',
    participation: '👥',
    event: '🎉',
    secret: '🔒',
    shame: '💀',
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ categories: newCategories });
  };

  return (
    <div className="space-y-6">
      {/* Quick Category Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-content">Filter by category:</span>
        <button
          onClick={() => onFiltersChange({ categories: [] })}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            filters.categories.length === 0
              ? 'bg-primary text-white border-primary'
              : 'bg-background text-tertiary border-muted hover:text-content'
          }`}
        >
          All
        </button>
        {Object.entries(categoryStats).map(([category, stats]) => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filters.categories.includes(category)
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-tertiary border-muted hover:text-content'
            }`}
          >
            <span>{categoryIcons[category] || '🏅'}</span>
            <span className="capitalize">{category}</span>
            <span className="text-xs opacity-75">
              ({stats.completed}/{stats.total})
            </span>
          </button>
        ))}
      </div>
      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-content mb-4 flex items-center">
            🎉 Recently Unlocked
            <span className="ml-2 text-sm font-normal text-tertiary">
              ({recentAchievements.length} this week)
            </span>
          </h2>
          <div className={gridClass}>
            {recentAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                viewMode={viewMode}
                isRecent={true}
                isPinned={false}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pinned Achievements */}
      {pinnedItems.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-content mb-4 flex items-center">
            📌 Pinned Goals
            <span className="ml-2 text-sm font-normal text-tertiary">({pinnedItems.length}/5)</span>
          </h2>
          <div className={gridClass}>
            {pinnedItems.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                viewMode={viewMode}
                isPinned={true}
                onTogglePin={onTogglePin}
                showProgress={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Close to Completion */}
      {closeToCompletion.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-content mb-4 flex items-center">
            ⚡ Close to Completion
            <span className="ml-2 text-sm font-normal text-tertiary">(75%+ progress)</span>
          </h2>
          <div className={gridClass}>
            {closeToCompletion.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                viewMode={viewMode}
                isPinned={pinnedAchievements.includes(achievement.id.toString())}
                onTogglePin={onTogglePin}
                showProgress={true}
                highlightProgress={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Started */}
      {recentlyStarted.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-content mb-4 flex items-center">
            🚀 Recently Started
            <span className="ml-2 text-sm font-normal text-tertiary">(new progress)</span>
          </h2>
          <div className={gridClass}>
            {recentlyStarted.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                viewMode={viewMode}
                isPinned={pinnedAchievements.includes(achievement.id.toString())}
                onTogglePin={onTogglePin}
                showProgress={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {recentAchievements.length === 0 &&
        pinnedItems.length === 0 &&
        closeToCompletion.length === 0 &&
        recentlyStarted.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-content mb-2">Start Your Journey!</h3>
            <p className="text-tertiary mb-6 max-w-md mx-auto">
              Begin participating in activities to unlock achievements and track your progress.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
              <div className="bg-background/50 rounded-lg p-3 border border-muted">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-medium text-content">Place Bets</div>
                <div className="text-tertiary">Start betting to unlock betting achievements</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-muted">
                <div className="text-2xl mb-2">🏓</div>
                <div className="font-medium text-content">Play Pong</div>
                <div className="text-tertiary">Win matches to earn gaming achievements</div>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-muted">
                <div className="text-2xl mb-2">💬</div>
                <div className="font-medium text-content">Join Chat</div>
                <div className="text-tertiary">Participate in community discussions</div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
});

export default ProgressView;
