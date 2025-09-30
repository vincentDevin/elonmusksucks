// apps/client/src/utils/feedAdapter.ts
// Unified feed adapter to convert different content types to GenericFeed format

import type { TimelineItem, UserFeedPost } from '@ems/types';
import type { FeedItem, FeedResponse } from '../components/GenericFeed';
import { timelineApi } from '../api/timeline';
import { getTimeline, getUserPosts } from '../api/posts';

export interface UnifiedFeedItem extends FeedItem {
  type: 'article' | 'post';
  originalData: TimelineItem | UserFeedPost;
}

/**
 * Convert TimelineItem (article) to UnifiedFeedItem
 */
export function convertArticleToFeedItem(item: TimelineItem): UnifiedFeedItem {
  // Ensure unique ID by always prefixing with type
  const uniqueId = item.id.toString().startsWith('article-') ? item.id : `article-${item.id}`;

  return {
    id: uniqueId,
    type: 'article',
    createdAt: item.timestamp,
    updatedAt: item.timestamp,
    originalData: item,
  };
}

/**
 * Convert UserFeedPost (community post) to UnifiedFeedItem
 */
export function convertPostToFeedItem(item: UserFeedPost): UnifiedFeedItem {
  // Ensure unique ID by always prefixing with type
  const uniqueId = `post-${item.id}`;

  return {
    id: uniqueId,
    type: 'post',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
    originalData: item,
  };
}

/**
 * Generic conversion function that handles both types
 */
export function convertToFeedItem(item: TimelineItem | UserFeedPost): UnifiedFeedItem {
  // Check if it's a TimelineItem (has content.title) or UserFeedPost (has user property)
  if ('content' in item && item.content?.title) {
    return convertArticleToFeedItem(item as TimelineItem);
  } else {
    return convertPostToFeedItem(item as UserFeedPost);
  }
}

/**
 * Calculate next cursor for unified pagination
 */
function calculateNextCursor(
  items: UnifiedFeedItem[],
  articlesPagination?: { cursor?: string; hasMore?: boolean },
  postsCursor?: number,
): string | undefined {
  if (items.length === 0) {
    return undefined;
  }

  // Use the oldest item's timestamp as the cursor
  const oldestItem = items[items.length - 1];
  return new Date(oldestItem.createdAt).toISOString();
}

/**
 * Fetch unified feed of articles and community posts
 * This is the main function that GenericFeed will call
 */
export async function fetchUnifiedFeed(params: {
  cursor?: string;
  offset?: number;
  limit?: number;
  tab?: string;
  filters?: Record<string, any>;
}): Promise<FeedResponse<UnifiedFeedItem>> {
  try {
    const limit = params.limit || 20;
    const halfLimit = Math.ceil(limit / 2);

    // Fetch articles and posts in parallel
    const [articlesResponse, postsResponse] = await Promise.all([
      timelineApi
        .getArticles({
          cursor: params.cursor, // Articles API expects timestamp string
          limit: halfLimit,
          search: params.filters?.search,
        })
        .catch((error) => {
          console.error('Failed to fetch articles:', error);
          return { items: [], pagination: { hasMore: false } };
        }),

      getTimeline({
        // Posts API expects numeric cursor, but we need to handle timestamp cursor
        // For now, don't pass cursor to posts API to avoid confusion
        cursor: undefined,
        limit: halfLimit,
        sortBy: 'recent',
      }).catch((error) => {
        console.error('Failed to fetch posts:', error);
        return { posts: [], nextCursor: undefined };
      }),
    ]);

    // Convert both types to unified format
    const articleItems = articlesResponse.items.map(convertArticleToFeedItem);
    const postItems = postsResponse.posts.map(convertPostToFeedItem);

    // Merge and sort chronologically (newest first)
    let allItems = [...articleItems, ...postItems].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });

    // Filter items by cursor timestamp if provided (for pagination)
    if (params.cursor) {
      const cursorTime = new Date(params.cursor).getTime();
      allItems = allItems.filter((item) => {
        const itemTime = new Date(item.createdAt).getTime();
        return itemTime < cursorTime; // Only items older than cursor
      });
    }

    // Take only the requested limit
    const limitedItems = allItems.slice(0, limit);

    return {
      items: limitedItems,
      pagination: {
        hasMore: articlesResponse.pagination?.hasMore || !!postsResponse.nextCursor,
        cursor: calculateNextCursor(
          limitedItems,
          articlesResponse.pagination,
          postsResponse.nextCursor,
        ),
        total: limitedItems.length,
      },
    };
  } catch (error) {
    console.error('Failed to fetch unified feed:', error);
    return {
      items: [],
      pagination: {
        hasMore: false,
        total: 0,
      },
    };
  }
}

/**
 * Fetch user-specific posts feed (for profile pages)
 */
export async function fetchUserPostsFeed(params: {
  userId: number;
  cursor?: string;
  limit?: number;
  includeReplies?: boolean;
}): Promise<FeedResponse<UnifiedFeedItem>> {
  try {
    const limit = params.limit || 20;

    // Convert cursor from timestamp to numeric if needed
    let numericCursor: number | undefined;
    if (params.cursor) {
      // Try to extract numeric cursor from timestamp
      // For now, we'll skip cursor conversion and just use undefined
      numericCursor = undefined;
    }

    const postsResponse = await getUserPosts(params.userId, {
      cursor: numericCursor,
      limit,
      includeReplies: params.includeReplies,
    });

    const postItems = postsResponse.posts.map(convertPostToFeedItem);

    // Filter items by cursor timestamp if provided (for pagination)
    let filteredItems = postItems;
    if (params.cursor) {
      const cursorTime = new Date(params.cursor).getTime();
      filteredItems = postItems.filter((item) => {
        const itemTime = new Date(item.createdAt).getTime();
        return itemTime < cursorTime; // Only items older than cursor
      });
    }

    return {
      items: filteredItems,
      pagination: {
        hasMore: !!postsResponse.nextCursor,
        cursor: calculateNextCursor(filteredItems),
        total: filteredItems.length,
      },
    };
  } catch (error) {
    console.error('Failed to fetch user posts feed:', error);
    return {
      items: [],
      pagination: {
        hasMore: false,
        total: 0,
      },
    };
  }
}

/**
 * Search function for unified feed
 */
export async function searchUnifiedFeed(params: {
  query: string;
  cursor?: string;
  limit?: number;
  filters?: Record<string, any>;
}): Promise<FeedResponse<UnifiedFeedItem>> {
  try {
    // For now, only search articles since posts don't have search API
    const articlesResponse = await timelineApi.search({
      query: params.query,
      cursor: params.cursor,
      limit: params.limit || 20,
      filters: params.filters,
    });

    const articleItems = articlesResponse.items.map(convertArticleToFeedItem);

    return {
      items: articleItems,
      pagination: {
        hasMore: articlesResponse.pagination?.hasMore || false,
        cursor: articlesResponse.pagination?.cursor,
        total: articleItems.length,
      },
    };
  } catch (error) {
    console.error('Failed to search unified feed:', error);
    return {
      items: [],
      pagination: {
        hasMore: false,
        total: 0,
      },
    };
  }
}
