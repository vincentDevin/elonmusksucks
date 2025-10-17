// Prometheus Metrics Endpoint Routes
// Exposes /metrics endpoint for Fly.io scraper

import express, { Request, Response, NextFunction } from 'express';
import { register } from '../lib/prometheusMetrics';
import env from '../config/env';

const router = express.Router();

/**
 * Security middleware: Restrict metrics endpoint to internal Fly.io network only
 *
 * In production (Fly.io):
 * - Only allows requests from localhost (Fly.io's internal scraper)
 * - Blocks all external internet requests
 *
 * In development:
 * - Allows localhost access for testing
 */
function restrictToInternalNetwork(req: Request, res: Response, next: NextFunction) {
  // In development, allow localhost access
  if (env.NODE_ENV === 'development') {
    return next();
  }

  // Get client IP address
  const clientIp = req.ip || req.socket.remoteAddress || '';

  // Allow requests from localhost (Fly.io's internal scraper)
  // Fly.io metrics scraper connects from localhost within the VM
  const isLocalhost =
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp === '::ffff:127.0.0.1' ||
    clientIp.startsWith('127.') ||
    clientIp.startsWith('::ffff:127.');

  // Also check if there's NO X-Forwarded-For header
  // Internal requests won't have this header, external requests will
  const hasExternalForwarding = req.headers['x-forwarded-for'] !== undefined;

  if (isLocalhost && !hasExternalForwarding) {
    return next();
  }

  // Block all other requests
  console.warn(`[prometheus] Blocked external metrics access attempt from IP: ${clientIp}`);
  res.status(403).send('Forbidden: Metrics endpoint is internal only');
}

/**
 * GET /metrics
 *
 * Prometheus metrics endpoint - returns metrics in Prometheus text format
 *
 * Security:
 * - Restricted to Fly.io internal network only via middleware
 * - Not accessible from public internet (403 Forbidden)
 * - Fly.io's internal scraper accesses from localhost
 *
 * Usage by Fly.io:
 * - Configured in fly.toml with [metrics] section
 * - Scraped every 15 seconds automatically
 * - Stored in VictoriaMetrics (Prometheus-compatible)
 * - Queryable via Grafana at fly-metrics.net
 */
router.get('/metrics', restrictToInternalNetwork, async (_req, res) => {
  try {
    // Set content type to Prometheus text format
    res.set('Content-Type', register.contentType);

    // Generate and return metrics
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('[prometheus] Error generating metrics:', error);

    // Return 500 but don't expose error details
    res.status(500).end('Error generating metrics');
  }
});

/**
 * GET /metrics/json (optional - for debugging)
 *
 * Returns metrics as JSON for easier debugging
 * Restricted to internal network only for security
 */
router.get('/metrics/json', restrictToInternalNetwork, async (_req, res) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    res.json(metrics);
  } catch (error) {
    console.error('[prometheus] Error generating JSON metrics:', error);
    res.status(500).json({ error: 'Error generating metrics' });
  }
});

export default router;
