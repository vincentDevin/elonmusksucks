// apps/server/src/services/dashboardAnalytics.service.ts
// Comprehensive analytics service for dashboard metrics
import type { IAnalyticsRepository } from '../repositories/interfaces/IAnalyticsRepository';
import { withCache, CacheKeys, CACHE_TTL } from '../utils/analyticsCache';

export interface PlatformHealthMetrics {
  activeUsers: {
    last24h: number;
    last7d: number;
    last30d: number;
    growth: number; // percentage change from previous period
  };
  predictions: {
    total: number;
    active: number;
    resolved: number;
    createdLast24h: number;
    resolutionRate: number; // percentage of predictions resolved on time
  };
  betting: {
    totalVolume: string; // BigInt as string
    volumeLast24h: string;
    uniqueBettors: number;
    averageBetSize: string;
    winRate: number;
  };
  engagement: {
    commentsLast24h: number;
    likesLast24h: number;
    pongMatchesLast24h: number;
    timelineViews: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    systemLoad: number;
    databaseConnections: number;
  };
}

export interface TrendAnalysis {
  userRegistrations: Array<{
    date: string;
    count: number;
    cumulativeCount: number;
  }>;
  bettingVolume: Array<{
    date: string;
    volume: string;
    averageBetSize: string;
    uniqueBettors: number;
  }>;
  predictionActivity: Array<{
    date: string;
    created: number;
    resolved: number;
    totalVolume: string;
  }>;
  engagement: Array<{
    date: string;
    comments: number;
    likes: number;
    views: number;
    pongMatches: number;
  }>;
}

export interface CrossFeatureAnalytics {
  userSegmentation: {
    highValueUsers: number;
    activeUsers: number;
    newUsers: number;
    dormantUsers: number;
  };
  featureCorrelations: Array<{
    feature1: string;
    feature2: string;
    correlation: number;
    significance: number;
  }>;
  userJourney: Array<{
    step: string;
    users: number;
    conversionRate: number;
  }>;
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface ContentAnalytics {
  categoryPerformance: Array<{
    category: string;
    totalPredictions: number;
    avgAccuracy: number;
    totalVolume: string;
    participationRate: number;
  }>;
  topCreators: Array<{
    userId: number;
    username: string;
    totalPredictions: number;
    avgAccuracy: number;
    totalFollowers: number;
  }>;
  contentMetrics: {
    totalArticles: number;
    articlesLast24h: number;
    avgEngagementPerPost: number;
    topSources: Array<{
      source: string;
      articles: number;
    }>;
  };
}

export class DashboardAnalyticsService {
  constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

  /**
   * Get comprehensive platform health metrics
   * Cached for 1 minute to reduce database load
   */
  async getPlatformHealthMetrics(): Promise<PlatformHealthMetrics> {
    return withCache(CacheKeys.PLATFORM_HEALTH(), CACHE_TTL.PLATFORM_HEALTH, async () => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previous30d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Execute all queries in parallel using the repository
      const [
        activeUserCounts,
        predictionMetrics,
        bettingMetrics,
        engagementMetrics,
        performanceMetrics,
      ] = await Promise.all([
        this.analyticsRepository.getActiveUserCounts(last24h, last7d, last30d, previous30d),
        this.analyticsRepository.getPredictionMetrics(),
        this.analyticsRepository.getBettingMetrics(last24h),
        this.analyticsRepository.getEngagementMetrics(last24h),
        this.analyticsRepository.getPerformanceMetrics(),
      ]);

      // Calculate growth rate
      const growth =
        activeUserCounts.previous30d > 0
          ? ((activeUserCounts.last30d - activeUserCounts.previous30d) /
              activeUserCounts.previous30d) *
            100
          : 0;

      return {
        activeUsers: {
          last24h: activeUserCounts.last24h,
          last7d: activeUserCounts.last7d,
          last30d: activeUserCounts.last30d,
          growth,
        },
        predictions: predictionMetrics,
        betting: bettingMetrics,
        engagement: {
          commentsLast24h: engagementMetrics.totalComments,
          likesLast24h: 0, // Would implement when likes system exists
          pongMatchesLast24h: engagementMetrics.pongMatchesLast24h,
          timelineViews: 0, // Would implement from view tracking
        },
        performance: {
          averageResponseTime: performanceMetrics.avgLoadTime,
          errorRate: 0.1, // Would come from error tracking
          systemLoad: 45, // Would come from system monitoring
          databaseConnections: 12, // Would come from database monitoring
        },
      };
    });
  }

