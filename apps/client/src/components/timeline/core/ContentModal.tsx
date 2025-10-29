import React from 'react';
import BaseModal from '../../BaseModal';
import { PostReactions } from '../../posts/core/PostReactions';
import { CommentSection } from './CommentSection';
import { useReactions } from '../../../contexts/ReactionContext';
import type { UnifiedFeedItem } from '../../../utils/feedAdapter';
import type { TimelineItem, ReactionType, UserFeedPost } from '@ems/types';

// Type for the full post data structure - can be either from timeline or direct fetch
// TimelineItem['postData'] uses 'content' field, UserFeedPost uses 'body' field
type TimelinePostData = NonNullable<TimelineItem['postData']>;
type FullPostData = TimelinePostData | UserFeedPost;

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: UnifiedFeedItem;
}

/**
 * Modal for displaying both articles and posts with consistent interactions
 * Delegates to existing reaction/comment systems while providing unified UX
 */
export const ContentModal: React.FC<ContentModalProps> = ({ isOpen, onClose, content }) => {
  const { getReactionState, toggleReaction, initializeReactions } = useReactions();
  const contentType = content.type; // 'article' | 'post'
  const contentData = content.originalData;
  const contentId =
    typeof content.id === 'string'
      ? parseInt(content.id.replace(/^(article-|post-)/, ''))
      : content.id;

  // Initialize reactions when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (contentType === 'post' && contentData) {
        const postData = contentData as any;
        // Handle both UserFeedPost (has reactionCounts) and TimelineItem.postData structures
        const counts = postData.reactionCounts || {};
        const reaction = postData.userReaction || undefined;

        console.log('[ContentModal] Initializing reactions:', {
          contentId,
          counts,
          reaction,
          postData,
        });
        initializeReactions('post', contentId, counts, reaction);
      } else if (contentType === 'article') {
        initializeReactions('article', contentId);
      }
    }
  }, [isOpen, contentType, contentId, contentData, initializeReactions]);

  // Get reaction state from context
  const { reactionCounts, userReaction } = getReactionState(contentType, contentId);

  // Type-safe content data
  const articleData = contentType === 'article' ? (contentData as TimelineItem) : null;
  const postData = contentType === 'post' ? (contentData as unknown as FullPostData) : null;

  // Modal title based on content type
  const modalTitle =
    contentType === 'article'
      ? articleData?.content?.title || 'Article Details'
      : `${postData?.authorName || 'User'}'s Post`;

  // Modal icon based on content type
  const modalIcon = contentType === 'article' ? '📄' : '💬';

  // For posts, use a clean modal without any header
  if (contentType === 'post' && postData) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        showCloseButton={false} // No header at all
        className="transition-all duration-300"
      >
        <div className="relative space-y-0">
          {/* Custom Close Button - positioned absolute in top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-tertiary hover:text-content text-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>

          {/* Post Header - User Info */}
          <div className="flex items-start space-x-3 mb-4 p-4">
            <div className="flex-shrink-0">
              {postData.authorAvatar ? (
                <img
                  src={postData.authorAvatar}
                  alt={postData.authorName || 'User'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary text-lg font-medium">
                    {(postData.authorName || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-content text-base">
                  {postData.authorName || 'Unknown User'}
                </h3>
              </div>
              <div className="text-sm text-tertiary">
                {new Date(postData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {postData.editedAt && <span className="italic ml-2">• edited</span>}
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-4 px-4">
            <p className="text-content leading-relaxed whitespace-pre-wrap text-base">
              {'body' in postData ? postData.body : postData.content}
            </p>

            {/* Media Content */}
            {postData.mediaUrls &&
              Array.isArray(postData.mediaUrls) &&
              postData.mediaUrls.length > 0 && (
                <div className="mt-3 space-y-3">
                  {postData.mediaUrls.map((url: string, index: number) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                    const isVideo = /\.(mp4|webm|mov)$/i.test(url);

                    if (isImage) {
                      return (
                        <div key={index} className="rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-auto object-cover max-h-96"
                          />
                        </div>
                      );
                    } else if (isVideo) {
                      return (
                        <div key={index} className="rounded-lg overflow-hidden">
                          <video src={url} controls className="w-full h-auto max-h-96">
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      );
                    } else {
                      return (
                        <div key={index} className="p-3 bg-muted/20 rounded-lg">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 font-medium text-sm"
                          >
                            📎 Attachment {index + 1}
                          </a>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
          </div>

          {/* Modern Action Bar - Instagram/Twitter Style */}
          <div className="border-t border-border/40">
            {/* Primary Actions Row */}
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left: Reactions */}
              <div className="flex items-center space-x-6">
                <PostReactions
                  counts={reactionCounts}
                  userReaction={userReaction}
                  postId={contentId}
                  onReactionSelect={(type: ReactionType) =>
                    toggleReaction(contentType, contentId, type)
                  }
                />
              </div>

              {/* Right: Menu Actions */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => console.log('Share post:', postData.id)}
                  className="p-2 hover:bg-muted/50 rounded-full transition-colors group cursor-pointer"
                  title="Share"
                >
                  <svg
                    className="w-5 h-5 text-content/60 group-hover:text-content"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => console.log('Report post:', postData.id)}
                  className="p-2 hover:bg-muted/50 rounded-full transition-colors group cursor-pointer"
                  title="Report"
                >
                  <svg
                    className="w-5 h-5 text-content/60 group-hover:text-warning"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => console.log('Delete post:', postData.id)}
                  className="p-2 hover:bg-error/10 rounded-full transition-colors group cursor-pointer"
                  title="Delete"
                >
                  <svg
                    className="w-5 h-5 text-content/60 group-hover:text-error"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="px-4 pb-3">
              <div className="flex items-center space-x-4 text-sm text-content/50">
                <span>{postData.commentsCount || 0} comments</span>
                <span>•</span>
                <span>{postData.viewsCount ? Number(postData.viewsCount) : 0} views</span>
                {postData.sharesCount && postData.sharesCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{postData.sharesCount} shares</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-4 pb-4">
            <CommentSection
              contentType="post"
              contentId={contentId}
              comments={[]} // Always fetch fresh comments to get updated avatar URLs
              commentsCount={(postData as any).commentsCount || (postData as any).repliesCount || 0}
              onCommentsUpdate={(updatedComments) => {
                // Update post data with new comments
                console.log('[ContentModal] Comments updated:', updatedComments);
              }}
            />
          </div>
        </div>
      </BaseModal>
    );
  }

  // For articles, keep the existing layout
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" title={modalTitle} icon={modalIcon}>
      <div className="space-y-6">
        {contentType === 'article' && articleData ? (
          <div className="space-y-4">
            <div className="prose max-w-none">
              <h2 className="text-xl font-bold text-content mb-3">{articleData.content?.title}</h2>

              {/* Article Image */}
              {articleData.content?.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-lg mb-4">
                  <img
                    src={articleData.content?.imageUrl}
                    alt={articleData.content?.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {articleData.content?.excerpt && (
                <p className="text-content/80 text-sm leading-relaxed mb-4">
                  {articleData.content?.excerpt}
                </p>
              )}
              {articleData.content?.url && (
                <a
                  href={articleData.content?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  Read full article →
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-tertiary py-8">
            <p>Content not available</p>
          </div>
        )}

        <PostReactions
          counts={reactionCounts}
          userReaction={userReaction}
          postId={contentId}
          onReactionSelect={(type: ReactionType) => toggleReaction(contentType, contentId, type)}
        />

        {/* Comments section for articles */}
        <CommentSection
          contentType="article"
          contentId={contentId}
          comments={[]}
          commentsCount={articleData?.engagement?.comments || 0}
          onCommentsUpdate={(updatedComments) => {
            console.log('Article comments updated:', updatedComments);
          }}
        />
      </div>
    </BaseModal>
  );
};

export default ContentModal;
