// apps/client/src/components/dashboard/AchievementManager/BrowseView.tsx
import { memo, useState, useMemo } from 'react';
import AchievementCard from './AchievementCard';
import type { AchievementRarity } from '../../../theme/utils/achievement-colors';

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

interface FilterState {
  categories: string[];
  rarities: AchievementRarity[];
  status: ('completed' | 'in-progress' | 'locked')[];
  searchQuery: string;
}

interface BrowseViewProps {
  achievements: Achievement[];
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  sortBy: 'progress' | 'rarity' | 'category' | 'name';
  sortOrder: 'asc' | 'desc';
  onSortChange: (
    sortBy: 'progress' | 'rarity' | 'category' | 'name',
    order: 'asc' | 'desc',
  ) => void;
  pinnedAchievements: string[];
  onTogglePin: (achievementId: string) => void;
  viewMode: 'grid' | 'list';
  categoryStats: Record<string, { total: number; completed: number }>;
}

const BrowseView = memo(function BrowseView({
  achievements,
  filters,
  onFiltersChange,
  sortBy,
  sortOrder,
  onSortChange,
  pinnedAchievements,
  onTogglePin,
  viewMode,
  categoryStats,
}: BrowseViewProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);

  // Filter and sort achievements
  const filteredAndSorted = useMemo(() => {
    let filtered = achievements.filter((achievement) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText =
          `${achievement.title} ${achievement.name} ${achievement.description} ${achievement.category}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      // Category filter
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(achievement.category)) return false;
      }

      // Status filter
      const status = achievement.isCompleted
        ? 'completed'
        : achievement.progress > 0
          ? 'in-progress'
          : 'locked';

      if (!filters.status.includes(status)) return false;

      // Rarity filter
      if (filters.rarities.length > 0) {
        const rarity = achievement.rarity || 'common';
        if (!filters.rarities.includes(rarity as AchievementRarity)) return false;
      }

      return true;
    });

    // Sort achievements
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'progress':
          const aProgress = a.targetValue > 0 ? a.progress / a.targetValue : 0;
          const bProgress = b.targetValue > 0 ? b.progress / b.targetValue : 0;
          comparison = aProgress - bProgress;
          break;
        case 'rarity':
          const rarityOrder = [
            'common',
            'uncommon',
            'rare',
            'epic',
            'legendary',
            'secret',
            'shame',
          ];
          const aRarityIndex = rarityOrder.indexOf(a.rarity || 'common');
          const bRarityIndex = rarityOrder.indexOf(b.rarity || 'common');
          comparison = aRarityIndex - bRarityIndex;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'name':
          comparison = (a.title || a.name).localeCompare(b.title || b.name);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [achievements, filters, sortBy, sortOrder]);

  const handleSearch = (query: string) => {
    setSearchInput(query);
    onFiltersChange({ searchQuery: query });
  };

  const toggleRarity = (rarity: AchievementRarity) => {
    const newRarities = filters.rarities.includes(rarity)
      ? filters.rarities.filter((r) => r !== rarity)
      : [...filters.rarities, rarity];
    onFiltersChange({ rarities: newRarities });
  };

  const gridClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
      : 'space-y-3';

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search achievements..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary">
              🔍
            </div>
            {searchInput && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tertiary hover:text-content"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-tertiary">Sort by:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              onSortChange(field as any, order as 'asc' | 'desc');
            }}
            className="px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:border-primary"
          >
            <option value="progress-desc">Progress (High to Low)</option>
            <option value="progress-asc">Progress (Low to High)</option>
            <option value="rarity-desc">Rarity (Rare to Common)</option>
            <option value="rarity-asc">Rarity (Common to Rare)</option>
            <option value="category-asc">Category (A-Z)</option>
            <option value="category-desc">Category (Z-A)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Rarity Filter Chips */}
      {filters.rarities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-tertiary">Showing rarities:</span>
          {filters.rarities.map((rarity) => (
            <button
              key={rarity}
              onClick={() => toggleRarity(rarity)}
              className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              {rarity} ✕
            </button>
          ))}
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-tertiary">
          {filteredAndSorted.length} achievement{filteredAndSorted.length !== 1 ? 's' : ''} found
        </div>

        {/* Quick filter buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-tertiary">Quick filters:</span>
          <button
            onClick={() => onFiltersChange({ status: ['completed'] })}
            className="px-2 py-1 text-xs bg-success/10 text-success border border-success/20 rounded hover:bg-success/20 transition-colors"
          >
            Completed
          </button>
          <button
            onClick={() => onFiltersChange({ status: ['in-progress'] })}
            className="px-2 py-1 text-xs bg-warning/10 text-warning border border-warning/20 rounded hover:bg-warning/20 transition-colors"
          >
            In Progress
          </button>
          <button
            onClick={() => onFiltersChange({ status: ['locked'] })}
            className="px-2 py-1 text-xs bg-muted/20 text-tertiary border border-muted rounded hover:bg-muted/30 transition-colors"
          >
            Locked
          </button>
        </div>
      </div>

      {/* Achievement Grid/List */}
      {filteredAndSorted.length > 0 ? (
        <div className={gridClass}>
          {filteredAndSorted.map((achievement) => (
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
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-content mb-2">No achievements found</h3>
          <p className="text-tertiary mb-4">Try adjusting your search terms or filters</p>
          <button
            onClick={() => {
              setSearchInput('');
              onFiltersChange({
                searchQuery: '',
                categories: [],
                rarities: [],
                status: ['completed', 'in-progress', 'locked'],
              });
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
});

export default BrowseView;
