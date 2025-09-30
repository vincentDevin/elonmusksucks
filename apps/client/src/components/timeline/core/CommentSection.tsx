import React, { useState, useEffect } from 'react';
import { createComment, getPostComments } from '../../../api/posts';
import { timelineApi } from '../../../api/timeline';
import { useAuth } from '../../../contexts/AuthContext';
import { useReactions } from '../../../contexts/ReactionContext';
import { PostReactions } from '../../posts/core/PostReactions';
import type { UserFeedPost, ReactionType } from '@ems/types';

interface CommentSectionProps {
  contentType: 'post' | 'article';
  contentId: number;
  comments: UserFeedPost[] | any[];
  commentsCount: number;
  onCommentsUpdate?: (comments: UserFeedPost[] | any[]) => void;
}

// Compact comment component for better threading
const Comment: React.FC<{
  comment: UserFeedPost | any;
  contentType: 'post' | 'article';
  depth?: number;
  onReply?: (parentId: number, content: string) => void;
  allComments: (UserFeedPost | any)[];
}> = ({ comment, contentType, depth = 0, onReply, allComments }) => {
  const { user } = useAuth();
  const { getReactionState, toggleReaction, initializeReactions } = useReactions();
  const [showReplies, setShowReplies] = useState(true); // Default to showing replies
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Initialize reactions for comments (both posts and articles)
  React.useEffect(() => {
    if (comment.id) {
      initializeReactions(contentType, comment.id, comment.reactionCounts, comment.userReaction);
    }
  }, [comment.id, contentType, comment.reactionCounts, comment.userReaction, initializeReactions]);

  const handleReaction = (type: ReactionType) => {
    toggleReaction(contentType, comment.id, type);
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReply) return;

    onReply(comment.id, replyText.trim());
    setReplyText('');
    setIsReplying(false);
  };

  const { reactionCounts, userReaction } = getReactionState(contentType, comment.id);

  return (
    <div
      className={`${depth > 0 ? 'mt-3' : 'border border-border/50 rounded-lg p-4 bg-surface/50 mb-4'}`}
    >
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.authorAvatar || comment.user?.avatarUrl ? (
            <img
              src={comment.authorAvatar || comment.user?.avatarUrl}
              alt={comment.authorName || comment.user?.name}
              className={`${depth > 0 ? 'w-7 h-7' : 'w-8 h-8'} rounded-full object-cover`}
            />
          ) : (
            <div
              className={`${depth > 0 ? 'w-7 h-7' : 'w-8 h-8'} bg-primary/10 rounded-full flex items-center justify-center`}
            >
              <span className="text-primary text-xs font-medium">
                {(comment.authorName || comment.user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`font-medium text-content ${depth > 0 ? 'text-xs' : 'text-sm'}`}>
              {comment.authorName || comment.user?.name || 'Unknown User'}
            </span>
            <span className="text-xs text-tertiary/70">
              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <p className={`text-content leading-relaxed mb-2 ${depth > 0 ? 'text-xs' : 'text-sm'}`}>
            {comment.content}
          </p>

          {/* Actions Row - Reactions and Buttons */}
          <div className="flex items-center justify-between mt-2">
            {/* Left: Reactions */}
            <div className={depth > 0 ? 'scale-90 origin-left' : ''}>
              <PostReactions
                counts={reactionCounts}
                userReaction={userReaction}
                postId={comment.id}
                onReactionSelect={(type: ReactionType) =>
                  toggleReaction(contentType, comment.id, type)
                }
              />
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center space-x-3 text-xs">
              {/* Reply button - only for posts */}
              {user && onReply && contentType === 'post' && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-tertiary/80 hover:text-primary transition-colors font-medium"
                >
                  Reply
                </button>
              )}

              {/* Reply count and toggle - only for posts */}
              {contentType === 'post' &&
                (() => {
                  const replyCount = allComments.filter(
                    (reply) => reply.parentId === comment.id,
                  ).length;
                  if (replyCount > 0) {
                    return (
                      <button
                        onClick={() => setShowReplies(!showReplies)}
                        className="text-tertiary/80 hover:text-content transition-colors font-medium flex items-center space-x-1"
                      >
                        <span>
                          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                        <span className="text-xs">{showReplies ? '▲' : '▼'}</span>
                      </button>
                    );
                  }
                  return null;
                })()}
            </div>
          </div>

          {/* Reply form */}
          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex space-x-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 p-2 border border-border/50 rounded-lg bg-surface text-content resize-none focus:outline-none focus:border-primary text-sm"
                  rows={2}
                  autoFocus
                />
                <div className="flex flex-col space-y-1">
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-3 py-1 bg-primary text-white rounded-md text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReplying(false)}
                    className="px-3 py-1 bg-muted/50 text-content rounded-md text-xs hover:bg-muted/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Nested replies - render all replies to this comment (only for posts) */}
      {contentType === 'post' && showReplies && (
        <div className="mt-4 ml-8 pl-4 border-l border-border/30 space-y-0">
          {allComments
            .filter((reply) => reply.parentId === comment.id)
            .map((reply: any) => (
              <Comment
                key={reply.id}
                comment={reply}
                contentType={contentType}
                depth={depth + 1}
                onReply={onReply}
                allComments={allComments}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  contentType,
  contentId,
  comments,
  commentsCount,
  onCommentsUpdate,
}) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedComments, setLoadedComments] = useState<UserFeedPost[] | any[]>(comments);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load comments when component mounts if we don't have them
  useEffect(() => {
    if (hasLoaded) return; // Prevent re-fetching

    const loadComments = async () => {
      if (contentType === 'post' && (!comments || comments.length === 0) && commentsCount > 0) {
        setLoading(true);
        try {
          const response = await getPostComments(contentId);
          setLoadedComments(response.comments);
        } catch (error) {
          console.error('Failed to load comments:', error);
        } finally {
          setLoading(false);
          setHasLoaded(true);
        }
      } else if (contentType === 'article') {
        setLoading(true);
        try {
          const response = await timelineApi.getComments(contentId);
          // Transform article comments to match the expected structure
          const transformedComments = response.comments.map((comment) => ({
            ...comment,
            authorName: comment.user?.name,
            authorAvatar: comment.user?.avatarUrl,
            parentId: contentId, // Article comments are always top-level
            reactionCounts: { LIKE: 0, LOVE: 0, LAUGH: 0, ANGRY: 0, SAD: 0 }, // Will be populated by ReactionContext
            userReaction: null, // Will be populated by ReactionContext
            commentsCount: 0,
            children: [],
          }));
          setLoadedComments(transformedComments);
        } catch (error) {
          console.error('Failed to load article comments:', error);
        } finally {
          setLoading(false);
          setHasLoaded(true);
        }
      } else {
        setLoadedComments(comments);
        setHasLoaded(true);
      }
    };

    loadComments();
  }, [contentType, contentId, commentsCount, hasLoaded, comments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (contentType === 'post') {
        const comment = await createComment(contentId, newComment.trim());
        const updatedComments = [...loadedComments, comment];
        setLoadedComments(updatedComments);
        onCommentsUpdate?.(updatedComments);
      } else {
        const comment = await timelineApi.addComment(contentId, newComment.trim());
        // Transform article comment to match expected structure
        const transformedComment = {
          ...comment,
          authorName: comment.user?.name || user?.name, // Fallback to current user
          authorAvatar: comment.user?.avatarUrl || user?.avatarUrl || user?.profilePictureKey, // Try multiple fallbacks
          parentId: contentId, // Article comments are always top-level
          reactionCounts: { LIKE: 0, LOVE: 0, LAUGH: 0, ANGRY: 0, SAD: 0 }, // Will be populated by ReactionContext
          userReaction: null, // Will be populated by ReactionContext
          commentsCount: 0,
          children: [],
        };
        const updatedComments = [...loadedComments, transformedComment];
        setLoadedComments(updatedComments);
        onCommentsUpdate?.(updatedComments);
      }
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: number, content: string) => {
    if (!user || contentType !== 'post') return; // Only handle post replies for now

    try {
      const reply = await createComment(parentId, content);
      // Refresh comments to get updated tree
      const response = await getPostComments(contentId);
      setLoadedComments(response.comments);
      onCommentsUpdate?.(response.comments);
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  return (
    <div className="border-t border-border/40 pt-4">
      <h3 className="font-semibold text-content mb-3">Comments ({commentsCount})</h3>

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="mb-4">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-3 border border-border rounded-lg bg-surface text-content resize-none focus:outline-none focus:border-primary"
                rows={3}
                disabled={isSubmitting}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-tertiary">Loading comments...</span>
        </div>
      ) : loadedComments.length > 0 ? (
        <div className="space-y-2">
          {loadedComments
            .filter((comment) => comment.parentId === contentId)
            .map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                contentType={contentType}
                depth={0}
                onReply={contentType === 'post' ? handleReply : undefined}
                allComments={loadedComments}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4">
          <div className="text-2xl mb-2">💬</div>
          <p className="text-tertiary text-sm mb-2">No comments yet</p>
          <p className="text-tertiary/70 text-xs">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
};
