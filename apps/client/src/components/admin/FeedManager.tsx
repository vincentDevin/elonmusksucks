// apps/client/src/components/admin/FeedManager.tsx
import React, { useState, useEffect } from 'react';
import type { PublicFeedSource } from '@ems/types';
import { timelineAPIs } from '../../api/timeline';

interface FeedManagerProps {
  className?: string;
}

/**
 * Admin component for managing RSS feeds
 * Features:
 * - List all feeds with health statistics
 * - Add new RSS feeds
 * - Edit existing feeds
 * - Delete feeds
 * - Manual feed refresh
 * - Feed health monitoring
 */
export const FeedManager: React.FC<FeedManagerProps> = ({ className = '' }) => {
  const [feeds, setFeeds] = useState<PublicFeedSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      setError(null);
      const feedData = await timelineAPIs.feeds.getAllFeeds();
      setFeeds(feedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFeed = async (feedId: number) => {
    try {
      setRefreshing((prev) => new Set(prev).add(feedId));
      await timelineAPIs.feeds.refreshFeed(feedId);
      await loadFeeds(); // Reload to get updated stats
    } catch (err) {
      console.error('Failed to refresh feed:', err);
    } finally {
      setRefreshing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(feedId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastFetch = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading && feeds.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading feeds...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RSS Feed Management</h2>
          <p className="text-gray-600 mt-1">Manage RSS feeds for the timeline</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Feed
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Feeds</h3>
          <p className="text-2xl font-bold text-gray-900">{feeds.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Feeds</h3>
          <p className="text-2xl font-bold text-green-600">
            {feeds.filter((f) => f.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Error Feeds</h3>
          <p className="text-2xl font-bold text-red-600">
            {feeds.filter((f) => f.status === 'ERROR').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Articles This Week</h3>
          <p className="text-2xl font-bold text-blue-600">
            {/* TODO: Add article count from API */}
            --
          </p>
        </div>
      </div>

      {/* Feeds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                Last Fetch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metrics
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {feeds.map((feed) => (
              <tr key={feed.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{feed.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {feed.siteUrl || feed.url}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(feed.status)}`}
                  >
                    {feed.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div>{formatLastFetch(feed.lastFetchedAt)}</div>
                    {feed.lastErrorAt && (
                      <div className="text-xs text-red-600 truncate max-w-xs">
                        Error: {feed.lastErrorMsg}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    <div>Fetches: {feed.fetchCount}</div>
                    <div className={feed.errorCount > 0 ? 'text-red-600' : ''}>
                      Errors: {feed.errorCount}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleRefreshFeed(feed.id)}
                      disabled={refreshing.has(feed.id)}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                    >
                      {refreshing.has(feed.id) ? '⏳' : '🔄'}
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">✏️</button>
                    <button className="text-red-600 hover:text-red-900">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {feeds.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium mb-2">No feeds configured</p>
              <p className="text-sm">Add your first RSS feed to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* TODO: Add Feed Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add RSS Feed</h3>
            <p className="text-gray-600 mb-4">Feed creation functionality coming soon...</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedManager;
