/**
 * Hashtag Response DTOs
 *
 * Response types for hashtag and trending endpoints
 */

// ============================================================================
// Trending Hashtag
// ============================================================================

export interface TrendingHashtagResponse {
  tag: string;
  count: number;
  growth: number;
  relatedPredictions?: number;
}

// ============================================================================
// Hashtag Feed
// ============================================================================

export interface HashtagFeedResponse {
  tag: string;
  posts: Array<{
    id: number;
    content: string;
    authorId: number;
    authorName: string;
    createdAt: string;
    reactionsCount: number;
    commentsCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
