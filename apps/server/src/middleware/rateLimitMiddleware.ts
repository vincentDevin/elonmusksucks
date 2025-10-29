// apps/server/src/middleware/rateLimitMiddleware.ts
// -----------------------------------------------------------------------------
// Socket.IO rate limiting middleware with Redis-backed sliding window
// -----------------------------------------------------------------------------

import redisClient from '../lib/redis';

// Socket-specific rate limit configuration
export interface SocketRateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip successful requests from counting
  keyGenerator?: (userId: number, eventName: string) => string; // Custom key generator
}

// Socket-specific rate limiter interface (simpler than service-layer IRateLimiter)
export interface ISocketRateLimiter {
  checkLimit(userId: number, eventName: string): Promise<{ allowed: boolean; resetTime?: number }>;
  reset(userId: number, eventName: string): Promise<void>;
}

export class SocketRateLimiter implements ISocketRateLimiter {
  private config: SocketRateLimitConfig;
  private keyPrefix = 'rate_limit:socket';

  constructor(config: SocketRateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minute default
      maxRequests: config.maxRequests || 10,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator.bind(this),
    };
  }

  private defaultKeyGenerator(userId: number, eventName: string): string {
    return `${this.keyPrefix}:${userId}:${eventName}`;
  }

  async checkLimit(
    userId: number,
    eventName: string,
  ): Promise<{ allowed: boolean; resetTime?: number }> {
    const keyGenerator = this.config.keyGenerator ?? this.defaultKeyGenerator.bind(this);
    const key = keyGenerator(userId, eventName);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redisClient.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, now);

      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      const currentCount = results[1][1] as number;

      // Check if limit exceeded
      if (currentCount >= this.config.maxRequests) {
        // Remove the request we just added since it's over limit
        await redisClient.zrem(key, now);

        return {
          allowed: false,
          resetTime: windowStart + this.config.windowMs,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[rate-limiter] Redis error:', error);
      // Fail open - allow request if Redis is down
      return { allowed: true };
    }
  }

  async reset(userId: number, eventName: string): Promise<void> {
    const keyGenerator = this.config.keyGenerator ?? this.defaultKeyGenerator.bind(this);
    const key = keyGenerator(userId, eventName);
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('[rate-limiter] Reset error:', error);
    }
  }
}

// Create rate limiter instances for different event types
export const betRateLimiter = new SocketRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 bets per minute per user
});

export const chatRateLimiter = new SocketRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60, // 60 messages per minute per user
});

export const generalRateLimiter = new SocketRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 general events per minute per user
});

// Middleware factory for socket event rate limiting
export function createRateLimitMiddleware(limiter: ISocketRateLimiter, eventName: string) {
  return async function rateLimitHandler(
    userId: number,
    next: (error?: string) => void,
  ): Promise<void> {
    try {
      const result = await limiter.checkLimit(userId, eventName);

      if (!result.allowed) {
        const waitTime = result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60;
        return next(`RATE_LIMIT_EXCEEDED:${waitTime}`);
      }

      next();
    } catch (error) {
      console.error('[rate-limiter] Middleware error:', error);
      // Fail open
      next();
    }
  };
}
