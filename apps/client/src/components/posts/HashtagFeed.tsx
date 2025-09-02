import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import type { UserFeedPost } from '@ems/types';
import { PostCard } from './PostCard';
import { TrendingHashtags } from './TrendingHashtags';

interface HashtagFeedResponse {
  posts: UserFeedPost[];
  nextCursor?: number;
}

const HashtagFeed: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const [posts, setPosts] = useState<UserFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (tag) {
      fetchHashtagPosts(true);
    }
  }, [tag]);

  const fetchHashtagPosts = async (reset: boolean = false) => {
    if (!tag) return;

    try {
      if (reset) {
        setLoading(true);
        setPosts([]);
        setCursor(undefined);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      if (!reset && cursor) {
        params.append('cursor', cursor.toString());
      }
      params.append('limit', '20');

      const response = await api.get<HashtagFeedResponse>(
        `/api/posts/hashtags/${encodeURIComponent(tag)}?${params}`,
      );

      const { posts: newPosts, nextCursor } = response.data;

      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setCursor(nextCursor);
      setHasMore(!!nextCursor);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch hashtag posts:', err);
      setError('Failed to load posts for this hashtag');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHashtagPosts(false);
    }
  };

  const handlePostUpdate = useCallback((updatedPost: UserFeedPost) => {
    setPosts((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  }, []);

  const handlePostDelete = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  if (!tag) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-tertiary">No hashtag specified</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="bg-surface rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Link
                to="/posts"
                className="text-tertiary hover:text-content transition-colors text-xl"
              >
                ←
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-2xl text-primary">#</span>
                <h1 className="text-2xl font-bold text-content">{tag}</h1>
              </div>
            </div>
            <p className="text-tertiary">
              {posts.length > 0
                ? `Showing posts tagged with #${tag}`
                : `No posts found for #${tag}`}
            </p>
          </div>

          {/* Posts */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-surface rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted/20 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted/20 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-surface rounded-lg p-8 text-center">
              <p className="text-error mb-4">{error}</p>
              <button onClick={() => fetchHashtagPosts(true)} className="btn btn-primary">
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-surface rounded-lg p-8 text-center">
              <span className="text-6xl text-muted mb-4 block">#</span>
              <p className="text-tertiary mb-2">No posts yet for #{tag}</p>
              <p className="text-sm text-tertiary">Be the first to use this hashtag!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
                />
              ))}

              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="btn btn-outline btn-primary"
                  >
                    {loadingMore ? (
                      <span className="flex items-center space-x-2">
                        <span className="animate-spin">⏳</span>
                        <span>Loading...</span>
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <TrendingHashtags className="sticky top-4" />
        </div>
      </div>
    </div>
  );
};

export default HashtagFeed;
