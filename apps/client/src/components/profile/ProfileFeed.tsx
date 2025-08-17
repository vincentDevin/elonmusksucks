// apps/client/src/components/ProfileFeed.tsx
import { useState } from 'react';
import type { UserFeedPost } from '@ems/types';
import { CreatePostForm } from './CreatePostForm';

type ProfileFeedProps = {
  feed: UserFeedPost[];
  loading?: boolean;
  onSubmit?: (content: string, parentId?: number | null) => Promise<void>;
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

  const handleReplySubmit = async (content: string, parentId?: number | null) => {
    if (onSubmit) {
      await onSubmit(content, parentId);
      setIsReplying(false);
    }
  };

  return (
    <div className="border rounded p-3 bg-surface">
      <div className="flex items-center space-x-2">
        <span className="font-bold">{post.authorName ?? `User #${post.authorId}`}</span>
        <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="my-2">{post.content}</div>
      <div className="flex gap-2">
        {onSubmit && !isReplying && (
          <button
            className="text-xs text-blue-600 hover:underline cursor-pointer"
            onClick={() => setIsReplying(true)}
          >
            Reply
          </button>
        )}
        {isReplying && (
          <button
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setIsReplying(false)}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Reply form directly below this post */}
      {isReplying && (
        <div className="mt-3 pl-4 border-l-2 border-blue-200">
          <CreatePostForm onSubmit={handleReplySubmit} parentId={post.id} disabled={false} />
        </div>
      )}
      {/* Render comments if present */}
      {post.children && post.children.length > 0 && (
        <div className="ml-4 border-l pl-3 mt-2 space-y-2">
          {post.children.map((child) => (
            <FeedPost key={child.id} post={child} onSubmit={onSubmit} />
          ))}
        </div>
      )}
    </div>
  );
}
