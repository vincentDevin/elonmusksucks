// Database Performance Monitoring Routes
// Provides endpoints for monitoring and health checks

import express from 'express';
import {
  getDatabaseMetrics,
  clearDatabaseMetrics,
  healthCheck,
} from '../controllers/monitoring.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Public health check endpoint (no auth required)
// Used by load balancers and monitoring services
router.get('/health', healthCheck);

// Admin-only monitoring endpoints
router.get('/metrics/database', requireAuth, requireAdmin, getDatabaseMetrics);
router.delete('/metrics/database', requireAuth, requireAdmin, clearDatabaseMetrics);

export default router;
