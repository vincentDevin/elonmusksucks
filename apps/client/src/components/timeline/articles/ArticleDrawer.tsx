// apps/client/src/components/timeline/ArticleDrawer.tsx
import React, { useState, useEffect } from 'react';
import BaseModal from '../../BaseModal';
import type { TimelineItem, PublicArticle } from '@ems/types';
import { timelineAPIs } from '../../../api/timeline';

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
  onUseAsSource,
}) => {
  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comment state
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCursor, setCommentCursor] = useState<string | undefined>(undefined);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && item && item.type === 'article') {
      loadArticleDetails();
      loadComments(true); // Reset comments when opening
    }
  }, [isOpen, item]); // Keep watching original item to avoid infinite loop

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

  const loadComments = async (reset = false) => {
    if (!item) return;

    try {
      setLoadingComments(true);
      const articleId = parseInt(item.id.replace('article-', ''));
      const commentsData = await timelineAPIs.timeline.getComments(articleId, {
        limit: 20,
        cursor: reset ? undefined : commentCursor,
      });

      if (reset) {
        setComments(commentsData.comments);
      } else {
        setComments((prev) => [...prev, ...commentsData.comments]);
      }

      setCommentCursor(commentsData.pagination.cursor);
      setHasMoreComments(commentsData.pagination.hasMore);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !item || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const articleId = parseInt(item.id.replace('article-', ''));
      const comment = await timelineAPIs.timeline.addComment(articleId, newComment.trim());

      // Add new comment to the top of the list
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Article Details"
      icon="📄"
      actions={[
        {
          label: '📊 Use as Prediction Source',
          onClick: () => item && onUseAsSource?.(item),
          variant: 'primary',
          icon: '📊',
        },
        {
          label: '🔗 Read Original',
          onClick: () => item?.content?.url && window.open(item.content.url, '_blank'),
          variant: 'secondary',
          icon: '🔗',
        },
      ]}
    >
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-content/70">Loading article...</span>
          </div>
        )}

        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-6">{error}</div>}

        {item && !loading && (
          <>
            {/* Article Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-content leading-tight mb-4">
                {item?.content?.title || 'Untitled'}
              </h1>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center text-sm text-content/60 space-x-4 mb-4">
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {item?.content.author || 'Unknown'}
                </span>
                <span className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatDate(article?.publishedAt || null)}
                </span>
                {item?.content.source && (
                  <span className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    {item?.content.source}
                  </span>
                )}
              </div>

              {/* Tags */}
              {item?.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Lead Image */}
            {item?.content.imageUrl && (
              <div className="mb-6">
                <img
                  src={item?.content.imageUrl}
                  alt={item?.content.title}
                  className="w-full rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Article Excerpt/Content */}
            {item?.content.excerpt && (
              <div className="mb-6">
                <p className="text-content/80 leading-relaxed text-lg">{item?.content.excerpt}</p>
              </div>
            )}

            {/* Related Predictions */}
            {item?.sourceLinks && item.sourceLinks.length > 0 && (
              <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                <h3 className="text-sm font-semibold text-content mb-3">Related Predictions</h3>
                <div className="space-y-2">
                  {item.sourceLinks.map((link) => (
                    <div key={link.id}>
                      <a
                        href={`/predictions/${link.predictionId}`}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        {link.title}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Stats */}
            <div className="mb-6 flex items-center space-x-6 text-sm text-content/60">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {item.engagement.reactions} reactions
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {item.engagement.comments} comments
              </span>
            </div>

            {/* Comments Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-content mb-4">
                Comments ({comments.length})
              </h3>

              {/* Add Comment Form */}
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content placeholder-content/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows={3}
                      maxLength={1000}
                      disabled={isSubmitting}
                    />
                    <div className="text-xs text-content/60 mt-1">
                      {newComment.length}/1000 characters
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start"
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {comment.user.avatarUrl ? (
                        <img
                          src={comment.user.avatarUrl}
                          alt={comment.user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-primary text-sm font-medium">
                          {comment.user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-content">{comment.user.name}</span>
                        <span className="text-xs text-content/60">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-content/80 text-sm leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))}

                {/* Load More Comments Button */}
                {hasMoreComments && (
                  <button
                    onClick={() => loadComments(false)}
                    disabled={loadingComments}
                    className="w-full py-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                  >
                    {loadingComments ? 'Loading...' : 'Load more comments'}
                  </button>
                )}

                {/* Empty State */}
                {comments.length === 0 && !loadingComments && (
                  <div className="text-center py-6 text-content/60">
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default ArticleDrawer;
