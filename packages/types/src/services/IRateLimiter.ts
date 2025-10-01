/**
 * Services Layer - Rate Limiter Interface
 *
 * Abstract interface for rate limiting functionality.
 * Prevents direct implementation details in service layer.
 */

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Current count of requests in the window
   */
  current: number;

  /**
   * Maximum requests allowed in the window
   */
  limit: number;

  /**
   * Remaining requests in the window
   */
  remaining: number;

  /**
   * Time in milliseconds until the limit resets
   */
  resetMs: number;

  /**
   * Timestamp when the limit will reset
   */
  resetAt: Date;
}

/**
 * Rate Limit Options (for service-level rate limiting)
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the window
   */
  max: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Optional prefix for Redis keys
   */
  keyPrefix?: string;
}

/**
 * Rate Limiter Interface
 *
 * Services depend on this interface for rate limiting operations.
 * Implementation handles Redis-based token bucket or sliding window.
 */
export interface IRateLimiter {
  /**
   * Check and consume a rate limit token
   *
   * @param identifier - Unique identifier for the rate limit (e.g., userId, IP)
   * @param options - Rate limit options
   * @returns Promise resolving to rate limit result
   */
  consume(identifier: string, options: RateLimitOptions): Promise<RateLimitResult>;

  /**
   * Check rate limit without consuming a token
   *
   * @param identifier - Unique identifier for the rate limit
   * @param options - Rate limit options
   * @returns Promise resolving to rate limit result
   */
  check(identifier: string, options: RateLimitOptions): Promise<RateLimitResult>;

  /**
   * Reset rate limit for an identifier
   *
   * @param identifier - Unique identifier for the rate limit
   * @param options - Rate limit options
   * @returns Promise that resolves when limit is reset
   */
  reset(identifier: string, options: RateLimitOptions): Promise<void>;

  /**
   * Get current rate limit status for an identifier
   *
   * @param identifier - Unique identifier for the rate limit
   * @param options - Rate limit options
   * @returns Promise resolving to rate limit result
   */
  status(identifier: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

/**
 * Common Rate Limit Configurations
 */
export const RateLimitPresets = {
  /**
   * Authentication endpoints (5 requests per 15 minutes)
   */
  AUTH: {
    max: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: 'rl:auth:',
  } as const,

  /**
   * API endpoints (100 requests per minute)
   */
  API: {
    max: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:api:',
  } as const,

  /**
   * Chat messages (10 messages per 10 seconds)
   */
  CHAT: {
    max: 10,
    windowMs: 10 * 1000,
    keyPrefix: 'rl:chat:',
  } as const,

  /**
   * Bet placement (20 bets per minute)
   */
  BET: {
    max: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:bet:',
  } as const,

  /**
   * Prediction creation (5 predictions per hour)
   */
  PREDICTION: {
    max: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'rl:prediction:',
  } as const,

  /**
   * Content creation (30 posts/comments per hour)
   */
  CONTENT: {
    max: 30,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'rl:content:',
  } as const,

  /**
   * Profile updates (10 updates per hour)
   */
  PROFILE: {
    max: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'rl:profile:',
  } as const,

  /**
   * Admin actions (unlimited, but tracked)
   */
  ADMIN: {
    max: 1000,
    windowMs: 60 * 1000,
    keyPrefix: 'rl:admin:',
  } as const,
} as const;

/**
 * Rate Limiter Factory
 *
 * Used for dependency injection in service constructors
 */
export type RateLimiterFactory = () => IRateLimiter;
