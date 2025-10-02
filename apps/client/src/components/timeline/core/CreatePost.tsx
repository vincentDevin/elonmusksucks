import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { createPost } from '../../../api/posts';
import BaseModal from '../../BaseModal';
import type { PostContentType, PostVisibility } from '@ems/types';

interface CreatePostProps {
  onPostCreated?: () => void;
  className?: string;
}

/**
 * CreatePost Component
 *
 * Provides a quick-access card that opens a modal for creating posts
 * Features:
 * - Click to expand full post creation modal
 * - Rich text input with character counter
 * - Media upload support
 * - Visibility controls (public, followers, private)
 * - Content type selection (text, poll, etc.)
 */
export const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated, className = '' }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [contentType, setContentType] = useState<PostContentType>('TEXT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_LENGTH = 5000;
  const remainingChars = MAX_LENGTH - content.length;

  const handleOpenModal = () => {
    if (!user) return;
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setContent('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createPost({
        content: content.trim(),
        contentType,
        visibility,
      });

      // Success - close modal and refresh feed
      handleCloseModal();
      onPostCreated?.();
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null; // Don't show create post for non-authenticated users
  }

  return (
    <>
      {/* Quick Access Card - Sits above timeline feed */}
      <div
        className={`bg-surface rounded-lg p-4 border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer mb-6 ${className}`}
        onClick={handleOpenModal}
      >
        <div className="flex items-center space-x-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Placeholder Text */}
          <div className="flex-1">
            <div className="text-content/50 text-sm py-2 px-4 bg-muted/30 rounded-full">
              What's on your mind, {user.name.split(' ')[0]}?
            </div>
          </div>

          {/* Post Button */}
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium">
            Post
          </button>
        </div>
      </div>

      {/* Full Create Post Modal */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create Post"
        icon="✍️"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-error/10 text-error border border-error/20 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* User Info Header */}
          <div className="flex items-center space-x-3 pb-3 border-b border-border/50">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="font-medium text-content">{user.name}</div>
              <div className="text-xs text-tertiary">Posting to timeline</div>
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="w-full min-h-[150px] p-4 border border-border rounded-lg bg-surface text-content resize-none focus:outline-none focus:border-primary text-base leading-relaxed"
              maxLength={MAX_LENGTH}
              autoFocus
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center text-xs">
              <span
                className={`${
                  remainingChars < 100
                    ? 'text-warning'
                    : remainingChars < 0
                      ? 'text-error'
                      : 'text-tertiary'
                }`}
              >
                {remainingChars} characters remaining
              </span>
            </div>
          </div>

          {/* Visibility Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Visibility</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visibility === 'PUBLIC'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-content hover:bg-muted/70'
                }`}
                disabled={isSubmitting}
              >
                🌍 Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility('FOLLOWERS')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visibility === 'FOLLOWERS'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-content hover:bg-muted/70'
                }`}
                disabled={isSubmitting}
              >
                👥 Followers
              </button>
              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visibility === 'PRIVATE'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-content hover:bg-muted/70'
                }`}
                disabled={isSubmitting}
              >
                🔒 Private
              </button>
            </div>
          </div>

          {/* Content Type Selector (Future Enhancement) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-content">Post Type</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setContentType('TEXT')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentType === 'TEXT'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-content hover:bg-muted/70'
                }`}
                disabled={isSubmitting}
              >
                📝 Text
              </button>
              <button
                type="button"
                onClick={() => setContentType('POLL')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentType === 'POLL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-content hover:bg-muted/70'
                }`}
                disabled={isSubmitting}
              >
                📊 Poll
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 bg-muted/50 text-content rounded-lg hover:bg-muted/70 transition-colors text-sm font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting || remainingChars < 0}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </BaseModal>
    </>
  );
};

export default CreatePost;
