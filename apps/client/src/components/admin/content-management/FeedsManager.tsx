// apps/client/src/components/admin/FeedsManager.tsx
// Rollback: Remove useCallback import and unwrap socket handlers from useCallback
import React, { useState, useEffect, useCallback } from 'react';
import type {
  PublicFeedSource,
  CreateFeedRequest,
  UpdateFeedRequest,
  FeedStatsResponse,
} from '@ems/types';
import { useSocket } from '../../../contexts/SocketContext';
import * as feedsAPI from '../../../api/feeds';

interface FeedsManagerProps {
  className?: string;
}

/**
 * Admin component for RSS feed CRUD operations
 * Features:
 * - List all feeds with health statistics
 * - Add new RSS/Atom feeds
 * - Edit feed settings (name, URL, status)
 * - Delete feeds with confirmation
 * - Manual feed refresh triggers
 * - Feed health monitoring
 */
export const FeedsManager: React.FC<FeedsManagerProps> = ({ className = '' }) => {
  const [feeds, setFeeds] = useState<PublicFeedSource[]>([]);
  const [stats, setStats] = useState<Record<number, FeedStatsResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<PublicFeedSource | null>(null);
  const [refreshingFeeds, setRefreshingFeeds] = useState<Set<number>>(new Set());
  const socket = useSocket();

  useEffect(() => {
    loadFeeds();
    loadStats();
  }, []);

  // Stable handlers for socket events
  const handleFeedRefresh = useCallback((data: any) => {
    console.log('[FeedsManager] Feed refresh notification:', data);

    // Remove from refreshing set and reload feeds
    setRefreshingFeeds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(data.feedId);
      return newSet;
    });

    loadFeeds();
    loadStats();
  }, []);

  const handleAdminFeedRefresh = useCallback((data: any) => {
    console.log('[FeedsManager] Admin feed refresh:', data);
    loadFeeds();
    loadStats();
  }, []);

  // Socket.IO integration for real-time feed updates
  useEffect(() => {
    if (!socket) return;

    // Register event listeners
    socket.on('admin:feed:refresh', handleAdminFeedRefresh);
    socket.on('timeline:feed:refresh', handleFeedRefresh);

    return () => {
      socket.off('admin:feed:refresh', handleAdminFeedRefresh);
      socket.off('timeline:feed:refresh', handleFeedRefresh);
    };
  }, [socket, handleAdminFeedRefresh, handleFeedRefresh]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      setError(null);

      const feedsData = await feedsAPI.listFeeds();
      setFeeds(feedsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await feedsAPI.getFeedStats();

      // Convert array to object keyed by feedId
      const statsMap = statsData.reduce(
        (acc: Record<number, FeedStatsResponse>, stat: FeedStatsResponse) => {
          acc[stat.feedId] = stat;
          return acc;
        },
        {},
      );

      setStats(statsMap);
    } catch (err) {
      console.error('Failed to load feed stats:', err);
      // Don't set error state for stats failures, just log them
    }
  };

  const handleCreateFeed = async (feedData: CreateFeedRequest) => {
    try {
      const newFeed = await feedsAPI.createFeed(feedData);
      setFeeds((prev) => [...prev, newFeed]);
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feed');
    }
  };

  const handleUpdateFeed = async (feedId: number, updateData: UpdateFeedRequest) => {
    try {
      const updatedFeed = await feedsAPI.updateFeed(feedId, updateData);
      setFeeds((prev) => prev.map((feed) => (feed.id === feedId ? updatedFeed : feed)));
      setEditingFeed(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feed');
    }
  };

  const handleDeleteFeed = async (feedId: number) => {
    if (
      !confirm('Are you sure you want to delete this feed? This will also delete all its articles.')
    ) {
      return;
    }

    try {
      await feedsAPI.deleteFeed(feedId);
      setFeeds((prev) => prev.filter((feed) => feed.id !== feedId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feed');
    }
  };

  const handleRefreshFeed = async (feedId: number) => {
    try {
      setRefreshingFeeds((prev) => new Set(prev).add(feedId));

      await feedsAPI.refreshFeed(feedId);

      // The Socket.IO handler will remove from refreshing set and reload feeds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feed');
      setRefreshingFeeds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(feedId);
        return newSet;
      });
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/10 text-success border border-success/20';
      case 'INACTIVE':
        return 'bg-warning/10 text-warning border border-warning/20';
      case 'ERROR':
        return 'bg-danger/10 text-danger border border-danger/20';
      default:
        return 'bg-muted/10 text-muted border border-muted/20';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return { date: 'Never', time: '' };
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-content">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2">Loading feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-content">RSS Feeds Manager</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Add Feed
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-danger/10 text-danger border border-danger/20 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-surface border border-muted rounded-lg overflow-hidden shadow-sm">
        {feeds.length === 0 ? (
          <div className="p-8 text-center text-content/70">
            <p className="text-lg mb-2">No feeds configured</p>
            <p>Add your first RSS feed to start ingesting content.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-muted">
              <thead className="bg-muted/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content/60 uppercase tracking-wider">
                    Feed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content/60 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content/60 uppercase tracking-wider">
                    Last Fetch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-muted">
                {feeds.map((feed) => {
                  const lastFetch = formatDate(feed.lastFetchedAt);
                  const isRefreshing = refreshingFeeds.has(feed.id);

                  return (
                    <tr key={feed.id} className="hover:bg-muted/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-content">{feed.name}</div>
                          <div className="text-sm text-content/60 break-all">{feed.url}</div>
                          {feed.siteUrl && (
                            <div className="text-xs text-primary">
                              <a
                                href={feed.siteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {feed.siteUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(feed.status)}`}
                        >
                          {feed.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-content/70">
                        <div>
                          {(() => {
                            const feedStats = stats[feed.id];
                            if (!feedStats && feed.fetchCount === 0) {
                              return <span className="text-content/60">No data</span>;
                            }

                            return (
                              <>
                                {feedStats && (
                                  <>
                                    <div>Articles: {feedStats.totalArticles}</div>
                                    <div>Recent (7d): {feedStats.recentArticles}</div>
                                    <div
                                      className={
                                        feedStats.errorRate > 10
                                          ? 'text-danger'
                                          : feedStats.errorRate > 5
                                            ? 'text-warning'
                                            : 'text-success'
                                      }
                                    >
                                      Error Rate: {feedStats.errorRate}%
                                    </div>
                                    <div className="text-xs">
                                      Avg Fetch: {feedStats.avgFetchTime}ms
                                    </div>
                                  </>
                                )}
                                {!feedStats && (
                                  <>
                                    <div>Fetches: {feed.fetchCount}</div>
                                    <div className={feed.errorCount > 0 ? 'text-danger' : ''}>
                                      Errors: {feed.errorCount}
                                    </div>
                                  </>
                                )}
                                {feed.lastErrorMsg && (
                                  <div
                                    className="text-danger text-xs truncate max-w-xs"
                                    title={feed.lastErrorMsg}
                                  >
                                    {feed.lastErrorMsg}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-content/70">
                        {lastFetch.date !== 'Never' ? (
                          <div>
                            <div>{lastFetch.date}</div>
                            <div className="text-xs">{lastFetch.time}</div>
                          </div>
                        ) : (
                          <div>Never</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button
                          onClick={() => setEditingFeed(feed)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRefreshFeed(feed.id)}
                          disabled={isRefreshing}
                          className="text-success hover:text-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isRefreshing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-success mr-1"></div>
                              Refreshing...
                            </>
                          ) : (
                            'Refresh'
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="text-danger hover:text-danger/80 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Feed Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-muted rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-content">Add New Feed</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateFeed({
                  name: formData.get('name') as string,
                  url: formData.get('url') as string,
                  siteUrl: (formData.get('siteUrl') as string) || undefined,
                  allowImages: (formData.get('allowImages') as string) === 'on',
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., TechCrunch"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">
                    RSS/Atom URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    required
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://example.com/feed.xml"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">
                    Site URL (optional)
                  </label>
                  <input
                    type="url"
                    name="siteUrl"
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowImages"
                      defaultChecked
                      className="mr-2 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-content">Allow images</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-content/70 border border-muted rounded-md hover:bg-muted/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Add Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Feed Modal */}
      {editingFeed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-muted rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-content">Edit Feed</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateFeed(editingFeed.id, {
                  name: formData.get('name') as string,
                  url: formData.get('url') as string,
                  siteUrl: (formData.get('siteUrl') as string) || undefined,
                  status: formData.get('status') as 'ACTIVE' | 'INACTIVE' | 'ERROR',
                  allowImages: (formData.get('allowImages') as string) === 'on',
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingFeed.name}
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">
                    RSS/Atom URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    required
                    defaultValue={editingFeed.url}
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Site URL</label>
                  <input
                    type="url"
                    name="siteUrl"
                    defaultValue={editingFeed.siteUrl || ''}
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingFeed.status}
                    className="w-full border border-muted rounded-md px-3 py-2 bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ERROR">Error</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowImages"
                      defaultChecked={editingFeed.allowImages}
                      className="mr-2 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-content">Allow images</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingFeed(null)}
                  className="px-4 py-2 text-content/70 border border-muted rounded-md hover:bg-muted/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Update Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedsManager;
