import React, { useState } from 'react';

interface PredictionFiltersProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedCreator: string;
  onCreatorChange: (value: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  className?: string;
}

const PredictionFilters: React.FC<PredictionFiltersProps> = ({
  searchText,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedCreator,
  onCreatorChange,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    'Politics',
    'Sports',
    'Technology',
    'Entertainment',
    'Economics',
    'Science',
    'Crypto',
    'Climate',
    'Health',
    'Other',
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'title', label: 'Title' },
    { value: 'category', label: 'Category' },
    { value: 'analytics.totalBets', label: 'Total Bets' },
    { value: 'analytics.totalVolume', label: 'Volume' },
    { value: 'analytics.controversyScore', label: 'Controversy' },
    { value: 'analytics.popularityScore', label: 'Popularity' },
  ];

  const hasActiveFilters = selectedCategory || selectedCreator || dateRange.start || dateRange.end;

  return (
    <div className={`bg-surface rounded-lg border border-muted ${className}`}>
      {/* Main Search Bar */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-tertiary text-sm">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search predictions by title, description, or creator..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium
              ${
                isExpanded
                  ? 'bg-primary text-white border-primary'
                  : hasActiveFilters
                    ? 'bg-warning/10 text-warning border-warning/30'
                    : 'bg-surface text-tertiary border-muted hover:border-primary hover:text-content'
              }
            `}
          >
            <span>⚙️</span>
            <span className="hidden sm:inline">{isExpanded ? 'Hide Filters' : 'Advanced'}</span>
            {hasActiveFilters && !isExpanded && (
              <span className="bg-warning text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {
                  [selectedCategory, selectedCreator, dateRange.start, dateRange.end].filter(
                    Boolean,
                  ).length
                }
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
              title="Clear all filters"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-muted p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Creator Filter */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">Creator</label>
              <input
                type="text"
                placeholder="Filter by creator name..."
                value={selectedCreator}
                onChange={(e) => onCreatorChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-muted">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg text-content focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-2">Sort Order</label>
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => onSortOrderChange('desc')}
                  className={`
                    flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors
                    ${
                      sortOrder === 'desc'
                        ? 'bg-primary text-white'
                        : 'text-tertiary hover:text-content'
                    }
                  `}
                >
                  ⬇️ Newest First
                </button>
                <button
                  onClick={() => onSortOrderChange('asc')}
                  className={`
                    flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors
                    ${
                      sortOrder === 'asc'
                        ? 'bg-primary text-white'
                        : 'text-tertiary hover:text-content'
                    }
                  `}
                >
                  ⬆️ Oldest First
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-muted">
            <span className="text-sm text-tertiary font-medium">Quick Filters:</span>
            <button
              onClick={() =>
                onDateRangeChange({
                  start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end: '',
                })
              }
              className="px-3 py-1 text-xs bg-muted hover:bg-primary hover:text-white rounded-full transition-colors"
            >
              Last 24h
            </button>
            <button
              onClick={() =>
                onDateRangeChange({
                  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end: '',
                })
              }
              className="px-3 py-1 text-xs bg-muted hover:bg-primary hover:text-white rounded-full transition-colors"
            >
              Last Week
            </button>
            <button
              onClick={() =>
                onDateRangeChange({
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                  end: '',
                })
              }
              className="px-3 py-1 text-xs bg-muted hover:bg-primary hover:text-white rounded-full transition-colors"
            >
              Last Month
            </button>
            <button
              onClick={() => onCategoryChange('Politics')}
              className="px-3 py-1 text-xs bg-muted hover:bg-primary hover:text-white rounded-full transition-colors"
            >
              Politics Only
            </button>
            <button
              onClick={() => onSortChange('analytics.totalBets')}
              className="px-3 py-1 text-xs bg-muted hover:bg-primary hover:text-white rounded-full transition-colors"
            >
              Most Popular
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionFilters;
