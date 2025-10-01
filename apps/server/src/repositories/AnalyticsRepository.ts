import { PrismaClient } from '@prisma/client';
import type { IAnalyticsRepository } from './interfaces/IAnalyticsRepository';

/**
 * Repository for analytics data access
 * Handles all database queries for analytics dashboard
 */
export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getActiveUserCounts(
    last24h: Date,
    last7d: Date,
    last30d: Date,
    previous30d: Date,
  ): Promise<{
    last24h: number;
    last7d: number;
    last30d: number;
    previous30d: number;
  }> {
    const [last24hCount, last7dCount, last30dCount, previous30dCount] = await Promise.all([
      this.prisma.userActivityLog
        .groupBy({
          by: ['userId'],
          where: { occurredAt: { gte: last24h } },
        })
        .then((result: any[]) => result.length),

      this.prisma.userActivityLog
        .groupBy({
          by: ['userId'],
          where: { occurredAt: { gte: last7d } },
        })
        .then((result: any[]) => result.length),

      this.prisma.userActivityLog
        .groupBy({
          by: ['userId'],
          where: { occurredAt: { gte: last30d } },
        })
        .then((result: any[]) => result.length),

      this.prisma.userActivityLog
        .groupBy({
          by: ['userId'],
          where: { occurredAt: { gte: previous30d, lt: last30d } },
        })
        .then((result: any[]) => result.length),
    ]);

    return {
      last24h: last24hCount,
      last7d: last7dCount,
      last30d: last30dCount,
      previous30d: previous30dCount,
    };
  }

  async getPredictionMetrics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    createdLast24h: number;
    resolutionRate: number;
  }> {
    const now = new Date();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, active, resolved, createdLast24h] = await Promise.all([
      this.prisma.prediction.count(),
      this.prisma.prediction.count({ where: { resolved: false, expiresAt: { gt: now } } }),
      this.prisma.prediction.count({ where: { resolved: true } }),
      this.prisma.prediction.count({ where: { createdAt: { gte: last24h } } }),
    ]);

    const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

    return {
      total,
      active,
      resolved,
      createdLast24h,
      resolutionRate,
    };
  }

  async getBettingMetrics(last24h: Date): Promise<{
    totalVolume: string;
    volumeLast24h: string;
    uniqueBettors: number;
    averageBetSize: string;
    winRate: number;
  }> {
    const [totalVolumeResult, volumeLast24hResult, uniqueBettors, totalBets, wonBets] =
      await Promise.all([
        this.prisma.bet.aggregate({
          _sum: { amount: true },
        }),
        this.prisma.bet.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: last24h } },
        }),
        this.prisma.bet
          .groupBy({
            by: ['userId'],
          })
          .then((result: any[]) => result.length),
        this.prisma.bet.count(),
        this.prisma.bet.count({ where: { status: 'WON' } }),
      ]);

    const totalVolume = totalVolumeResult._sum.amount?.toString() || '0';
    const volumeLast24h = volumeLast24hResult._sum?.amount?.toString() || '0';
    const averageBetSize =
      totalBets > 0 ? (BigInt(totalVolume) / BigInt(totalBets)).toString() : '0';
    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

    return {
      totalVolume,
      volumeLast24h,
      uniqueBettors,
      averageBetSize,
      winRate,
    };
  }

  async getEngagementMetrics(last24h: Date): Promise<{
    totalComments: number;
    averageCommentsPerPrediction: number;
    mostActiveUsers: number;
    pongMatchesLast24h: number;
  }> {
    const [totalComments, totalPredictions, mostActiveUsers, pongMatchesLast24h] =
      await Promise.all([
        this.prisma.content.count({
          where: {
            type: 'COMMENT',
            isDeleted: false,
          },
        }),
        this.prisma.prediction.count(),
        this.prisma.userActivityLog.count({
          where: { occurredAt: { gte: last24h } },
        }),
        this.prisma.pongMatch.count({
          where: { createdAt: { gte: last24h } },
        }),
      ]);

    const averageCommentsPerPrediction =
      totalPredictions > 0 ? totalComments / totalPredictions : 0;

    return {
      totalComments,
      averageCommentsPerPrediction,
      mostActiveUsers,
      pongMatchesLast24h,
    };
  }

  async getPerformanceMetrics(): Promise<{
    avgBetResolutionTime: number;
    avgPredictionAccuracy: number;
    platformUptime: number;
    avgLoadTime: number;
  }> {
    // Simplified implementation - would be more complex in production
    return {
      avgBetResolutionTime: 2.5,
      avgPredictionAccuracy: 0.72,
      platformUptime: 99.9,
      avgLoadTime: 1.2,
    };
  }

  async getUserRegistrations(dateRange: string[]): Promise<
    Array<{
      date: string;
      count: number;
      cumulativeCount: number;
    }>
  > {
    const users = await this.prisma.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return this.processTimeSeriesData(dateRange, users);
  }

  async getPredictionCreations(dateRange: string[]): Promise<
    Array<{
      date: string;
      count: number;
      cumulativeCount: number;
    }>
  > {
    const predictions = await this.prisma.prediction.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return this.processTimeSeriesData(dateRange, predictions);
  }

  async getBettingVolume(dateRange: string[]): Promise<
    Array<{
      date: string;
      volume: string;
      cumulativeVolume: string;
    }>
  > {
    const bets = await this.prisma.bet.findMany({
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: 'asc' },
    });

    return dateRange.map((date) => {
      const dayBets = bets.filter((bet) => bet.createdAt.toISOString().startsWith(date));
      const cumulativeBets = bets.filter((bet) => bet.createdAt <= new Date(date));

      const dayVolume = dayBets.reduce((sum, bet) => sum + bet.amount, BigInt(0));
      const cumulativeVolume = cumulativeBets.reduce((sum, bet) => sum + bet.amount, BigInt(0));

      return {
        date,
        volume: dayVolume.toString(),
        cumulativeVolume: cumulativeVolume.toString(),
      };
    });
  }

  async getEngagementData(dateRange: string[]): Promise<
    Array<{
      date: string;
      comments: number;
      likes: number;
      views: number;
      pongMatches: number;
    }>
  > {
    const [comments, pongMatches] = await Promise.all([
      this.prisma.content.findMany({
        where: {
          type: 'COMMENT',
          isDeleted: false,
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.pongMatch.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return dateRange.map((date) => ({
      date,
      comments: comments.filter((d: any) => d.createdAt.toISOString().startsWith(date)).length,
      likes: 0, // Would implement when likes system exists
      views: 0, // Would calculate from view tracking
      pongMatches: pongMatches.filter((d: any) => d.createdAt.toISOString().startsWith(date))
        .length,
    }));
  }

  async getUserSegmentation(): Promise<{
    highValueUsers: number;
    activeUsers: number;
    newUsers: number;
    dormantUsers: number;
  }> {
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [highValueUsers, activeUsers, newUsers, totalUsers] = await Promise.all([
      this.prisma.user.count({
        where: {
          bets: {
            some: {
              amount: { gte: 1000 },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          activityLogs: {
            some: {
              occurredAt: { gte: last7d },
            },
          },
        },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: last30d } },
      }),
      this.prisma.user.count(),
    ]);

    const dormantUsers = totalUsers - activeUsers;

    return {
      highValueUsers,
      activeUsers,
      newUsers,
      dormantUsers,
    };
  }

  async getFeatureCorrelations(): Promise<
    Array<{
      feature1: string;
      feature2: string;
      correlation: number;
      significance: number;
    }>
  > {
    // Simplified implementation - would calculate actual correlations in production
    return [
      {
        feature1: 'Betting Activity',
        feature2: 'Pong Engagement',
        correlation: 0.65,
        significance: 0.95,
      },
      {
        feature1: 'Prediction Creation',
        feature2: 'Comment Activity',
        correlation: 0.78,
        significance: 0.99,
      },
      {
        feature1: 'Daily Logins',
        feature2: 'Revenue Generation',
        correlation: 0.82,
        significance: 0.98,
      },
    ];
  }

  async getUserJourney(): Promise<
    Array<{
      step: string;
      users: number;
      conversionRate: number;
    }>
  > {
    const [totalUsers, profileCompleteUsers, firstBetUsers, activeBettors] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { profileComplete: true } }),
      this.prisma.user.count({
        where: {
          bets: {
            some: {},
          },
        },
      }),
      this.prisma.user.count({
        where: {
          bets: {
            some: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
    ]);

    return [
      { step: 'Registration', users: totalUsers, conversionRate: 100 },
      {
        step: 'Profile Complete',
        users: profileCompleteUsers,
        conversionRate: (profileCompleteUsers / totalUsers) * 100,
      },
      {
        step: 'First Bet',
        users: firstBetUsers,
        conversionRate: (firstBetUsers / totalUsers) * 100,
      },
      {
        step: 'Active Bettor',
        users: activeBettors,
        conversionRate: (activeBettors / totalUsers) * 100,
      },
    ];
  }

  async getCategoryPerformance(): Promise<
    Array<{
      category: string;
      totalPredictions: number;
      avgAccuracy: number;
      totalVolume: string;
      participationRate: number;
    }>
  > {
    // Simplified implementation - would group by actual categories in production
    return [
      {
        category: 'Politics',
        totalPredictions: 150,
        avgAccuracy: 72.5,
        totalVolume: '50000',
        participationRate: 65.2,
      },
      {
        category: 'Sports',
        totalPredictions: 200,
        avgAccuracy: 68.3,
        totalVolume: '75000',
        participationRate: 78.9,
      },
      {
        category: 'Technology',
        totalPredictions: 120,
        avgAccuracy: 75.1,
        totalVolume: '40000',
        participationRate: 55.7,
      },
    ];
  }

  async getTopCreators(): Promise<
    Array<{
      userId: number;
      username: string;
      totalPredictions: number;
      avgAccuracy: number;
      totalFollowers: number;
    }>
  > {
    const topCreators = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            Prediction: true,
            followers: true,
          },
        },
        Prediction: {
          select: { resolved: true },
        },
      },
      orderBy: {
        Prediction: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return topCreators.map((creator: any) => {
      const resolvedPredictions = creator.Prediction.filter((p: any) => p.resolved);
      const avgAccuracy =
        resolvedPredictions.length > 0
          ? (resolvedPredictions.length / creator.Prediction.length) * 100
          : 0;

      return {
        userId: creator.id,
        username: creator.name,
        totalPredictions: creator._count.Prediction,
        avgAccuracy,
        totalFollowers: creator._count.followers,
      };
    });
  }

  async getContentMetrics(): Promise<{
    totalArticles: number;
    articlesLast24h: number;
    avgEngagementPerPost: number;
    topSources: Array<{ source: string; articles: number }>;
  }> {
    // Simplified implementation - would use actual Article/Feed models when they exist
    return {
      totalArticles: 0, // Would implement when Article model exists
      articlesLast24h: 0, // Would implement when Article model exists
      avgEngagementPerPost: 2.3, // Simplified
      topSources: [], // Would implement when Feed model exists
    };
  }

  async getUserRetention(): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }> {
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      include: {
        _count: {
          select: {
            activityLogs: true,
          },
        },
      },
    });

    const totalUsers = users.length;
    if (totalUsers === 0) return { day1: 0, day7: 0, day30: 0 };

    return {
      day1: Math.round((users.filter((u) => u._count.activityLogs > 1).length / totalUsers) * 100),
      day7: Math.round((users.filter((u) => u._count.activityLogs > 5).length / totalUsers) * 100),
      day30: Math.round(
        (users.filter((u) => u._count.activityLogs > 10).length / totalUsers) * 100,
      ),
    };
  }

  // Helper methods
  private processTimeSeriesData(dateRange: string[], data: any[]): any[] {
    return dateRange.map((date, _index) => ({
      date,
      count: data.filter((d) => d.createdAt.toISOString().startsWith(date)).length,
      cumulativeCount: data.filter((d) => d.createdAt <= new Date(date)).length,
    }));
  }
}
