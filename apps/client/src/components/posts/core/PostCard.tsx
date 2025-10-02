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
  const [isDeleted, setIsDeleted] = useState(post.isDeleted);

  // Initialize reactions on mount
  useEffect(() => {
    initializeReactions('post', post.id, post.reactionCounts, post.userReaction);
  }, [post.id, post.reactionCounts, post.userReaction, initializeReactions]);

  // Get current reaction state from context
  const { reactionCounts, userReaction, isReacting } = getReactionState('post', post.id);

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
              {post.authorAvatar ? (
                <img
                  src={post.authorAvatar}
                  alt={post.authorName || 'User'}
                  className="w-11 h-11 rounded-full object-cover hover:ring-2 hover:ring-primary/30 transition-all"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-primary/30 transition-all">
                  {post.authorName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Link
                  to={`/profile/${post.authorId}`}
                  className="font-semibold text-content hover:text-primary transition-colors"
                >
                  {post.authorName || 'Unknown User'}
                </Link>
                {post.visibility && post.visibility !== 'PUBLIC' && (
                  <span className="px-2 py-0.5 bg-muted/50 rounded-full text-xs font-medium text-tertiary">
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
        <div className="mb-4">
          <MentionRenderer content={post.body || ''} className="text-content leading-relaxed" />

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
                  <p className="text-sm text-tertiary line-clamp-2">
                    {post.linkPreview.description}
                  </p>
                )}
                <p className="text-xs text-muted mt-1">{new URL(post.linkPreview.url).hostname}</p>
              </a>
            </div>
          )}
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
              <span className="font-medium">{post.commentsCount || 0}</span>
              {post.commentsCount > 0 && <span className="text-xs">{showReplies ? '▲' : '▼'}</span>}
            </button>

            {/* Views */}
            <div className="flex items-center space-x-1.5 text-tertiary">
              <span className="text-base">👁</span>
              <span className="font-medium">{Number(post.viewsCount) || 0}</span>
            </div>

            {/* Shares */}
            {post.sharesCount > 0 && (
              <div className="flex items-center space-x-1.5 text-tertiary">
                <span className="text-base">🔄</span>
                <span className="font-medium">{post.sharesCount}</span>
              </div>
            )}
          </div>

          <PostActions
            post={post}
            onShare={() => {
              handlePostUpdate({
                ...post,
                sharesCount: (post.sharesCount || 0) + 1,
              });
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
              commentsCount={post.commentsCount || 0}
              onCommentsUpdate={(updatedComments) => {
                // Update post with new comment count
                handlePostUpdate({
                  ...post,
                  commentsCount: updatedComments.length,
                  children: updatedComments,
                });
              }}
            />
          </div>
        )}
      </BaseCard>
    </div>
  );
};
