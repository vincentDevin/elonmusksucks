/**
 * Shared Error Types
 *
 * Structured error handling and context types
 */

// ============================================================================
// Structured Errors
// ============================================================================

/**
 * Structured Error
 */
export interface StructuredError {
  code: string;
  message: string;
  context?: ErrorContext;
  timestamp: string;
  traceId?: string;
  statusCode?: number;
}

/**
 * Error Context
 */
export interface ErrorContext {
  userId?: number;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  originalMessage?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tracing Types
// ============================================================================

/**
 * Trace Span
 */
export interface TraceSpan {
  spanId: string;
  traceId: string;
  operationName: string;
  metadata: Record<string, any>;
}

/**
 * Trace Context
 */
export interface TraceContext {
  traceId: string;
  parentSpanId: string;
}

// ============================================================================
// Error Conversion Utilities
// ============================================================================

/**
 * Service Error (extends Error with additional fields)
 */
export interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
  context?: ErrorContext;
}

/**
 * Safely convert unknown error to Error instance
 *
 * @param error - Unknown error value from catch block
 * @returns Error instance with message
 *
 * @example
 * try {
 *   // ... code
 * } catch (error: unknown) {
 *   const err = toError(error);
 *   console.error(err.message);
 * }
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }
  return new Error(String(error));
}

/**
 * Check if error is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof Error && ('code' in error || 'statusCode' in error);
}
