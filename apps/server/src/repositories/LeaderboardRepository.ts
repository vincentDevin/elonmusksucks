// apps/server/src/repositories/LeaderboardRepository.ts
import prisma from '../db';
import type { PublicLeaderboardEntry } from '@ems/types';
import type {
  ILeaderboardRepository,
  LeaderboardQuery,
  PaginatedLeaderboard,
  UserRank,
  LeaderboardStats,
} from './interfaces/ILeaderboardRepository';
import { UserService } from '../services/user.service';
import redisClient from '../lib/redis';

const userService = new UserService();

// Cache configuration
const CACHE_TTL = {
  LEADERBOARD: 300, // 5 minutes
  USER_RANK: 600, // 10 minutes
  STATS: 900, // 15 minutes
  AVATAR: 86400, // 24 hours
};

// Cache key generators
const getCacheKey = {
  leaderboard: (metric: string, limit: number, offset: number = 0) =>
    `leaderboard:${metric}:${limit}:${offset}`,
  userRank: (userId: number, period: string) => `user_rank:${userId}:${period}`,
  stats: () => 'leaderboard:stats',
  avatar: (userId: number, avatarKey: string) => `avatar:${userId}:${avatarKey}`,
};

export class LeaderboardRepository implements ILeaderboardRepository {
  /**
   * Legacy method - maintained for backward compatibility
   */
  async getTopAllTime(limit: number): Promise<PublicLeaderboardEntry[]> {
    const result = await this.getTopAllTimePaginated({ limit });
    return result.entries;
  }

  /**
   * Enhanced method with caching and pagination
   */
  async getTopAllTimePaginated(params: LeaderboardQuery): Promise<PaginatedLeaderboard> {
    const { limit = 25, offset = 0 } = params;
    const cacheKey = getCacheKey.leaderboard('allTime', limit, offset);

    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache read failed:', error);
    }

    // Query from materialized view using Prisma raw query (needed for materialized view)
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM leaderboard_view 
      ORDER BY profit_all DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const [totalResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM leaderboard_view
    `;
    const totalCount = Number(totalResult.count);

    // Process entries with optimized avatar handling
    const entries = await this.processLeaderboardEntries(rows);

    const result: PaginatedLeaderboard = {
      entries,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPrevPage: offset > 0,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
    };

    // Cache the result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL.LEADERBOARD, JSON.stringify(result));
    } catch (error) {
      console.warn('[leaderboard] Cache write failed:', error);
    }

    return result;
  }

  /**
   * Legacy method - maintained for backward compatibility
   */
  async getTopDaily(limit: number): Promise<PublicLeaderboardEntry[]> {
    const result = await this.getTopDailyPaginated({ limit });
    return result.entries;
  }

  /**
   * Enhanced method with caching and pagination
   */
  async getTopDailyPaginated(params: LeaderboardQuery): Promise<PaginatedLeaderboard> {
    const { limit = 25, offset = 0 } = params;
    const cacheKey = getCacheKey.leaderboard('daily', limit, offset);

    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache read failed:', error);
    }

    // Query from materialized view
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM leaderboard_view 
      ORDER BY profit_period DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const [totalResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM leaderboard_view
    `;
    const totalCount = Number(totalResult.count);

    // Process entries with optimized avatar handling
    const entries = await this.processLeaderboardEntries(rows);

    const result: PaginatedLeaderboard = {
      entries,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPrevPage: offset > 0,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
    };

    // Cache the result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL.LEADERBOARD, JSON.stringify(result));
    } catch (error) {
      console.warn('[leaderboard] Cache write failed:', error);
    }

