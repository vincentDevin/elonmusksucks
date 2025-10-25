import React from 'react';
import {
  DocumentDuplicateIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export interface TimelineFilter {
  contentType: ('article' | 'post' | 'all')[];
  sortBy: 'newest' | 'oldest';
  hasMedia: boolean | null;
}

interface TimelineFiltersProps {
  filters: TimelineFilter;
  onFilterChange: (filters: TimelineFilter) => void;
  onReset?: () => void;
  className?: string;
  hasSearchQuery?: boolean;
}

export const defaultFilters: TimelineFilter = {
  contentType: ['all'],
  sortBy: 'newest',
  hasMedia: null,
};

export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  className = '',
  hasSearchQuery = false,
}) => {
  const handleContentTypeToggle = (type: 'article' | 'post' | 'all') => {
    let newTypes = [...filters.contentType];

    if (type === 'all') {
      newTypes = ['all'];
    } else {
      // Remove 'all' if it exists
      newTypes = newTypes.filter((t) => t !== 'all');

      const index = newTypes.indexOf(type);
      if (index > -1) {
        newTypes.splice(index, 1);
      } else {
        newTypes.push(type);
      }

      // If no types selected, default to all
      if (newTypes.length === 0) {
        newTypes = ['all'];
      }
    }

    onFilterChange({
      ...filters,
      contentType: newTypes,
    });
  };

  const handleSortToggle = () => {
    onFilterChange({
      ...filters,
      sortBy: filters.sortBy === 'newest' ? 'oldest' : 'newest',
    });
  };

  const handleMediaToggle = () => {
    onFilterChange({
      ...filters,
      hasMedia: filters.hasMedia === true ? null : true,
    });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onFilterChange(defaultFilters);
    }
  };

  const hasActiveFilters =
    hasSearchQuery ||
    !filters.contentType.includes('all') ||
    filters.sortBy !== 'newest' ||
    filters.hasMedia !== null;

  const activeFilterCount = [
    hasSearchQuery,
    !filters.contentType.includes('all'),
    filters.sortBy !== 'newest',
    filters.hasMedia !== null,
  ].filter(Boolean).length;

  return (
    <div className={className}>
      {/* Compact Horizontal Layout */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Content Type Toggle Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleContentTypeToggle('all')}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-colors
              ${
                filters.contentType.includes('all')
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
              }
            `}
          >
            <DocumentDuplicateIcon className="w-3 h-3 inline mr-1" />
            All
          </button>
          <button
            onClick={() => handleContentTypeToggle('article')}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-colors
              ${
                filters.contentType.includes('article')
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
              }
            `}
          >
            Articles
          </button>
          <button
            onClick={() => handleContentTypeToggle('post')}
            className={`
              px-2 py-1 rounded text-xs font-medium transition-colors
              ${
                filters.contentType.includes('post')
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
              }
            `}
          >
            Posts
          </button>
        </div>

        <div className="h-5 w-px bg-border/50" />

        {/* Sort Toggle */}
        <button
          onClick={handleSortToggle}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-colors
            flex items-center gap-1
            ${
              filters.sortBy !== 'newest'
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
            }
          `}
        >
          {filters.sortBy === 'newest' ? (
            <ArrowDownIcon className="w-3 h-3" />
          ) : (
            <ArrowUpIcon className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">
            {filters.sortBy === 'newest' ? 'Newest' : 'Oldest'}
          </span>
        </button>

        <div className="h-4 w-px bg-border/50 hidden sm:block" />

        {/* Media Toggle */}
        <button
          onClick={handleMediaToggle}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-colors
            flex items-center gap-1
            ${
              filters.hasMedia === true
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
            }
          `}
        >
          <PhotoIcon className="w-3 h-3" />
          <span className="hidden sm:inline">Media</span>
        </button>

        {/* Reset Button */}
        <div className="h-4 w-px bg-border/50 hidden sm:block" />
        <button
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-colors
            flex items-center gap-1
            ${
              hasActiveFilters
                ? 'bg-error/10 text-error border border-error/30 hover:bg-error/20 hover:border-error/50'
                : 'bg-surface/50 border border-border/50 text-content/30 cursor-not-allowed opacity-50'
            }
          `}
        >
          <XMarkIcon className="w-3 h-3" />
          <span className="hidden sm:inline">
            {hasActiveFilters ? `(${activeFilterCount})` : 'Clear'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default TimelineFilters;
