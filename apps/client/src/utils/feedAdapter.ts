// apps/client/src/utils/feedAdapter.ts
// Unified feed adapter to convert different content types to GenericFeed format

import type { TimelineItem, UserFeedPost } from '@ems/types';
import type { FeedItem, FeedResponse } from '../components/GenericFeed';
import { timelineApi } from '../api/timeline';
import { getUserPosts } from '../api/posts';

export interface UnifiedFeedItem extends FeedItem {
  type: 'article' | 'post';
  originalData: TimelineItem | UserFeedPost;
}

/**
 * Convert TimelineItem to UnifiedFeedItem
 * Detects whether it's an article or post based on ID prefix
 * Uses postData field when available for proper post rendering
 */
export function convertArticleToFeedItem(item: TimelineItem): UnifiedFeedItem {
  // Determine type from ID prefix
  const isPost = item.id.toString().startsWith('post-');
  const type = isPost ? 'post' : 'article';

  // If it's a post and we have postData, use that as originalData
  const originalData = isPost && item.postData ? (item.postData as any as UserFeedPost) : item;

  return {
    id: item.id,
    type: type,
    createdAt: item.timestamp,
    updatedAt: item.timestamp,
    originalData: originalData,
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
    updatedAt: item.createdAt,
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
function calculateNextCursor(items: UnifiedFeedItem[]): string | undefined {
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
 * Backend already merges articles + posts at /api/timeline
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

    // Check if there's a search query or filters
    const hasSearch = params.filters?.search && params.filters.search.trim().length > 0;
    const hasMediaFilter =
      params.filters?.hasMedia !== null && params.filters?.hasMedia !== undefined;
    const hasContentTypeFilter =
      params.filters?.contentType &&
      params.filters.contentType.length > 0 &&
      !params.filters.contentType.includes('all');

    const hasMeaningfulFilters = hasSearch || hasMediaFilter || hasContentTypeFilter;

    // If we have search or filters, use the search endpoint
    // Otherwise use the regular timeline endpoint for better performance
    const response = hasMeaningfulFilters
      ? await timelineApi.search({
          query: params.filters?.search || '',
          cursor: params.cursor,
          limit: limit,
          filters: params.filters,
        })
      : await timelineApi.getTimeline({
          cursor: params.cursor,
          limit: limit,
        });

    // Convert TimelineItems to UnifiedFeedItems
    const items = response.items.map(convertArticleToFeedItem);

    return {
      items,
      pagination: {
        hasMore: response.pagination?.hasMore || false,
        cursor: response.pagination?.cursor,
        total: items.length,
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
 * Searches both articles and posts via the timeline search endpoint
 */
export async function searchUnifiedFeed(params: {
  query: string;
  cursor?: string;
  limit?: number;
  filters?: Record<string, any>;
}): Promise<FeedResponse<UnifiedFeedItem>> {
  try {
    const response = await timelineApi.search({
      query: params.query,
      cursor: params.cursor,
      limit: params.limit || 20,
      filters: params.filters,
    });

    // Convert timeline items to unified feed items
    const items = response.items.map(convertArticleToFeedItem);

    return {
      items,
      pagination: {
        hasMore: response.pagination?.hasMore || false,
        cursor: response.pagination?.cursor,
        total: items.length,
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
