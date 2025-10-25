import { Request, Response, NextFunction } from 'express';

/**
 * Timeout middleware configuration
 */
export interface TimeoutConfig {
  timeoutMs: number;
  message?: string;
}

/**
 * Creates timeout middleware that terminates requests exceeding the specified duration
 *
 * @param config Timeout configuration
 * @returns Express middleware function
 */
export function createTimeoutMiddleware(config: TimeoutConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set a timeout for this request
    const timeout = setTimeout(() => {
      // Only send error if headers haven't been sent yet
      if (!res.headersSent) {
        console.error(`[TIMEOUT] ${req.method} ${req.path} exceeded ${config.timeoutMs}ms`, {
          method: req.method,
          path: req.path,
          query: req.query,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        });

        // Send 504 Gateway Timeout response
        res.status(504).json({
          error: 'Gateway Timeout',
          message: config.message || `Request exceeded ${config.timeoutMs}ms timeout`,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
        });
      }
    }, config.timeoutMs);

    // Clear timeout when response finishes or connection closes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

/**
 * Fast timeout (5 seconds)
 * Use for: Health checks, simple lookups
 */
export const fastTimeout = createTimeoutMiddleware({
  timeoutMs: 5000,
  message: 'Request timed out after 5 seconds',
});

/**
 * Standard timeout (15 seconds)
 * Use for: Most API endpoints, reads, writes
 */
export const standardTimeout = createTimeoutMiddleware({
  timeoutMs: 15000,
  message: 'Request timed out after 15 seconds',
});

/**
 * Heavy timeout (30 seconds)
 * Use for: Complex analytics, admin operations, large aggregations
 */
export const heavyTimeout = createTimeoutMiddleware({
  timeoutMs: 30000,
  message: 'Request timed out after 30 seconds',
});
