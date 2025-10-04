import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { UserFeedPost, ReactionType } from '@ems/types';
import { MentionRenderer } from '../creation/MentionRenderer';
import { PostActions } from './PostActions';
import { PostReactions } from './PostReactions';
import BaseCard from '../../BaseCard';
import { useReactions } from '../../../contexts/ReactionContext';
import { CommentSection } from '../../timeline/core/CommentSection';

interface PostCardProps {
  post: UserFeedPost;
  onUpdate?: (post: UserFeedPost) => void;
  onDelete?: (postId: number) => void;
  onExpand?: (post: UserFeedPost) => void;
  showComments?: boolean;
  isNested?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onUpdate,
  onDelete,
  onExpand,
  showComments = false,
  isNested = false,
}) => {
  const { getReactionState, toggleReaction, initializeReactions } = useReactions();
  const [showReplies, setShowReplies] = useState(showComments);
  const [isDeleted, setIsDeleted] = useState(false);

  // Initialize reactions on mount with actual data from post
  useEffect(() => {
    // Use reaction counts from post data, fallback to empty if not available
    const initialCounts = post.reactionCounts || {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      ANGRY: 0,
      SAD: 0,
    };
    const initialUserReaction = post.userReaction || undefined;
    initializeReactions('post', post.id, initialCounts, initialUserReaction);
  }, [post.id, post.reactionCounts, post.userReaction, initializeReactions]);

  // Get current reaction state from context
  const { reactionCounts, userReaction } = getReactionState('post', post.id);

  const handlePostUpdate = (updatedPost: UserFeedPost) => {
    onUpdate?.(updatedPost);
  };

  const handlePostDelete = () => {
    setIsDeleted(true);
    onDelete?.(post.id);
  };

  const handleReaction = async (type: ReactionType) => {
    await toggleReaction('post', post.id, type);
  };

  if (isDeleted) {
    return (
      <div className={`${isNested ? 'ml-12' : ''} p-4 bg-surface/50 rounded-lg opacity-50`}>
        <p className="text-tertiary italic">This post has been deleted</p>
      </div>
    );
  }

  return (
    <div className={`${isNested ? 'ml-12 border-l-2 border-muted pl-4' : ''}`}>
      <BaseCard
        variant="full"
        className="hover:bg-surface/80"
        hoverable={true}
        as="article"
        onClick={onExpand ? () => onExpand(post) : undefined}
      >
        {/* Author Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <Link to={`/profile/${post.authorId}`} className="flex-shrink-0">
              {post.author?.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name || 'User'}
                  className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-primary/30 transition-all">
                  {post.author?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Link
                  to={`/profile/${post.authorId}`}
                  className="font-semibold text-content hover:text-primary transition-colors"
                >
                  {post.author?.name || 'Unknown User'}
                </Link>
              </div>
              <div className="flex items-center space-x-2 text-sm text-tertiary">
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <MentionRenderer content={post.body || ''} className="text-content leading-relaxed" />
        </div>

        {/* Stats and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-5 text-sm">
            {/* Reactions */}
            <PostReactions
              counts={reactionCounts}
              userReaction={userReaction}
              postId={post.id}
              onReactionSelect={handleReaction}
            />

            {/* Comments */}
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center space-x-1.5 hover:text-primary transition-colors text-tertiary hover:bg-muted/30 px-2 py-1 rounded-lg"
            >
              <span className="text-base">💬</span>
              <span className="font-medium">{post.repliesCount || 0}</span>
              {post.repliesCount > 0 && <span className="text-xs">{showReplies ? '▲' : '▼'}</span>}
            </button>
          </div>

          <PostActions
            post={post}
            onShare={() => {
              handlePostUpdate(post);
            }}
            onReport={() => {
              // Handle report
            }}
            onEdit={(postId) => {
              console.log('Edit post:', postId);
            }}
            onDelete={handlePostDelete}
          />
        </div>

        {/* Comments Section */}
        {showComments && showReplies && (
          <div className="mt-4 pt-4">
            <CommentSection
              contentType="post"
              contentId={post.id}
              comments={[]} // Always fetch fresh comments to get updated avatar URLs
              commentsCount={post.repliesCount || 0}
              onCommentsUpdate={() => {
                // Update post with new comment count (can't update repliesCount on DbUserFeedContent)
                handlePostUpdate(post);
              }}
            />
          </div>
        )}
      </BaseCard>
    </div>
  );
};
