// apps/server/src/lib/ackPolicy.ts
// -----------------------------------------------------------------------------
// Standardized ACK timeout and retry policy for critical socket events
// -----------------------------------------------------------------------------

import type { ACKTimeoutConfig, ACKRetryPolicy } from '@ems/types';

// Default ACK configuration for critical events
export const defaultACKConfig: ACKTimeoutConfig = {
  timeoutMs: 5000, // 5 second base timeout
  maxRetries: 3, // Maximum 3 retry attempts
  backoffMultiplier: 2, // Exponential backoff (2x, 4x, 8x)
  maxBackoffMs: 30000, // Cap at 30 seconds
};

// Event-specific configurations
export const ACKConfigs = {
  'bet:place': defaultACKConfig,
  'prediction:create': defaultACKConfig,
  'parlay:create': { ...defaultACKConfig, maxRetries: 2 }, // Shorter for complex operations
} as const;

/**
 * Calculate next retry delay using exponential backoff
 */
export function calculateRetryDelay(config: ACKTimeoutConfig, attempt: number): number {
  const baseDelay = config.timeoutMs;
  const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, config.maxBackoffMs);
}

/**
 * Create retry policy for current attempt
 */
export function createRetryPolicy(config: ACKTimeoutConfig, attempt: number): ACKRetryPolicy {
  return {
    attempt,
    nextRetryDelayMs: calculateRetryDelay(config, attempt + 1),
  };
}

/**
 * Execute socket operation with ACK timeout and retry logic
 */
export function withACKTimeout<T>(
  socketEmit: (callback: (response: T | { error: string }) => void) => void,
  config: ACKTimeoutConfig = defaultACKConfig,
  eventName: string = 'unknown',
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const attemptOperation = () => {
      attempt++;
      console.log(`[ack-policy] ${eventName} attempt ${attempt}/${config.maxRetries + 1}`);

      const timeout = setTimeout(() => {
        if (attempt <= config.maxRetries) {
          const retryPolicy = createRetryPolicy(config, attempt);
          console.warn(
            `[ack-policy] ${eventName} timeout, retrying in ${retryPolicy.nextRetryDelayMs}ms`,
          );
          setTimeout(attemptOperation, retryPolicy.nextRetryDelayMs);
        } else {
          console.error(`[ack-policy] ${eventName} failed after ${attempt} attempts`);
          reject(new Error(`ACK timeout after ${attempt} attempts`));
        }
      }, config.timeoutMs);

      socketEmit((response) => {
        clearTimeout(timeout);
        if (response && typeof response === 'object' && 'error' in response) {
          console.error(`[ack-policy] ${eventName} server error:`, response.error);
          reject(new Error(response.error));
        } else {
          console.log(`[ack-policy] ${eventName} succeeded on attempt ${attempt}`);
          resolve(response);
        }
      });
    };

    attemptOperation();
  });
}
