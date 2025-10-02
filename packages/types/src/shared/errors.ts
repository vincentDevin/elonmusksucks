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
