import React, { useState, useCallback } from 'react';
import {
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
  hasSearchQuery?: boolean;
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
  hasSearchQuery = false,
}) => {
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
    { value: 'low', label: 'Low', icon: null },
    { value: 'medium', label: 'Medium', icon: null },
    { value: 'high', label: 'High', icon: <FireIcon className="w-4 h-4" /> },
    { value: 'viral', label: 'Viral', icon: <FireIcon className="w-4 h-4 text-error" /> },
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
      setActiveDropdown(null);
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
    setActiveDropdown(null);
  }, [onFilterChange, onReset]);

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const hasActiveFilters =
    hasSearchQuery ||
    filters.dateRange.preset !== 'all' ||
    !filters.contentType.includes('all') ||
    filters.sources.length > 0 ||
    filters.authors.length > 0 ||
    filters.engagementLevel !== 'all' ||
    filters.sortBy !== 'recent' ||
    filters.hasMedia !== null ||
    filters.hasReactions !== null;

  const activeFilterCount = [
    hasSearchQuery,
    filters.dateRange.preset !== 'all',
    !filters.contentType.includes('all'),
    filters.sources.length > 0,
    filters.authors.length > 0,
    filters.engagementLevel !== 'all',
    filters.sortBy !== 'recent',
    filters.hasMedia !== null,
    filters.hasReactions !== null,
  ].filter(Boolean).length;

  const FilterButton: React.FC<{
    label: string;
    icon?: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    dropdown?: React.ReactNode;
    dropdownId?: string;
    badge?: number;
  }> = ({ label, icon, active, onClick, dropdown, dropdownId, badge }) => (
    <div className="relative">
      <button
        onClick={onClick}
        className={`
          px-3 py-1.5 rounded-md text-xs font-medium
          transition-all duration-200 flex items-center space-x-1.5
          ${
            active
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:border-border hover:text-content'
          }
        `}
      >
        {icon && <span className="w-3.5 h-3.5">{icon}</span>}
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-[10px] rounded-full">
            {badge}
          </span>
        )}
        {dropdown && (
          <ChevronDownIcon
            className={`w-3 h-3 transition-transform ${
              activeDropdown === dropdownId ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {dropdown && activeDropdown === dropdownId && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
          <div
            className="absolute z-50 mt-1 bg-surface border border-border rounded-md
                        shadow-xl min-w-[180px] max-h-[280px] overflow-y-auto left-0"
          >
            {dropdown}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={className}>
      {/* Centered Horizontal Layout */}
      <div className="flex items-center justify-center gap-3 py-2">
        {/* Date Range Dropdown */}
        <FilterButton
          label={datePresets.find((p) => p.value === filters.dateRange.preset)?.label || 'All Time'}
          icon={<CalendarIcon className="w-3.5 h-3.5" />}
          active={filters.dateRange.preset !== 'all'}
          onClick={() => toggleDropdown('date')}
          dropdownId="date"
          dropdown={
            <div className="py-1">
              {datePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDatePresetChange(preset.value)}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-primary/10
                             transition-colors flex items-center justify-between"
                >
                  <span>{preset.label}</span>
                  {filters.dateRange.preset === preset.value && (
                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          }
        />

        {/* Content Type Toggle Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleContentTypeToggle('all')}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${
                filters.contentType.includes('all')
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
              }
            `}
          >
            <DocumentDuplicateIcon className="w-3.5 h-3.5 inline mr-1" />
            All
          </button>
          <button
            onClick={() => handleContentTypeToggle('article')}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-colors
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
              px-3 py-1.5 rounded-md text-xs font-medium transition-colors
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

        {/* Engagement Level Dropdown */}
        <FilterButton
          label={
            filters.engagementLevel === 'all'
              ? 'Engagement'
              : engagementLevels.find((e) => e.value === filters.engagementLevel)?.label ||
                'Engagement'
          }
          icon={<ChartBarIcon className="w-3.5 h-3.5" />}
          active={filters.engagementLevel !== 'all'}
          onClick={() => toggleDropdown('engagement')}
          dropdownId="engagement"
          dropdown={
            <div className="py-1">
              {engagementLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleEngagementChange(level.value)}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-primary/10
                             transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    {level.icon}
                    <span>{level.label}</span>
                  </div>
                  {filters.engagementLevel === level.value && (
                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          }
        />

        {/* Sort By Dropdown */}
        <FilterButton
          label={sortOptions.find((s) => s.value === filters.sortBy)?.label || 'Sort'}
          icon={<CalendarIcon className="w-3.5 h-3.5" />}
          active={filters.sortBy !== 'recent'}
          onClick={() => toggleDropdown('sort')}
          dropdownId="sort"
          dropdown={
            <div className="py-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-primary/10
                             transition-colors flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {filters.sortBy === option.value && (
                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          }
        />

        <div className="h-5 w-px bg-border/50" />

        {/* Media & Reactions Toggle */}
        <button
          onClick={() =>
            onFilterChange({
              ...filters,
              hasMedia: filters.hasMedia === true ? null : true,
            })
          }
          className={`
            px-3 py-1.5 rounded-md text-xs font-medium transition-colors
            ${
              filters.hasMedia === true
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
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
            px-3 py-1.5 rounded-md text-xs font-medium transition-colors
            ${
              filters.hasReactions === true
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-surface/50 border border-border/50 text-content/70 hover:bg-surface hover:text-content'
            }
          `}
        >
          Has Reactions
        </button>

        {/* Reset Button - Always visible */}
        <div className="h-5 w-px bg-border/50" />
        <button
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className={`
            px-3 py-1.5 rounded-md text-xs font-medium transition-colors
            flex items-center space-x-1.5
            ${
              hasActiveFilters
                ? 'bg-error/10 text-error border border-error/30 hover:bg-error/20 hover:border-error/50'
                : 'bg-surface/50 border border-border/50 text-content/30 cursor-not-allowed opacity-50'
            }
          `}
        >
          <XMarkIcon className="w-3.5 h-3.5" />
          <span>{hasActiveFilters ? `Clear All (${activeFilterCount})` : 'Clear All'}</span>
        </button>
      </div>
    </div>
  );
};

export default TimelineFilters;
