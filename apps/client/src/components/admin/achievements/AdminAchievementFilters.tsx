import React from 'react';
import type { AchievementWithStats } from '../../../api/admin';

interface AdminAchievementFiltersProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedRarity: string;
  onRarityChange: (value: string) => void;
  showActiveOnly: boolean;
  onActiveOnlyChange: (value: boolean) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  achievements: AchievementWithStats[];
  className?: string;
}

const AdminAchievementFilters: React.FC<AdminAchievementFiltersProps> = ({
  searchText,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedRarity,
  onRarityChange,
  showActiveOnly,
  onActiveOnlyChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters,
  achievements,
  className = '',
}) => {
  // Extract unique categories and rarities from achievements
  const categories = [...new Set(achievements.map((a) => a.category).filter(Boolean))].sort();
  const rarities = [...new Set(achievements.map((a) => a.rarity).filter(Boolean))].sort();

  const hasActiveFilters = searchText || selectedCategory || selectedRarity || showActiveOnly;

  return (
    <div className={`bg-surface rounded-lg border border-muted p-4 ${className}`}>
      <div className="space-y-4">
        {/* Search and Primary Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search achievements..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-background border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-tertiary">
              🔍
            </div>
            {searchText && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-tertiary hover:text-content transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          {/* Rarity Filter */}
          <select
            value={selectedRarity}
            onChange={(e) => onRarityChange(e.target.value)}
            className="px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          >
            <option value="">All Rarities</option>
            {rarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              onSortChange(field);
              onSortOrderChange(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="category-asc">Category (A-Z)</option>
            <option value="rarity-asc">Rarity (Low-High)</option>
            <option value="totalUnlocks-desc">Most Unlocked</option>
            <option value="totalUnlocks-asc">Least Unlocked</option>
          </select>
        </div>

        {/* Secondary Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Active Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => onActiveOnlyChange(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm text-content">Active only</span>
            </label>

            {/* Filter Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-tertiary">
                <span>Filters applied:</span>
                {searchText && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    Search: "{searchText}"
                  </span>
                )}
                {selectedCategory && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    Category: {selectedCategory}
                  </span>
                )}
                {selectedRarity && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    Rarity: {selectedRarity}
                  </span>
                )}
                {showActiveOnly && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                    Active only
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-1 text-sm text-tertiary hover:text-content border border-muted hover:border-primary rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-content">Quick filters:</span>

          {/* Rarity Quick Filters */}
          {['common', 'rare', 'epic', 'legendary'].map((rarity) => {
            const count = achievements.filter((a) => a.rarity === rarity).length;
            if (count === 0) return null;

            return (
              <button
                key={rarity}
                onClick={() => onRarityChange(selectedRarity === rarity ? '' : rarity)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedRarity === rarity
                    ? 'bg-primary text-white'
                    : 'bg-background text-tertiary border border-muted hover:text-content hover:border-primary'
                }`}
              >
                {rarity} ({count})
              </button>
            );
          })}

          {/* Status Quick Filters */}
          <button
            onClick={() => onActiveOnlyChange(!showActiveOnly)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              showActiveOnly
                ? 'bg-success text-white'
                : 'bg-background text-tertiary border border-muted hover:text-content hover:border-primary'
            }`}
          >
            Active ({achievements.filter((a) => a.isActive).length})
          </button>

          <button
            onClick={() => onActiveOnlyChange(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !showActiveOnly && !selectedCategory && !selectedRarity && !searchText
                ? 'bg-primary text-white'
                : 'bg-background text-tertiary border border-muted hover:text-content hover:border-primary'
            }`}
          >
            All ({achievements.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAchievementFilters;
