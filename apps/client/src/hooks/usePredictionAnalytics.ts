// apps/client/src/hooks/usePredictionAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getPredictionPageAnalytics,
  getTrendingCategories,
  getHotMarketIndicators,
  getRealtimeMetrics,
  formatVolume,
  formatPercentage,
} from '../api/analytics';

export interface PredictionAnalyticsData {
  // Platform insights
  platformInsights: {
    totalPredictions: number;
    activePredictions: number;
    resolutionRate: number;
    totalVolume: string;
    formattedVolume: string;
    averageBetSize: string;
    formattedAverageBetSize: string;
    uniqueBettors: number;
    winRate: number;
  };

  // Real-time activity
  realtimeActivity: {
    activeUsers: number;
    newPredictions: number;
    volume24h: string;
    formattedVolume24h: string;
  };

  // Category insights
  categoryInsights: Array<{
    category: string;
    totalPredictions: number;
    avgAccuracy: number;
    totalVolume: string;
    formattedVolume: string;
    participationRate: number;
    trendScore?: number;
    isHot?: boolean;
  }>;

  // Trending data
  trendingCategories: Array<{
    category: string;
    score: number;
    recentActivity: number;
    growth: number;
  }>;

  // Hot market data
  hotMarkets: {
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
  };
}

export interface PredictionAnalyticsHookReturn {
  data: PredictionAnalyticsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  getInsightForCategory: (category: string) => string | null;
  getCategoryTrendStatus: (category: string) => 'hot' | 'trending' | 'normal' | 'cooling';
  getMarketSentiment: () => 'bullish' | 'bearish' | 'neutral';
}

export function usePredictionAnalytics(): PredictionAnalyticsHookReturn {
  const [data, setData] = useState<PredictionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [pageAnalytics, trendingCategories, hotMarkets, realtimeMetrics] = await Promise.all([
        getPredictionPageAnalytics(),
        getTrendingCategories(),
        getHotMarketIndicators(),
        getRealtimeMetrics(),
      ]);

      // Process and format the data
      const processedData: PredictionAnalyticsData = {
        platformInsights: {
          totalPredictions: pageAnalytics.platformHealth.predictions.total,
          activePredictions: pageAnalytics.platformHealth.predictions.active,
          resolutionRate: pageAnalytics.platformHealth.predictions.resolutionRate,
          totalVolume: pageAnalytics.platformHealth.betting.totalVolume,
          formattedVolume: formatVolume(pageAnalytics.platformHealth.betting.totalVolume),
          averageBetSize: pageAnalytics.platformHealth.betting.averageBetSize,
          formattedAverageBetSize: formatVolume(
            pageAnalytics.platformHealth.betting.averageBetSize,
          ),
          uniqueBettors: pageAnalytics.platformHealth.betting.uniqueBettors,
          winRate: pageAnalytics.platformHealth.betting.winRate,
        },

        realtimeActivity: {
          activeUsers: pageAnalytics.realtimeActivity.activeUsers24h,
          newPredictions: pageAnalytics.realtimeActivity.newPredictions24h,
          volume24h: pageAnalytics.realtimeActivity.bettingVolume24h,
          formattedVolume24h: formatVolume(pageAnalytics.realtimeActivity.bettingVolume24h),
        },

        categoryInsights: pageAnalytics.categoryPerformance.map((category) => {
          const trendData = trendingCategories.find((t) => t.category === category.category);
          return {
            ...category,
            formattedVolume: formatVolume(category.totalVolume),
            trendScore: trendData?.score,
            isHot: trendData ? trendData.score > 70 : false,
          };
        }),

        trendingCategories,
        hotMarkets,
      };

      setData(processedData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      console.error('[usePredictionAnalytics] Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  // Helper function to get insights for a specific category
  const getInsightForCategory = useCallback(
    (category: string): string | null => {
      if (!data) return null;

      const categoryData = data.categoryInsights.find((c) => c.category === category);
      const trendData = data.trendingCategories.find((t) => t.category === category);

      if (!categoryData) return null;

      // Generate insights based on the data
      const insights: string[] = [];

      if (categoryData.avgAccuracy > 75) {
        insights.push('High accuracy predictions');
      }

      if (categoryData.participationRate > 60) {
        insights.push('Very active category');
      }

      if (trendData && trendData.score > 70) {
        insights.push('Trending now');
      }

      if (categoryData.totalPredictions > data.platformInsights.totalPredictions * 0.2) {
        insights.push('Popular category');
      }

      return insights.length > 0 ? insights.join(' • ') : null;
    },
    [data],
  );

  // Helper function to get trend status for a category
  const getCategoryTrendStatus = useCallback(
    (category: string): 'hot' | 'trending' | 'normal' | 'cooling' => {
      if (!data) return 'normal';

      const trendData = data.trendingCategories.find((t) => t.category === category);
      if (!trendData) return 'normal';

      if (trendData.score > 80) return 'hot';
      if (trendData.score > 60) return 'trending';
      if (trendData.score < 30) return 'cooling';
      return 'normal';
    },
    [data],
  );

  // Helper function to get overall market sentiment
  const getMarketSentiment = useCallback((): 'bullish' | 'bearish' | 'neutral' => {
    if (!data) return 'neutral';

    const { winRate, resolutionRate } = data.platformInsights;
    const { activeUsers, newPredictions } = data.realtimeActivity;

    // Calculate sentiment score
    let sentimentScore = 0;

    // Win rate contributes to sentiment
    if (winRate > 60) sentimentScore += 1;
    else if (winRate < 40) sentimentScore -= 1;

    // Resolution rate indicates platform health
    if (resolutionRate > 80) sentimentScore += 1;
    else if (resolutionRate < 60) sentimentScore -= 1;

    // Activity levels indicate engagement
    if (activeUsers > 100 && newPredictions > 10) sentimentScore += 1;
    else if (activeUsers < 50 || newPredictions < 5) sentimentScore -= 1;

    if (sentimentScore > 0) return 'bullish';
    if (sentimentScore < 0) return 'bearish';
    return 'neutral';
  }, [data]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchAnalytics,
    getInsightForCategory,
    getCategoryTrendStatus,
    getMarketSentiment,
  };
}
