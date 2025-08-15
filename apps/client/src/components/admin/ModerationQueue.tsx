// apps/client/src/components/admin/ModerationQueue.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ArticleModerationData } from '@ems/types';
import { useSocket } from '../../contexts/SocketContext';
import * as feedsAPI from '../../api/feeds';

interface ModerationQueueProps {
  className?: string;
}

/**
 * Admin component for article moderation queue
 * Features:
 * - List pending articles with preview
 * - Bulk approve/reject operations
 * - Individual article moderation
 * - Tag management and bulk retagging
 * - Moderation notes
 * - Real-time updates via Socket.IO
 */
export const ModerationQueue: React.FC<ModerationQueueProps> = ({ className = '' }) => {
  const [articles, setArticles] = useState<ArticleModerationData[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedFeed, setSelectedFeed] = useState<string>('all');
  const [availableFeeds, setAvailableFeeds] = useState<{ id: number; name: string }[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const socket = useSocket();

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
    loadArticles();
    loadAvailableFeeds();
  }, [filter]);

  useEffect(() => {
    loadArticles();
  }, [currentPage, pageSize, debouncedSearchQuery, selectedFeed]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Socket.IO integration for real-time admin updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new articles requiring moderation
    const handleNewArticle = (data: any) => {
      console.log('[ModerationQueue] New article for moderation:', data);

      // Only update if we're viewing pending articles
      if (filter === 'pending' || filter === 'all') {
        loadArticles();
      }
    };

    // Listen for bulk moderation updates
    const handleBulkModeration = (data: any) => {
      console.log('[ModerationQueue] Bulk moderation completed:', data);

      // Clear selected articles and reload
      setSelectedArticles(new Set());
      setBulkProcessing(false);
      loadArticles();
    };

    // Listen for bulk retagging updates
    const handleBulkRetagging = (data: any) => {
      console.log('[ModerationQueue] Bulk retagging completed:', data);

      // Reload articles to show updated tags
      loadArticles();
    };

    // Register event listeners
    socket.on('feed:article:new', handleNewArticle);
    socket.on('admin:moderation:bulk', handleBulkModeration);
    socket.on('admin:retagging:bulk', handleBulkRetagging);

    return () => {
      socket.off('feed:article:new', handleNewArticle);
      socket.off('admin:moderation:bulk', handleBulkModeration);
      socket.off('admin:retagging:bulk', handleBulkRetagging);
    };
  }, [socket, filter]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      const articlesData = await feedsAPI.getArticlesForModeration({
        status: filter === 'all' ? undefined : filter.toUpperCase(),
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        search: debouncedSearchQuery.trim() || undefined,
        feedId: selectedFeed === 'all' ? undefined : selectedFeed,
      });

      // If this is a paginated response, extract articles and pagination info
      if (typeof articlesData === 'object' && 'articles' in articlesData) {
        setArticles(articlesData.articles);
        setTotalPages(Math.ceil(articlesData.total / pageSize));
      } else {
        // Fallback for non-paginated response
        setArticles(articlesData);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFeeds = async () => {
    try {
      const feeds = await feedsAPI.listFeeds();
      setAvailableFeeds(feeds.map((feed) => ({ id: feed.id, name: feed.name })));
    } catch (err) {
      console.error('Failed to load feeds for filter:', err);
      // Don't set error state for this, just log it
    }
  };

  const handleBulkModeration = async (action: 'APPROVED' | 'REJECTED', notes?: string) => {
    if (selectedArticles.size === 0) return;

    try {
      setBulkProcessing(true);

      await feedsAPI.bulkModerateArticles({
        ids: Array.from(selectedArticles),
        action,
        notes,
      });

      // Clear selected articles and reload immediately, don't wait for socket
      setSelectedArticles(new Set());
      setBulkProcessing(false);
      loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate articles');
      setBulkProcessing(false);
    }
  };

  const handleBulkRetagging = async (addTags: string[], removeTags: string[]) => {
    if (selectedArticles.size === 0) return;

    try {
      await feedsAPI.bulkRetagArticles({
        ids: Array.from(selectedArticles),
        add: addTags,
        remove: removeTags,
      });

      // Socket.IO handler will reload articles
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retag articles');
    }
  };

  const toggleArticleSelection = (articleId: number) => {
    setSelectedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedArticles(new Set(articles.map((a) => a.id)));
  };

  const clearSelection = () => {
    setSelectedArticles(new Set());
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success/10 text-success border border-success/20';
      case 'REJECTED':
        return 'bg-danger/10 text-danger border border-danger/20';
      case 'PENDING':
        return 'bg-warning/10 text-warning border border-warning/20';
      default:
        return 'bg-muted/10 text-muted border border-muted/20';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-content">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2">Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-content">Content Moderation Queue</h2>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-muted/10 rounded-lg p-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-primary text-primary-foreground'
                  : 'text-content/70 hover:text-content hover:bg-muted/10'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-danger/10 text-danger border border-danger/20 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search articles by title, content, or feed name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-content/70">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-muted rounded-md px-2 py-1 bg-background text-content focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-content/70">per page</span>
          </div>
        </div>

        {/* Feed Filter */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-content">Filter by RSS Feed:</label>
          <select
            value={selectedFeed}
            onChange={(e) => {
              setSelectedFeed(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[200px]"
          >
            <option value="all">All Feeds</option>
            {availableFeeds.map((feed) => (
              <option key={feed.id} value={feed.id.toString()}>
                {feed.name}
              </option>
            ))}
          </select>
          {selectedFeed !== 'all' && (
            <button
              onClick={() => setSelectedFeed('all')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedArticles.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-content font-medium">
              {selectedArticles.size} article{selectedArticles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkModeration('APPROVED')}
                disabled={bulkProcessing}
                className="px-3 py-1 bg-success text-surface rounded-md hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? 'Processing...' : 'Approve All'}
              </button>
              <button
                onClick={() => handleBulkModeration('REJECTED')}
                disabled={bulkProcessing}
                className="px-3 py-1 bg-danger text-surface rounded-md hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {bulkProcessing ? 'Processing...' : 'Reject All'}
              </button>
              <button
                onClick={() => {
                  // Example: Add "Tesla" tag to selected articles
                  handleBulkRetagging(['Tesla'], []);
                }}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Tag Tesla
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-content/70 border border-muted rounded-md hover:bg-muted/5 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface border border-muted rounded-lg overflow-hidden shadow-sm">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-content/70">
            <p className="text-lg mb-2">No articles found</p>
            <p>
              {filter === 'pending'
                ? 'No articles are currently pending moderation.'
                : `No ${filter} articles found.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-muted">
            {/* Header with select all */}
            <div className="p-4 bg-muted/5 border-b border-muted">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedArticles.size === articles.length && articles.length > 0}
                  onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                  className="mr-2 text-primary focus:ring-primary"
                />
                <span className="text-sm text-content/60">
                  Select all ({articles.length} articles)
                </span>
              </label>
            </div>

            {/* Article List */}
            {articles.map((article) => {
              const isSelected = selectedArticles.has(article.id);
              const isExpanded = expandedArticle === article.id;

              return (
                <div key={article.id} className="p-4 hover:bg-muted/5">
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleArticleSelection(article.id)}
                      className="mt-1 text-primary focus:ring-primary"
                    />

                    {/* Article Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-content font-medium leading-tight">
                            {article.title}
                          </h3>

                          {/* Feed and Publication Date */}
                          <div className="flex items-center space-x-2 mt-1 text-sm text-content/60">
                            <span className="font-medium">{article.feedName}</span>
                            <span>•</span>
                            <span>{formatDate(article.publishedAt)}</span>
                          </div>

                          {/* Excerpt */}
                          {article.excerpt && (
                            <p className="mt-2 text-sm text-content/70">
                              {isExpanded ? article.excerpt : truncateText(article.excerpt, 200)}
                            </p>
                          )}

                          {/* Tags */}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Moderation Notes */}
                          {article.modNotes && (
                            <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm">
                              <strong>Mod Notes:</strong> {article.modNotes}
                            </div>
                          )}
                        </div>

                        {/* Status and Actions */}
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(article.status)}`}
                          >
                            {article.status}
                          </span>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                              className="text-primary hover:text-primary/80 text-sm"
                            >
                              {isExpanded ? 'Collapse' : 'Expand'}
                            </button>

                            {article.url && (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 text-sm"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-muted">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong className="text-content">URL:</strong>
                              <div className="text-content/60 break-all">{article.url}</div>
                            </div>
                            <div>
                              <strong className="text-content">Feed:</strong>
                              <div className="text-content/60">{article.feedName}</div>
                            </div>
                            <div>
                              <strong className="text-content">Status:</strong>
                              <div className="text-content/60">{article.status}</div>
                            </div>
                            <div>
                              <strong className="text-content">Published:</strong>
                              <div className="text-content/60">
                                {formatDate(article.publishedAt)}
                              </div>
                            </div>
                            {article.leadImageUrl && (
                              <div className="col-span-2">
                                <strong className="text-content">Lead Image:</strong>
                                <div className="mt-1">
                                  <img
                                    src={article.leadImageUrl}
                                    alt="Article lead"
                                    className="max-w-xs max-h-32 object-cover rounded border border-muted"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-content/60">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-content/70 border border-muted rounded-md hover:bg-muted/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            {/* Page numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else {
                  // Show pages around current page
                  const start = Math.max(1, currentPage - 2);
                  const end = Math.min(totalPages, start + 4);
                  pageNum = start + i;
                  if (pageNum > end) return null;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-primary-foreground'
                        : 'text-content/70 border border-muted hover:bg-muted/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-content/70 border border-muted rounded-md hover:bg-muted/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationQueue;
