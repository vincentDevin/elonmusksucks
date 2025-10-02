import React, { useState, useCallback } from 'react';
import {
  FunnelIcon,
  CalendarIcon,
  FireIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

export interface TimelineFilter {
  dateRange: {
    start: Date | null;
    end: Date | null;
    preset?: 'today' | 'week' | 'month' | 'year' | 'all';
  };
  contentType: ('article' | 'post' | 'all')[];
  sources: string[];
  authors: string[];
  engagementLevel: 'all' | 'low' | 'medium' | 'high' | 'viral';
  sortBy: 'recent' | 'popular' | 'trending' | 'controversial';
  hasMedia: boolean | null;
  hasReactions: boolean | null;
}

interface TimelineFiltersProps {
  filters: TimelineFilter;
  onFilterChange: (filters: TimelineFilter) => void;
  onReset?: () => void;
  className?: string;
  compact?: boolean;
}

const defaultFilters: TimelineFilter = {
  dateRange: { start: null, end: null, preset: 'all' },
  contentType: ['all'],
  sources: [],
  authors: [],
  engagementLevel: 'all',
  sortBy: 'recent',
  hasMedia: null,
  hasReactions: null,
};

export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  className = '',
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  const engagementLevels = [
    { value: 'all', label: 'All Engagement', icon: null },
    { value: 'low', label: 'Low (0-50)', icon: null },
    { value: 'medium', label: 'Medium (50-200)', icon: null },
    { value: 'high', label: 'High (200-1000)', icon: <FireIcon className="w-4 h-4" /> },
    { value: 'viral', label: 'Viral (1000+)', icon: <FireIcon className="w-4 h-4 text-error" /> },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'trending', label: 'Trending' },
    { value: 'controversial', label: 'Most Discussed' },
  ];

  const handleDatePresetChange = useCallback(
    (preset: string) => {
      let start: Date | null = null;
      let end: Date | null = new Date();

      switch (preset) {
        case 'today':
          start = new Date();
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start = new Date();
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start = new Date();
          start.setMonth(start.getMonth() - 1);
          break;
        case 'year':
          start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          break;
        case 'all':
        default:
          start = null;
          end = null;
      }

      onFilterChange({
        ...filters,
        dateRange: { start, end, preset: preset as any },
      });
    },
    [filters, onFilterChange],
  );

  const handleContentTypeToggle = useCallback(
    (type: 'article' | 'post' | 'all') => {
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
    },
    [filters, onFilterChange],
  );

  const handleEngagementChange = useCallback(
    (level: string) => {
      onFilterChange({
        ...filters,
        engagementLevel: level as any,
      });
      setActiveDropdown(null);
    },
    [filters, onFilterChange],
  );

  const handleSortChange = useCallback(
    (sortBy: string) => {
      onFilterChange({
        ...filters,
        sortBy: sortBy as any,
      });
      setActiveDropdown(null);
    },
    [filters, onFilterChange],
  );

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    } else {
      onFilterChange(defaultFilters);
    }
  }, [onFilterChange, onReset]);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const hasActiveFilters =
    filters.dateRange.preset !== 'all' ||
    !filters.contentType.includes('all') ||
    filters.sources.length > 0 ||
    filters.authors.length > 0 ||
    filters.engagementLevel !== 'all' ||
    filters.sortBy !== 'recent' ||
    filters.hasMedia !== null ||
    filters.hasReactions !== null;

  const FilterButton: React.FC<{
    label: string;
    icon?: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    dropdown?: React.ReactNode;
    dropdownId?: string;
  }> = ({ label, icon, active, onClick, dropdown, dropdownId }) => (
    <div className="relative">
      <button
        onClick={onClick}
        className={`
          px-3 py-1.5 rounded-lg border text-sm font-medium
          transition-all duration-200 flex items-center space-x-2
          ${
            active
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-surface border-border text-content hover:bg-primary/10 hover:border-primary/50'
          }
        `}
      >
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        {dropdown && (
          <ChevronDownIcon
            className={`w-3 h-3 transition-transform ${
              activeDropdown === dropdownId ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {dropdown && activeDropdown === dropdownId && (
        <div
          className="absolute z-50 mt-2 bg-surface border border-border rounded-lg
                        shadow-lg min-w-[200px] max-h-[300px] overflow-y-auto"
        >
          {dropdown}
        </div>
      )}
    </div>
  );

  return (
    <div className={`${className}`}>
      {/* Compact Header */}
      {compact && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between
                     text-sm font-medium text-content hover:bg-primary/10
                     transition-colors rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                Active
              </span>
            )}
          </div>
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Filter Controls */}
      {(isExpanded || !compact) && (
        <div className="space-y-3 p-4 bg-surface rounded-lg border border-border">
          {/* Date Range */}
          <div>
            <label className="text-xs font-medium text-tertiary uppercase mb-2 block">
              Date Range
            </label>
            <div className="flex flex-wrap gap-2">
              {datePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDatePresetChange(preset.value)}
                  className={`
                    px-3 py-1.5 text-xs rounded-lg border transition-colors
                    ${
                      filters.dateRange.preset === preset.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-content hover:bg-primary/10'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Type */}
          <div>
            <label className="text-xs font-medium text-tertiary uppercase mb-2 block">
              Content Type
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleContentTypeToggle('all')}
                className={`
                  px-3 py-1.5 text-xs rounded-lg border transition-colors
                  flex items-center space-x-1
                  ${
                    filters.contentType.includes('all')
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-content hover:bg-hover'
                  }
                `}
              >
                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                <span>All</span>
              </button>
              <button
                onClick={() => handleContentTypeToggle('article')}
                className={`
                  px-3 py-1.5 text-xs rounded-lg border transition-colors
                  ${
                    filters.contentType.includes('article')
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-content hover:bg-hover'
                  }
                `}
              >
                Articles
              </button>
              <button
                onClick={() => handleContentTypeToggle('post')}
                className={`
                  px-3 py-1.5 text-xs rounded-lg border transition-colors
                  ${
                    filters.contentType.includes('post')
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-content hover:bg-hover'
                  }
                `}
              >
                Posts
              </button>
            </div>
          </div>

          {/* Engagement & Sort Row */}
          <div className="flex flex-wrap gap-2">
            {/* Engagement Level Dropdown */}
            <FilterButton
              label={
                engagementLevels.find((e) => e.value === filters.engagementLevel)?.label ||
                'Engagement'
              }
              icon={<ChartBarIcon className="w-4 h-4" />}
              active={filters.engagementLevel !== 'all'}
              onClick={() => toggleDropdown('engagement')}
              dropdownId="engagement"
              dropdown={
                <div className="py-1">
                  {engagementLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => handleEngagementChange(level.value)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10
                                 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        {level.icon}
                        <span>{level.label}</span>
                      </div>
                      {filters.engagementLevel === level.value && (
                        <CheckIcon className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              }
            />

            {/* Sort By Dropdown */}
            <FilterButton
              label={sortOptions.find((s) => s.value === filters.sortBy)?.label || 'Sort'}
              icon={<CalendarIcon className="w-4 h-4" />}
              active={filters.sortBy !== 'recent'}
              onClick={() => toggleDropdown('sort')}
              dropdownId="sort"
              dropdown={
                <div className="py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10
                                 transition-colors flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {filters.sortBy === option.value && (
                        <CheckIcon className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              }
            />
          </div>

          {/* Media & Reactions Toggle */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  hasMedia: filters.hasMedia === true ? null : true,
                })
              }
              className={`
                px-3 py-1.5 text-xs rounded-lg border transition-colors
                ${
                  filters.hasMedia === true
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-content hover:bg-primary/10'
                }
              `}
            >
              Has Media
            </button>
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  hasReactions: filters.hasReactions === true ? null : true,
                })
              }
              className={`
                px-3 py-1.5 text-xs rounded-lg border transition-colors
                ${
                  filters.hasReactions === true
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-content hover:bg-primary/10'
                }
              `}
            >
              Has Reactions
            </button>
          </div>

          {/* Active Filters & Reset */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-tertiary">
                {
                  Object.values(filters).filter(
                    (v) =>
                      v !== null &&
                      v !== 'all' &&
                      (Array.isArray(v) ? v.length > 0 && !v.includes('all') : true),
                  ).length
                }{' '}
                active filters
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-primary hover:text-primary/80 transition-colors
                          flex items-center space-x-1"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                <span>Reset all</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineFilters;
