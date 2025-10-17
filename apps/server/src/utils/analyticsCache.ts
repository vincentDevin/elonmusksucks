/**
 * Redis-based caching layer for analytics queries
 * Reduces database load by caching expensive aggregation results
 */

import redisClient from '../lib/redis';

// Cache TTLs (in seconds)
const CACHE_TTL = {
  PLATFORM_HEALTH: 60, // 1 minute
  TRENDS: 300, // 5 minutes
  CROSS_FEATURE: 300, // 5 minutes
  CONTENT: 300, // 5 minutes
  DASHBOARD: 300, // 5 minutes
  LEADERBOARD: 60, // 1 minute
  TIMELINE_UNIFIED: 60, // 1 minute - articles + posts unified timeline
  TIMELINE_ARTICLES: 120, // 2 minutes - articles only (more stable)
  TIMELINE_SEARCH: 180, // 3 minutes - search results
  TIMELINE_TRENDING: 300, // 5 minutes - trending content
} as const;

/**
 * Generic cache wrapper for async functions
 * @param key - Cache key
 * @param ttl - Time to live in seconds
 * @param fetchFn - Function to execute if cache miss
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await redisClient.get(key);

    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (parseError) {
        // If JSON parse fails, clear bad cache and continue
        console.warn('[analyticsCache] Failed to parse cached value, invalidating:', key);
        await redisClient.del(key);
      }
    }

    // Cache miss - fetch fresh data
    const data = await fetchFn();

    // Store in cache (fire and forget to not block response)
    redisClient
      .setex(key, ttl, JSON.stringify(data))
      .catch((err: Error) => console.error('[analyticsCache] Failed to set cache:', err));

    return data;
  } catch (error) {
    // If Redis is down, just execute the function
    console.error('[analyticsCache] Redis error, bypassing cache:', error);
    return await fetchFn();
  }
}

/**
 * Invalidate specific cache keys or patterns
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`[analyticsCache] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('[analyticsCache] Failed to invalidate cache:', error);
  }
}

/**
 * Cache key builders for analytics endpoints
 */
export const CacheKeys = {
  PLATFORM_HEALTH: () => 'analytics:platform-health',
  TRENDS: (days: number) => `analytics:trends:${days}`,
  CROSS_FEATURE: () => 'analytics:cross-feature',
  CONTENT: () => 'analytics:content',
  DASHBOARD: (days: number) => `analytics:dashboard:${days}`,
  LEADERBOARD_ALL_TIME: (limit: number, offset: number, metric: string) =>
    `leaderboard:all-time:${limit}:${offset}:${metric}`,
  LEADERBOARD_DAILY: (limit: number, offset: number, metric: string) =>
    `leaderboard:daily:${limit}:${offset}:${metric}`,
  LEADERBOARD_STATS: () => 'leaderboard:stats',
  TIMELINE_UNIFIED: (limit: number, cursor?: string) =>
    `timeline:unified:${limit}:${cursor || 'initial'}`,
  TIMELINE_ARTICLES: (limit: number, cursor?: string) =>
    `timeline:articles:${limit}:${cursor || 'initial'}`,
  TIMELINE_SEARCH: (query: string, filters: string, limit: number, cursor?: string) =>
    `timeline:search:${query}:${filters}:${limit}:${cursor || 'initial'}`,
  TIMELINE_TRENDING: (timeRange: string, type: string, limit: number) =>
    `timeline:trending:${timeRange}:${type}:${limit}`,
} as const;

/**
 * Cache TTLs export for easy access
 */
export { CACHE_TTL };

/**
 * Invalidation patterns for different event types
 * Call these when data changes to keep cache fresh
 */
export const InvalidationPatterns = {
  // Invalidate all analytics caches (call on major data changes)
  ALL_ANALYTICS: () => invalidateCache('analytics:*'),

  // Invalidate leaderboard caches (call when bets resolve, user stats change)
  ALL_LEADERBOARDS: () => invalidateCache('leaderboard:*'),

  // Invalidate specific analytics sections
  PLATFORM_HEALTH: () => invalidateCache('analytics:platform-health'),
  TRENDS: () => invalidateCache('analytics:trends:*'),
  DASHBOARD: () => invalidateCache('analytics:dashboard:*'),

  // Invalidate timeline caches (call when articles/posts created, reactions added)
  ALL_TIMELINE: () => invalidateCache('timeline:*'),
  TIMELINE_UNIFIED: () => invalidateCache('timeline:unified:*'),
  TIMELINE_ARTICLES: () => invalidateCache('timeline:articles:*'),
  TIMELINE_SEARCH: () => invalidateCache('timeline:search:*'),
  TIMELINE_TRENDING: () => invalidateCache('timeline:trending:*'),
} as const;
