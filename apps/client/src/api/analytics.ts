// apps/client/src/api/analytics.ts
import api from './axios';

// Import interfaces from the server types
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

export interface ComprehensiveDashboard {
  healthMetrics: PlatformHealthMetrics;
  trends: TrendAnalysis;
  crossFeature: CrossFeatureAnalytics;
  content: ContentAnalytics;
  generatedAt: string;
  timeRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export interface RealtimeMetrics {
  activeUsers24h: number;
  newPredictions24h: number;
  bettingVolume24h: string;
  engagement24h: {
    totalComments: number;
    averageCommentsPerPrediction: number;
    mostActiveUsers: number;
    pongMatchesLast24h: number;
  };
  performance: {
    avgBetResolutionTime: number;
    avgPredictionAccuracy: number;
    platformUptime: number;
    avgLoadTime: number;
  };
  timestamp: string;
}

export interface AnalyticsSummary {
  period: 'week' | 'month' | 'quarter';
  days: number;
  overview: {
    totalUsers: number;
    userGrowth: number;
    totalPredictions: number;
    activePredictions: number;
    totalBettingVolume: string;
    averageBetSize: string;
  };
  engagement: {
    dailyComments: number;
    dailyPongMatches: number;
    totalEngagement: number;
  };
  trends: {
    userRegistrations: Array<{
      date: string;
      count: number;
      cumulativeCount: number;
    }>;
    topCategories: Array<{
      category: string;
      totalPredictions: number;
      avgAccuracy: number;
      totalVolume: string;
      participationRate: number;
    }>;
  };
  generatedAt: string;
}

/** — Core Analytics API Functions — **/

/**
 * Get comprehensive platform health metrics
 * GET /api/analytics/platform-health
 */
export async function getPlatformHealthMetrics(): Promise<PlatformHealthMetrics> {
  const response = await api.get<PlatformHealthMetrics>('/api/analytics/platform-health');
  return response.data;
}

/**
 * Get trend analysis for specified number of days
 * GET /api/analytics/trends?days=30
 */
export async function getTrendAnalysis(days: number = 30): Promise<TrendAnalysis> {
  const response = await api.get<TrendAnalysis>(`/api/analytics/trends?days=${days}`);
  return response.data;
}

/**
 * Get cross-feature analytics showing relationships between platform features
 * GET /api/analytics/cross-feature
 */
export async function getCrossFeatureAnalytics(): Promise<CrossFeatureAnalytics> {
  const response = await api.get<CrossFeatureAnalytics>('/api/analytics/cross-feature');
  return response.data;
}

/**
 * Get content analytics showing performance of different content types
 * GET /api/analytics/content
 */
export async function getContentAnalytics(): Promise<ContentAnalytics> {
  const response = await api.get<ContentAnalytics>('/api/analytics/content');
  return response.data;
}

/**
 * Get comprehensive dashboard data (combines multiple analytics)
 * GET /api/analytics/dashboard?days=30
 */
export async function getComprehensiveDashboard(
  days: number = 30,
): Promise<ComprehensiveDashboard> {
  const response = await api.get<ComprehensiveDashboard>(`/api/analytics/dashboard?days=${days}`);
  return response.data;
}

/**
 * Get real-time metrics (lightweight version for frequent updates)
 * GET /api/analytics/realtime
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const response = await api.get<RealtimeMetrics>('/api/analytics/realtime');
  return response.data;
}

/**
 * Get analytics summary for specific time period
 * GET /api/analytics/summary?period=week|month|quarter
 */
export async function getAnalyticsSummary(
  period: 'week' | 'month' | 'quarter' = 'month',
): Promise<AnalyticsSummary> {
  const response = await api.get<AnalyticsSummary>(`/api/analytics/summary?period=${period}`);
  return response.data;
}

/** — Specialized Analytics Functions — **/

/**
 * Get analytics data optimized for predictions page
 * Combines relevant metrics for prediction discovery and filtering
 */
export async function getPredictionPageAnalytics(): Promise<{
  platformHealth: Pick<PlatformHealthMetrics, 'predictions' | 'betting' | 'engagement'>;
  categoryPerformance: ContentAnalytics['categoryPerformance'];
  realtimeActivity: Pick<
    RealtimeMetrics,
    'activeUsers24h' | 'newPredictions24h' | 'bettingVolume24h'
  >;
}> {
  // Get multiple analytics in parallel for predictions page
  const [healthMetrics, contentAnalytics, realtimeMetrics] = await Promise.all([
    getPlatformHealthMetrics(),
    getContentAnalytics(),
    getRealtimeMetrics(),
  ]);

  return {
    platformHealth: {
      predictions: healthMetrics.predictions,
      betting: healthMetrics.betting,
      engagement: healthMetrics.engagement,
    },
    categoryPerformance: contentAnalytics.categoryPerformance,
    realtimeActivity: {
      activeUsers24h: realtimeMetrics.activeUsers24h,
      newPredictions24h: realtimeMetrics.newPredictions24h,
      bettingVolume24h: realtimeMetrics.bettingVolume24h,
    },
  };
}

/**
 * Get trending categories based on recent activity
 * Useful for prediction filtering and recommendation
 */
export async function getTrendingCategories(): Promise<
  Array<{
    category: string;
    score: number;
    recentActivity: number;
    growth: number;
  }>
> {
  const [contentAnalytics, trends] = await Promise.all([
    getContentAnalytics(),
    getTrendAnalysis(7), // Last 7 days for trending data
  ]);

  // Calculate trending scores based on recent activity and growth
  return contentAnalytics.categoryPerformance
    .map((category) => {
      // Calculate growth based on recent prediction activity
      const recentPredictions = trends.predictionActivity
        .slice(-3) // Last 3 days
        .reduce((sum, day) => sum + day.created, 0);

      const score =
        category.participationRate * 0.4 +
        (recentPredictions / 10) * 0.3 +
        category.avgAccuracy * 0.3;

      return {
        category: category.category,
        score: Math.round(score * 100) / 100,
        recentActivity: recentPredictions,
        growth: category.participationRate, // Using participation rate as growth proxy
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get hot market indicators for predictions
 * Returns data for showing "hot" indicators on prediction cards
 */
export async function getHotMarketIndicators(): Promise<{
  hotPredictions: Array<{
    predictionId: number;
    hotScore: number;
    indicators: string[];
  }>;
  marketTrends: {
    mostActivePredictions: number[];
    rapidlyChangingOdds: number[];
    highVolumePredictions: number[];
  };
}> {
  // This would integrate with the hot market detection we built
  // For now, return structure that components can use
  const healthMetrics = await getPlatformHealthMetrics();

  return {
    hotPredictions: [], // Would be populated by hot market algorithm
    marketTrends: {
      mostActivePredictions: [],
      rapidlyChangingOdds: [],
      highVolumePredictions: [],
    },
  };
}

/** — Utility Functions — **/

/**
 * Format volume/currency strings for display
 */
export function formatVolume(volumeString: string): string {
  const volume = parseFloat(volumeString);
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get time-based greeting for analytics
 */
export function getAnalyticsTimeContext(): {
  period: string;
  greeting: string;
  suggestedMetrics: string[];
} {
  const hour = new Date().getHours();

  if (hour < 12) {
    return {
      period: 'morning',
      greeting: "Good morning! Here's your platform overview",
      suggestedMetrics: ['overnight activity', 'morning trends', 'daily projections'],
    };
  } else if (hour < 18) {
    return {
      period: 'afternoon',
      greeting: 'Good afternoon! Mid-day market update',
      suggestedMetrics: ['peak activity', 'trending markets', 'user engagement'],
    };
  } else {
    return {
      period: 'evening',
      greeting: 'Evening wrap-up and insights',
      suggestedMetrics: ['daily summary', 'end-of-day trends', "tomorrow's outlook"],
    };
  }
}
