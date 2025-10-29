import api from './axios';
import type { UserFeedPost } from '@ems/types';

export interface TrendingHashtag {
  id: number;
  tag: string;
  usageCount: number;
  trendingScore?: number;
}

export interface HashtagFeedResponse {
  posts: UserFeedPost[];
  nextCursor?: number;
}

/**
 * Get trending hashtags
 */
export async function getTrendingHashtags(limit: number = 10): Promise<TrendingHashtag[]> {
  const response = await api.get<TrendingHashtag[]>(`/api/posts/hashtags/trending?limit=${limit}`);
  return response.data;
}

/**
 * Get posts by hashtag
 */
export async function getPostsByHashtag(
  tag: string,
  cursor?: number,
  limit: number = 20,
): Promise<HashtagFeedResponse> {
  const params = new URLSearchParams();
  if (cursor) {
    params.append('cursor', cursor.toString());
  }
  params.append('limit', limit.toString());

  const response = await api.get<HashtagFeedResponse>(
    `/api/posts/hashtags/${encodeURIComponent(tag)}?${params}`,
  );
  return response.data;
}

/**
 * Search hashtags (for autocomplete)
 */
export async function searchHashtags(query: string): Promise<TrendingHashtag[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // For now, just return trending hashtags that match the query
  // In the future, we could add a dedicated search endpoint
  const trending = await getTrendingHashtags(20);
  return trending.filter((h) => h.tag.toLowerCase().includes(query.toLowerCase()));
}
