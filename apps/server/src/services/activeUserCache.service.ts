// apps/server/src/services/activeUserCache.service.ts
// -----------------------------------------------------------------------------
// Active User Cache Service
// Implements read-through cache pattern for frequently accessed user data
// Reduces N+1 query patterns in leaderboards, chat history, and other features
// -----------------------------------------------------------------------------

import type { IRedisPool } from '@ems/types';
import type { ActiveUserCache } from '@ems/types';
import type { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';
import { CACHE_KEYS, CACHE_TTL } from '../lib/cacheTTL';
import { RedisPool } from '../lib/RedisPool';
import redisClient from '../lib/redis';

/**
 * Active User Cache Service
 *
 * Provides high-performance caching for active user profiles used in:
 * - Leaderboards (avatar URLs, names, stats)
 * - Chat history (user info for messages)
 * - Activity feeds (user attribution)
 *
 * Architecture:
 * - Uses IRedisPool for all Redis operations (no direct redisClient)
 * - Read-through cache pattern (cache miss → DB fetch → cache write)
 * - Batch operations for efficient multi-user lookups
 * - Automatic cache invalidation on profile updates
 */
export class ActiveUserCacheService {
  private redisPool: IRedisPool;
  private userRepo: IUserRepository;

  constructor(redisPool?: IRedisPool, userRepo: IUserRepository = new UserRepository()) {
    // Use provided pool or create singleton instance
    this.redisPool = redisPool || this.createDefaultPool();
    this.userRepo = userRepo;
  }

  /**
   * Create default Redis pool for active user caching
   * Uses same config as EventBus for consistency
   */
  private createDefaultPool(): IRedisPool {
    const options = {
      host: redisClient.options.host,
      port: redisClient.options.port,
      password: redisClient.options.password,
      username: redisClient.options.username,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      lazyConnect: true,
    };

    return new RedisPool(options, {
      maxConnections: 8,
      minConnections: 2,
      acquireTimeoutMs: 10000,
      idleTimeoutMs: 60000,
    });
  }

  /**
   * Get single active user with read-through cache
   *
   * @param userId - User ID to fetch
   * @returns Active user cache data or null if not found
   */
  async getActiveUser(userId: number): Promise<ActiveUserCache | null> {
    const cacheKey = CACHE_KEYS.ACTIVE_USER_PROFILE(userId);

    try {
      // Try cache first
      const cached = await this.redisPool.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as ActiveUserCache;
      }
    } catch (error) {
      console.warn(`[active-user-cache] Cache read failed for user ${userId}:`, error);
    }

    // Cache miss - fetch from database
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return null;
    }

    // Build cache object
    const activeUser: ActiveUserCache = {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      muskBucks: user.muskBucks.toString(),
      profilePictureKey: user.profilePictureKey,
      lastSeen: new Date().toISOString(),
    };

    // Write to cache (fire and forget - don't block on cache writes)
    this.redisPool
      .set(cacheKey, JSON.stringify(activeUser), CACHE_TTL.ACTIVE_USER_PROFILE)
      .catch((error) => {
        console.warn(`[active-user-cache] Cache write failed for user ${userId}:`, error);
      });

    return activeUser;
  }

  /**
   * Batch get active users using Redis MGET for efficiency
   *
   * @param userIds - Array of user IDs to fetch
   * @returns Map of userId to ActiveUserCache (only includes found users)
   */
  async getBatchActiveUsers(userIds: number[]): Promise<Map<number, ActiveUserCache>> {
    if (userIds.length === 0) {
      return new Map();
    }

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(userIds)];
    const cacheKeys = uniqueUserIds.map((id) => CACHE_KEYS.ACTIVE_USER_PROFILE(id));

    const result = new Map<number, ActiveUserCache>();

    try {
      // Batch cache lookup with MGET
      const cachedValues = await this.redisPool.mget(cacheKeys);

      const missingUserIds: number[] = [];

      // Process cached results
      for (let i = 0; i < uniqueUserIds.length; i++) {
        const userId = uniqueUserIds[i];
        const cached = cachedValues[i];

        if (cached) {
          try {
            const activeUser = JSON.parse(cached) as ActiveUserCache;
            result.set(userId, activeUser);
          } catch (error) {
            console.warn(`[active-user-cache] Failed to parse cached user ${userId}:`, error);
            missingUserIds.push(userId);
          }
        } else {
          missingUserIds.push(userId);
        }
      }

      // Fetch missing users from database (if any)
      if (missingUserIds.length > 0) {
        await this.fetchAndCacheMissingUsers(missingUserIds, result);
      }
    } catch (error) {
      console.error('[active-user-cache] Batch fetch failed:', error);
      // Fallback to individual fetches on batch failure
      await this.fallbackIndividualFetches(uniqueUserIds, result);
    }

    return result;
  }

  /**
   * Fetch missing users from database and cache them
   */
  private async fetchAndCacheMissingUsers(
    userIds: number[],
    resultMap: Map<number, ActiveUserCache>,
  ): Promise<void> {
    // Fetch users from database in parallel
    const userPromises = userIds.map((id) => this.userRepo.findById(id));
    const users = await Promise.all(userPromises);

    const cacheEntries: Array<{ key: string; value: string }> = [];

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const user = users[i];

      if (user) {
        const activeUser: ActiveUserCache = {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          muskBucks: user.muskBucks.toString(),
          profilePictureKey: user.profilePictureKey,
          lastSeen: new Date().toISOString(),
        };

        resultMap.set(userId, activeUser);
        cacheEntries.push({
          key: CACHE_KEYS.ACTIVE_USER_PROFILE(userId),
          value: JSON.stringify(activeUser),
        });
      }
    }

    // Batch cache write (fire and forget)
    if (cacheEntries.length > 0) {
      this.redisPool.mset(cacheEntries).catch((error) => {
        console.warn('[active-user-cache] Batch cache write failed:', error);
      });

      // Set TTL for each cached entry (Redis MSET doesn't support TTL)
      for (const entry of cacheEntries) {
        this.redisPool.expire(entry.key, CACHE_TTL.ACTIVE_USER_PROFILE).catch((error) => {
          console.warn(`[active-user-cache] Failed to set TTL for ${entry.key}:`, error);
        });
      }
    }
  }

  /**
   * Fallback to individual fetches if batch operation fails
   */
  private async fallbackIndividualFetches(
    userIds: number[],
    resultMap: Map<number, ActiveUserCache>,
  ): Promise<void> {
    const fetchPromises = userIds.map(async (userId) => {
      try {
        const activeUser = await this.getActiveUser(userId);
        if (activeUser) {
          resultMap.set(userId, activeUser);
        }
      } catch (error) {
        console.warn(`[active-user-cache] Individual fetch failed for user ${userId}:`, error);
      }
    });

    await Promise.all(fetchPromises);
  }

  /**
   * Invalidate cache for a user (call on profile updates)
   *
   * @param userId - User ID to invalidate
   */
  async invalidateUser(userId: number): Promise<void> {
    const cacheKey = CACHE_KEYS.ACTIVE_USER_PROFILE(userId);

    try {
      await this.redisPool.del(cacheKey);
      console.log(`[active-user-cache] Invalidated cache for user ${userId}`);
    } catch (error) {
      console.warn(`[active-user-cache] Failed to invalidate cache for user ${userId}:`, error);
    }
  }

  /**
   * Mark user as active (called on socket connect, API calls)
   * Updates lastSeen timestamp in cache
   *
   * @param userId - User ID to mark as active
   */
  async markUserActive(userId: number): Promise<void> {
    const cacheKey = CACHE_KEYS.ACTIVE_USER_PROFILE(userId);

    try {
      const cached = await this.redisPool.get(cacheKey);
      if (cached) {
        // Update lastSeen timestamp
        const activeUser = JSON.parse(cached) as ActiveUserCache;
        activeUser.lastSeen = new Date().toISOString();

        await this.redisPool.set(
          cacheKey,
          JSON.stringify(activeUser),
          CACHE_TTL.ACTIVE_USER_PROFILE,
        );
      }
    } catch (error) {
      console.warn(`[active-user-cache] Failed to mark user ${userId} as active:`, error);
    }
  }
}

// Singleton instance for easy import across the application
export const activeUserCacheService = new ActiveUserCacheService();
