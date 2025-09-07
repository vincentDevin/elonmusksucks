import {
  CategoryAccuracy,
  Streak,
  TrendData,
  CategoryStats,
  UserRanking,
  EnhancedUserStats,
  REDIS_CHANNELS,
} from '@ems/types';
import { leaderboardService } from './leaderboard.service';
import { eventBus } from './eventBus.service';
import { UserRepository } from '../repositories/UserRepository';
import { BettingRepository } from '../repositories/BettingRepository';
import { StatsRepository } from '../repositories/StatsRepository';

// Note: User stats service interfaces now imported from @ems/types

export class EnhancedUserStatsService {
  private userRepository: UserRepository;
  private bettingRepository: BettingRepository;
  private statsRepository: StatsRepository;

  constructor(
    userRepository: UserRepository,
    bettingRepository: BettingRepository,
    statsRepository: StatsRepository,
  ) {
    this.userRepository = userRepository;
    this.bettingRepository = bettingRepository;
    this.statsRepository = statsRepository;
  }

  async getEnhancedStats(userId: number): Promise<EnhancedUserStats> {
    const [basicStats, categoryAccuracy, currentStreak, trends, ranking] = await Promise.all([
      this.getBasicStats(userId),
      this.calculateCategoryAccuracy(userId),
      this.calculateCurrentStreak(userId),
      this.calculateTrends(userId),
      this.getUserRanking(userId),
    ]);

    const bestCategory =
      categoryAccuracy.length > 0
        ? categoryAccuracy.reduce((best, current) =>
            current.accuracy > best.accuracy ? current : best,
          ).category
        : 'None';

    const winRate = basicStats.totalBets > 0 ? basicStats.betsWon / basicStats.totalBets : 0;
    const avgBetSize =
      basicStats.totalBets > 0 ? Number(basicStats.totalWagered) / basicStats.totalBets : 0;

    return {
      // Performance metrics
      totalBets: basicStats.totalBets,
      winRate,
      profitLoss: Number(basicStats.profit),
      categoryAccuracy,
      currentStreak,
      bestCategory,
      totalWagered: Number(basicStats.totalWagered),
      avgBetSize,

      // Ranking data
      ranking,

      // Achievement progress (calculated from real data)
      achievementProgress: this.calculateAchievementProgress(
        basicStats,
        categoryAccuracy,
        currentStreak,
      ),
      achievementCompletionRate: this.calculateAchievementCompletionRate(
        basicStats,
        categoryAccuracy,
        currentStreak,
      ),

      // Trend data
      weeklyVolume: trends.weeklyVolume,
      monthlyProfitLoss: trends.monthlyProfitLoss,
      categoryStats: this.calculateCategoryStats(categoryAccuracy, Number(basicStats.totalWagered)),
    };
  }

  private async getUserRanking(
    userId: number,
  ): Promise<{ allTime: UserRanking; daily: UserRanking }> {
    try {
      const [allTimeRank, dailyRank, stats] = await Promise.all([
        leaderboardService.getUserRank(userId, 'allTime'),
        leaderboardService.getUserRank(userId, 'daily'),
        leaderboardService.getLeaderboardStats(),
      ]);

      const allTimeRanking: UserRanking = {
        rank: allTimeRank.allTimeRank,
        percentile: allTimeRank.allTimeRank
          ? Math.round((1 - allTimeRank.allTimeRank / stats.totalUsers) * 100)
          : 0,
        rankChange: null, // UserRank interface doesn't have rankChange - would need to be calculated separately
        totalUsers: stats.totalUsers,
        category: 'allTime',
      };

      const dailyRanking: UserRanking = {
        rank: dailyRank.dailyRank,
        percentile: dailyRank.dailyRank
          ? Math.round((1 - dailyRank.dailyRank / stats.totalUsers) * 100)
          : 0,
        rankChange: null, // UserRank interface doesn't have rankChange - would need to be calculated separately
        totalUsers: stats.totalUsers,
        category: 'daily',
      };

      return {
        allTime: allTimeRanking,
        daily: dailyRanking,
      };
    } catch (error) {
      console.error('Error fetching user ranking:', error);
      // Return default ranking data if leaderboard service fails
      return {
        allTime: {
          rank: null,
          percentile: 0,
          rankChange: null,
          totalUsers: 0,
          category: 'allTime',
        },
        daily: { rank: null, percentile: 0, rankChange: null, totalUsers: 0, category: 'daily' },
      };
    }
  }

  private async getBasicStats(userId: number) {
    const stats = await this.userRepository.getUserStats(userId);

    return (
      stats || {
        totalBets: 0,
        betsWon: 0,
        betsLost: 0,
        totalWagered: 0,
        totalWon: 0,
        profit: 0,
        currentStreak: 0,
        longestStreak: 0,
      }
    );
  }

  async calculateCategoryAccuracy(userId: number): Promise<CategoryAccuracy[]> {
    const categoryStats = await this.statsRepository.getCategoryAccuracy(userId);

    return categoryStats.map((stat) => ({
      category: stat.category,
      accuracy: Number(stat.accuracy),
      totalBets: Number(stat.totalBets),
      wins: Number(stat.wins),
    }));
  }

  async calculateCurrentStreak(userId: number): Promise<Streak> {
    const recentBets = await this.bettingRepository.getRecentBetsForStreak(userId, 50);

    if (recentBets.length === 0) {
      return { type: 'win', count: 0, isActive: false };
    }

    let streakCount = 0;
    const streakType = recentBets[0].status === 'WON' ? 'win' : 'lose';

    for (const bet of recentBets) {
      if (
        (streakType === 'win' && bet.status === 'WON') ||
        (streakType === 'lose' && bet.status === 'LOST')
      ) {
        streakCount++;
      } else {
        break;
      }
    }

    return {
      type: streakType,
      count: streakCount,
      isActive: streakCount > 0,
    };
  }

