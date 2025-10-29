// apps/server/src/lib/errors.ts
// Structured error taxonomy with PII redaction

import type { StructuredError, ErrorContext } from '@ems/types';

/**
 * Standard error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  AUTH_NOT_AUTHENTICATED: 'AUTH_NOT_AUTHENTICATED',

  // Betting & Market
  BET_INSUFFICIENT_FUNDS: 'BET_INSUFFICIENT_FUNDS',
  BET_PREDICTION_CLOSED: 'BET_PREDICTION_CLOSED',
  BET_OPTION_NOT_FOUND: 'BET_OPTION_NOT_FOUND',
  BET_INVALID_AMOUNT: 'BET_INVALID_AMOUNT',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  // Rate Limiting & Abuse
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',

  // System
  SYSTEM_DATABASE_ERROR: 'SYSTEM_DATABASE_ERROR',
  SYSTEM_EXTERNAL_SERVICE: 'SYSTEM_EXTERNAL_SERVICE',
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * PII-sensitive field patterns that should be redacted
 */
const PII_PATTERNS = [
  /email/i,
  /password/i,
  /token/i,
  /ssn/i,
  /phone/i,
  /address/i,
  /credit.*card/i,
  /ip.*address/i,
];

/**
 * Redact potentially sensitive information from error context
 */
function redactPII(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact email patterns
    return obj.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***');
  }

  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if key matches PII pattern
    const isPII = PII_PATTERNS.some((pattern) => pattern.test(key));

    if (isPII && typeof value === 'string') {
      redacted[key] = '***REDACTED***';
    } else {
      redacted[key] = redactPII(value);
    }
  }

  return redacted;
}

/**
 * Create a structured error with automatic PII redaction
 */
export function createStructuredError(
  code: ErrorCode,
  message: string,
  context: ErrorContext = {},
  statusCode: number = 500,
): StructuredError {
  return {
    code,
    message,
    context: redactPII(context),
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Map common error patterns to structured errors
 */
export function mapToStructuredError(error: any): StructuredError {
  if (error.code && ERROR_CODES[error.code as keyof typeof ERROR_CODES]) {
    // Already a structured error
    return error;
  }

  const message = error.message || 'Unknown error';

  // Map common error patterns
  if (message.includes('INSUFFICIENT_FUNDS')) {
    return createStructuredError(
      ERROR_CODES.BET_INSUFFICIENT_FUNDS,
      'Insufficient funds for bet',
      { originalMessage: message },
      400,
    );
  }

  if (message.includes('PREDICTION_CLOSED')) {
    return createStructuredError(
      ERROR_CODES.BET_PREDICTION_CLOSED,
      'Prediction is closed for betting',
      { originalMessage: message },
      400,
    );
  }

  if (message.includes('NOT_AUTHENTICATED')) {
    return createStructuredError(
      ERROR_CODES.AUTH_NOT_AUTHENTICATED,
      'Authentication required',
      {},
      401,
    );
  }

  if (message.includes('Forbidden')) {
    return createStructuredError(ERROR_CODES.AUTH_FORBIDDEN, 'Access forbidden', {}, 403);
  }

  if (message.includes('rate limit')) {
    return createStructuredError(ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', {}, 429);
  }

  // Default to system internal error
  return createStructuredError(
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    'Internal server error',
    { originalMessage: message },
    500,
  );
}

/**
 * Log structured error with redaction
 */
export function logStructuredError(error: StructuredError, additionalContext: any = {}): void {
  console.error('[error]', {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    context: redactPII({ ...error.context, ...additionalContext }),
  });
}
