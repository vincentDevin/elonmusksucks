// apps/server/src/lib/cacheTTL.ts
// -----------------------------------------------------------------------------
// Centralized TTL configuration for different Redis cache types
// Provides consistent expiration policies across the application
// -----------------------------------------------------------------------------

/**
 * TTL configuration for different cache types
 * All values are in seconds
 */
export const CACHE_TTL = {
  // Profile image URLs - match S3 signed URL expiry
  PROFILE_IMAGE_URL: 60 * 60, // 1 hour (default S3 signature expiry)
  PROFILE_IMAGE_URL_LONG: 60 * 60 * 24 * 7, // 7 days (max S3 signature)

  // User session and authentication
  USER_SESSION: 60 * 60 * 24 * 30, // 30 days
  DAILY_LOGIN_TRACKING: 60 * 60 * 24, // 24 hours (expires at midnight)

  // Activity and content caches
  UNIFIED_ACTIVITY_LIST: 60 * 60 * 24 * 7, // 7 days
  CHAT_PRESENCE: 60 * 60, // 1 hour (user goes offline)
  USER_ONLINE_STATUS: 60 * 5, // 5 minutes (heartbeat timeout)
  ACTIVE_USER_PROFILE: 60 * 5, // 5 minutes (active user cache)

  // Leaderboard and statistics
  LEADERBOARD_CACHE: 60 * 15, // 15 minutes
  USER_STATS_CACHE: 60 * 30, // 30 minutes
  USER_RANK_CACHE: 60 * 10, // 10 minutes

  // Feed and content
  RSS_FEED_CACHE: 60 * 30, // 30 minutes
  ARTICLE_CACHE: 60 * 60 * 2, // 2 hours

  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 15, // 15 minutes

  // Temporary data
  EMAIL_VERIFICATION: 60 * 60 * 24, // 24 hours
  PASSWORD_RESET: 60 * 60, // 1 hour

  // Performance caches
  DATABASE_QUERY_CACHE: 60 * 5, // 5 minutes
  API_RESPONSE_CACHE: 60 * 2, // 2 minutes
} as const;

/**
 * Get TTL for profile image cache based on signature expiry
 * Uses the shorter of cache TTL or actual signature expiry
 */
export function getProfileImageTTL(signatureExpirySeconds: number): number {
  // Use the minimum of our cache policy and actual signature expiry
  // Add 60 second buffer to avoid cache miss due to timing
  const bufferSeconds = 60;
  return Math.min(CACHE_TTL.PROFILE_IMAGE_URL, signatureExpirySeconds - bufferSeconds);
}

/**
 * Get dynamic TTL for time-based keys that expire at specific times
 * Example: daily login tracking that expires at midnight
 */
export function getTTLUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight

  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Get TTL for rate limiting windows
 * Ensures consistent window sizing across rate limiters
 */
export function getRateLimitTTL(windowMinutes = 15): number {
  return windowMinutes * 60;
}

/**
 * Cache key patterns for consistent naming
 */
export const CACHE_KEYS = {
  PROFILE_IMAGE_URL: (userId: number) => `profileImageUrl:userId:${userId}`,
  USER_ONLINE: (userId: number) => `user:online:${userId}`,
  DAILY_LOGIN: (userId: number, date: string) => `daily_login:${userId}:${date}`,
  LEADERBOARD_CACHE: (type: string, limit: number) => `leaderboard:${type}:${limit}`,
  USER_STATS: (userId: number) => `user:stats:${userId}`,
  USER_RANK: (userId: number, period: string) => `user:rank:${userId}:${period}`,
  RATE_LIMIT: (identifier: string, action: string) => `rate_limit:${identifier}:${action}`,
  ACTIVE_USER_PROFILE: (userId: number) => `user:active:profile:${userId}`,
} as const;

/**
 * Helper to set cache with appropriate TTL
 */
export async function setCache(
  redis: any,
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.setex(key, ttlSeconds, value);
}

/**
 * Helper to set cache with JSON serialization
 */
export async function setCacheJSON(
  redis: any,
  key: string,
  value: any,
  ttlSeconds: number,
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}
