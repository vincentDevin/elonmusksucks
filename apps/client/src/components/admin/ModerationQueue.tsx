// apps/client/src/components/admin/ModerationQueue.tsx
import React, { useState, useEffect } from 'react';
import type { ArticleModerationData, UpdateArticleRequest } from '@ems/types';
import { useSocket } from '../../contexts/SocketContext';

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
  const socket = useSocket();

  useEffect(() => {
    loadArticles();
  }, [filter]);

  // Socket.IO integration for real-time admin updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new articles requiring moderation
    const handleNewArticle = (data: any) => {
      console.log('[ModerationQueue] New article for moderation:', data);
      
      // Only update if we're viewing pending articles
      if (filter === 'pending' || filter === 'all') {
        // Refresh the articles list to include the new one
        loadArticles();
      }
    };

    // Listen for bulk moderation updates
    const handleBulkModeration = (data: any) => {
      console.log('[ModerationQueue] Bulk moderation completed:', data);
      
      // Clear selection and refresh list
      setSelectedArticles(new Set());
      loadArticles();
    };

    // Listen for bulk retagging updates
    const handleBulkRetagging = (data: any) => {
      console.log('[ModerationQueue] Bulk retagging completed:', data);
      
      // Clear selection and refresh list
      setSelectedArticles(new Set());
      loadArticles();
    };

    // Register event listeners based on Redis events from redisEventHandlers.ts
    socket.on('timeline:article:new', handleNewArticle);
    socket.on('timeline:moderation:bulk', handleBulkModeration);
    socket.on('timeline:retagging:bulk', handleBulkRetagging);

    return () => {
      socket.off('timeline:article:new', handleNewArticle);
      socket.off('timeline:moderation:bulk', handleBulkModeration);
      socket.off('timeline:retagging:bulk', handleBulkRetagging);
    };
  }, [socket, filter]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/feeds/articles?status=${filter}&limit=50`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.status}`);
      }
      
      const articlesData = await response.json();
      setArticles(articlesData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkModerate = async (action: 'APPROVED' | 'REJECTED', notes?: string) => {
    if (selectedArticles.size === 0) return;

    try {
      const response = await fetch('/api/admin/feeds/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ids: Array.from(selectedArticles),
          action,
          notes
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to moderate articles: ${response.status}`);
      }

      setSelectedArticles(new Set());
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate articles');
    }
  };

  const handleModerateArticle = async (articleId: number, action: 'APPROVED' | 'REJECTED', notes?: string) => {
    try {
      const response = await fetch('/api/admin/feeds/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ids: [articleId],
          action,
          notes
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to moderate article: ${response.status}`);
      }

      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to moderate article');
    }
  };

  const handleBulkRetag = async (addTags: string[], removeTags: string[]) => {
    if (selectedArticles.size === 0) return;

    try {
      const response = await fetch('/api/admin/feeds/retag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ids: Array.from(selectedArticles),
          add: addTags,
          remove: removeTags
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to retag articles: ${response.status}`);
      }

      setSelectedArticles(new Set());
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retag articles');
    }
  };

  const toggleArticleSelection = (articleId: number) => {
    setSelectedArticles(prev => {
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
    setSelectedArticles(new Set(articles.map(a => a.id)));
  };

  const clearSelection = () => {
    setSelectedArticles(new Set());
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">Loading moderation queue...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Article Moderation Queue</h2>
        
        <div className="flex gap-2">
          {/* Filter buttons */}
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded capitalize ${
                filter === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedArticles.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {selectedArticles.size} article{selectedArticles.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkModerate('APPROVED')}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Approve Selected
            </button>
            <button
              onClick={() => handleBulkModerate('REJECTED')}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Reject Selected
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No articles found</p>
            <p>
              {filter === 'pending' 
                ? 'No articles pending moderation.' 
                : `No ${filter} articles found.`}
            </p>
          </div>
        ) : (
          <div>
            {/* Bulk selection header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedArticles.size === articles.length && articles.length > 0}
                  onChange={selectedArticles.size === articles.length ? clearSelection : selectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  {selectedArticles.size > 0 
                    ? `${selectedArticles.size} selected`
                    : `${articles.length} articles`
                  }
                </span>
              </div>
              
              {selectedArticles.size > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Bulk actions:</span>
                  <button
                    onClick={() => handleBulkModerate('APPROVED')}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => handleBulkModerate('REJECTED')}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject All
                  </button>
                </div>
              )}
            </div>

            {/* Articles list */}
            <div className="divide-y divide-gray-200">
              {articles.map((article) => (
                <div key={article.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.id)}
                      onChange={() => toggleArticleSelection(article.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />

                    {/* Article image */}
                    {article.leadImageUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={article.leadImageUrl}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Article content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {article.feed.name}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            article.status === 'APPROVED' 
                              ? 'bg-green-100 text-green-800'
                              : article.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {article.publishedAt 
                            ? new Date(article.publishedAt).toLocaleDateString()
                            : new Date(article.fetchedAt).toLocaleDateString()
                          }
                        </span>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600"
                        >
                          {article.title}
                        </a>
                      </h3>

                      {article.excerpt && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Moderation notes */}
                      {article.modNotes && (
                        <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded mb-3">
                          <strong>Moderation notes:</strong> {article.modNotes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {article.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleModerateArticle(article.id, 'APPROVED')}
                                className="text-green-600 hover:text-green-900 text-sm font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleModerateArticle(article.id, 'REJECTED')}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View Original
                          </a>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          ID: {article.id} • Fetched: {new Date(article.fetchedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationQueue;