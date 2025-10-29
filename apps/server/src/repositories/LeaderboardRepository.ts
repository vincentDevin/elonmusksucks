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
   * Enhanced method with caching and pagination - now queries UserStats directly
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

    // Query UserStats directly (like Pong does) with User data
    const userStats = await prisma.userStats.findMany({
      take: limit,
      skip: offset,
      orderBy: { profit: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
            muskBucks: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.userStats.count();

    // Process entries with optimized avatar handling
    const entries = await this.processUserStatsEntries(userStats);

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
   * Enhanced method with caching and pagination - daily period calculated dynamically
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

    // For daily leaderboard, we need to calculate profit from recent bets/parlays
    // Use raw query to get daily profits and join with UserStats for other data
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        us."userId" as user_id,
        u.name as user_name,
        u."avatarUrl" as avatar_url,
        u."profilePictureKey" as avatar_key,
        u."muskBucks" as balance,
        us."totalBets" + us."totalParlays" as total_bets,
        CASE 
          WHEN (us."totalBets" + us."totalParlays") > 0 
          THEN CAST((us."betsWon" + us."parlaysWon") AS FLOAT) / (us."totalBets" + us."totalParlays")
          ELSE 0 
        END as win_rate,
        us.profit as profit_all,
        COALESCE(
          (SELECT SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END)
           FROM "Bet" b 
           WHERE b."userId" = us."userId" AND b."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
          ), 0
        ) + COALESCE(
          (SELECT SUM(CASE WHEN p.status = 'WON' THEN p."potentialPayout" - p.amount ELSE -p.amount END)
           FROM "Parlay" p
           WHERE p."userId" = us."userId" AND p."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
          ), 0
        ) as profit_period,
        us.roi,
        us."longestStreak" as longest_streak,
        us."currentStreak" as current_streak,
        us."totalParlays" as parlays_started,
        us."parlaysWon" as parlays_won,
        us."totalParlayLegs" as total_parlay_legs,
        us."parlayLegsWon" as parlay_legs_won,
        0 as rank_change
      FROM "UserStats" us
      JOIN "User" u ON us."userId" = u.id
      ORDER BY profit_period DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const totalCount = await prisma.userStats.count();

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
   * Get combined user ranking data in a single query (optimized for enhanced stats)
   * Combines all-time rank, daily rank, and leaderboard stats in one CTE query
   */
  async getUserRankingCombined(userId: number): Promise<{
    allTimeRank: number | null;
    dailyRank: number | null;
    totalUsers: number;
  }> {
    const cacheKey = `user_rank_combined:${userId}`;

    // Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache read failed:', error);
    }

    // Single CTE query to get all ranking data at once
    const result = await prisma.$queryRaw<
      Array<{
        all_time_rank: bigint | null;
        daily_rank: bigint | null;
        total_users: bigint;
      }>
    >`
      WITH all_time_ranks AS (
        SELECT
          "userId",
          ROW_NUMBER() OVER (ORDER BY profit DESC) as rank
        FROM "UserStats"
      ),
      daily_profits AS (
        SELECT
          us."userId",
          COALESCE(
            (SELECT SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END)
             FROM "Bet" b
             WHERE b."userId" = us."userId" AND b."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
            ), 0
          ) + COALESCE(
            (SELECT SUM(CASE WHEN p.status = 'WON' THEN p."potentialPayout" - p.amount ELSE -p.amount END)
             FROM "Parlay" p
             WHERE p."userId" = us."userId" AND p."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
            ), 0
          ) as daily_profit
        FROM "UserStats" us
      ),
      daily_ranks AS (
        SELECT
          "userId",
          ROW_NUMBER() OVER (ORDER BY daily_profit DESC) as rank
        FROM daily_profits
      ),
      user_stats AS (
        SELECT COUNT(*)::bigint as total_users
        FROM "UserStats"
      )
      SELECT
        atr.rank as all_time_rank,
        dr.rank as daily_rank,
        us.total_users
      FROM user_stats us
      LEFT JOIN all_time_ranks atr ON atr."userId" = ${userId}
      LEFT JOIN daily_ranks dr ON dr."userId" = ${userId}
    `;

    const [row] = result;

    const ranking = {
      allTimeRank: row?.all_time_rank ? Number(row.all_time_rank) : null,
      dailyRank: row?.daily_rank ? Number(row.daily_rank) : null,
      totalUsers: row?.total_users ? Number(row.total_users) : 0,
    };

    // Cache the result
    try {
      await redisClient.setex(cacheKey, CACHE_TTL.USER_RANK, JSON.stringify(ranking));
    } catch (error) {
      console.warn('[leaderboard] Cache write failed:', error);
    }

    return ranking;
  }

  /**
   * Get specific user's rank across different time periods - now queries UserStats directly
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

    // Query user's rank using window functions on UserStats
    let result: any[];
    if (period === 'allTime') {
      result = await prisma.$queryRaw<any[]>`
        WITH ranked_users AS (
          SELECT 
            "userId",
            ROW_NUMBER() OVER (ORDER BY profit DESC) as rank
          FROM "UserStats"
        )
        SELECT rank FROM ranked_users WHERE "userId" = ${userId}
      `;
    } else {
      // For daily ranking, calculate daily profit dynamically
      result = await prisma.$queryRaw<any[]>`
        WITH daily_profits AS (
          SELECT 
            us."userId",
            COALESCE(
              (SELECT SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END)
               FROM "Bet" b 
               WHERE b."userId" = us."userId" AND b."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
              ), 0
            ) + COALESCE(
              (SELECT SUM(CASE WHEN p.status = 'WON' THEN p."potentialPayout" - p.amount ELSE -p.amount END)
               FROM "Parlay" p
               WHERE p."userId" = us."userId" AND p."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
              ), 0
            ) as daily_profit
          FROM "UserStats" us
        ),
        ranked_users AS (
          SELECT 
            "userId",
            ROW_NUMBER() OVER (ORDER BY daily_profit DESC) as rank
          FROM daily_profits
        )
        SELECT rank FROM ranked_users WHERE "userId" = ${userId}
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
   * Get overall leaderboard statistics - now queries UserStats directly
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

    // Use Prisma aggregations on UserStats for better performance
    const [statsResult] = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN "totalBets" + "totalParlays" > 0 THEN 1 END) as active_users,
        SUM("totalBets" + "totalParlays") as total_bets,
        SUM("totalWagered") as total_volume
      FROM "UserStats"
    `;

    // No longer need last refresh time since we're querying live data
    const stats: LeaderboardStats = {
      totalUsers: Number(statsResult.total_users),
      activeUsers: Number(statsResult.active_users),
      totalBets: Number(statsResult.total_bets),
      totalVolume: Number(statsResult.total_volume),
      lastRefresh: new Date(), // Always current since we're querying live data
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
   * Refresh method is now simplified - just clear caches since we query live data
   * No more leaderboard_view table to maintain!
   */
  async refreshMaterializedView(): Promise<void> {
    console.log('[leaderboard] Refreshing by clearing caches (now using live UserStats data)');

    // Clear all leaderboard caches - data is always fresh from UserStats
    await this.clearCache();

    console.log('[leaderboard] Refresh complete - all caches cleared');
  }

  /**
   * Process leaderboard entries with optimized avatar handling
   * Uses batch avatar URL fetching to reduce N+1 queries
   */
  private async processLeaderboardEntries(rows: any[]): Promise<PublicLeaderboardEntry[]> {
    if (rows.length === 0) {
      return [];
    }

    // Collect all users that need avatar URLs
    const usersForAvatars = rows.map((r) => ({
      id: Number(r.user_id),
      profilePictureKey: r.avatar_key,
      avatarUrl: r.avatar_url,
    }));

    // Batch fetch avatar URLs (single MGET + parallel S3 calls)
    const avatarUrlMap = await userService.getBatchedAvatarUrls(usersForAvatars);

    // Map results back to rows
    return rows.map((r) => ({
      userId: Number(r.user_id),
      userName: r.user_name,
      avatarUrl: avatarUrlMap.get(Number(r.user_id)) || null,
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
   * Process UserStats entries directly (for all-time leaderboard)
   * Uses batch avatar URL fetching to reduce N+1 queries
   */
  private async processUserStatsEntries(userStats: any[]): Promise<PublicLeaderboardEntry[]> {
    if (userStats.length === 0) {
      return [];
    }

    // Collect all users that need avatar URLs
    const usersForAvatars = userStats.map((stat) => ({
      id: stat.user.id,
      profilePictureKey: stat.user.profilePictureKey,
      avatarUrl: stat.user.avatarUrl,
    }));

    // Batch fetch avatar URLs (single MGET + parallel S3 calls)
    const avatarUrlMap = await userService.getBatchedAvatarUrls(usersForAvatars);

    // Map results back to stats
    return userStats.map((stat) => {
      const user = stat.user;
      return {
        userId: user.id,
        userName: user.name,
        avatarUrl: avatarUrlMap.get(user.id) || null,
        balance: user.muskBucks.toString(),
        totalBets: stat.totalBets + stat.totalParlays,
        winRate:
          stat.totalBets + stat.totalParlays > 0
            ? (stat.betsWon + stat.parlaysWon) / (stat.totalBets + stat.totalParlays)
            : 0,
        profitAll: stat.profit.toString(),
        profitPeriod: '0', // Will be calculated separately for daily leaderboard
        roi: stat.roi,
        longestStreak: stat.longestStreak,
        currentStreak: stat.currentStreak,
        parlaysStarted: stat.totalParlays,
        parlaysWon: stat.parlaysWon,
        totalParlayLegs: stat.totalParlayLegs,
        parlayLegsWon: stat.parlayLegsWon,
        rankChange: null, // Can be calculated if needed
      };
    });
  }

  /**
   * Clear all leaderboard-related caches
   */
  private async clearCache(): Promise<void> {
    try {
      const keys = await redisClient.keys('leaderboard:*');
      const userRankKeys = await redisClient.keys('user_rank:*');
      // Keep avatar cache as it's still useful

      const allKeys = [...keys, ...userRankKeys];

      if (allKeys.length > 0) {
        await redisClient.del(...allKeys);
        console.log(`[leaderboard] Cleared ${allKeys.length} cache keys (keeping avatar cache)`);
      }
    } catch (error) {
      console.warn('[leaderboard] Cache clear failed:', error);
    }
  }
}
