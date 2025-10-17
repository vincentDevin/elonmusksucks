// Prometheus Middleware for Express
// Automatically tracks HTTP request metrics for all routes

import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpErrorsTotal,
  safeIncCounter,
} from '../lib/prometheusMetrics';

/**
 * Express middleware to track HTTP request metrics
 *
 * Tracks:
 * - Request duration (histogram)
 * - Request count (counter)
 * - Error count (counter for 4xx and 5xx)
 *
 * Usage:
 * app.use(prometheusMiddleware);
 */
export function prometheusMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Start timer
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    try {
      const duration = (Date.now() - start) / 1000; // Convert to seconds

      // Normalize route path to avoid high cardinality
      // If route is defined, use it; otherwise use a generic path
      const route = normalizeRoute(req);
      const method = req.method;
      const statusCode = res.statusCode.toString();

      // Record request duration
      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

      // Record request count
      safeIncCounter(httpRequestTotal, 1, { method, route, status_code: statusCode });

      // Track errors (4xx and 5xx)
      if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
        const errorType = statusCode.startsWith('4') ? 'client_error' : 'server_error';
        safeIncCounter(httpErrorsTotal, 1, {
          method,
          route,
          status_code: statusCode,
          error_type: errorType,
        });
      }
    } catch (error) {
      // Don't let metrics errors break the response
      console.warn('[prometheusMiddleware] Error recording metrics:', error);
    }
  });

  next();
}

/**
 * Normalize route path to prevent high cardinality
 *
 * Examples:
 * - /api/users/123 -> /api/users/:id
 * - /api/predictions/456/bets -> /api/predictions/:id/bets
 * - /metrics -> /metrics (preserved)
 * - /health -> /health (preserved)
 */
function normalizeRoute(req: Request): string {
  // If Express route is defined (when using routers), use it
  if (req.route?.path) {
    // Combine base URL with route path
    const baseUrl = req.baseUrl || '';
    return `${baseUrl}${req.route.path}`;
  }

  // Otherwise, normalize the path manually
  const path = req.path || req.url;

  // Special routes to preserve as-is
  const preservedRoutes = ['/health', '/metrics', '/'];
  if (preservedRoutes.includes(path)) {
    return path;
  }

  // Normalize paths with IDs (numeric segments)
  // /api/users/123 -> /api/users/:id
  // /api/predictions/456/bets -> /api/predictions/:id/bets
  const normalized = path.replace(/\/\d+/g, '/:id');

  // Normalize paths with UUIDs
  // /api/games/550e8400-e29b-41d4-a716-446655440000 -> /api/games/:uuid
  const uuidPattern = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const withUuids = normalized.replace(uuidPattern, '/:uuid');

  // If path is too long (likely contains user data), truncate to base API path
  if (withUuids.length > 100) {
    const segments = withUuids.split('/');
    return segments.slice(0, 4).join('/') + '/...';
  }

  return withUuids;
}

/**
 * Middleware to exclude specific routes from metrics
 *
 * Usage:
 * app.use('/metrics', skipMetrics, prometheusRoutes);
 */
export function skipMetrics(req: Request, _res: Response, next: NextFunction): void {
  // Mark this request to skip metrics
  (req as any).skipMetrics = true;
  next();
}
