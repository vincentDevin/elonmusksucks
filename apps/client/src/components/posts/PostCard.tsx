import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { UserFeedPost } from '@ems/types';
import { MentionRenderer } from './MentionRenderer';
import { PostActions } from './PostActions';

interface PostCardProps {
  post: UserFeedPost;
  onUpdate?: (post: UserFeedPost) => void;
  onDelete?: (postId: number) => void;
  showComments?: boolean;
  isNested?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onUpdate,
  onDelete,
  showComments = false,
  isNested = false,
}) => {
  const [showReplies, setShowReplies] = useState(showComments);
  const [isDeleted, setIsDeleted] = useState(post.isDeleted);

  const handlePostUpdate = (updatedPost: UserFeedPost) => {
    onUpdate?.(updatedPost);
  };

  const handlePostDelete = () => {
    setIsDeleted(true);
    onDelete?.(post.id);
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
      <div className="bg-surface rounded-lg p-4 hover:bg-surface/80 transition-colors">
        {/* Author Header */}
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
          <div className="flex items-center space-x-4 text-sm text-tertiary">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center space-x-1 hover:text-primary transition-colors"
            >
              <span>💬</span>
              <span>{post.commentsCount || 0}</span>
              {post.commentsCount > 0 && (showReplies ? <span>▲</span> : <span>▼</span>)}
            </button>
            <div className="flex items-center space-x-1">
              <span>👁</span>
              <span>{post.viewsCount || 0}</span>
            </div>
          </div>

          <PostActions
            post={post}
            onShare={() => {
              // Update share count
              handlePostUpdate({
                ...post,
                sharesCount: (post.sharesCount || 0) + 1,
              });
            }}
            onReport={() => {
              // Handle report
            }}
            onEdit={(content) => {
              // Handle edit
              handlePostUpdate({
                ...post,
                content,
                editedAt: new Date().toISOString(),
              });
            }}
            onDelete={handlePostDelete}
          />
        </div>

        {/* Nested Comments/Replies */}
        {showReplies && post.children && post.children.length > 0 && (
          <div className="mt-4 space-y-2">
            {post.children.map((child) => (
              <PostCard
                key={child.id}
                post={child}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isNested={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
