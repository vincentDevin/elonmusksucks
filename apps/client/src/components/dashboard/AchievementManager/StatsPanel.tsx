// apps/client/src/components/dashboard/AchievementManager/StatsPanel.tsx
import { memo } from 'react';
import type { AchievementRarity } from '../../../theme/utils/achievement-colors';

interface FilterState {
  categories: string[];
  rarities: AchievementRarity[];
  status: ('completed' | 'in-progress' | 'locked')[];
  searchQuery: string;
}

interface StatsPanelProps {
  totalBadges: number;
  totalAvailable: number;
  completionRate: number;
  categoryStats: Record<string, { total: number; completed: number }>;
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
}

const StatsPanel = memo(function StatsPanel({
  totalBadges,
  totalAvailable,
  completionRate,
  categoryStats,
  filters,
  onFiltersChange,
}: StatsPanelProps) {
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

  const toggleStatus = (status: 'completed' | 'in-progress' | 'locked') => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ status: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Compact Overall Stats */}
      <div className="bg-background/50 rounded-lg p-3 border border-muted">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-content text-sm">📊 Progress</h3>
          <span className="font-bold text-primary text-sm">
            {(completionRate * 100).toFixed(0)}%
          </span>
        </div>

        <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-2 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(completionRate * 100, 100)}%` }}
          />
        </div>

        <div className="text-xs text-tertiary text-center">
          {totalBadges} of {totalAvailable} unlocked
        </div>
      </div>

      {/* Compact Status Filter */}
      <div className="bg-background/50 rounded-lg p-3 border border-muted">
        <h3 className="font-semibold text-content mb-2 text-sm">🔍 Show</h3>
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'completed', label: 'Done', icon: '✅' },
            { key: 'in-progress', label: 'Active', icon: '⏳' },
            { key: 'locked', label: 'Locked', icon: '🔒' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => toggleStatus(key as any)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                filters.status.includes(key as any)
                  ? 'bg-primary text-white'
                  : 'bg-surface text-tertiary hover:text-content hover:bg-background'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Category Filter */}
      <div className="bg-background/50 rounded-lg p-3 border border-muted">
        <h3 className="font-semibold text-content mb-2 text-sm">🏷️ Categories</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {Object.entries(categoryStats).map(([category, stats]) => {
            const isSelected =
              filters.categories.length === 0 || filters.categories.includes(category);
            const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-surface hover:bg-background border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm">{categoryIcons[category] || '🏅'}</span>
                    <span className="text-xs font-medium text-content capitalize truncate">
                      {category}
                    </span>
                  </div>
                  <span className="text-xs text-tertiary ml-2">
                    {stats.completed}/{stats.total}
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="w-full bg-muted rounded-full h-0.5 mt-1 overflow-hidden">
                  <div
                    className="bg-primary rounded-full h-0.5 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.categories.length > 0 || filters.status.length < 3) && (
        <button
          onClick={() =>
            onFiltersChange({
              categories: [],
              status: ['completed', 'in-progress', 'locked'],
            })
          }
          className="w-full p-2 text-xs text-tertiary hover:text-content bg-surface hover:bg-background rounded-lg border border-muted transition-colors"
        >
          🗑️ Clear Filters
        </button>
      )}
    </div>
  );
});

export default StatsPanel;