  private async calculateTrends(userId: number): Promise<{
    weeklyVolume: TrendData[];
    monthlyProfitLoss: TrendData[];
  }> {
    // Get bet volume for the last 7 days
    const weeklyVolume = await this.statsRepository.getWeeklyVolume(userId);

    // Get profit/loss for the last 30 days
    const monthlyProfitLoss = await this.statsRepository.getMonthlyProfitLoss(userId);

    return {
      weeklyVolume: weeklyVolume.map((item) => ({
        date: item.date,
        value: Number(item.volume),
      })),
      monthlyProfitLoss: monthlyProfitLoss.map((item) => ({
        date: item.date,
        value: Number(item.profit),
      })),
    };
  }

  private calculateAchievementProgress(
    basicStats: any,
    categoryAccuracy: CategoryAccuracy[],
    currentStreak: Streak,
  ) {
    const achievements = [
      {
        id: 'first_bet',
        title: 'First Bet',
        description: 'Place your first bet',
        progress: Math.min(basicStats.totalBets, 1),
        target: 1,
        isCompleted: basicStats.totalBets >= 1,
      },
      {
        id: 'streak_master',
        title: 'Streak Master',
        description: 'Win 10 bets in a row',
        progress: currentStreak.type === 'win' ? Math.min(currentStreak.count, 10) : 0,
        target: 10,
        isCompleted: currentStreak.type === 'win' && currentStreak.count >= 10,
      },
      {
        id: 'high_roller',
        title: 'High Roller',
        description: 'Wager 10,000🪙 total',
        progress: Math.min(Number(basicStats.totalWagered), 10000),
        target: 10000,
        isCompleted: Number(basicStats.totalWagered) >= 10000,
      },
      {
        id: 'category_expert',
        title: 'Category Expert',
        description: 'Achieve 75% accuracy in any category',
        progress:
          categoryAccuracy.length > 0
            ? Math.floor(Math.max(...categoryAccuracy.map((c) => c.accuracy)) * 100)
            : 0,
        target: 75,
        isCompleted: categoryAccuracy.some((c) => c.accuracy >= 0.75),
      },
      {
        id: 'consistent_trader',
        title: 'Consistent Trader',
        description: 'Place 100 bets',
        progress: Math.min(basicStats.totalBets, 100),
        target: 100,
        isCompleted: basicStats.totalBets >= 100,
      },
    ];

    return achievements;
  }

  private calculateAchievementCompletionRate(
    basicStats: any,
    categoryAccuracy: CategoryAccuracy[],
    currentStreak: Streak,
  ): number {
    const achievements = this.calculateAchievementProgress(
      basicStats,
      categoryAccuracy,
      currentStreak,
    );
    const completedAchievements = achievements.filter((a) => a.isCompleted).length;
    return achievements.length > 0 ? completedAchievements / achievements.length : 0;
  }

  private calculateCategoryStats(
    categoryAccuracy: CategoryAccuracy[],
    totalWagered: number,
  ): CategoryStats[] {
    const avgBetSizeOverall =
      categoryAccuracy.reduce((sum, cat) => sum + cat.totalBets, 0) > 0
        ? totalWagered / categoryAccuracy.reduce((sum, cat) => sum + cat.totalBets, 0)
        : 0;

    return categoryAccuracy.map((cat) => ({
      category: cat.category,
      betCount: cat.totalBets,
      winRate: cat.accuracy,
      profitLoss: cat.totalBets * avgBetSizeOverall * (cat.accuracy - 0.5),
      avgBetSize: avgBetSizeOverall,
    }));
  }

  /**
   * Publish stats update event to Redis for real-time notifications
   */
  async publishStatsUpdate(userId: number, changes?: Partial<EnhancedUserStats>): Promise<void> {
    try {
      const statsPayload = {
        userId,
        changes: changes || {},
        timestamp: new Date().toISOString(),
      };

      await eventBus.publish(REDIS_CHANNELS.STATS_UPDATE, statsPayload);
      console.log(`[enhancedUserStats] Published stats update for user ${userId}`);
    } catch (error) {
      console.error('[enhancedUserStats] Error publishing stats update:', error);
    }
  }

  /**
   * Trigger stats refresh and broadcast to connected clients
   */
  async triggerStatsRefresh(userId: number): Promise<void> {
    try {
      const refreshedStats = await this.getEnhancedStats(userId);

      const refreshPayload = {
        userId,
        stats: refreshedStats,
        timestamp: new Date().toISOString(),
      };

      await eventBus.publish(REDIS_CHANNELS.STATS_REFRESH, refreshPayload);
      console.log(`[enhancedUserStats] Published stats refresh for user ${userId}`);
    } catch (error) {
      console.error('[enhancedUserStats] Error publishing stats refresh:', error);
    }
  }

  /**
   * Publish ranking change event
   */
  async publishRankingChange(
    userId: number,
    oldRank: number | null,
    newRank: number | null,
    category: 'allTime' | 'daily',
  ): Promise<void> {
    try {
      const rankingPayload = {
        userId,
        oldRank,
        newRank,
        category,
        change: oldRank && newRank ? oldRank - newRank : null,
        timestamp: new Date().toISOString(),
      };

      await eventBus.publish(REDIS_CHANNELS.RANKING_CHANGE, rankingPayload);
      console.log(
        `[enhancedUserStats] Published ranking change for user ${userId}: ${oldRank} -> ${newRank}`,
      );
    } catch (error) {
      console.error('[enhancedUserStats] Error publishing ranking change:', error);
    }
  }
}
