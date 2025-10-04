import React, { useState, useEffect, useMemo } from 'react';
import type { UnifiedContentFilters, UnifiedContentType, UnifiedContentStatus } from '@ems/types';

interface ContentFiltersProps {
  filters: UnifiedContentFilters;
  onFiltersChange: (filters: Partial<UnifiedContentFilters>) => void;
  onClearFilters?: () => void;
  totalCount: number;
  className?: string;
}

/**
 * Advanced Content Filters Component
 *
 * Provides comprehensive filtering capabilities for unified content management:
 * - Full-text search across titles and content
 * - Content type filtering with multi-select
 * - Status filtering (pending, approved, rejected, flagged)
 * - Date range filtering (created/updated)
 * - Author filtering and search
 * - Quality score filtering
 * - Engagement metrics filtering
 * - Quick filter presets
 * - Filter persistence and reset
 */
const ContentFilters: React.FC<ContentFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  totalCount,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState(filters.search || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Content type definitions with icons and colors
  const contentTypes = [
    { key: 'article', label: 'Articles', icon: '📰', color: 'bg-blue-100 text-blue-800' },
    { key: 'user_post', label: 'User Posts', icon: '💬', color: 'bg-green-100 text-green-800' },
    { key: 'comment', label: 'Comments', icon: '🗨️', color: 'bg-purple-100 text-purple-800' },
    { key: 'prediction', label: 'Predictions', icon: '🔮', color: 'bg-amber-100 text-amber-800' },
  ] as const;

  // Status definitions with colors
  const statusOptions = [
    { key: 'pending', label: 'Pending Review', icon: '⏳', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'approved', label: 'Approved', icon: '✅', color: 'bg-green-100 text-green-800' },
    { key: 'rejected', label: 'Rejected', icon: '❌', color: 'bg-red-100 text-red-800' },
    { key: 'flagged', label: 'Flagged', icon: '🚩', color: 'bg-orange-100 text-orange-800' },
    { key: 'hidden', label: 'Hidden', icon: '👁️‍🗨️', color: 'bg-gray-100 text-gray-800' },
  ] as const;

  // Quick filter presets
  const quickFilters = [
    { label: 'All Content', filters: {} },
    { label: 'Needs Review', filters: { statuses: ['pending'] } },
    { label: 'Flagged Content', filters: { statuses: ['flagged'] } },
    { label: 'Recent Articles', filters: { types: ['article'], dateRange: 'last_7_days' } },
    { label: 'User Generated', filters: { types: ['user_post', 'comment'] } },
    { label: 'High Engagement', filters: { minViews: 100, minReactions: 10 } },
  ];

  // Debounced search handling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDebounce !== filters.search) {
        onFiltersChange({ search: searchDebounce });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchDebounce, filters.search, onFiltersChange]);

  // Active filter count for display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.types && filters.types.length > 0) count++;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (
      filters.createdAfter ||
      filters.createdBefore ||
      filters.publishedAfter ||
      filters.publishedBefore
    )
      count++;
    if (filters.authorIds && filters.authorIds.length > 0) count++;
    if (filters.minQualityScore !== undefined) count++;
    if (
      filters.minViews !== undefined ||
      filters.minReactions !== undefined ||
      filters.minComments !== undefined
    )
      count++;
    return count;
  }, [filters]);

  // Handle content type selection
  const handleTypeToggle = (type: UnifiedContentType) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onFiltersChange({ types: newTypes.length > 0 ? newTypes : undefined });
  };

  // Handle quick filter application
  const applyQuickFilter = (quickFilters: Record<string, any>) => {
    onFiltersChange(quickFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchDebounce('');
    if (onClearFilters) {
      // Use parent's clear function if provided
      onClearFilters();
    } else {
      // Fallback to local implementation
      onFiltersChange({
        search: '',
        types: undefined,
        statuses: undefined,
        createdAfter: undefined,
        createdBefore: undefined,
        publishedAfter: undefined,
        publishedBefore: undefined,
        authorIds: undefined,
        minQualityScore: undefined,
        minViews: undefined,
        minReactions: undefined,
        minComments: undefined,
      });
    }
  };

  // Format date for input

  return (
    <div className={`bg-background rounded-lg border border-muted ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-muted">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-content flex items-center">
            <span className="mr-2">🔍</span>
            Content Filters
          </h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-tertiary">{totalCount.toLocaleString()} results</div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-tertiary hover:text-content transition-colors"
            title={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            {isExpanded ? '⬆️' : '⬇️'}
          </button>
        </div>
      </div>

      {/* Main Search */}
      <div className="p-4 border-b border-muted">
        <div className="relative">
          <input
            type="text"
            placeholder="Search content, titles, authors..."
            value={searchDebounce}
            onChange={(e) => setSearchDebounce(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-content placeholder-tertiary"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary">🔍</div>
          {searchDebounce && (
            <button
              onClick={() => setSearchDebounce('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tertiary hover:text-content"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="p-4 border-b border-muted">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((quick, index) => (
            <button
              key={index}
              onClick={() => applyQuickFilter(quick.filters)}
              className="px-3 py-1 text-sm bg-surface hover:bg-muted border border-muted rounded-full transition-colors text-content"
            >
              {quick.label}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-sm bg-error/10 hover:bg-error/20 text-error border border-error/20 rounded-full transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Content Types */}
          <div>
            <label className="block text-sm font-medium text-content mb-3">Content Types</label>
            <div className="flex flex-wrap gap-2">
              {contentTypes.map((type) => {
                const isSelected = filters.types?.includes(type.key as UnifiedContentType);
                return (
                  <button
                    key={type.key}
                    onClick={() => handleTypeToggle(type.key as UnifiedContentType)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface hover:bg-muted border-muted text-content'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-content mb-3">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFiltersChange({ statuses: undefined })}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  !filters.statuses || filters.statuses.length === 0
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface hover:bg-muted border-muted text-content'
                }`}
              >
                All Statuses
              </button>
              {statusOptions.map((status) => {
                const isSelected = filters.statuses?.includes(status.key as UnifiedContentStatus);
                return (
                  <button
                    key={status.key}
                    onClick={() => {
                      const currentStatuses = filters.statuses || [];
                      const newStatuses = isSelected
                        ? currentStatuses.filter((s) => s !== status.key)
                        : [...currentStatuses, status.key as UnifiedContentStatus];
                      onFiltersChange({
                        statuses: newStatuses.length > 0 ? newStatuses : undefined,
                      });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      isSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface hover:bg-muted border-muted text-content'
                    }`}
                  >
                    <span>{status.icon}</span>
                    <span>{status.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-content mb-3">Date Range</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { key: 'today', label: 'Today', days: 1 },
                { key: 'last_7_days', label: 'Last 7 days', days: 7 },
                { key: 'last_30_days', label: 'Last 30 days', days: 30 },
                { key: 'last_90_days', label: 'Last 90 days', days: 90 },
              ].map((range) => {
                const endDate = new Date().toISOString();
                const startDate = new Date(
                  Date.now() - range.days * 24 * 60 * 60 * 1000,
                ).toISOString();
                const isActive =
                  filters.createdAfter === startDate.split('T')[0] &&
                  filters.createdBefore === endDate.split('T')[0];

                return (
                  <button
                    key={range.key}
                    onClick={() =>
                      onFiltersChange({
                        createdAfter: startDate.split('T')[0],
                        createdBefore: endDate.split('T')[0],
                      })
                    }
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      isActive
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface hover:bg-muted border-muted text-content'
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-3 py-2 rounded-lg border text-sm bg-surface hover:bg-muted border-muted text-content transition-all"
              >
                Custom Range
              </button>
            </div>

            {/* Custom Date Picker */}
            {showDatePicker && (
              <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-muted">
                <div>
                  <label className="block text-xs text-tertiary mb-1">From</label>
                  <input
                    type="date"
                    value={filters.createdAfter || ''}
                    className="px-2 py-1 bg-background border border-muted rounded text-sm text-content"
                    onChange={(e) => onFiltersChange({ createdAfter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-tertiary mb-1">To</label>
                  <input
                    type="date"
                    value={filters.createdBefore || ''}
                    className="px-2 py-1 bg-background border border-muted rounded text-sm text-content"
                    onChange={(e) => onFiltersChange({ createdBefore: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Author Search */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">Author IDs</label>
              <input
                type="text"
                placeholder="Enter author IDs (comma-separated)..."
                value={filters.authorIds?.join(', ') || ''}
                onChange={(e) => {
                  const ids = e.target.value
                    .split(',')
                    .map((id) => parseInt(id.trim()))
                    .filter((id) => !isNaN(id));
                  onFiltersChange({ authorIds: ids.length > 0 ? ids : undefined });
                }}
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-content placeholder-tertiary"
              />
            </div>

            {/* Quality Score */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Min Quality Score
              </label>
              <select
                value={filters.minQualityScore || ''}
                onChange={(e) =>
                  onFiltersChange({
                    minQualityScore: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-content"
              >
                <option value="">Any score</option>
                <option value="5">5+ (High quality)</option>
                <option value="7">7+ (Very high quality)</option>
                <option value="8">8+ (Excellent)</option>
                <option value="9">9+ (Outstanding)</option>
              </select>
            </div>

            {/* Engagement */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">Min Views</label>
              <select
                value={filters.minViews || ''}
                onChange={(e) =>
                  onFiltersChange({ minViews: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 bg-surface border border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-content"
              >
                <option value="">Any views</option>
                <option value="10">10+ views</option>
                <option value="50">50+ views</option>
                <option value="100">100+ views</option>
                <option value="500">500+ views</option>
                <option value="1000">1000+ views</option>
              </select>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-content mb-3">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'createdAt', label: 'Newest First', order: 'desc' },
                { key: 'createdAt', label: 'Oldest First', order: 'asc' },
                { key: 'updatedAt', label: 'Recently Updated', order: 'desc' },
                { key: 'views', label: 'Most Views', order: 'desc' },
                { key: 'reactions', label: 'Most Reactions', order: 'desc' },
                { key: 'quality', label: 'Highest Quality', order: 'desc' },
              ].map((sort, index) => {
                const isActive = filters.sortBy === sort.key && filters.sortOrder === sort.order;
                return (
                  <button
                    key={`${sort.key}-${sort.order}-${index}`}
                    onClick={() =>
                      onFiltersChange({ sortBy: sort.key as any, sortOrder: sort.order as any })
                    }
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      isActive
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface hover:bg-muted border-muted text-content'
                    }`}
                  >
                    {sort.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentFilters;
