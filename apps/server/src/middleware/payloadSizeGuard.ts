// apps/server/src/middleware/payloadSizeGuard.ts
// -----------------------------------------------------------------------------
// Socket.IO payload size validation middleware
// -----------------------------------------------------------------------------

import { Socket } from 'socket.io';
import type { PayloadSizeConfig, PayloadSizeResult } from '@ems/types';

// Default configuration: soft cap at 32KB, hard cap at 64KB
const DEFAULT_CONFIG: PayloadSizeConfig = {
  softLimitBytes: 32 * 1024, // 32KB warning threshold
  hardLimitBytes: 64 * 1024, // 64KB rejection threshold
  enforceMode: 'strict',
};

/**
 * Calculate payload size in bytes
 */
function getPayloadSize(payload: any): number {
  try {
    // Stringify to get accurate byte size
    const jsonString = JSON.stringify(payload);
    // Use Buffer.byteLength for accurate UTF-8 byte count
    return Buffer.byteLength(jsonString, 'utf8');
  } catch (error) {
    console.error('[payload-guard] Failed to calculate payload size:', error);
    return 0;
  }
}

/**
 * Check payload size against limits
 */
export function checkPayloadSize(
  payload: any,
  config: PayloadSizeConfig = DEFAULT_CONFIG,
): PayloadSizeResult {
  const size = getPayloadSize(payload);
  const exceedsSoft = size > config.softLimitBytes;
  const exceedsHard = size > config.hardLimitBytes;

  let message: string | undefined;
  if (exceedsHard) {
    message = `Payload size ${size} bytes exceeds hard limit of ${config.hardLimitBytes} bytes`;
  } else if (exceedsSoft) {
    message = `Payload size ${size} bytes exceeds soft limit of ${config.softLimitBytes} bytes`;
  }

  return { size, exceedsSoft, exceedsHard, message };
}

/**
 * Socket.IO middleware for payload size validation
 */
export function createPayloadSizeGuard(config: PayloadSizeConfig = DEFAULT_CONFIG) {
  return (event: string, handler: Function) => {
    return async function (this: Socket, ...args: any[]) {
      // Extract payload (usually first argument)
      const payload = args[0];
      const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;

      const result = checkPayloadSize(payload, config);

      // Log if exceeds soft limit
      if (result.exceedsSoft) {
        console.warn(`[payload-guard] ${event}: ${result.message}`);
      }

      // Reject if exceeds hard limit in strict mode
      if (result.exceedsHard && config.enforceMode === 'strict') {
        console.error(`[payload-guard] REJECTED ${event}: ${result.message}`);

        // Send error response
        if (callback) {
          return callback({ error: 'PAYLOAD_TOO_LARGE', maxSize: config.hardLimitBytes });
        } else {
          this.emit('error', { message: 'Payload too large', maxSize: config.hardLimitBytes });
          return;
        }
      }

      // Continue with original handler
      return handler.call(this, ...args);
    };
  };
}

/**
 * Apply payload guard to specific socket event
 */
export function guardSocketEvent(
  socket: Socket,
  event: string,
  handler: Function,
  config?: PayloadSizeConfig,
): void {
  const guard = createPayloadSizeGuard(config);
  socket.on(event, guard(event, handler));
}

// Export configuration for monitoring
export const getPayloadConfig = () => DEFAULT_CONFIG;

// Log configuration on module load
console.log(
  `[payload-guard] Initialized - Soft: ${DEFAULT_CONFIG.softLimitBytes} bytes, Hard: ${DEFAULT_CONFIG.hardLimitBytes} bytes`,
);
