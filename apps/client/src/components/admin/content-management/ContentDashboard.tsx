import React, { useState, useEffect, useCallback } from 'react';
import { REDIS_CHANNELS } from '@ems/types';
import { useSocket } from '../../../contexts/SocketContext';
import { useAuth } from '../../../contexts/AuthContext';
import type { UnifiedContentItem, UnifiedContentFilters, UnifiedContentResponse } from '@ems/types';
import * as unifiedContentAPI from '../../../api/unifiedContent';
import ContentOverview from './ContentOverview';
import ContentFilters from './ContentFilters';
import ContentTable from './ContentTable';
import ContentModerationPanel from './ContentModerationPanel';
import ContentAnalytics from './ContentAnalytics';
import { OPMLManager } from './OPMLManager';
import FeedsManager from './FeedsManager';

interface ContentDashboardProps {
  className?: string;
}

type DashboardView = 'overview' | 'content' | 'moderation' | 'analytics' | 'feeds';

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
const ContentDashboard: React.FC<ContentDashboardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const socket = useSocket();

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
    if (!socket) return;

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
    socket.on(REDIS_CHANNELS.CONTENT_UPDATED, handleContentUpdate);
    socket.on(REDIS_CHANNELS.CONTENT_MODERATED, handleModerationUpdate);
    socket.on(REDIS_CHANNELS.FEEDS_UPDATED, handleContentUpdate);
    socket.on(REDIS_CHANNELS.ARTICLES_BULK_MODERATED, handleContentUpdate);

    return () => {
      socket.off(REDIS_CHANNELS.CONTENT_UPDATED, handleContentUpdate);
      socket.off(REDIS_CHANNELS.CONTENT_MODERATED, handleModerationUpdate);
      socket.off(REDIS_CHANNELS.FEEDS_UPDATED, handleContentUpdate);
      socket.off(REDIS_CHANNELS.ARTICLES_BULK_MODERATED, handleContentUpdate);
    };
  }, [socket, loadContent]);

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
      description: 'Unified view of all content types',
    },
    {
      key: 'moderation',
      label: 'Moderation',
      icon: '🛡️',
      description: 'Content approval and moderation tools',
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: '📈',
      description: 'Content performance and insights',
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
    <div className={`bg-surface rounded-lg border border-muted ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-muted">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content flex items-center">
              <span className="mr-3">🎛️</span>
              Unified Content Management
            </h1>
            <p className="text-tertiary mt-1">
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
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Bulk Actions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-b border-muted">
        <nav className="flex space-x-1">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeView === item.key
                  ? 'bg-primary text-white'
                  : 'text-tertiary hover:text-content hover:bg-background'
              }`}
              title={item.description}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bulk Moderation Panel */}
      {showModerationPanel && (
        <ContentModerationPanel
          selectedContent={selectedContent}
          onBulkOperation={handleBulkOperation}
          onClose={() => setShowModerationPanel(false)}
          className="mx-6 mt-4"
        />
      )}

      {/* Main Content Area */}
      <div className="p-6">
        {activeView === 'overview' && (
          <ContentOverview
            totalContent={totalCount}
            selectedFilters={filters}
            onQuickFilter={handleFiltersChange}
          />
        )}

        {activeView === 'content' && (
          <div className="space-y-6">
            <ContentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
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
          <ContentModerationPanel
            selectedContent={selectedContent}
            onBulkOperation={handleBulkOperation}
            showQuickActions={true}
          />
        )}

        {activeView === 'analytics' && <ContentAnalytics filters={filters} content={content} />}

        {activeView === 'feeds' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* RSS Feeds Management - Main Section */}
              <div className="xl:col-span-2">
                <FeedsManager />
              </div>

              {/* OPML Tools - Side Panel */}
              <div className="xl:col-span-1">
                <div className="bg-background rounded-lg border border-muted p-6">
                  <div className="text-lg font-semibold text-content mb-4 flex items-center">
                    <span className="mr-2">📦</span>
                    OPML Import/Export
                  </div>
                  <OPMLManager />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentDashboard;
