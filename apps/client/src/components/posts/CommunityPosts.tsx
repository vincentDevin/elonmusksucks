import React, { useState, useEffect, useCallback } from 'react';
import type { UserFeedPost } from '@ems/types';
import { getTimeline } from '../../api/posts';
import { ProfileFeed } from '../profile/ProfileFeed';
import { CreatePostForm } from '../profile/CreatePostForm';
import { createPost } from '../../api/posts';
import { useAuth } from '../../hooks/useAuth';

interface CommunityPostsProps {
  className?: string;
  showCreateForm?: boolean;
}

export const CommunityPosts: React.FC<CommunityPostsProps> = ({
  className = '',
  showCreateForm = true,
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<UserFeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'recent' | 'trending'>('recent');

  // Load community posts
  const loadPosts = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const cursor = reset ? undefined : nextCursor;
        const result = await getTimeline({
          cursor,
          limit: 20,
          sortBy,
        });

        if (reset) {
          setPosts(result.posts);
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
        }

        setNextCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
      } catch (err: any) {
        setError(err.message || 'Failed to load posts');
        console.error('Error loading community posts:', err);
      } finally {
        setLoading(false);
      }
    },
    [nextCursor, sortBy],
  );

  // Load posts on mount and when sort changes
  useEffect(() => {
    loadPosts(true);
  }, [sortBy]);

  // Handle creating new posts
  const handleCreatePost = async (
    content: string,
    parentId?: number | null,
    options?: { visibility?: any; contentType?: any },
  ) => {
    if (!user) return;

    try {
      const newPost = await createPost({
        content,
        contentType: options?.contentType || 'TEXT',
        visibility: options?.visibility || 'PUBLIC',
        parentId: parentId || null,
      });

      // Add the new post to the top of the feed if it's public and not a reply
      if (!parentId && newPost.visibility === 'PUBLIC') {
        setPosts((prev) => [newPost, ...prev]);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create post');
    }
  };

  // Handle loading more posts
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-tertiary">Loading community posts...</p>
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-error mb-4">{error}</p>
        <button
          onClick={() => loadPosts(true)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with sort options */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-content">Community Posts</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-tertiary">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'trending')}
            className="text-sm border border-muted rounded px-2 py-1 bg-surface text-content focus:border-primary focus:outline-none"
          >
            <option value="recent">Recent</option>
            <option value="trending">Trending</option>
          </select>
        </div>
      </div>

      {/* Create post form for authenticated users */}
      {showCreateForm && user && (
        <div className="mb-6">
          <CreatePostForm
            onSubmit={handleCreatePost}
            showVisibilityOptions={true}
            placeholder="Share your thoughts about Elon Musk with the community..."
          />
        </div>
      )}

      {/* Posts feed */}
      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-tertiary mb-4">No community posts yet.</p>
          {user && showCreateForm && (
            <p className="text-sm text-tertiary/80">Be the first to share something!</p>
          )}
          {!user && (
            <p className="text-sm text-tertiary/80">
              <a href="/login" className="text-primary hover:underline">
                Sign in
              </a>{' '}
              to join the conversation
            </p>
          )}
        </div>
      ) : (
        <>
          <ProfileFeed
            feed={posts}
            loading={false}
            onSubmit={user ? handleCreatePost : undefined}
          />

          {/* Load more button */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Load More Posts'}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-4 text-tertiary text-sm">
              You've reached the end of the community posts
            </div>
          )}
        </>
      )}

      {/* Error display for load more failures */}
      {error && posts.length > 0 && (
        <div className="text-center py-4">
          <p className="text-error text-sm mb-2">{error}</p>
          <button onClick={() => loadPosts(false)} className="text-primary hover:underline text-sm">
            Try again
          </button>
        </div>
      )}
    </div>
  );
};
