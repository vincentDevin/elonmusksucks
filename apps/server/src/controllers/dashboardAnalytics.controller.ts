// apps/server/src/controllers/dashboardAnalytics.controller.ts
import type { Request, Response } from 'express';
import { dashboardAnalyticsService } from '../services/dashboardAnalytics.service';

/**
 * Get comprehensive platform health metrics
 * GET /api/analytics/platform-health
 */
export async function getPlatformHealthMetrics(_req: Request, res: Response): Promise<void> {
  try {
    const metrics = await dashboardAnalyticsService.getPlatformHealthMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting platform health metrics:', error);
    res.status(500).json({ error: 'Failed to get platform health metrics' });
  }
}

/**
 * Get trend analysis for specified number of days
 * GET /api/analytics/trends?days=30
 */
export async function getTrendAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;

    if (days < 1 || days > 365) {
      res.status(400).json({ error: 'Days must be between 1 and 365' });
      return;
    }

    const trends = await dashboardAnalyticsService.getTrendAnalysis(days);
    res.json(trends);
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting trend analysis:', error);
    res.status(500).json({ error: 'Failed to get trend analysis' });
  }
}

/**
 * Get cross-feature analytics showing relationships between platform features
 * GET /api/analytics/cross-feature
 */
export async function getCrossFeatureAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const analytics = await dashboardAnalyticsService.getCrossFeatureAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting cross-feature analytics:', error);
    res.status(500).json({ error: 'Failed to get cross-feature analytics' });
  }
}

/**
 * Get content analytics showing performance of different content types
 * GET /api/analytics/content
 */
export async function getContentAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    const analytics = await dashboardAnalyticsService.getContentAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting content analytics:', error);
    res.status(500).json({ error: 'Failed to get content analytics' });
  }
}

/**
 * Get comprehensive dashboard data (combines multiple analytics)
 * GET /api/analytics/dashboard
 */
export async function getComprehensiveDashboard(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;

    if (days < 1 || days > 365) {
      res.status(400).json({ error: 'Days must be between 1 and 365' });
      return;
    }

    // Execute all analytics in parallel for better performance
    const [healthMetrics, trends, crossFeature, content] = await Promise.all([
      dashboardAnalyticsService.getPlatformHealthMetrics(),
      dashboardAnalyticsService.getTrendAnalysis(days),
      dashboardAnalyticsService.getCrossFeatureAnalytics(),
      dashboardAnalyticsService.getContentAnalytics(),
    ]);

    res.json({
      healthMetrics,
      trends,
      crossFeature,
      content,
      generatedAt: new Date().toISOString(),
      timeRange: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting comprehensive dashboard:', error);
    res.status(500).json({ error: 'Failed to get comprehensive dashboard data' });
  }
}

/**
 * Get real-time metrics (lightweight version for frequent updates)
 * GET /api/analytics/realtime
 */
export async function getRealtimeMetrics(_req: Request, res: Response): Promise<void> {
  try {
    // Only get the most essential real-time metrics for performance
    const healthMetrics = await dashboardAnalyticsService.getPlatformHealthMetrics();

    // Extract only real-time relevant data
    const realTimeData = {
      activeUsers24h: healthMetrics.activeUsers.last24h,
      newPredictions24h: healthMetrics.predictions.createdLast24h,
      bettingVolume24h: healthMetrics.betting.volumeLast24h,
      engagement24h: healthMetrics.engagement,
      performance: healthMetrics.performance,
      timestamp: new Date().toISOString(),
    };

    res.json(realTimeData);
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting realtime metrics:', error);
    res.status(500).json({ error: 'Failed to get realtime metrics' });
  }
}

/**
 * Get analytics summary for specific time period
 * GET /api/analytics/summary?period=week|month|quarter
 */
export async function getAnalyticsSummary(req: Request, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || 'month';

    let days: number;
    switch (period) {
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      case 'quarter':
        days = 90;
        break;
      default:
        res.status(400).json({ error: 'Invalid period. Use: week, month, or quarter' });
        return;
    }

    const [healthMetrics, trends] = await Promise.all([
      dashboardAnalyticsService.getPlatformHealthMetrics(),
      dashboardAnalyticsService.getTrendAnalysis(days),
    ]);

    // Calculate summary statistics
    const summary = {
      period,
      days,
      overview: {
        totalUsers: healthMetrics.activeUsers.last30d,
        userGrowth: healthMetrics.activeUsers.growth,
        totalPredictions: healthMetrics.predictions.total,
        activePredictions: healthMetrics.predictions.active,
        totalBettingVolume: healthMetrics.betting.totalVolume,
        averageBetSize: healthMetrics.betting.averageBetSize,
      },
      engagement: {
        dailyComments: Math.round(
          trends.engagement.reduce((sum, day) => sum + day.comments, 0) / days,
        ),
        dailyPongMatches: Math.round(
          trends.engagement.reduce((sum, day) => sum + day.pongMatches, 0) / days,
        ),
        totalEngagement: trends.engagement.reduce(
          (sum, day) => sum + day.comments + day.likes + day.pongMatches,
          0,
        ),
      },
      trends: {
        userRegistrations: trends.userRegistrations.slice(-7), // Last 7 days
        topCategories: [], // Would calculate from content analytics
      },
      generatedAt: new Date().toISOString(),
    };

    res.json(summary);
  } catch (error) {
    console.error('[dashboardAnalytics] Error getting analytics summary:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
}
