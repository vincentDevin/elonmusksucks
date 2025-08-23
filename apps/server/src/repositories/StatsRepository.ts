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
      // Get user stats from the database
      const userStats = await this.prisma.userStats.findUnique({
        where: { userId },
      });

      if (!userStats) {
        // Return default counters for new users
        return this.getDefaultCounters();
      }

      // Serialize bigint fields to numbers and map database fields to counter names
      const serialized = serializeBigInt(userStats);
      return {
        // Betting counters
        betsPlaced: userStats.totalBets || 0,
        betsWon: userStats.betsWon || 0,
        totalStaked: Number(serialized.totalWagered || 0),
        totalProfit: Number(serialized.totalWon || 0),
        parlayWins: userStats.parlaysWon || 0,
        biggestWin: Number(serialized.biggestWin || 0),
        winStreak: userStats.currentStreak || 0,
        bestWinStreak: userStats.longestStreak || 0,

        // Pong counters (placeholder - will be added to schema later)
        pongMatches: 0,
        pongWins: 0,
        pongLosses: 0,
        pongElo: 1200,
        pongStreakWin: 0,
        pongBestStreakWin: 0,

        // Social counters (placeholder)
        predictionsCreated: 0,
        followersCount: 0,
        followingCount: 0,
      };
    } catch (error) {
      console.error('Failed to get user counters:', error);
      return this.getDefaultCounters();
    }
  }

  /**
   * Update user counters (for stats synchronization)
   */
  async updateUserCounters(userId: number, updates: Record<string, number>): Promise<void> {
    try {
      // Map counter updates back to database fields
      const dbUpdates: any = {};

      if (updates.betsPlaced !== undefined) dbUpdates.totalBets = updates.betsPlaced;
      if (updates.betsWon !== undefined) dbUpdates.totalWins = updates.betsWon;
      if (updates.totalStaked !== undefined) dbUpdates.totalStaked = updates.totalStaked.toString();
      if (updates.totalProfit !== undefined) dbUpdates.totalProfit = updates.totalProfit.toString();
      if (updates.parlayWins !== undefined) dbUpdates.parlayWins = updates.parlayWins;
      if (updates.biggestWin !== undefined) dbUpdates.biggestWin = updates.biggestWin.toString();
      if (updates.winStreak !== undefined) dbUpdates.currentWinStreak = updates.winStreak;
      if (updates.bestWinStreak !== undefined) dbUpdates.bestWinStreak = updates.bestWinStreak;

      if (updates.pongMatches !== undefined) dbUpdates.pongMatches = updates.pongMatches;
      if (updates.pongWins !== undefined) dbUpdates.pongWins = updates.pongWins;
      if (updates.pongLosses !== undefined) dbUpdates.pongLosses = updates.pongLosses;
      if (updates.pongElo !== undefined) dbUpdates.pongElo = updates.pongElo;
      if (updates.pongStreakWin !== undefined) dbUpdates.pongWinStreak = updates.pongStreakWin;
      if (updates.pongBestStreakWin !== undefined)
        dbUpdates.pongBestWinStreak = updates.pongBestStreakWin;

      if (updates.predictionsCreated !== undefined)
        dbUpdates.predictionsCreated = updates.predictionsCreated;

      if (Object.keys(dbUpdates).length > 0) {
        await this.prisma.userStats.upsert({
          where: { userId },
          create: {
            userId,
            ...dbUpdates,
          },
          update: dbUpdates,
        });
      }
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
   * Default counters for new users
   */
  private getDefaultCounters(): Record<string, number> {
    return {
      // Betting
      betsPlaced: 0,
      betsWon: 0,
      totalStaked: 0,
      totalProfit: 0,
      parlayWins: 0,
      biggestWin: 0,
      winStreak: 0,
      bestWinStreak: 0,

      // Pong
      pongMatches: 0,
      pongWins: 0,
      pongLosses: 0,
      pongElo: 1200,
      pongStreakWin: 0,
      pongBestStreakWin: 0,

      // Social
      predictionsCreated: 0,
      followersCount: 0,
      followingCount: 0,
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
