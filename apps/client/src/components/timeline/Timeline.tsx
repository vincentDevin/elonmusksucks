// apps/client/src/components/timeline/Timeline.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { TimelineItem, TimelineResponse } from '@ems/types';
import { timelineApi } from '../../api/timeline';
import ArticleCard from './ArticleCard';
import ArticleDrawer from './ArticleDrawer';
import UseAsSourceModal from './UseAsSourceModal';
import { useTimelineSocket } from '../../hooks/useTimelineSocket';

interface TimelineProps {
  className?: string;
  initialTab?: 'articles' | 'tweets';
}

/**
 * Main Timeline component with tabbed Articles | Tweets interface
 * Features:
 * - Infinite scroll with cursor-based pagination
 * - Real-time Socket.IO updates for new content
 * - Tab switching between Articles and Tweets
 * - Filter integration
 * - "Use as Prediction Source" on every item
 */
export const Timeline: React.FC<TimelineProps> = ({ className = '', initialTab = 'articles' }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'tweets'>(initialTab);
  const [articles, setArticles] = useState<TimelineItem[]>([]);
  const [tweets, setTweets] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [showArticleDrawer, setShowArticleDrawer] = useState(false);
  const [showUseAsSourceModal, setShowUseAsSourceModal] = useState(false);
  const [sourceItem, setSourceItem] = useState<TimelineItem | null>(null);

  // Load timeline items when tab changes
  useEffect(() => {
    loadTimelineItems(true); // Initial load
  }, [activeTab]);

  const loadTimelineItems = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      // Use the actual API calls - simple routes are working
      const data: TimelineResponse =
        activeTab === 'articles'
          ? await timelineApi.getArticles({
              cursor: !reset ? cursor : undefined,
              limit: 30,
              status: 'APPROVED',
            })
          : await timelineApi.getTweets({
              cursor: !reset ? cursor : undefined,
              limit: 50,
            });

      if (reset) {
        if (activeTab === 'articles') {
          setArticles(data.items);
        } else {
          setTweets(data.items);
        }
      } else {
        if (activeTab === 'articles') {
          setArticles((prev) => [...prev, ...data.items]);
        } else {
          setTweets((prev) => [...prev, ...data.items]);
        }
      }

      setHasMore(data.pagination.hasMore);
      setCursor(data.pagination.cursor);
    } catch (err) {
      console.error('Timeline API error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline');

      // Fallback to empty state on error
      if (reset) {
        if (activeTab === 'articles') {
          setArticles([]);
        } else {
          setTweets([]);
        }
      }
      setHasMore(false);
      setCursor(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'articles' | 'tweets') => {
    if (tab === activeTab) return;

    setActiveTab(tab);
    setCursor(undefined);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadTimelineItems(false);
    }
  };

  const handleUseAsSource = useCallback((item: TimelineItem) => {
    setSourceItem(item);
    setShowUseAsSourceModal(true);
  }, []);

  const handleViewDetails = useCallback((item: TimelineItem) => {
    setSelectedItem(item);
    setShowArticleDrawer(true);
  }, []);

  const closeArticleDrawer = useCallback(() => {
    setShowArticleDrawer(false);
    setSelectedItem(null);
  }, []);

  const closeUseAsSourceModal = useCallback(() => {
    setShowUseAsSourceModal(false);
    setSourceItem(null);
  }, []);

  // Handle real-time updates via Socket.IO
  const handleNewArticles = useCallback((newArticles: TimelineItem[]) => {
    setArticles((prev) => [...newArticles, ...prev]);
  }, []);

  const handleNewTweets = useCallback((newTweets: TimelineItem[]) => {
    setTweets((prev) => [...newTweets, ...prev]);
  }, []);

  const { isConnected } = useTimelineSocket({
    activeTab,
    onNewArticles: handleNewArticles,
    onNewTweets: handleNewTweets,
    onModerationUpdate: (data) => {
      console.log('Moderation update:', data);
      // Could show toast notification or update article status
    },
  });

  const currentItems = activeTab === 'articles' ? articles || [] : tweets || [];

  return (
    <div className={`${className}`}>
      {/* Tab Navigation */}
      <div className="flex justify-between items-center border-b border-gray-200 mb-6">
        <div className="flex">
          <button
            onClick={() => handleTabChange('articles')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'articles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Articles
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
              {articles?.length || 0}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('tweets')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'tweets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tweets
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
              {tweets?.length || 0}
            </span>
          </button>
        </div>

        {/* Real-time connection status */}
        <div className="flex items-center text-xs text-gray-500">
          <div
            className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
          />
          {isConnected ? 'Live updates' : 'Disconnected'}
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Timeline Content */}
      <div className="space-y-4">
        {(!currentItems || currentItems.length === 0) && !loading ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">🚧 Timeline Not Implemented</p>
            <p>This component needs:</p>
            <ul className="mt-2 text-left max-w-md mx-auto space-y-1 text-sm">
              <li>• API integration for {activeTab}</li>
              <li>• Infinite scroll implementation</li>
              <li>• Real-time Socket.IO updates</li>
              <li>• ArticleCard and TweetCard components</li>
              <li>• Filter integration</li>
              <li>• "Use as Source" modal integration</li>
            </ul>
          </div>
        ) : (
          <>
            {/* Timeline Items */}
            {currentItems?.map((item) =>
              item.type === 'article' ? (
                <ArticleCard
                  key={item.id}
                  item={item}
                  onUseAsSource={() => handleUseAsSource(item)}
                  onViewDetails={() => handleViewDetails(item)}
                />
              ) : (
                <div key={item.id} className="bg-white rounded-lg shadow p-4">
                  {/* Social media post card */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">𝕏</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.content.title}</h3>
                      <p className="text-gray-600 mt-1">{item.content.excerpt}</p>
                      <div className="mt-3 flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>❤️ {item.engagement.reactions}</span>
                          <span>💬 {item.engagement.comments}</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => handleUseAsSource(item)}
                          className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          Use as Source
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`px-6 py-2 rounded font-medium ${
                    loading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Article Drawer */}
      <ArticleDrawer
        item={selectedItem}
        isOpen={showArticleDrawer}
        onClose={closeArticleDrawer}
        onUseAsSource={handleUseAsSource}
      />

      {/* Use As Source Modal */}
      <UseAsSourceModal
        item={sourceItem}
        isOpen={showUseAsSourceModal}
        onClose={closeUseAsSourceModal}
      />

      {/* Future: Real-time timeline updates via Socket.IO */}
    </div>
  );
};

export default Timeline;
