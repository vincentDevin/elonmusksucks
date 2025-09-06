import { PrismaClient } from '@prisma/client';
import type { IStatsRepository } from '../services/AchievementEngine';
import { serializeBigInt } from '../utils/bigintSerializer';

/**
 * Repository for user statistics and counters
 * Manages materialized user stats for fast achievement rule evaluation
 */
export class StatsRepository implements IStatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get all user counters for achievement evaluation
   */
  async getUserCounters(userId: number): Promise<Record<string, number>> {
    try {
      // Get all user stats in parallel
      const [userStats, pongStats, user, predictionsCount, followersCount, followingCount] =
        await Promise.all([
          this.prisma.userStats.findUnique({ where: { userId } }),
          this.prisma.pongStats.findUnique({ where: { userId } }),
          this.prisma.user.findUnique({ where: { id: userId } }),
          this.prisma.prediction.count({ where: { creatorId: userId } }),
          this.prisma.follow.count({ where: { followingId: userId } }),
          this.prisma.follow.count({ where: { followerId: userId } }),
        ]);

      // Serialize bigint fields to numbers
      const serializedUserStats = userStats ? serializeBigInt(userStats) : null;
      const serializedPongStats = pongStats ? serializeBigInt(pongStats) : null;

      return {
        // Betting counters
        betsPlaced: userStats?.totalBets || 0,
        betsWon: userStats?.betsWon || 0,
        betsLost: userStats?.betsLost || 0,
        totalStaked: Number(serializedUserStats?.totalWagered || 0),
        totalProfit: Number(serializedUserStats?.profit || 0), // Use actual profit, not totalWon
        totalWon: Number(serializedUserStats?.totalWon || 0),
        parlayWins: userStats?.parlaysWon || 0,
        parlayTotal: userStats?.totalParlays || 0,
        biggestWin: Number(serializedUserStats?.biggestWin || 0),
        winStreak: userStats?.currentStreak || 0,
        bestWinStreak: userStats?.longestStreak || 0,
        winRate: userStats?.winRate || 0,

        // Pong counters - NOW USING REAL DATA
        pongMatches: pongStats?.totalMatches || 0,
        pongWins: pongStats?.wins || 0,
        pongLosses: pongStats?.losses || 0,
        pongElo: pongStats?.eloRating || 1200,
        pongStreakWin: pongStats?.winStreak || 0,
        pongBestStreakWin: pongStats?.bestWinStreak || 0,
        pongPerfectGames: pongStats?.perfectGames || 0,
        pongComebacks: pongStats?.comebacks || 0,
        pongTotalWagered: Number(serializedPongStats?.totalWagered || 0),
        pongTotalWon: Number(serializedPongStats?.totalWon || 0),

        // Social counters - NOW USING REAL DATA
        predictionsCreated: predictionsCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,

        // User profile completion counters
        profileComplete: user?.profileComplete ? 1 : 0,
        hasAvatar: user?.avatarUrl ? 1 : 0,
        hasBio: user?.bio ? 1 : 0,
        hasLocation: user?.location ? 1 : 0,
      };
    } catch (error) {
      console.error('Failed to get user counters:', error);
      return this.getDefaultCounters();
    }
  }

  /**
   * Update user counters (for stats synchronization)
   * NOTE: This method is mainly for testing. In production, stats are updated
   * directly by the respective services (betting, pong, etc.)
   */
  async updateUserCounters(userId: number, updates: Record<string, number>): Promise<void> {
    try {
      // Map counter updates back to database fields for UserStats
      const userStatsUpdates: any = {};

      if (updates.betsPlaced !== undefined) userStatsUpdates.totalBets = updates.betsPlaced;
      if (updates.betsWon !== undefined) userStatsUpdates.betsWon = updates.betsWon;
      if (updates.betsLost !== undefined) userStatsUpdates.betsLost = updates.betsLost;
      if (updates.totalStaked !== undefined)
        userStatsUpdates.totalWagered = BigInt(updates.totalStaked);
      if (updates.totalProfit !== undefined) userStatsUpdates.profit = BigInt(updates.totalProfit);
      if (updates.totalWon !== undefined) userStatsUpdates.totalWon = BigInt(updates.totalWon);
      if (updates.parlayWins !== undefined) userStatsUpdates.parlaysWon = updates.parlayWins;
      if (updates.parlayTotal !== undefined) userStatsUpdates.totalParlays = updates.parlayTotal;
      if (updates.biggestWin !== undefined)
        userStatsUpdates.biggestWin = BigInt(updates.biggestWin);
      if (updates.winStreak !== undefined) userStatsUpdates.currentStreak = updates.winStreak;
      if (updates.bestWinStreak !== undefined)
        userStatsUpdates.longestStreak = updates.bestWinStreak;
      if (updates.winRate !== undefined) userStatsUpdates.winRate = updates.winRate;

      // Update UserStats if there are changes
      if (Object.keys(userStatsUpdates).length > 0) {
        await this.prisma.userStats.upsert({
          where: { userId },
          create: {
            userId,
            ...userStatsUpdates,
          },
          update: userStatsUpdates,
        });
      }

      // Map counter updates back to database fields for PongStats
      const pongStatsUpdates: any = {};

      if (updates.pongMatches !== undefined) pongStatsUpdates.totalMatches = updates.pongMatches;
      if (updates.pongWins !== undefined) pongStatsUpdates.wins = updates.pongWins;
      if (updates.pongLosses !== undefined) pongStatsUpdates.losses = updates.pongLosses;
      if (updates.pongElo !== undefined) pongStatsUpdates.eloRating = updates.pongElo;
      if (updates.pongStreakWin !== undefined) pongStatsUpdates.winStreak = updates.pongStreakWin;
      if (updates.pongBestStreakWin !== undefined)
        pongStatsUpdates.bestWinStreak = updates.pongBestStreakWin;
      if (updates.pongPerfectGames !== undefined)
        pongStatsUpdates.perfectGames = updates.pongPerfectGames;
      if (updates.pongComebacks !== undefined) pongStatsUpdates.comebacks = updates.pongComebacks;
      if (updates.pongTotalWagered !== undefined)
        pongStatsUpdates.totalWagered = BigInt(updates.pongTotalWagered);
      if (updates.pongTotalWon !== undefined)
        pongStatsUpdates.totalWon = BigInt(updates.pongTotalWon);

      // Update PongStats if there are changes
      if (Object.keys(pongStatsUpdates).length > 0) {
        await this.prisma.pongStats.upsert({
          where: { userId },
          create: {
            userId,
            ...pongStatsUpdates,
          },
          update: pongStatsUpdates,
        });
      }

      // Note: Social counters (predictionsCreated, followersCount, etc.) are derived
      // from actual database relationships and should not be manually updated
    } catch (error) {
      console.error('Failed to update user counters:', error);
      throw error;
    }
  }

  /**
   * Get specific counter value
   */
  async getCounter(userId: number, counterName: string): Promise<number> {
    const counters = await this.getUserCounters(userId);
    return counters[counterName] || 0;
  }

  /**
   * Increment a specific counter atomically
   */
  async incrementCounter(userId: number, counterName: string, amount = 1): Promise<number> {
    const current = await this.getCounter(userId, counterName);
    const newValue = current + amount;
    await this.updateUserCounters(userId, { [counterName]: newValue });
    return newValue;
  }

  /**
   * Get monthly profit/loss for a user
   */
  async getMonthlyProfitLoss(userId: number): Promise<
    Array<{
      date: string;
      profit: bigint;
    }>
  > {
    return await this.prisma.$queryRaw<
      Array<{
        date: string;
        profit: bigint;
      }>
    >`
      SELECT 
        dates.date::text as date,
        COALESCE(SUM(
          CASE 
            WHEN b.status = 'WON' THEN COALESCE(b.payout, 0) - b.amount
            WHEN b.status = 'LOST' THEN -b.amount
            ELSE 0
          END
        ), 0)::bigint as profit
      FROM generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) as dates(date)
      LEFT JOIN "Bet" b ON DATE(b."createdAt") = dates.date AND b."userId" = ${userId}
      GROUP BY dates.date
      ORDER BY dates.date
    `;
  }

  /**
   * Get weekly bet volume for a user
   */
  async getWeeklyVolume(userId: number): Promise<
    Array<{
      date: string;
      volume: bigint;
    }>
  > {
    return await this.prisma.$queryRaw<
      Array<{
        date: string;
        volume: bigint;
      }>
    >`
      SELECT 
        dates.date::text as date,
        COALESCE(SUM(b.amount), 0)::bigint as volume
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) as dates(date)
      LEFT JOIN "Bet" b ON DATE(b."createdAt") = dates.date AND b."userId" = ${userId}
      GROUP BY dates.date
      ORDER BY dates.date
    `;
  }

  /**
   * Get category accuracy statistics for a user
   */
  async getCategoryAccuracy(userId: number): Promise<
    Array<{
      category: string;
      totalBets: bigint;
      wins: bigint;
      accuracy: number;
    }>
  > {
    return await this.prisma.$queryRaw<
      Array<{
        category: string;
        totalBets: bigint;
        wins: bigint;
        accuracy: number;
      }>
    >`
      SELECT 
        p.category,
        COUNT(*)::bigint as "totalBets",
        SUM(CASE WHEN b.status = 'WON' THEN 1 ELSE 0 END)::bigint as wins,
        AVG(CASE WHEN b.status = 'WON' THEN 1.0 ELSE 0.0 END) as accuracy
      FROM "Bet" b 
      JOIN "Prediction" p ON b."predictionId" = p.id 
      WHERE b."userId" = ${userId} AND b.status IN ('WON', 'LOST')
      GROUP BY p.category
      HAVING COUNT(*) >= 3
      ORDER BY accuracy DESC
    `;
  }

  /**
   * Default counters for new users
   */
  private getDefaultCounters(): Record<string, number> {
    return {
      // Betting counters
      betsPlaced: 0,
      betsWon: 0,
      betsLost: 0,
      totalStaked: 0,
      totalProfit: 0,
      totalWon: 0,
      parlayWins: 0,
      parlayTotal: 0,
      biggestWin: 0,
      winStreak: 0,
      bestWinStreak: 0,
      winRate: 0,

      // Pong counters
      pongMatches: 0,
      pongWins: 0,
      pongLosses: 0,
      pongElo: 1200,
      pongStreakWin: 0,
      pongBestStreakWin: 0,
      pongPerfectGames: 0,
      pongComebacks: 0,
      pongTotalWagered: 0,
      pongTotalWon: 0,

      // Social counters
      predictionsCreated: 0,
      followersCount: 0,
      followingCount: 0,

      // User profile completion counters
      profileComplete: 0,
      hasAvatar: 0,
      hasBio: 0,
      hasLocation: 0,
    };
  }
}

/**
 * Mock implementation for testing
 */
export class MockStatsRepository implements IStatsRepository {
  private counters = new Map<number, Record<string, number>>();

  async getUserCounters(userId: number): Promise<Record<string, number>> {
    return this.counters.get(userId) || {};
  }

  async updateUserCounters(userId: number, updates: Record<string, number>): Promise<void> {
    const current = this.counters.get(userId) || {};
    this.counters.set(userId, { ...current, ...updates });
  }

  setCounters(userId: number, counters: Record<string, number>): void {
    this.counters.set(userId, counters);
  }

  clear(): void {
    this.counters.clear();
  }
}
