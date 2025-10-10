import React, { useState, useEffect, useCallback } from 'react';
import { REDIS_CHANNELS } from '@ems/types';
import { useEventBusCore } from '../../../contexts/EventBusCoreContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { UnifiedContentItem, UnifiedContentFilters, UnifiedContentResponse } from '@ems/types';
import * as unifiedContentAPI from '../../../api/unifiedContent';
import ContentOverview from './ContentOverview';
import ContentFilters from './ContentFilters';
import ContentTable from './ContentTable';
import ContentModerationPanel from './ContentModerationPanel';
import { OPMLManager } from './OPMLManager';
import FeedsManager from './FeedsManager';

interface ContentDashboardProps {
  className?: string;
}

type DashboardView = 'overview' | 'content' | 'moderation' | 'feeds';

/**
 * Unified Content Management Dashboard
 *
 * This component consolidates all content management functionality:
 * - Articles from RSS feeds
 * - User-generated posts
 * - Comments and interactions
 * - Predictions and market content
 * - Feed source management
 *
 * Features:
 * - Unified content view across all types
 * - Advanced filtering and search
 * - Bulk moderation operations
 * - Real-time updates via Socket.IO
 * - Cross-content analytics
 * - OPML import/export for feeds
 */
const ContentDashboard: React.FC<ContentDashboardProps> = () => {
  const { user } = useAuth();
  const { subscribe } = useEventBusCore();

  // State for content data
  const [content, setContent] = useState<UnifiedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // State for UI
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set());
  const [showModerationPanel, setShowModerationPanel] = useState(false);

  // State for filters
  const [filters, setFilters] = useState<UnifiedContentFilters>({
    types: [],
    statuses: undefined,
    search: '',
    limit: 25,
    offset: 0,
  });

  // Load content data
  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response: UnifiedContentResponse = await unifiedContentAPI.getContent(filters);
      setContent(response.items);
      setTotalCount(response.pagination.total);
    } catch (err) {
      console.error('Error loading unified content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Handle real-time content updates
  useEffect(() => {
    const handleContentUpdate = (data: any) => {
      console.log('[ContentDashboard] Content update received:', data);
      // Reload content when updates occur
      loadContent();
    };

    const handleModerationUpdate = (data: any) => {
      console.log('[ContentDashboard] Moderation update received:', data);
      // Update content status in real-time
      setContent((prev) =>
        prev.map((item) =>
          item.id === data.contentId ? { ...item, status: data.newStatus } : item,
        ),
      );
    };

    // Subscribe to real-time events
    const unsubscribers = [
      subscribe(REDIS_CHANNELS.CONTENT_UPDATED, handleContentUpdate),
      subscribe(REDIS_CHANNELS.CONTENT_MODERATED, handleModerationUpdate),
      subscribe(REDIS_CHANNELS.FEEDS_UPDATED, handleContentUpdate),
      subscribe(REDIS_CHANNELS.ARTICLES_BULK_MODERATED, handleContentUpdate),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [subscribe, loadContent]);

  // Load initial data
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<UnifiedContentFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      offset: 0, // Reset to first page when filters change
    }));
    setSelectedContent(new Set()); // Clear selections when filters change
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      types: [],
      statuses: undefined,
      search: '',
      limit: 25,
      offset: 0,
    });
    setSelectedContent(new Set());
  }, []);

  // Update filters when switching to moderation tab
  useEffect(() => {
    if (activeView === 'moderation') {
      // Auto-filter to show items that need review
      setFilters({
        types: [],
        statuses: ['pending', 'flagged'],
        search: '',
        limit: 25,
        offset: 0,
      });
    }
    // All Content tab: no auto-filtering, user manually filters
  }, [activeView]);

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      const limit = filters.limit || 25;
      setFilters((prev) => ({
        ...prev,
        offset: (page - 1) * limit,
      }));
    },
    [filters.limit],
  );

  // Handle content selection
  const handleContentSelect = useCallback((contentId: string, selected: boolean) => {
    setSelectedContent((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(contentId);
      } else {
        newSet.delete(contentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = content.map((item) => item.id);
    const allSelected = allIds.every((id) => selectedContent.has(id));

    if (allSelected) {
      setSelectedContent(new Set()); // Deselect all
    } else {
      setSelectedContent(new Set(allIds)); // Select all
    }
  }, [content, selectedContent]);

  // Handle bulk operations
  const handleBulkOperation = useCallback(
    async (operation: string) => {
      if (selectedContent.size === 0) {
        alert('Please select content items first');
        return;
      }

      try {
        const contentIds = Array.from(selectedContent);

        switch (operation) {
          case 'approve':
          case 'reject':
          case 'flag':
          case 'delete':
            await unifiedContentAPI.bulkModerateContent({
              itemIds: contentIds,
              action: operation as any,
              parameters: {
                reason: `Bulk ${operation} via admin dashboard`,
              },
            });
            break;
          default:
            console.warn('Unknown bulk operation:', operation);
            return;
        }

        // Reload content and clear selections
        await loadContent();
        setSelectedContent(new Set());
      } catch (err) {
        console.error('Error performing bulk operation:', err);
        alert(
          `Failed to ${operation} content: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    },
    [selectedContent, loadContent],
  );

  // Navigation items for the dashboard
  const navigationItems = [
    {
      key: 'overview',
      label: 'Overview',
      icon: '📊',
      description: 'Content summary and quick stats',
    },
    {
      key: 'content',
      label: 'All Content',
      icon: '📄',
      description: 'Browse and filter all content',
    },
    {
      key: 'moderation',
      label: 'Moderation',
      icon: '🛡️',
      description: 'Review queue for pending and flagged content',
    },
    {
      key: 'feeds',
      label: 'Feed Sources',
      icon: '📡',
      description: 'RSS feed management and OPML tools',
    },
  ] as const;

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="p-6 text-center">
        <div className="text-error text-lg">Access Denied</div>
        <div className="text-tertiary mt-2">This feature is only available to administrators.</div>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-hidden space-y-4">
      {/* Compact Header with Tabs Combined */}
      <div className="bg-surface rounded-lg border border-muted">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-muted">
          <div>
            <h1 className="text-xl font-bold text-content flex items-center">
              <span className="mr-2">🎛️</span>
              Unified Content Management
            </h1>
            <p className="text-xs text-tertiary mt-1">
              Manage all content types from articles to user posts in one unified interface
            </p>
          </div>

          {selectedContent.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-tertiary">
                {selectedContent.size} item{selectedContent.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setShowModerationPanel(!showModerationPanel)}
                className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-xs font-medium"
              >
                Bulk Actions
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeView === item.key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-tertiary hover:text-content hover:bg-background'
              }`}
              title={item.description}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Moderation Modal */}
      {showModerationPanel && selectedContent.size > 0 && (
        <ContentModerationPanel
          selectedContent={selectedContent}
          onBulkOperation={handleBulkOperation}
          onClose={() => {
            setShowModerationPanel(false);
            setSelectedContent(new Set()); // Clear selection when closing modal
          }}
          showQuickActions={true}
        />
      )}

      {/* Main Content Area */}
      <div>
        {activeView === 'overview' && (
          <ContentOverview totalContent={totalCount} selectedFilters={filters} />
        )}

        {activeView === 'content' && (
          <div className="space-y-4">
            <ContentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearFilters}
              totalCount={totalCount}
            />

            <ContentTable
              content={content}
              selectedContent={selectedContent}
              loading={loading}
              error={error}
              onContentSelect={handleContentSelect}
              onSelectAll={handleSelectAll}
              onPageChange={handlePageChange}
              currentPage={Math.floor((filters.offset || 0) / (filters.limit || 25)) + 1}
              totalPages={Math.ceil(totalCount / (filters.limit || 25))}
            />
          </div>
        )}

        {activeView === 'moderation' && (
          <div className="space-y-4">
            <ContentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={clearFilters}
              totalCount={totalCount}
            />

            <ContentTable
              content={content}
              selectedContent={selectedContent}
              loading={loading}
              error={error}
              onContentSelect={handleContentSelect}
              onSelectAll={handleSelectAll}
              onPageChange={handlePageChange}
              currentPage={Math.floor((filters.offset || 0) / (filters.limit || 25)) + 1}
              totalPages={Math.ceil(totalCount / (filters.limit || 25))}
            />
          </div>
        )}

        {activeView === 'feeds' && (
          <div className="space-y-4">
            {/* RSS Feeds Management */}
            <FeedsManager />

            {/* OPML Tools */}
            <div className="bg-background rounded-lg border border-muted p-4">
              <div className="text-sm font-semibold text-content mb-3 flex items-center">
                <span className="mr-2">📦</span>
                OPML Import/Export
              </div>
              <OPMLManager />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentDashboard;
