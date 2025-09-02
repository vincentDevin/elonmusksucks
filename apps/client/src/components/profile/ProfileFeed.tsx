// apps/client/src/components/ProfileFeed.tsx
import { useState } from 'react';
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
    <div className="border rounded p-3 bg-surface">
      <div className="flex items-center space-x-2">
        <span className="font-bold">{post.authorName ?? `User #${post.authorId}`}</span>
        <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="my-2">
        <MentionRenderer content={post.content} />
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
