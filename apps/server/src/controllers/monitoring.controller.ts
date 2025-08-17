// Database Performance Monitoring Controller
// Provides endpoints for monitoring database query performance and health

import { Request, Response, NextFunction } from 'express';
import { getQueryMetrics, clearQueryMetrics, isDbConnected } from '../db';
import redisClient from '../lib/redis';

/**
 * Get current database query performance metrics
 * Requires admin authentication
 */
export async function getDatabaseMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const metrics = getQueryMetrics();

    // Add database connection status
    const dbStatus = {
      connected: isDbConnected(),
      timestamp: new Date().toISOString(),
    };

    // Get Redis status as well
    let redisStatus;
    try {
      await redisClient.ping();
      redisStatus = {
        connected: true,
        memory: await redisClient.info('memory'),
      };
    } catch (err) {
      redisStatus = {
        connected: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    res.json({
      database: {
        ...metrics,
        status: dbStatus,
      },
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear query metrics history
 * Requires admin authentication
 */
export async function clearDatabaseMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    clearQueryMetrics();
    res.json({
      success: true,
      message: 'Query metrics cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Health check endpoint for monitoring services
 * No authentication required - used by load balancers
 */
export async function healthCheck(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const checks = {
    database: false,
    redis: false,
  };

  // Check database
  try {
    checks.database = isDbConnected();
  } catch {
    checks.database = false;
  }

  // Check Redis
  try {
    await redisClient.ping();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  const isHealthy = checks.database && checks.redis;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
}
