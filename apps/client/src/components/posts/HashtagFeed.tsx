import React, { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import type { UserFeedPost } from '@ems/types';
import { PostCard } from './PostCard';
import { TrendingHashtags } from './TrendingHashtags';
import GenericFeed from '../GenericFeed';
import type { FeedResponse } from '../GenericFeed';

interface HashtagFeedResponse {
  posts: UserFeedPost[];
  nextCursor?: number;
}

const HashtagFeed: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();

  // Fetch function for GenericFeed
  const fetchHashtagPosts = async ({
    cursor,
    limit = 20,
  }: {
    cursor?: string;
    limit?: number;
  }): Promise<FeedResponse<UserFeedPost>> => {
    if (!tag) {
      throw new Error('No hashtag specified');
    }

    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor);
    }
    params.append('limit', limit.toString());

    const response = await api.get<HashtagFeedResponse>(
      `/api/posts/hashtags/${encodeURIComponent(tag)}?${params}`,
    );

    const { posts, nextCursor } = response.data;

    return {
      items: posts,
      pagination: {
        hasMore: !!nextCursor,
        cursor: nextCursor?.toString(),
      },
    };
  };

  const handlePostUpdate = useCallback((_updatedPost: UserFeedPost) => {
    // This will be handled by GenericFeed's internal state
  }, []);

  const handlePostDelete = useCallback((_postId: number) => {
    // This will be handled by GenericFeed's internal state
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
            <p className="text-tertiary">Posts tagged with #{tag}</p>
          </div>

          {/* Posts Feed */}
          <GenericFeed
            fetchItems={fetchHashtagPosts}
            renderItem={(post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
              />
            )}
            variant="list"
            spacing="normal"
            emptyComponent={
              <div className="bg-surface rounded-lg p-8 text-center">
                <span className="text-6xl text-muted mb-4 block">#</span>
                <p className="text-tertiary mb-2">No posts yet for #{tag}</p>
                <p className="text-sm text-tertiary">Be the first to use this hashtag!</p>
              </div>
            }
          />
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
