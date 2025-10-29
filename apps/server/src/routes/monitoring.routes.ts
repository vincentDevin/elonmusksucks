// Database Performance Monitoring Routes
// Provides endpoints for monitoring and health checks

import express from 'express';
import {
  getDatabaseMetrics,
  clearDatabaseMetrics,
  healthCheck,
  getEventSystemMetrics,
  resetEventSystemMetrics,
  startEventSystemMonitoring,
  stopEventSystemMonitoring,
} from '../controllers/monitoring.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { fastTimeout, standardTimeout } from '../middleware/timeout.middleware';

const router = express.Router();

// Public health check endpoint (no auth required)
// Used by load balancers and monitoring services
router.get('/health', fastTimeout, healthCheck);

// Admin-only monitoring endpoints
router.get('/metrics/database', standardTimeout, requireAuth, requireAdmin, getDatabaseMetrics);
router.delete(
  '/metrics/database',
  standardTimeout,
  requireAuth,
  requireAdmin,
  clearDatabaseMetrics,
);

// Event System monitoring endpoints
router.get('/metrics/events', standardTimeout, requireAuth, requireAdmin, getEventSystemMetrics);
router.post(
  '/metrics/events/reset',
  standardTimeout,
  requireAuth,
  requireAdmin,
  resetEventSystemMetrics,
);
router.post(
  '/monitoring/start',
  standardTimeout,
  requireAuth,
  requireAdmin,
  startEventSystemMonitoring,
);
router.post(
  '/monitoring/stop',
  standardTimeout,
  requireAuth,
  requireAdmin,
  stopEventSystemMonitoring,
);

export default router;
