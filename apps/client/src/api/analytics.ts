// apps/client/src/api/analytics.ts
import api from './axios';
import type {
  PlatformHealthMetricsResponse,
  TrendAnalysisResponse,
  CrossFeatureAnalyticsResponse,
  ContentAnalyticsResponse,
  ComprehensiveDashboardResponse,
  RealtimeMetricsResponse,
  AnalyticsSummaryResponse,
} from '@ems/types';

// Type aliases for backwards compatibility
export type PlatformHealthMetrics = PlatformHealthMetricsResponse;
export type TrendAnalysis = TrendAnalysisResponse;
export type CrossFeatureAnalytics = CrossFeatureAnalyticsResponse;
export type ContentAnalytics = ContentAnalyticsResponse;
export type ComprehensiveDashboard = ComprehensiveDashboardResponse;
export type RealtimeMetrics = RealtimeMetricsResponse;
export type AnalyticsSummary = AnalyticsSummaryResponse;

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
  platformHealth: {
    predictions: PlatformHealthMetrics['predictionMetrics'];
    betting: PlatformHealthMetrics['financialMetrics'];
    engagement: PlatformHealthMetrics['engagementMetrics'];
  };
  contentMetrics: ContentAnalytics;
  realtimeActivity: {
    activeUsers: number;
    recentPredictions: RealtimeMetrics['recentPredictions'];
    recentBets: RealtimeMetrics['recentBets'];
  };
}> {
  // Get multiple analytics in parallel for predictions page
  const [healthMetrics, contentAnalytics, realtimeMetrics] = await Promise.all([
    getPlatformHealthMetrics(),
    getContentAnalytics(),
    getRealtimeMetrics(),
  ]);

  return {
    platformHealth: {
      predictions: healthMetrics.predictionMetrics,
      betting: healthMetrics.financialMetrics,
      engagement: healthMetrics.engagementMetrics,
    },
    contentMetrics: contentAnalytics,
    realtimeActivity: {
      activeUsers: realtimeMetrics.activeUsers,
      recentPredictions: realtimeMetrics.recentPredictions,
      recentBets: realtimeMetrics.recentBets,
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
  const trends = await getTrendAnalysis(7); // Last 7 days for trending data

  // Map category trends from analytics
  return trends.categoryTrends.trending.map((item) => ({
    category: item.category,
    score: item.growth,
    recentActivity: item.volume,
    growth: item.growth,
  }));
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
