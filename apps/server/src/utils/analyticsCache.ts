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
  TIMELINE_UNIFIED: 30, // 30 seconds - articles + posts unified timeline
  TIMELINE_ARTICLES: 30, // 30 seconds - articles only (reduced for fresh content)
  TIMELINE_SEARCH: 180, // 3 minutes - search results
  TIMELINE_TRENDING: 300, // 5 minutes - trending content
  // User stats (Issue #3 - high traffic, frequently updated)
  USER_STATS: 30, // 30 seconds - balances freshness with performance
  // Predictions (Issue #3)
  PREDICTIONS_ACTIVE: 60, // 1 minute - odds change frequently
  PREDICTIONS_RESOLVED: 3600, // 1 hour - static data, never changes
  PREDICTIONS_COUNT: 60, // 1 minute - count updates
  // Achievements (Issue #3)
  ACHIEVEMENTS_GLOBAL: 3600, // 1 hour - achievement definitions rarely change
  ACHIEVEMENTS_USER: 30, // 30 seconds - user progress updates
  // Leaderboard ranks (Issue #3)
  LEADERBOARD_RANK: 120, // 2 minutes - matches full leaderboard cache
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
  // User stats (Issue #3)
  USER_STATS_ENHANCED: (userId: number) => `user:stats:enhanced:${userId}`,
  USER_STATS_BASIC: (userId: number) => `user:stats:basic:${userId}`,
  // Predictions (Issue #3)
  PREDICTION_SINGLE: (predictionId: number) => `prediction:${predictionId}`,
  PREDICTIONS_ACTIVE: (limit: number, offset: number, filters?: string) =>
    `predictions:active:${limit}:${offset}:${filters || 'none'}`,
  PREDICTIONS_COUNT: (status: 'active' | 'resolved' | 'all') => `predictions:count:${status}`,
  // Achievements (Issue #3)
  ACHIEVEMENTS_ALL: () => 'achievements:all',
  USER_ACHIEVEMENTS_PROGRESS: (userId: number) => `user:${userId}:achievements:progress`,
  // Leaderboard ranks (Issue #3)
  LEADERBOARD_USER_RANK: (userId: number, type: 'allTime' | 'daily') =>
    `leaderboard:rank:${userId}:${type}`,
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

  // Invalidate user stats (Issue #3 - call after bet, payout, achievement)
  USER_STATS: (userId: number) => invalidateCache(`user:stats:*:${userId}`),
  ALL_USER_STATS: () => invalidateCache('user:stats:*'),

  // Invalidate predictions (Issue #3 - call after bet, resolution, creation)
  PREDICTION: (predictionId: number) => invalidateCache(`prediction:${predictionId}`),
  ALL_PREDICTIONS: () => invalidateCache('predictions:*'),
  PREDICTIONS_ACTIVE: () => invalidateCache('predictions:active:*'),
  PREDICTIONS_COUNT: () => invalidateCache('predictions:count:*'),

  // Invalidate achievements (Issue #3 - call after unlock, progress update)
  USER_ACHIEVEMENTS: (userId: number) => invalidateCache(`user:${userId}:achievements:*`),
  ALL_ACHIEVEMENTS: () => invalidateCache('achievements:*'),

  // Invalidate leaderboard ranks (Issue #3 - call after payout, leaderboard refresh)
  LEADERBOARD_USER_RANK: (userId: number) => invalidateCache(`leaderboard:rank:${userId}:*`),
  ALL_LEADERBOARD_RANKS: () => invalidateCache('leaderboard:rank:*'),
} as const;
