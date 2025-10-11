import React, { useState, useEffect, useRef, useDeferredValue } from 'react';
import {
  MagnifyingGlassIcon as Search,
  FunnelIcon as Filter,
  XMarkIcon as X,
  ClockIcon as Clock,
  ArrowTrendingUpIcon as TrendingUp,
  TagIcon as Tag,
  BoltIcon as Zap,
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  ChartBarIcon as Activity,
  Squares2X2Icon as Layers,
  CheckIcon as Check,
} from '@heroicons/react/24/outline';
import type { PredictionFilter } from '../../hooks/usePredictionDiscovery';
import type { PrismaCategory } from '@ems/types';

interface EnhancedPredictionFiltersProps {
  filters: PredictionFilter;
  availableCategories: PrismaCategory[];
  onFiltersChange: (filters: Partial<PredictionFilter>) => void;
  onClearFilters: () => void;
  totalResults?: number;
  className?: string;
  isMobile?: boolean;
  layout?: 'vertical' | 'horizontal';
}

function EnhancedPredictionFilters({
  filters,
  availableCategories,
  onFiltersChange,
  onClearFilters,
  totalResults,
  className = '',
  isMobile = false,
  layout = 'vertical',
}: EnhancedPredictionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'categories' | 'advanced'>('quick');
  const [tempFilters, setTempFilters] = useState(filters);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Defer expensive filter rendering for better performance
  const deferredSearch = useDeferredValue(filters.search);
  const deferredCategories = useDeferredValue(availableCategories);
  const isSearchPending = deferredSearch !== filters.search;

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('recentPredictionSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Quick filter pills
  const quickFilters = [
    { id: 'hot', label: 'Hot', icon: '🔥', filter: { activity: 'high' as const } },
    { id: 'ending', label: 'Ending Soon', icon: '⏰', filter: { timeRemaining: '1d' as const } },
    { id: 'new', label: 'New', icon: '✨', filter: { status: 'open' as const } },
    { id: 'highOdds', label: 'High Odds', icon: '📈', filter: { activity: 'high' as const } },
    { id: 'easy', label: 'Easy', icon: '🟢', filter: { difficulties: ['easy' as const] } },
  ];

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.timeRemaining !== 'all' ||
    filters.activity !== 'all' ||
    filters.status !== 'all' ||
    filters.search.length > 0;

  const activeFilterCount =
    filters.categories.length +
    filters.difficulties.length +
    (filters.timeRemaining !== 'all' ? 1 : 0) +
    (filters.activity !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.search ? 1 : 0);

  const handleSearchSubmit = (value: string) => {
    if (value.trim()) {
      // Add to recent searches
      const newRecent = [value, ...recentSearches.filter((s) => s !== value)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentPredictionSearches', JSON.stringify(newRecent));
      onFiltersChange({ search: value });
    }
  };

  const applyMobileFilters = () => {
    onFiltersChange(tempFilters);
    setShowMobileSheet(false);
  };

  const clearMobileFilters = () => {
    setTempFilters({
      search: '',
      categories: [],
      difficulties: [],
      timeRemaining: 'all',
      activity: 'all',
      status: 'all',
      sortBy: 'relevance',
    });
  };

  // Mobile bottom sheet
  if (isMobile && showMobileSheet) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileSheet(false)} />

        {/* Mobile Filter Sheet */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl z-50 max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="sticky top-0 bg-surface border-b border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-content">Filters</h3>
              <button
                onClick={() => setShowMobileSheet(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { id: 'quick', label: 'Quick', icon: <Zap className="w-4 h-4" /> },
                { id: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
                { id: 'advanced', label: 'Advanced', icon: <Layers className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-sm font-medium
                    flex items-center justify-center gap-1.5
                    transition-colors
                    ${activeTab === tab.id ? 'bg-primary text-surface' : 'bg-muted text-content'}
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {activeTab === 'quick' && (
              <div className="space-y-4">
                {/* Status Filters */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-3">Status</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'open', label: 'Live', icon: '🎯' },
                      { value: 'all', label: 'All', icon: '📋' },
                      { value: 'expired', label: 'Expired', icon: '⏰' },
                      { value: 'resolved', label: 'Resolved', icon: '✅' },
                    ].map((status) => (
                      <button
                        key={status.value}
                        onClick={() =>
                          setTempFilters({ ...tempFilters, status: status.value as any })
                        }
                        className={`
                          p-3 rounded-lg border text-sm font-medium
                          flex items-center justify-center gap-2
                          transition-all
                          ${
                            tempFilters.status === status.value
                              ? 'bg-primary text-surface border-primary'
                              : 'bg-surface text-content border-border hover:border-primary/50'
                          }
                        `}
                      >
                        <span>{status.icon}</span>
                        <span>{status.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Filters */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-3">Time Remaining</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: '1h', label: '1 Hour' },
                      { value: '1d', label: '1 Day' },
                      { value: '1w', label: '1 Week' },
                    ].map((time) => (
                      <button
                        key={time.value}
                        onClick={() =>
                          setTempFilters({ ...tempFilters, timeRemaining: time.value as any })
                        }
                        className={`
                          px-4 py-2 rounded-full text-sm whitespace-nowrap
                          transition-all
                          ${
                            tempFilters.timeRemaining === time.value
                              ? 'bg-primary text-surface'
                              : 'bg-muted text-content'
                          }
                        `}
                      >
                        {time.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-3">Difficulty</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => {
                          const newDiffs = tempFilters.difficulties.includes(diff)
                            ? tempFilters.difficulties.filter((d) => d !== diff)
                            : [...tempFilters.difficulties, diff];
                          setTempFilters({ ...tempFilters, difficulties: newDiffs });
                        }}
                        className={`
                          p-2 rounded-lg border text-sm capitalize
                          transition-all flex items-center justify-center gap-2
                          ${
                            tempFilters.difficulties.includes(diff)
                              ? 'bg-primary text-surface border-primary'
                              : 'bg-surface text-content border-border'
                          }
                        `}
                      >
                        <span>
                          {diff === 'easy' && '🟢'}
                          {diff === 'medium' && '🟡'}
                          {diff === 'hard' && '🟠'}
                          {diff === 'expert' && '🔴'}
                        </span>
                        <span>{diff}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-2">
                {deferredCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      const newCats = tempFilters.categories.includes(category.id)
                        ? tempFilters.categories.filter((c) => c !== category.id)
                        : [...tempFilters.categories, category.id];
                      setTempFilters({ ...tempFilters, categories: newCats });
                    }}
                    className={`
                      w-full p-3 rounded-lg border text-left
                      transition-all flex items-center justify-between
                      ${
                        tempFilters.categories.includes(category.id)
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'bg-surface text-content border-border'
                      }
                    `}
                  >
                    <span className="inline-flex items-center gap-2">
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.name}</span>
                    </span>
                    {tempFilters.categories.includes(category.id) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-4">
                {/* Activity Level */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-3">Activity Level</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'all', label: 'All', icon: <Activity className="w-4 h-4" /> },
                      { value: 'high', label: 'High', icon: <TrendingUp className="w-4 h-4" /> },
                      { value: 'medium', label: 'Medium', icon: <Zap className="w-4 h-4" /> },
                      { value: 'low', label: 'Low', icon: <Clock className="w-4 h-4" /> },
                    ].map((activity) => (
                      <button
                        key={activity.value}
                        onClick={() =>
                          setTempFilters({ ...tempFilters, activity: activity.value as any })
                        }
                        className={`
                          p-2 rounded-lg border text-sm
                          flex items-center justify-center gap-2
                          transition-all
                          ${
                            tempFilters.activity === activity.value
                              ? 'bg-primary text-surface border-primary'
                              : 'bg-surface text-content border-border'
                          }
                        `}
                      >
                        {activity.icon}
                        <span>{activity.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-3">Sort By</h4>
                  <select
                    value={tempFilters.sortBy}
                    onChange={(e) =>
                      setTempFilters({ ...tempFilters, sortBy: e.target.value as any })
                    }
                    className="w-full p-2 bg-surface border border-border rounded-lg text-content"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="odds">Highest Odds</option>
                    <option value="volume">Most Volume</option>
                    <option value="activity">Most Active</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-surface border-t border-border p-4 flex gap-2">
            <button
              onClick={clearMobileFilters}
              className="px-4 py-2 bg-muted text-content rounded-lg font-medium"
            >
              Clear
            </button>
            <button
              onClick={applyMobileFilters}
              className="flex-1 px-4 py-2 bg-primary text-surface rounded-lg font-medium"
            >
              Apply Filters
              {activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Horizontal Layout (for header)
  if (layout === 'horizontal') {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search predictions..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="w-full pl-10 pr-8 py-2 bg-muted border border-transparent rounded-lg text-sm text-content placeholder-tertiary focus:outline-none focus:border-primary transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: '' })}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-tertiary hover:text-content" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex gap-1.5 flex-wrap">
          {quickFilters.slice(0, 4).map((filter) => (
            <button
              key={filter.id}
              onClick={() => onFiltersChange(filter.filter)}
              className="px-3 py-1.5 bg-muted hover:bg-primary/20 text-content text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <select
            value={filters.categories[0] || ''}
            onChange={(e) =>
              onFiltersChange({
                categories: e.target.value ? [Number(e.target.value)] : [],
              })
            }
            className="px-3 py-1.5 pr-8 bg-muted border border-transparent rounded-lg text-sm text-content focus:outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {deferredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ${category.name}` : category.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value as any })}
            className="px-3 py-1.5 pr-8 bg-muted border border-transparent rounded-lg text-sm text-content focus:outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="expired">Expired</option>
            <option value="resolved">Resolved</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
        </div>

        {/* Time Dropdown */}
        <div className="relative">
          <select
            value={filters.timeRemaining}
            onChange={(e) => onFiltersChange({ timeRemaining: e.target.value as any })}
            className="px-3 py-1.5 pr-8 bg-muted border border-transparent rounded-lg text-sm text-content focus:outline-none focus:border-primary appearance-none cursor-pointer"
          >
            <option value="all">Any Time</option>
            <option value="1h">1 Hour</option>
            <option value="1d">1 Day</option>
            <option value="1w">1 Week</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-1.5 bg-muted hover:bg-error/20 text-tertiary hover:text-error rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}

        {/* Results Count */}
        {totalResults !== undefined && (
          <div className="text-xs text-tertiary ml-auto">
            <span className="font-medium text-content">{totalResults}</span> results
          </div>
        )}
      </div>
    );
  }

  // Desktop/Tablet View (Vertical)
  return (
    <div className={`bg-surface rounded-xl border border-border ${className}`}>
      {/* Search Bar */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search predictions..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit(filters.search);
              }
            }}
            className={`w-full pl-10 pr-10 py-2 bg-muted border rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary transition-colors ${
              isSearchPending ? 'border-primary/50' : 'border-transparent'
            }`}
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-tertiary hover:text-content" />
            </button>
          )}

          {/* Search Suggestions */}
          {searchFocused && recentSearches.length > 0 && !filters.search && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10">
              <div className="p-2 border-b border-border">
                <span className="text-xs text-tertiary">Recent</span>
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => handleSearchSubmit(search)}
                  className="w-full px-3 py-2 text-left text-sm text-content hover:bg-muted transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onFiltersChange(filter.filter)}
              className="px-2.5 py-1 bg-muted hover:bg-primary/20 text-content text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Advanced Filters */}
      <div className="p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-tertiary" />
            <span className="font-medium text-content text-sm">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-surface text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-tertiary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-tertiary" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Categories */}
            <div>
              <h4 className="text-xs font-medium text-tertiary mb-2">Categories</h4>
              <div className="grid grid-cols-1 gap-1.5">
                {deferredCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      const newCats = filters.categories.includes(category.id)
                        ? filters.categories.filter((c) => c !== category.id)
                        : [...filters.categories, category.id];
                      onFiltersChange({ categories: newCats });
                    }}
                    className={`
                      w-full px-2.5 py-1.5 rounded-lg text-xs border transition-colors text-left flex items-center justify-between
                      ${
                        filters.categories.includes(category.id)
                          ? 'bg-primary text-surface border-primary'
                          : 'bg-surface text-content border-border hover:border-primary/50 hover:bg-muted'
                      }
                    `}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {category.icon && <span>{category.icon}</span>}
                      <span>{category.name}</span>
                    </span>
                    {filters.categories.includes(category.id) && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Other Filters Grid */}
            <div className="grid grid-cols-1 gap-2">
              {/* Time Remaining */}
              <div>
                <label className="text-xs font-medium text-tertiary mb-1 block">Time</label>
                <select
                  value={filters.timeRemaining}
                  onChange={(e) => onFiltersChange({ timeRemaining: e.target.value as any })}
                  className="w-full p-1.5 bg-muted border border-border rounded-lg text-content text-xs"
                >
                  <option value="all">All Time</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-tertiary mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => onFiltersChange({ status: e.target.value as any })}
                  className="w-full p-1.5 bg-muted border border-border rounded-lg text-content text-xs"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="expired">Expired</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Activity */}
              <div>
                <label className="text-xs font-medium text-tertiary mb-1 block">Activity</label>
                <select
                  value={filters.activity}
                  onChange={(e) => onFiltersChange({ activity: e.target.value as any })}
                  className="w-full p-1.5 bg-muted border border-border rounded-lg text-content text-xs"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={onClearFilters}
                  className="text-xs text-tertiary hover:text-error transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      {totalResults !== undefined && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          <p className="text-xs text-tertiary">
            Found <span className="font-medium text-content">{totalResults}</span> predictions
          </p>
        </div>
      )}

      {/* Mobile Filter Button */}
      {isMobile && (
        <button
          onClick={() => setShowMobileSheet(true)}
          className="fixed bottom-20 right-4 z-30 p-3 bg-primary text-surface rounded-full shadow-lg flex items-center gap-2"
        >
          <Filter className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="bg-surface text-primary text-sm font-medium px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function arePropsEqual(
  prev: EnhancedPredictionFiltersProps,
  next: EnhancedPredictionFiltersProps,
): boolean {
  // Check filters object equality (deep comparison)
  const filtersEqual =
    prev.filters.search === next.filters.search &&
    prev.filters.timeRemaining === next.filters.timeRemaining &&
    prev.filters.activity === next.filters.activity &&
    prev.filters.status === next.filters.status &&
    prev.filters.sortBy === next.filters.sortBy &&
    prev.filters.categories.length === next.filters.categories.length &&
    prev.filters.categories.every((cat) => next.filters.categories.includes(cat)) &&
    prev.filters.difficulties.length === next.filters.difficulties.length &&
    prev.filters.difficulties.every((diff) => next.filters.difficulties.includes(diff));

  if (!filtersEqual) return false;

  // Check other props
  if (prev.totalResults !== next.totalResults) return false;
  if (prev.isMobile !== next.isMobile) return false;
  if (prev.className !== next.className) return false;

  // Check availableCategories array
  if (prev.availableCategories.length !== next.availableCategories.length) return false;
  if (
    !prev.availableCategories.every((cat) =>
      next.availableCategories.some((nextCat) => nextCat.id === cat.id),
    )
  )
    return false;

  return true;
}

export default React.memo(EnhancedPredictionFilters, arePropsEqual);
