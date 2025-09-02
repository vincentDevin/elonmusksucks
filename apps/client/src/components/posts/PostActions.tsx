import React, { useState } from 'react';
import { sharePost } from '../../api/posts';
import { useAuth } from '../../hooks/useAuth';
import type { UserFeedPost } from '@ems/types';

interface PostActionsProps {
  post: UserFeedPost;
  onShare?: (postId: number, newShareCount: number) => void;
  onReport?: (postId: number) => void;
  onEdit?: (postId: number) => void;
  onDelete?: (postId: number) => void;
  className?: string;
}

export const PostActions: React.FC<PostActionsProps> = ({
  post,
  onShare,
  onReport,
  onEdit,
  onDelete,
  className = '',
}) => {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [shareCount, setShareCount] = useState(post.sharesCount);

  const isAuthor = user?.id === post.authorId;
  const canEdit = isAuthor && post.canEdit;
  const canDelete = isAuthor || user?.role === 'ADMIN';

  const handleShare = async () => {
    if (!user || sharing) return;

    try {
      setSharing(true);
      const result = await sharePost(post.id);

      if (result.success) {
        setShareCount(result.sharesCount);
        onShare?.(post.id, result.sharesCount);

        // Simple success feedback
        const button = document.querySelector(`[data-share-btn="${post.id}"]`);
        if (button) {
          button.classList.add('animate-pulse');
          setTimeout(() => button.classList.remove('animate-pulse'), 1000);
        }
      }
    } catch (error: any) {
      console.error('Failed to share post:', error);
      // TODO: Show error toast
    } finally {
      setSharing(false);
    }
  };

  const handleReport = () => {
    if (!user) return;
    onReport?.(post.id);
  };

  const handleEdit = () => {
    if (!canEdit) return;
    onEdit?.(post.id);
  };

  const handleDelete = () => {
    if (!canDelete) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this post? This action cannot be undone.',
    );

    if (confirmed) {
      onDelete?.(post.id);
    }
  };

  return (
    <div className={`flex items-center gap-4 text-sm text-tertiary ${className}`}>
      {/* Share Button */}
      <button
        data-share-btn={post.id}
        onClick={handleShare}
        disabled={sharing || !user}
        className="flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={user ? 'Share this post' : 'Sign in to share'}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
        <span>{sharing ? 'Sharing...' : 'Share'}</span>
        {shareCount > 0 && <span>({shareCount})</span>}
      </button>

      {/* Report Button - Only show for non-authors */}
      {!isAuthor && user && (
        <button
          onClick={handleReport}
          className="flex items-center gap-1 hover:text-yellow-600 transition-colors"
          title="Report this post"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>Report</span>
        </button>
      )}

      {/* Edit Button - Only for author within time limit */}
      {canEdit && (
        <button
          onClick={handleEdit}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          title="Edit this post"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>Edit</span>
        </button>
      )}

      {/* Delete Button - For author or admin */}
      {canDelete && (
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 hover:text-red-600 transition-colors"
          title="Delete this post"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <span>Delete</span>
        </button>
      )}
    </div>
  );
};
