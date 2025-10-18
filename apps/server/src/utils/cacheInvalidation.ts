/**
 * Centralized cache invalidation utility for Issue #3 caching layer
 *
 * Provides high-level methods to invalidate related cache keys when data changes.
 * Uses the existing invalidateCache() utility from analyticsCache.ts for pattern-based deletion.
 */

import redisClient from '../lib/redis';
import { invalidateCache } from './analyticsCache';

export class CacheInvalidation {
  /**
   * Invalidate all caches for a specific user
   * Call this after: bet placement, payout, achievement unlock, balance change
   */
  static async invalidateUser(userId: number): Promise<void> {
    try {
      await Promise.all([
        // User stats caches
        redisClient.del(`user:stats:enhanced:${userId}`),
        redisClient.del(`user:stats:basic:${userId}`),
        // User achievement progress
        redisClient.del(`user:${userId}:achievements:progress`),
        // User leaderboard ranks
        redisClient.del(`leaderboard:rank:${userId}:allTime`),
        redisClient.del(`leaderboard:rank:${userId}:daily`),
      ]);
      console.log(`[cacheInvalidation] Invalidated all caches for user ${userId}`);
    } catch (error) {
      console.error(`[cacheInvalidation] Error invalidating user ${userId} caches:`, error);
    }
  }

  /**
   * Invalidate all caches for a specific prediction
   * Call this after: bet placement (odds change), prediction resolution, prediction edit
   */
  static async invalidatePrediction(predictionId: number): Promise<void> {
    try {
      await Promise.all([
        // Single prediction cache
        redisClient.del(`prediction:${predictionId}`),
        // Prediction list caches (all pages and filters)
        invalidateCache('predictions:active:*'),
        // Prediction count caches
        redisClient.del('predictions:count:active'),
        redisClient.del('predictions:count:all'),
      ]);
      console.log(`[cacheInvalidation] Invalidated caches for prediction ${predictionId}`);
    } catch (error) {
      console.error(
        `[cacheInvalidation] Error invalidating prediction ${predictionId} caches:`,
        error,
      );
    }
  }

  /**
   * Invalidate achievement-related caches
   * Call this after: achievement definition changes (rare)
   */
  static async invalidateAchievements(): Promise<void> {
    try {
      await Promise.all([
        // Global achievements cache
        redisClient.del('achievements:all'),
        // All user achievement progress caches
        invalidateCache('user:*:achievements:progress'),
      ]);
      console.log('[cacheInvalidation] Invalidated all achievement caches');
    } catch (error) {
      console.error('[cacheInvalidation] Error invalidating achievement caches:', error);
    }
  }

  /**
   * Invalidate user's achievement progress only
   * Call this after: achievement unlock, progress update
   */
  static async invalidateUserAchievements(userId: number): Promise<void> {
    try {
      await redisClient.del(`user:${userId}:achievements:progress`);
      console.log(`[cacheInvalidation] Invalidated achievement progress for user ${userId}`);
    } catch (error) {
      console.error(
        `[cacheInvalidation] Error invalidating user ${userId} achievement caches:`,
        error,
      );
    }
  }

  /**
   * Invalidate leaderboard-related caches
   * Call this after: leaderboard refresh job, major ranking changes
   */
  static async invalidateLeaderboard(): Promise<void> {
    try {
      await Promise.all([
        // All leaderboard list caches
        invalidateCache('leaderboard:all-time:*'),
        invalidateCache('leaderboard:daily:*'),
        // All user rank caches
        invalidateCache('leaderboard:rank:*'),
        // Leaderboard stats
        redisClient.del('leaderboard:stats'),
      ]);
      console.log('[cacheInvalidation] Invalidated all leaderboard caches');
    } catch (error) {
      console.error('[cacheInvalidation] Error invalidating leaderboard caches:', error);
    }
  }

  /**
   * Invalidate specific user's leaderboard rank
   * Call this after: bet resolves and affects user's ranking
   */
  static async invalidateUserRank(userId: number): Promise<void> {
    try {
      await Promise.all([
        redisClient.del(`leaderboard:rank:${userId}:allTime`),
        redisClient.del(`leaderboard:rank:${userId}:daily`),
      ]);
      console.log(`[cacheInvalidation] Invalidated leaderboard ranks for user ${userId}`);
    } catch (error) {
      console.error(
        `[cacheInvalidation] Error invalidating user ${userId} leaderboard ranks:`,
        error,
      );
    }
  }

  /**
   * Invalidate prediction count caches
   * Call this after: new prediction created, prediction resolved
   */
  static async invalidatePredictionCounts(): Promise<void> {
    try {
      await Promise.all([
        redisClient.del('predictions:count:active'),
        redisClient.del('predictions:count:resolved'),
        redisClient.del('predictions:count:all'),
      ]);
      console.log('[cacheInvalidation] Invalidated prediction count caches');
    } catch (error) {
      console.error('[cacheInvalidation] Error invalidating prediction count caches:', error);
    }
  }

  /**
   * Invalidate all prediction list caches (all pages/filters)
   * Call this after: new prediction created
   */
  static async invalidatePredictionLists(): Promise<void> {
    try {
      await invalidateCache('predictions:active:*');
      console.log('[cacheInvalidation] Invalidated all prediction list caches');
    } catch (error) {
      console.error('[cacheInvalidation] Error invalidating prediction list caches:', error);
    }
  }

  /**
   * Pattern-based invalidation for custom use cases
   * Exposes the underlying invalidateCache function
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      await invalidateCache(pattern);
      console.log(`[cacheInvalidation] Invalidated pattern: ${pattern}`);
    } catch (error) {
      console.error(`[cacheInvalidation] Error invalidating pattern ${pattern}:`, error);
    }
  }
}
