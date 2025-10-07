// apps/client/src/components/GenericFeed.tsx
// -----------------------------------------------------------------------------
// Generic feed component providing consistent listing and pagination patterns
// Based on Timeline.tsx styling as the designated style source of truth
// Supports infinite scroll, tabs, filtering, real-time updates, and loading states
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

export interface FeedItem {
  id: string | number;
  createdAt: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
}

export interface FeedPagination {
  hasMore: boolean;
  cursor?: string;
  total?: number;
  offset?: number;
}

export interface FeedResponse<T extends FeedItem> {
  items: T[];
  pagination: FeedPagination;
}

export interface FeedTab {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface FeedFilter {
  id: string;
  label: string;
  value: any;
  active?: boolean;
}

interface GenericFeedProps<T extends FeedItem> {
  // Data fetching
  fetchItems: (params: {
    cursor?: string;
    offset?: number;
    limit?: number;
    tab?: string;
    filters?: Record<string, any>;
  }) => Promise<FeedResponse<T>>;

  // Rendering
  renderItem: (item: T, index: number) => ReactNode;

  // Configuration
  className?: string;
  itemsPerPage?: number;
  enableInfiniteScroll?: boolean;

  // Tabs
  tabs?: FeedTab[];
  initialTab?: string;
  onTabChange?: (tabId: string) => void;

  // Filtering
  filters?: FeedFilter[];
  onFilterChange?: (filters: FeedFilter[]) => void;

  // Real-time updates
  enableRealtimeUpdates?: boolean;
  onRealtimeUpdate?: (item: T) => void;

  // Loading and error states
  loadingComponent?: ReactNode;
  errorComponent?: (error: string) => ReactNode;
  emptyComponent?: ReactNode;

  // Item actions
  onItemClick?: (item: T) => void;
  onItemAction?: (action: string, item: T) => void;

