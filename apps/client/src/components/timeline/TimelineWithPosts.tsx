import React, { useState, useEffect, useCallback } from 'react';
import type { TimelineItem, TimelineResponse } from '@ems/types';
import { timelineApi } from '../../api/timeline';
import ArticleCard from './ArticleCard';
import ArticleDrawer from './ArticleDrawer';
import UseAsSourceModal from './UseAsSourceModal';
import { useTimelineSocket } from '../../hooks/useTimelineSocket';
import { CommunityPosts } from '../posts/CommunityPosts';

interface TimelineWithPostsProps {
  className?: string;
  initialTab?: 'articles' | 'posts';
}

/**
 * Enhanced Timeline component with Articles | Community Posts interface
 * Replaces the old Articles | Tweets tabs
 */
export const TimelineWithPosts: React.FC<TimelineWithPostsProps> = ({
  className = '',
  initialTab = 'articles',
}) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'posts'>(initialTab);
  const [articles, setArticles] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [showArticleDrawer, setShowArticleDrawer] = useState(false);
  const [showUseAsSourceModal, setShowUseAsSourceModal] = useState(false);
  const [sourceItem, setSourceItem] = useState<TimelineItem | null>(null);

  // Socket connection for real-time updates (only for articles)
  useTimelineSocket({
    onNewArticle: (article) => {
      if (activeTab === 'articles') {
        setArticles((prev) => [article, ...prev]);
      }
    },
    onNewTweet: () => {}, // No longer needed
  });

  // Load articles when tab changes to articles
  useEffect(() => {
    if (activeTab === 'articles') {
      loadArticles(true);
    }
  }, [activeTab]);

  const loadArticles = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const data: TimelineResponse = await timelineApi.getArticles({
        cursor: reset ? undefined : cursor,
        limit: 20,
      });

      if (reset) {
        setArticles(data.items);
        setCursor(undefined);
      } else {
        setArticles((prev) => [...prev, ...data.items]);
      }

      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
      console.error('Error loading articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'articles' && !loading && hasMore && cursor) {
      loadArticles(false);
    }
  }, [activeTab, loading, hasMore, cursor]);

  // Handle article interactions
  const handleViewDetails = (item: TimelineItem) => {
    setSelectedItem(item);
    setShowArticleDrawer(true);
  };

  const handleUseAsSource = (item: TimelineItem) => {
    setSourceItem(item);
    setShowUseAsSourceModal(true);
  };

  const handleCloseDrawer = () => {
    setShowArticleDrawer(false);
    setSelectedItem(null);
  };

  const handleCloseModal = () => {
    setShowUseAsSourceModal(false);
    setSourceItem(null);
  };

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="flex border-b border-muted mb-6">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'articles'
              ? 'border-primary text-primary'
              : 'border-transparent text-tertiary hover:text-content hover:border-muted'
          }`}
        >
          Articles
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-primary text-primary'
              : 'border-transparent text-tertiary hover:text-content hover:border-muted'
          }`}
        >
          Community Posts
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'articles' && (
        <div>
          {/* Articles Loading State */}
          {loading && articles.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-tertiary">Loading articles...</p>
            </div>
          )}

          {/* Articles Error State */}
          {error && articles.length === 0 && (
            <div className="text-center py-8">
              <p className="text-error mb-4">{error}</p>
              <button
                onClick={() => loadArticles(true)}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Articles List */}
          {articles.length > 0 && (
            <>
              <div className="space-y-4">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    item={article}
                    onViewDetails={handleViewDetails}
                    onUseAsSource={handleUseAsSource}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More Articles'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && articles.length === 0 && (
            <div className="text-center py-8">
              <p className="text-tertiary">No articles available at the moment.</p>
            </div>
          )}
        </div>
      )}

      {/* Community Posts Tab */}
      {activeTab === 'posts' && <CommunityPosts showCreateForm={true} />}

      {/* Article Drawer */}
      {showArticleDrawer && selectedItem && (
        <ArticleDrawer
          item={selectedItem}
          onClose={handleCloseDrawer}
          onUseAsSource={handleUseAsSource}
        />
      )}

      {/* Use as Source Modal */}
      {showUseAsSourceModal && sourceItem && (
        <UseAsSourceModal item={sourceItem} onClose={handleCloseModal} />
      )}
    </div>
  );
};
