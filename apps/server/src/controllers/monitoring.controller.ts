// Database Performance Monitoring Controller
// Provides endpoints for monitoring database query performance and health

import { Request, Response, NextFunction } from 'express';
import { getQueryMetrics, clearQueryMetrics, isDbConnected } from '../db';
import redisClient from '../lib/redis';
import {
  toDatabaseMetricsResponse,
  toClearMetricsResponse,
  toHealthCheckResponse,
} from '../view/monitoring.view';
import type {
  DatabaseMetricsResponse,
  ClearMetricsResponse,
  HealthCheckResponse,
} from '@ems/types';
import { eventSystemMetricsService } from '../services/eventSystemMetrics.service';

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
      timestamp: new Date(),
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

    const payload = toDatabaseMetricsResponse({
      metrics,
      dbStatus,
      redisStatus,
      timestamp: new Date(),
    }) satisfies DatabaseMetricsResponse;
    res.json(payload);
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
    const payload = toClearMetricsResponse({
      success: true,
      message: 'Query metrics cleared',
      clearedAt: new Date(),
    }) satisfies ClearMetricsResponse;
    res.json(payload);
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

  const payload = toHealthCheckResponse({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date(),
  }) satisfies HealthCheckResponse;
  res.status(statusCode).json(payload);
}

/**
 * Get Event System metrics and health status
 * Requires admin authentication
 */
export async function getEventSystemMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const systemMetrics = await eventSystemMetricsService.getSystemMetrics();
    const eventMetrics = Array.from(eventSystemMetricsService.getEventMetrics().values());
    const topEvents = eventSystemMetricsService.getTopEventsByCount(10);
    const slowestEvents = eventSystemMetricsService.getSlowestEvents(5);
    const monitoringStatus = eventSystemMetricsService.getMonitoringStatus();
    const isHealthy = await eventSystemMetricsService.isHealthy();

    const payload = {
      system: systemMetrics,
      events: eventMetrics,
      topEvents,
      slowestEvents,
      monitoring: monitoringStatus,
      isHealthy,
      timestamp: new Date().toISOString(),
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * Reset Event System metrics
 * Requires admin authentication
 */
export async function resetEventSystemMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    eventSystemMetricsService.resetMetrics();

    const payload = {
      success: true,
      message: 'Event System metrics reset successfully',
      timestamp: new Date().toISOString(),
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * Start Event System monitoring
 * Requires admin authentication
 */
export async function startEventSystemMonitoring(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await eventSystemMetricsService.startMonitoring();

    const payload = {
      success: true,
      message: 'Event System monitoring started',
      status: eventSystemMetricsService.getMonitoringStatus(),
      timestamp: new Date().toISOString(),
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * Stop Event System monitoring
 * Requires admin authentication
 */
export async function stopEventSystemMonitoring(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await eventSystemMetricsService.stopMonitoring();

    const payload = {
      success: true,
      message: 'Event System monitoring stopped',
      status: eventSystemMetricsService.getMonitoringStatus(),
      timestamp: new Date().toISOString(),
    };

    res.json(payload);
  } catch (err) {
    next(err);
  }
}