  /**
   * Get trend analysis for the specified number of days
   * Cached for 5 minutes to reduce database load
   */
  async getTrendAnalysis(days: number = 30): Promise<TrendAnalysis> {
    return withCache(CacheKeys.TRENDS(days), CACHE_TTL.TRENDS, async () => {
      // Generate date range for the analysis
      const dateRange = this.generateDateRange(days);

      // Execute all trend queries in parallel using the repository
      const [userRegistrations, predictionCreations, bettingVolume, engagementData] =
        await Promise.all([
          this.analyticsRepository.getUserRegistrations(dateRange),
          this.analyticsRepository.getPredictionCreations(dateRange),
          this.analyticsRepository.getBettingVolume(dateRange),
          this.analyticsRepository.getEngagementData(dateRange),
        ]);

      // Transform betting volume data to include additional metrics
      const bettingVolumeWithMetrics = bettingVolume.map((item) => ({
        date: item.date,
        volume: item.volume,
        averageBetSize: '0', // Would calculate from detailed data
        uniqueBettors: 0, // Would calculate from detailed data
      }));

      // Transform prediction data to include resolution info
      const predictionActivity = predictionCreations.map((item) => ({
        date: item.date,
        created: item.count,
        resolved: 0, // Would calculate from resolution data
        totalVolume: '0', // Would calculate from betting data
      }));

      return {
        userRegistrations,
        bettingVolume: bettingVolumeWithMetrics,
        predictionActivity,
        engagement: engagementData,
      };
    });
  }

  /**
   * Get cross-feature analytics showing relationships between platform features
   * Cached for 5 minutes to reduce database load
   */
  async getCrossFeatureAnalytics(): Promise<CrossFeatureAnalytics> {
    return withCache(CacheKeys.CROSS_FEATURE(), CACHE_TTL.CROSS_FEATURE, async () => {
      // Execute all cross-feature queries in parallel using the repository
      const [userSegmentation, featureCorrelations, userJourney, retention] = await Promise.all([
        this.analyticsRepository.getUserSegmentation(),
        this.analyticsRepository.getFeatureCorrelations(),
        this.analyticsRepository.getUserJourney(),
        this.analyticsRepository.getUserRetention(),
      ]);

      return {
        userSegmentation,
        featureCorrelations,
        userJourney,
        retention,
      };
    });
  }

  /**
   * Get content analytics showing performance of different content types
   * Cached for 5 minutes to reduce database load
   */
  async getContentAnalytics(): Promise<ContentAnalytics> {
    return withCache(CacheKeys.CONTENT(), CACHE_TTL.CONTENT, async () => {
      // Execute all content queries in parallel using the repository
      const [categoryPerformance, topCreators, contentMetrics] = await Promise.all([
        this.analyticsRepository.getCategoryPerformance(),
        this.analyticsRepository.getTopCreators(),
        this.analyticsRepository.getContentMetrics(),
      ]);

      return {
        categoryPerformance,
        topCreators,
        contentMetrics,
      };
    });
  }

  // Helper methods
  private generateDateRange(days: number): string[] {
    const dates: string[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }
}

// Export a singleton instance with the repository dependency
import { AnalyticsRepository } from '../repositories/AnalyticsRepository';
const analyticsRepository = new AnalyticsRepository();
export const dashboardAnalyticsService = new DashboardAnalyticsService(analyticsRepository);
