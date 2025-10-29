// apps/server/src/routes/dashboardAnalytics.routes.ts
import { Router } from 'express';
import {
  getPlatformHealthMetrics,
  getTrendAnalysis,
  getCrossFeatureAnalytics,
  getContentAnalytics,
  getComprehensiveDashboard,
  getRealtimeMetrics,
  getAnalyticsSummary,
} from '../controllers/dashboardAnalytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { heavyTimeout } from '../middleware/timeout.middleware';

const router = Router();

// All analytics endpoints require authentication
// These endpoints provide sensitive business intelligence data

// Core analytics endpoints (heavy computations, use 30s timeout)
// GET /api/analytics/platform-health - Get comprehensive platform health metrics
router.get('/platform-health', heavyTimeout, requireAuth, getPlatformHealthMetrics);

// GET /api/analytics/trends - Get trend analysis for specified time period
router.get('/trends', heavyTimeout, requireAuth, getTrendAnalysis);

// GET /api/analytics/cross-feature - Get cross-feature analytics
router.get('/cross-feature', heavyTimeout, requireAuth, getCrossFeatureAnalytics);

// GET /api/analytics/content - Get content performance analytics
router.get('/content', heavyTimeout, requireAuth, getContentAnalytics);

// Comprehensive analytics endpoints
// GET /api/analytics/dashboard - Get comprehensive dashboard data
router.get('/dashboard', requireAuth, getComprehensiveDashboard);

// GET /api/analytics/realtime - Get real-time metrics (lightweight)
router.get('/realtime', requireAuth, getRealtimeMetrics);

// GET /api/analytics/summary - Get analytics summary for specific period
router.get('/summary', requireAuth, getAnalyticsSummary);

export default router;