  // Advanced features
  enableSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // Styling
  variant?: 'list' | 'grid' | 'card';
  spacing?: 'compact' | 'normal' | 'loose';
}

export default function GenericFeed<T extends FeedItem>({
  fetchItems,
  renderItem,
  className = '',
  itemsPerPage = 20,
  enableInfiniteScroll = true,
  tabs,
  initialTab,
  onTabChange,
  filters,
  onFilterChange,
  enableRealtimeUpdates = false,
  onRealtimeUpdate,
  loadingComponent,
  errorComponent,
  emptyComponent,
  onItemClick,
  onItemAction,
  enableSearch = false,
  searchPlaceholder = 'Search...',
  onSearch,
  variant = 'list',
  spacing = 'normal',
}: GenericFeedProps<T>) {
  // State management
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState(initialTab || tabs?.[0]?.id || '');
  const [activeFilters, setActiveFilters] = useState<FeedFilter[]>(filters || []);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for intersection observer and state tracking
  const observerRef = useRef<HTMLDivElement>(null);
  const observerInstance = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | undefined>(undefined);

  // Update refs when state changes
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  // Load items function
  const loadItems = useCallback(
    async (reset = false) => {
      // Prevent concurrent loads
      if (loadingRef.current && !reset) {
        return;
      }

      try {
        setLoading(true);
        loadingRef.current = true;
        setError(null);

        const filterValues = activeFilters.reduce(
          (acc, filter) => {
            if (filter.active) {
              acc[filter.id] = filter.value;
            }
            return acc;
          },
          {} as Record<string, any>,
        );

        const response = await fetchItems({
          cursor: !reset ? cursorRef.current : undefined,
          limit: itemsPerPage,
          tab: activeTab,
          filters: filterValues,
        });

        if (reset) {
          setItems(response.items);
        } else {
          // Deduplicate items to prevent duplicate keys
          setItems((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = response.items.filter((item) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        }

        setHasMore(response.pagination.hasMore);
        hasMoreRef.current = response.pagination.hasMore;
        setCursor(response.pagination.cursor);
        cursorRef.current = response.pagination.cursor;
      } catch (err) {
        console.error('Feed loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load items');
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [fetchItems, itemsPerPage, activeTab, activeFilters],
  );

  // Tab change handler
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCursor(undefined);
    onTabChange?.(tabId);
  };

  // Filter change handler
  const handleFilterChange = (filterId: string, active: boolean) => {
    const updatedFilters = activeFilters.map((filter) =>
      filter.id === filterId ? { ...filter, active } : filter,
    );
    setActiveFilters(updatedFilters);
    setCursor(undefined);
    onFilterChange?.(updatedFilters);
  };

  // Search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCursor(undefined);
    onSearch?.(query);
  };

  // Initial load and tab changes
  useEffect(() => {
    loadItems(true);
  }, [activeTab, activeFilters, searchQuery]);

  // Infinite scroll setup
  useEffect(() => {
    if (!enableInfiniteScroll || items.length === 0) return;

    const currentObserverRef = observerRef.current;
    if (!currentObserverRef) return; // Wait for ref to be attached

    if (observerInstance.current) {
      observerInstance.current.disconnect();
    }

    observerInstance.current = new IntersectionObserver(
      (entries) => {
        // Use refs to get current values, preventing stale closures
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadItems(false);
        }
      },
      { threshold: 0.5 }, // Trigger slightly before reaching the bottom
    );

    observerInstance.current.observe(currentObserverRef);

    return () => {
      if (observerInstance.current) {
        observerInstance.current.disconnect();
      }
    };
  }, [loadItems, enableInfiniteScroll, items.length]);

  // Realtime updates
  useEffect(() => {
    if (!enableRealtimeUpdates || !onRealtimeUpdate) return;

    // Socket event listeners would be set up here
    // This is a placeholder for the actual implementation
  }, [enableRealtimeUpdates, onRealtimeUpdate]);

  // Spacing classes
  const getSpacingClasses = () => {
    switch (spacing) {
      case 'compact':
        return 'space-y-2';
      case 'loose':
        return 'space-y-8';
      default:
        return 'space-y-4';
    }
  };

  // Variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
      case 'card':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      default:
        return getSpacingClasses();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header Section */}
      <div className="mb-6">
        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="border-b border-muted bg-background/50 rounded-t-lg">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-surface text-content border-b-2 border-primary shadow-sm'
                      : 'text-tertiary hover:text-content hover:bg-surface/50'
                  }`}
                >
                  {tab.icon && <span className="text-lg">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-muted text-tertiary px-2 py-0.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {(enableSearch || (filters && filters.length > 0)) && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Search */}
            {enableSearch && (
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-muted rounded-lg bg-background text-content placeholder-tertiary focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Filters */}
            {filters && filters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterChange(filter.id, !filter.active)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filter.active
                        ? 'bg-primary text-surface'
                        : 'bg-muted text-tertiary hover:bg-muted/80'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="relative">
        {/* Loading State */}
        {loading && items.length === 0 && (
          <div className="flex items-center justify-center py-12">
            {loadingComponent || (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-tertiary">Loading...</span>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-12">
            {errorComponent ? (
              errorComponent(error)
            ) : (
              <div className="text-center">
                <div className="text-error mb-2">⚠️ Error loading content</div>
                <p className="text-tertiary text-sm">{error}</p>
                <button
                  onClick={() => loadItems(true)}
                  className="mt-3 px-4 py-2 bg-primary text-surface rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="py-12">
            {emptyComponent || (
              <div className="text-center text-tertiary">
                <div className="text-4xl mb-2">📭</div>
                <p>No items found</p>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        {items.length > 0 && (
          <div className={getVariantClasses()}>
            {items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={onItemClick ? 'cursor-pointer' : ''}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {enableInfiniteScroll && hasMore && (
          <div ref={observerRef} className="py-4 text-center">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
            )}
          </div>
        )}

        {/* Load More Button (alternative to infinite scroll) */}
        {!enableInfiniteScroll && hasMore && !loading && (
          <div className="text-center mt-6">
            <button
              onClick={() => loadItems(false)}
              className="px-6 py-2 bg-secondary text-content rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience hooks for common feed patterns
export function useGenericFeed<T extends FeedItem>(
  fetchItems: GenericFeedProps<T>['fetchItems'],
  options?: {
    itemsPerPage?: number;
    enableCache?: boolean;
  },
) {
  const [data, setData] = useState<FeedResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (params: Parameters<typeof fetchItems>[0]) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchItems(params);
        setData(response);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchItems],
  );

  return {
    data,
    loading,
    error,
    loadData,
    refresh: () => loadData({ limit: options?.itemsPerPage || 20 }),
  };
}
