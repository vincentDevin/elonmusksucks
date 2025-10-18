import { PrismaClient } from '@prisma/client';
import type { IStatsRepository } from './interfaces/IStatsRepository';
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
      // Get all user stats in parallel, including new tracking data sources
      const [
        userStats,
        pongStats,
        user,
        predictionsCount,
        followersCount,
        followingCount,
        messageCount,
        // New tracking data sources
        streakCounts,
        activityCounts,
        emojiUsageCount,
        leaderboardHistory,
        predictionViews,
        firstCorrectBets,
      ] = await Promise.all([
        this.prisma.userStats.findUnique({ where: { userId } }),
        this.prisma.pongStats.findUnique({ where: { userId } }),
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.prediction.count({ where: { creatorId: userId } }),
        this.prisma.follow.count({ where: { followingId: userId } }),
        this.prisma.follow.count({ where: { followerId: userId } }),
        this.prisma.message.count({ where: { userId } }),

        // New tracking queries
        this.getStreakCounts(userId),
        this.getActivityCounts(userId),
        this.prisma.userEmojiUsage.count({ where: { userId } }),
        this.getLeaderboardStats(userId),
        this.getPredictionViewStats(userId),
        this.getFirstCorrectBetCount(userId),
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

        // Chat counters - NOW USING REAL DATA
        chatMessages: messageCount || 0,
        chatFirstMessage: messageCount > 0 ? 1 : 0,

        // User profile completion counters
        profileComplete: user?.profileComplete ? 1 : 0,
        hasAvatar: user?.avatarUrl ? 1 : 0,
        hasBio: user?.bio ? 1 : 0,
        hasLocation: user?.location ? 1 : 0,

        // New tracking counters - Streak Management
        dailyLoginStreak: streakCounts.dailyLoginStreak || 0,
        bettingWinStreak: streakCounts.bettingWinStreak || 0,
        pongWinStreak: streakCounts.pongWinStreak || 0,
        longestLoginStreak: streakCounts.longestLoginStreak || 0,
        currentActiveStreaks: streakCounts.activeStreaks || 0,

        // New tracking counters - Time-based Activity
        activeDays: activityCounts.uniqueDays || 0,
        weekendLogins: activityCounts.weekendLogins || 0,
        chatMessagesToday: activityCounts.chatMessagesToday || 0,
        betsThisWeek: activityCounts.betsThisWeek || 0,
        dailyActivityPoints: activityCounts.dailyPoints || 0,

        // New tracking counters - Emoji Usage
        uniqueEmojisUsed: emojiUsageCount || 0,
        emojiMaster: emojiUsageCount >= 50 ? 1 : 0,

        // New tracking counters - Leaderboard History
        bestLeaderboardRank: leaderboardHistory.bestRank || 999999,
        leaderboardAppearances: leaderboardHistory.appearances || 0,
        top10Finishes: leaderboardHistory.top10Finishes || 0,
        leaderboardWins: leaderboardHistory.wins || 0,

        // New tracking counters - Prediction Accuracy
        predictionsViewed: predictionViews.totalViews || 0,
        popularPredictions: predictionViews.popularPredictions || 0,
        viralPredictions: predictionViews.viralPredictions || 0,
        firstCorrectBets: firstCorrectBets || 0,

        // Derived counters for complex achievements
        socialButterfly: followersCount >= 10 && followingCount >= 10 ? 1 : 0,
        conversationalist: messageCount >= 100 ? 1 : 0,
        predictionGuru: firstCorrectBets >= 5 && predictionsCount >= 3 ? 1 : 0,
        allRounder:
          (userStats?.totalBets || 0) >= 10 &&
          (pongStats?.totalMatches || 0) >= 10 &&
          messageCount >= 20
            ? 1
            : 0,
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
   * Get streak-related statistics for a user
   */
  private async getStreakCounts(userId: number): Promise<{
    dailyLoginStreak: number;
    bettingWinStreak: number;
    pongWinStreak: number;
    longestLoginStreak: number;
    activeStreaks: number;
  }> {
    try {
      const streaks = await this.prisma.userStreak.findMany({
        where: { userId },
      });

      const streakMap = streaks.reduce(
        (acc, streak) => {
          acc[streak.streakType] = streak;
          return acc;
        },
        {} as Record<string, any>,
      );

      return {
        dailyLoginStreak: streakMap.daily_login?.currentStreak || 0,
        bettingWinStreak: streakMap.betting_win?.currentStreak || 0,
        pongWinStreak: streakMap.pong_win?.currentStreak || 0,
        longestLoginStreak: streakMap.daily_login?.bestStreak || 0,
        activeStreaks: streaks.filter((s) => s.currentStreak > 0).length,
      };
    } catch (error) {
      console.error('Error getting streak counts:', error);
      return {
        dailyLoginStreak: 0,
        bettingWinStreak: 0,
        pongWinStreak: 0,
        longestLoginStreak: 0,
        activeStreaks: 0,
      };
    }
  }

  /**
   * Get activity-based statistics for a user
   */
  private async getActivityCounts(userId: number): Promise<{
    uniqueDays: number;
    weekendLogins: number;
    chatMessagesToday: number;
    betsThisWeek: number;
    dailyPoints: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [uniqueDays, todayActivity, weeklyBets] = await Promise.all([
        // Count unique days with any activity
        this.prisma.userActivityLog.groupBy({
          by: ['dateKey'],
          where: { userId },
          _count: { dateKey: true },
        }),

        // Today's activity
        this.prisma.userActivityLog.findMany({
          where: {
            userId,
            dateKey: today,
          },
        }),

        // This week's bets
        this.prisma.bet.count({
          where: {
            userId,
            createdAt: {
              gte: weekAgo,
            },
          },
        }),
      ]);

      const chatMessagesToday = todayActivity.filter(
        (a) => a.activityType === 'chat_message_sent',
      ).length;
      const weekendLogins = todayActivity.filter(
        (a) =>
          a.activityType === 'daily_login' &&
          (new Date().getDay() === 0 || new Date().getDay() === 6),
      ).length;

      return {
        uniqueDays: uniqueDays.length,
        weekendLogins,
        chatMessagesToday,
        betsThisWeek: weeklyBets,
        dailyPoints: todayActivity.length * 10, // 10 points per activity
      };
    } catch (error) {
      console.error('Error getting activity counts:', error);
      return {
        uniqueDays: 0,
        weekendLogins: 0,
        chatMessagesToday: 0,
        betsThisWeek: 0,
        dailyPoints: 0,
      };
    }
  }

  /**
   * Get leaderboard-related statistics for a user
   */
  private async getLeaderboardStats(userId: number): Promise<{
    bestRank: number;
    appearances: number;
    top10Finishes: number;
    wins: number;
  }> {
    try {
      const history = await this.prisma.leaderboardHistory.findMany({
        where: { userId },
        select: {
          position: true,
        },
      });

      if (history.length === 0) {
        return { bestRank: 999999, appearances: 0, top10Finishes: 0, wins: 0 };
      }

      const ranks = history.map((h) => h.position);
      const bestRank = Math.min(...ranks);
      const top10Finishes = ranks.filter((r) => r <= 10).length;
      const wins = ranks.filter((r) => r === 1).length;

      return {
        bestRank,
        appearances: history.length,
        top10Finishes,
        wins,
      };
    } catch (error) {
      console.error('Error getting leaderboard stats:', error);
      return { bestRank: 999999, appearances: 0, top10Finishes: 0, wins: 0 };
    }
  }

  /**
   * Get prediction view statistics for a user
   */
  private async getPredictionViewStats(userId: number): Promise<{
    totalViews: number;
    popularPredictions: number;
    viralPredictions: number;
  }> {
    try {
      const predictions = await this.prisma.prediction.findMany({
        where: { creatorId: userId },
        select: {
          viewCount: true,
        },
      });

      const totalViews = predictions.reduce((sum, p) => sum + (p.viewCount || 0), 0);
      const popularPredictions = predictions.filter((p) => (p.viewCount || 0) >= 100).length;
      const viralPredictions = predictions.filter((p) => (p.viewCount || 0) >= 1000).length;

      return {
        totalViews,
        popularPredictions,
        viralPredictions,
      };
    } catch (error) {
      console.error('Error getting prediction view stats:', error);
      return { totalViews: 0, popularPredictions: 0, viralPredictions: 0 };
    }
  }

  /**
   * Get count of predictions where user made the first correct bet
   */
  private async getFirstCorrectBetCount(userId: number): Promise<number> {
    try {
      return await this.prisma.prediction.count({
        where: { firstCorrectBetUserId: userId },
      });
    } catch (error) {
      console.error('Error getting first correct bet count:', error);
      return 0;
    }
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

      // Chat counters
      chatMessages: 0,
      chatFirstMessage: 0,

      // User profile completion counters
      profileComplete: 0,
      hasAvatar: 0,
      hasBio: 0,
      hasLocation: 0,

      // New tracking counters - Streak Management
      dailyLoginStreak: 0,
      bettingWinStreak: 0,
      pongWinStreak: 0,
      longestLoginStreak: 0,
      currentActiveStreaks: 0,

      // New tracking counters - Time-based Activity
      activeDays: 0,
      weekendLogins: 0,
      chatMessagesToday: 0,
      betsThisWeek: 0,
      dailyActivityPoints: 0,

      // New tracking counters - Emoji Usage
      uniqueEmojisUsed: 0,
      emojiMaster: 0,

      // New tracking counters - Leaderboard History
      bestLeaderboardRank: 999999,
      leaderboardAppearances: 0,
      top10Finishes: 0,
      leaderboardWins: 0,

      // New tracking counters - Prediction Accuracy
      predictionsViewed: 0,
      popularPredictions: 0,
      viralPredictions: 0,
      firstCorrectBets: 0,

      // Derived counters for complex achievements
      socialButterfly: 0,
      conversationalist: 0,
      predictionGuru: 0,
      allRounder: 0,
    };
  }

  /**
   * Get aggregated activity stats for a user
   * @param userId - ID of the user
   * @returns Aggregated stats for today, week, and all time
   */
  async getUserActivityStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Count posts (Content model with type POST)
    const [postsToday, postsWeek, postsAllTime] = await Promise.all([
      this.prisma.content.count({
        where: { authorId: userId, type: 'POST', createdAt: { gte: todayStart } },
      }),
      this.prisma.content.count({
        where: { authorId: userId, type: 'POST', createdAt: { gte: weekStart } },
      }),
      this.prisma.content.count({
        where: { authorId: userId, type: 'POST' },
      }),
    ]);

    // Count reactions given by user
    const [reactionsToday, reactionsWeek, reactionsAllTime] = await Promise.all([
      this.prisma.reaction.count({
        where: { userId, createdAt: { gte: todayStart } },
      }),
      this.prisma.reaction.count({
        where: { userId, createdAt: { gte: weekStart } },
      }),
      this.prisma.reaction.count({
        where: { userId },
      }),
    ]);

    // Count comments (Content model with type COMMENT)
    const [commentsToday, commentsWeek, commentsAllTime] = await Promise.all([
      this.prisma.content.count({
        where: { authorId: userId, type: 'COMMENT', createdAt: { gte: todayStart } },
      }),
      this.prisma.content.count({
        where: { authorId: userId, type: 'COMMENT', createdAt: { gte: weekStart } },
      }),
      this.prisma.content.count({
        where: { authorId: userId, type: 'COMMENT' },
      }),
    ]);

    // Count predictions created
    const [predictionsToday, predictionsWeek, predictionsAllTime] = await Promise.all([
      this.prisma.prediction.count({
        where: { creatorId: userId, createdAt: { gte: todayStart } },
      }),
      this.prisma.prediction.count({
        where: { creatorId: userId, createdAt: { gte: weekStart } },
      }),
      this.prisma.prediction.count({
        where: { creatorId: userId },
      }),
    ]);

    // Calculate account age in days
    const accountAge = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate current streak (days with activity)
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const hasActivity = await this.prisma.userActivity.count({
        where: {
          userId,
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        take: 1,
      });

      if (hasActivity > 0) {
        currentStreak++;
      } else if (i > 0) {
        // Don't break on day 0 (today) if no activity yet
        break;
      }
    }

    // For best streak, use longestStreak from UserStats if it exists
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { longestStreak: true },
    });

    return {
      today: {
        posts: postsToday,
        reactions: reactionsToday,
        comments: commentsToday,
        predictions: predictionsToday,
      },
      week: {
        posts: postsWeek,
        reactions: reactionsWeek,
        comments: commentsWeek,
        predictions: predictionsWeek,
        streak: currentStreak,
      },
      allTime: {
        totalPosts: postsAllTime,
        totalReactions: reactionsAllTime,
        totalComments: commentsAllTime,
        totalPredictions: predictionsAllTime,
        accountAge,
        bestStreak: userStats?.longestStreak || currentStreak,
      },
    };
  }
}
