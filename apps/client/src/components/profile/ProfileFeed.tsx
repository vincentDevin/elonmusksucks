// apps/client/src/components/ProfileFeed.tsx
import type { UserFeedPost } from '@ems/types';

type ProfileFeedProps = {
  feed: UserFeedPost[];
  loading?: boolean;
  onReply?: (parentId: number) => void;
};

export function ProfileFeed({ feed, loading = false, onReply }: ProfileFeedProps) {
  if (loading) return <div>Loading feed…</div>;
  if (!feed.length) return <div className="text-gray-500">No posts yet.</div>;

  return (
    <div className="space-y-4">
      {feed.map((post) => (
        <FeedPost key={post.id} post={post} onReply={onReply} />
      ))}
    </div>
  );
}

function FeedPost({ post, onReply }: { post: UserFeedPost; onReply?: (parentId: number) => void }) {
  return (
    <div className="border rounded p-3 bg-surface">
      <div className="flex items-center space-x-2">
        <span className="font-bold">{post.authorName ?? `User #${post.authorId}`}</span>
        <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="my-2">{post.content}</div>
      <div className="flex gap-2">
        {onReply && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => onReply(post.id)}
          >
            Reply
          </button>
        )}
      </div>
      {/* Render comments if present */}
      {post.children && post.children.length > 0 && (
        <div className="ml-4 border-l pl-3 mt-2 space-y-2">
          {post.children.map((child) => (
            <FeedPost key={child.id} post={child} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
