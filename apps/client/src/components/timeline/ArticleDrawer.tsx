// apps/client/src/components/timeline/ArticleDrawer.tsx
import React, { useState, useEffect } from 'react';
import type { TimelineItem, PublicArticle } from '@ems/types';
import { timelineAPIs } from '../../api/timeline';

interface ArticleDrawerProps {
  item: TimelineItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUseAsSource?: (item: TimelineItem) => void;
}

/**
 * Article drawer/modal for full article details
 * Features:
 * - Full article content display
 * - Related predictions
 * - Use as prediction source
 * - External link to original article
 * - Responsive slide-out design
 */
export const ArticleDrawer: React.FC<ArticleDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onUseAsSource
}) => {
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item && item.type === 'article') {
      loadArticleDetails();
    }
  }, [isOpen, item]);

  const loadArticleDetails = async () => {
    if (!item) return;
    
    try {
      setLoading(true);
      setError(null);
      const articleId = parseInt(item.id.replace('article-', ''));
      const articleData = await timelineAPIs.timeline.getArticleDetails(articleId);
      setArticle(articleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleUseAsSource = () => {
    if (item && onUseAsSource) {
      onUseAsSource(item);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Article Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading article...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-6">
              {error}
            </div>
          )}

          {item && !loading && (
            <>
              {/* Article Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">
                  {item.content.title}
                </h1>

                {/* Meta Information */}
                <div className="flex flex-wrap items-center text-sm text-gray-500 space-x-4 mb-4">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {item.content.author}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(article?.publishedAt || null)}
                  </span>
                  {item.content.source && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {item.content.source}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Lead Image */}
              {item.content.imageUrl && (
                <div className="mb-6">
                  <img
                    src={item.content.imageUrl}
                    alt={item.content.title}
                    className="w-full rounded-lg shadow-sm"
                  />
                </div>
              )}

              {/* Article Excerpt/Content */}
              {item.content.excerpt && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {item.content.excerpt}
                  </p>
                </div>
              )}

              {/* Related Predictions */}
              {item.sourceLinks && item.sourceLinks.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Predictions</h3>
                  <div className="space-y-2">
                    {item.sourceLinks.map((link) => (
                      <div key={link.id}>
                        <a
                          href={`/predictions/${link.predictionId}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {link.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engagement Stats */}
              <div className="mb-6 flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {item.engagement.reactions} reactions
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {item.engagement.comments} comments
                </span>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 -mx-6 px-6 pb-6">
                <div className="flex space-x-3">
                  <button
                    onClick={handleUseAsSource}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    📊 Use as Prediction Source
                  </button>
                  <a
                    href={item.content.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-center"
                  >
                    🔗 Read Original
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ArticleDrawer;