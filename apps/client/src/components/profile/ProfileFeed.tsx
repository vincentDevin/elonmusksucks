// apps/client/src/components/ProfileFeed.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { UserFeedPost, ReactionType } from '@ems/types';
import { CreatePostForm } from './CreatePostForm';
import { ReactionPicker } from '../posts/ReactionPicker';
import { PostReactions } from '../posts/PostReactions';
import { PostActions } from '../posts/PostActions';
import { PostModerationModal } from '../posts/PostModerationModal';
import { MentionRenderer } from '../posts/MentionRenderer';
import { useReactions } from '../../hooks/useReactions';

type ProfileFeedProps = {
  feed: UserFeedPost[];
  loading?: boolean;
  onSubmit?: (
    content: string,
    parentId?: number | null,
    options?: {
      visibility?: any;
      contentType?: any;
    },
  ) => Promise<void>;
};

export function ProfileFeed({ feed, loading = false, onSubmit }: ProfileFeedProps) {
  if (loading) return <div>Loading feed…</div>;
  if (!feed.length) return <div className="text-gray-500">No posts yet.</div>;

  return (
    <div className="space-y-4">
      {feed.map((post) => (
        <FeedPost key={post.id} post={post} onSubmit={onSubmit} />
      ))}
    </div>
  );
}

function FeedPost({
  post,
  onSubmit,
}: {
  post: UserFeedPost;
  onSubmit?: (content: string, parentId?: number | null) => Promise<void>;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [localPost, setLocalPost] = useState(post);

  const {
    counts,
    userReaction,
    toggleReaction,
    fetchReactions,
    loading: reactionsLoading,
    error: reactionsError,
  } = useReactions(localPost.id, localPost.reactionCounts, localPost.userReaction);

  const handleReplySubmit = async (content: string, parentId?: number | null, options?: any) => {
    if (onSubmit) {
      await onSubmit(content, parentId, options);
      setIsReplying(false);
    }
  };

  const handleReactionSelect = async (type: ReactionType) => {
    try {
      await toggleReaction(type);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleShowReactionDetails = async (postId: number) => {
    setShowReactionDetails(true);
  };

  const handleShare = (postId: number, newShareCount: number) => {
    setLocalPost((prev) => ({
      ...prev,
      sharesCount: newShareCount,
    }));
  };

  const handleReport = (postId: number) => {
    setShowModerationModal(true);
  };

  const handleReportSubmitted = (postId: number) => {
    // Optional: Show success message or update UI
    console.log('Report submitted for post:', postId);
  };

  const handleEdit = (postId: number) => {
    // TODO: Open edit modal
    console.log('Edit post:', postId);
  };

  const handleDelete = (postId: number) => {
    // TODO: Call delete API and remove from feed
    console.log('Delete post:', postId);
  };

  return (
    <div className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors">
      {/* Author Header with Profile Picture */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <Link to={`/profile/${post.authorId}`} className="flex-shrink-0">
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName || 'User'}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-lg ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                {post.authorName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Link
                to={`/profile/${post.authorId}`}
                className="font-semibold text-content hover:text-primary transition-colors text-base"
              >
                {post.authorName || 'Unknown User'}
              </Link>
              {post.visibility !== 'PUBLIC' && (
                <span className="px-2 py-0.5 bg-muted/50 rounded-full text-xs font-medium">
                  {post.visibility.toLowerCase()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-tertiary">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              {post.editedAt && (
                <>
                  <span>•</span>
                  <span className="italic">edited</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <MentionRenderer content={post.content} className="text-content" />

        {/* Media URLs */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {post.mediaUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Media ${index + 1}`}
                className="rounded-lg w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        )}

        {/* Link Preview */}
        {post.linkPreview && (
          <div className="mt-3 border border-muted rounded-lg p-3 hover:bg-muted/10 transition-colors">
            <a
              href={post.linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {post.linkPreview.image && (
                <img
                  src={post.linkPreview.image}
                  alt={post.linkPreview.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <h4 className="font-semibold text-content hover:text-primary">
                {post.linkPreview.title}
              </h4>
              {post.linkPreview.description && (
                <p className="text-sm text-tertiary line-clamp-2">{post.linkPreview.description}</p>
              )}
              <p className="text-xs text-muted mt-1">{new URL(post.linkPreview.url).hostname}</p>
            </a>
          </div>
        )}
      </div>

      {/* Reaction counts */}
      {counts && Object.values(counts).some((count) => count > 0) && (
        <PostReactions
          counts={counts}
          userReaction={userReaction}
          postId={post.id}
          onShowDetails={handleShowReactionDetails}
          className="mb-2"
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 items-center justify-between">
        <div className="flex gap-3 items-center">
          <ReactionPicker
            onReactionSelect={handleReactionSelect}
            userReaction={userReaction}
            disabled={reactionsLoading}
          />

          {onSubmit && !isReplying && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-tertiary hover:bg-muted hover:text-content transition-colors"
              onClick={() => setIsReplying(true)}
            >
              💬 Reply
            </button>
          )}

          {isReplying && (
            <button
              className="text-sm text-tertiary hover:text-content px-2 py-1"
              onClick={() => setIsReplying(false)}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Post Actions */}
        <PostActions
          post={localPost}
          onShare={handleShare}
          onReport={handleReport}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Error display */}
      {reactionsError && (
        <div className="mt-2 text-sm text-error bg-error/10 px-2 py-1 rounded border border-error/20">
          {reactionsError}
        </div>
      )}

      {/* Reply form directly below this post */}
      {isReplying && (
        <div className="mt-3 pl-4 border-l-2 border-primary/30">
          <CreatePostForm onSubmit={handleReplySubmit} parentId={post.id} disabled={false} />
        </div>
      )}

      {/* Render comments if present */}
      {post.children && post.children.length > 0 && (
        <div className="ml-4 border-l border-muted pl-3 mt-2 space-y-2">
          {post.children.map((child) => (
            <FeedPost key={child.id} post={child} onSubmit={onSubmit} />
          ))}
        </div>
      )}

      {/* Moderation Modal */}
      <PostModerationModal
        post={localPost}
        isOpen={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