    return result;
  }

  /**
   * Get specific user's rank across different time periods
   */
  async getUserRank(userId: number, period: 'allTime' | 'daily'): Promise<UserRank> {
    const cacheKey = getCacheKey.userRank(userId, period);

    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache read failed:', error);
    }

    // Query user's rank using window functions
    let result: any[];
    if (period === 'allTime') {
      result = await prisma.$queryRaw<any[]>`
        WITH ranked_users AS (
          SELECT 
            user_id,
            ROW_NUMBER() OVER (ORDER BY profit_all DESC) as rank
          FROM leaderboard_view
        )
        SELECT rank FROM ranked_users WHERE user_id = ${userId}
      `;
    } else {
      result = await prisma.$queryRaw<any[]>`
        WITH ranked_users AS (
          SELECT 
            user_id,
            ROW_NUMBER() OVER (ORDER BY profit_period DESC) as rank
          FROM leaderboard_view
        )
        SELECT rank FROM ranked_users WHERE user_id = ${userId}
      `;
    }

    const [rankResult] = result;

    const rank = rankResult ? Number(rankResult.rank) : null;

    const userRank: UserRank = {
      userId,
      allTimeRank: period === 'allTime' ? rank : null,
      dailyRank: period === 'daily' ? rank : null,
    };

    // Cache the result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL.USER_RANK, JSON.stringify(userRank));
    } catch (error) {
      console.warn('[leaderboard] Cache write failed:', error);
    }

    return userRank;
  }

  /**
   * Get overall leaderboard statistics
   */
  async getLeaderboardStats(): Promise<LeaderboardStats> {
    const cacheKey = getCacheKey.stats();

    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache read failed:', error);
    }

    // Use Prisma aggregations for better performance
    const [statsResult] = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN total_bets > 0 THEN 1 END) as active_users,
        SUM(total_bets) as total_bets,
        SUM(CASE WHEN profit_all > 0 THEN profit_all ELSE 0 END) as total_volume
      FROM leaderboard_view
    `;

    // Get last refresh time from Redis if available
    let lastRefresh: Date | null = null;
    try {
      const refreshData = await redisClient.get('leaderboard:last_refresh');
      if (refreshData) {
        const parsed = JSON.parse(refreshData);
        lastRefresh = new Date(parsed.timestamp);
      }
    } catch (error) {
      console.warn('[leaderboard] Failed to get last refresh time:', error);
    }

    const stats: LeaderboardStats = {
      totalUsers: Number(statsResult.total_users),
      activeUsers: Number(statsResult.active_users),
      totalBets: Number(statsResult.total_bets),
      totalVolume: Number(statsResult.total_volume),
      lastRefresh,
    };

    // Cache the result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL.STATS, JSON.stringify(stats));
    } catch (error) {
      console.warn('[leaderboard] Cache write failed:', error);
    }

    return stats;
  }

  /**
   * Refresh leaderboard data and clear related caches
   * Note: leaderboard_view is now a regular table, not a materialized view
   */
  async refreshMaterializedView(): Promise<void> {
    // Refresh the leaderboard_view table with current data
    await prisma.$executeRaw`
      INSERT INTO leaderboard_view (
        user_id, user_name, avatar_url, balance, total_bets, win_rate,
        profit_all, profit_period, roi, longest_streak, current_streak,
        parlays_started, parlays_won, total_parlay_legs, parlay_legs_won, rank_change
      )
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        u."avatarUrl" AS avatar_url,
        u."muskBucks" AS balance,
        COALESCE(COUNT(DISTINCT b.id), 0) AS total_bets,
        CASE 
          WHEN COUNT(b.id) > 0 
          THEN CAST(COUNT(CASE WHEN b.won = true THEN 1 END) AS FLOAT) / COUNT(b.id)
          ELSE 0 
        END AS win_rate,
        COALESCE(SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END), 0) AS profit_all,
        COALESCE(SUM(
          CASE 
            WHEN b."createdAt" >= CURRENT_DATE - INTERVAL '30 days' 
            THEN CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END
            ELSE 0
          END
        ), 0) AS profit_period,
        CASE 
          WHEN SUM(b.amount) > 0 
          THEN CAST(SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END) AS FLOAT) / SUM(b.amount)
          ELSE 0 
        END AS roi,
        COALESCE(u."longestStreak", 0) AS longest_streak,
        COALESCE(u."currentStreak", 0) AS current_streak,
        COALESCE(COUNT(DISTINCT p.id), 0) AS parlays_started,
        COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'WON' THEN p.id END), 0) AS parlays_won,
        COALESCE(COUNT(DISTINCT pl.id), 0) AS total_parlay_legs,
        COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'WON' THEN pl.id END), 0) AS parlay_legs_won,
        0 AS rank_change
      FROM "User" u
      LEFT JOIN "Bet" b ON u.id = b."userId"
      LEFT JOIN "Parlay" p ON u.id = p."userId"
      LEFT JOIN "ParlayLeg" pl ON p.id = pl."parlayId"
      WHERE u.role IN ('USER', 'ADMIN')
      GROUP BY u.id, u.name, u."avatarUrl", u."muskBucks", u."longestStreak", u."currentStreak"
      ON CONFLICT (user_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        avatar_url = EXCLUDED.avatar_url,
        balance = EXCLUDED.balance,
        total_bets = EXCLUDED.total_bets,
        win_rate = EXCLUDED.win_rate,
        profit_all = EXCLUDED.profit_all,
        profit_period = EXCLUDED.profit_period,
        roi = EXCLUDED.roi,
        longest_streak = EXCLUDED.longest_streak,
        current_streak = EXCLUDED.current_streak,
        parlays_started = EXCLUDED.parlays_started,
        parlays_won = EXCLUDED.parlays_won,
        total_parlay_legs = EXCLUDED.total_parlay_legs,
        parlay_legs_won = EXCLUDED.parlay_legs_won,
        rank_change = EXCLUDED.rank_change;
    `;

    // Clear all leaderboard caches after data update
    await this.clearCache();
  }

  /**
   * Process leaderboard entries with optimized avatar handling
   */
  private async processLeaderboardEntries(rows: any[]): Promise<PublicLeaderboardEntry[]> {
    // Batch avatar URL generation for better performance
    const avatarPromises = rows.map(async (r) => {
      if (r.avatar_key) {
        const cacheKey = getCacheKey.avatar(r.user_id, r.avatar_key);

        // Check cache first
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return cached;
          }
        } catch (error) {
          console.warn('[leaderboard] Avatar cache read failed:', error);
        }

        // Generate URL and cache it
        const avatarUrl = await userService.getCachedProfileImageUrl(
          r.user_id,
          r.avatar_key,
          CACHE_TTL.AVATAR,
        );

        try {
          await redisClient.setex(cacheKey, CACHE_TTL.AVATAR, avatarUrl || '');
        } catch (error) {
          console.warn('[leaderboard] Avatar cache write failed:', error);
        }

        return avatarUrl;
      } else if (r.avatar_url) {
        return r.avatar_url;
      }
      return null;
    });

    const avatarUrls = await Promise.all(avatarPromises);

    return rows.map((r, index) => ({
      userId: Number(r.user_id),
      userName: r.user_name,
      avatarUrl: avatarUrls[index],
      balance: r.balance.toString(),
      totalBets: Number(r.total_bets),
      winRate: Number(r.win_rate),
      profitAll: r.profit_all.toString(),
      profitPeriod: r.profit_period.toString(),
      roi: Number(r.roi),
      longestStreak: Number(r.longest_streak),
      currentStreak: Number(r.current_streak),
      parlaysStarted: Number(r.parlays_started),
      parlaysWon: Number(r.parlays_won),
      totalParlayLegs: Number(r.total_parlay_legs),
      parlayLegsWon: Number(r.parlay_legs_won),
      rankChange: r.rank_change !== null ? Number(r.rank_change) : null,
    }));
  }

  /**
   * Clear all leaderboard-related caches
   */
  private async clearCache(): Promise<void> {
    try {
      const keys = await redisClient.keys('leaderboard:*');
      const userRankKeys = await redisClient.keys('user_rank:*');
      const avatarKeys = await redisClient.keys('avatar:*');

      const allKeys = [...keys, ...userRankKeys, ...avatarKeys];

      if (allKeys.length > 0) {
        await redisClient.del(...allKeys);
        console.log(`[leaderboard] Cleared ${allKeys.length} cache keys`);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache clear failed:', error);
    }
  }
}
