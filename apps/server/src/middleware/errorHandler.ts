// apps/server/src/middleware/errorHandler.ts
// Express error handler with structured errors and PII redaction

import { Request, Response, NextFunction } from 'express';
import { mapToStructuredError, logStructuredError } from '../lib/errors';
import type { StructuredError } from '@ems/types';

/**
 * Global Express error handler middleware
 * Converts all errors to structured format with PII redaction
 */
export function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  // Convert to structured error
  const structuredError: StructuredError = mapToStructuredError(error);

  // Log error with request context (PII will be redacted)
  logStructuredError(structuredError, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id, // From auth middleware if present
  });

  // Send client-safe response
  res.status(structuredError.statusCode).json({
    error: structuredError.message,
    code: structuredError.code,
    timestamp: structuredError.timestamp,
  });
}

/**
 * Handle 404 not found errors
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
