// apps/client/src/components/admin/FeedsManager.tsx
import React, { useState, useEffect } from 'react';
import type { PublicFeedSource, CreateFeedRequest, UpdateFeedRequest, FeedStatsResponse } from '@ems/types';
import { useSocket } from '../../contexts/SocketContext';

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
  const socket = useSocket();

  useEffect(() => {
    loadFeeds();
  }, []);

  // Socket.IO integration for real-time feed updates
  useEffect(() => {
    if (!socket) return;

    // Listen for feed refresh notifications
    const handleFeedRefresh = (data: any) => {
      console.log('[FeedsManager] Feed refresh notification:', data);
      
      // Show success notification or update feed status
      // For now, just refresh the feeds list
      loadFeeds();
    };

    // Register event listeners
    socket.on('timeline:feed:refresh', handleFeedRefresh);

    return () => {
      socket.off('timeline:feed:refresh', handleFeedRefresh);
    };
  }, [socket]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/feeds', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch feeds: ${response.status}`);
      }
      
      const feedsData = await response.json();
      setFeeds(feedsData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeed = async (feedData: CreateFeedRequest) => {
    try {
      const response = await fetch('/api/admin/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(feedData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create feed: ${response.status}`);
      }
      
      const newFeed = await response.json();
      setFeeds(prev => [...prev, newFeed]);
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feed');
    }
  };

  const handleUpdateFeed = async (feedId: number, updateData: UpdateFeedRequest) => {
    try {
      const response = await fetch(`/api/admin/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update feed: ${response.status}`);
      }
      
      const updatedFeed = await response.json();
      setFeeds(prev => prev.map(feed => feed.id === feedId ? updatedFeed : feed));
      setEditingFeed(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feed');
    }
  };

  const handleDeleteFeed = async (feedId: number) => {
    if (!confirm('Are you sure you want to delete this feed? This will also delete all its articles.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/feeds/${feedId}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete feed: ${response.status}`);
      }
      
      setFeeds(prev => prev.filter(feed => feed.id !== feedId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feed');
    }
  };

  const handleRefreshFeed = async (feedId: number) => {
    try {
      // Note: Manual refresh endpoint not yet implemented in backend
      const response = await fetch(`/api/admin/feeds/${feedId}/refresh`, { 
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh feed: ${response.status}`);
      }
      
      // Reload feeds to get updated fetch status
      await loadFeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh feed');
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Loading feeds...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">RSS Feeds Manager</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Feed
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {feeds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No feeds configured</p>
            <p>Add your first RSS feed to start ingesting content.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Fetch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeds.map((feed) => (
                  <tr key={feed.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{feed.name}</div>
                        <div className="text-sm text-gray-500">{feed.url}</div>
                        {feed.siteUrl && (
                          <div className="text-xs text-blue-600">
                            <a href={feed.siteUrl} target="_blank" rel="noopener noreferrer">
                              {feed.siteUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        feed.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800'
                          : feed.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {feed.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {feed.fetchCount > 0 && (
                          <>
                            <div>Fetches: {feed.fetchCount}</div>
                            <div>Errors: {feed.errorCount}</div>
                            {feed.lastErrorMsg && (
                              <div className="text-red-600 text-xs truncate max-w-xs" title={feed.lastErrorMsg}>
                                {feed.lastErrorMsg}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {feed.lastFetchedAt ? (
                        <div>
                          <div>{new Date(feed.lastFetchedAt).toLocaleDateString()}</div>
                          <div className="text-xs">{new Date(feed.lastFetchedAt).toLocaleTimeString()}</div>
                        </div>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setEditingFeed(feed)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRefreshFeed(feed.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => handleDeleteFeed(feed.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Feed Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Feed</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateFeed({
                name: formData.get('name') as string,
                url: formData.get('url') as string,
                siteUrl: formData.get('siteUrl') as string || undefined,
                allowImages: (formData.get('allowImages') as string) === 'on'
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., TechCrunch"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">RSS/Atom URL</label>
                  <input
                    type="url"
                    name="url"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="https://example.com/feed.xml"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Site URL (optional)</label>
                  <input
                    type="url"
                    name="siteUrl"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowImages"
                      defaultChecked
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Allow images</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Feed</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateFeed(editingFeed.id, {
                name: formData.get('name') as string,
                url: formData.get('url') as string,
                siteUrl: formData.get('siteUrl') as string || undefined,
                status: formData.get('status') as 'ACTIVE' | 'PAUSED' | 'BLOCKED',
                allowImages: (formData.get('allowImages') as string) === 'on'
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingFeed.name}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">RSS/Atom URL</label>
                  <input
                    type="url"
                    name="url"
                    required
                    defaultValue={editingFeed.url}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Site URL</label>
                  <input
                    type="url"
                    name="siteUrl"
                    defaultValue={editingFeed.siteUrl || ''}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    defaultValue={editingFeed.status}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowImages"
                      defaultChecked={editingFeed.allowImages}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Allow images</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingFeed(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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