// apps/pong-server/src/middleware/payloadValidator.ts
// ══════════════════════════════════════════════════════════════════════════════
// Payload Size Validation Middleware
// ══════════════════════════════════════════════════════════════════════════════
// Prevents memory exhaustion attacks by validating payload sizes before processing.
// Socket.IO doesn't have built-in payload size limits, so we implement our own.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum payload sizes for different event types (in bytes)
 */
const PAYLOAD_SIZE_LIMITS: Record<string, number> = {
  // Game input - very small payload
  player_input: 512, // 512 bytes (just paddleY + timestamp)

  // Match creation - small payload
  create_match: 1024, // 1KB (type + wager + difficulty)

  // Join/leave operations - minimal payload
  join_match: 256, // 256 bytes (just match ID)
  leave_match: 256,
  spectate_match: 256,

  // Ready state - minimal payload
  player_ready: 256, // 256 bytes (just ready boolean)

  // Authentication - medium payload (JWT token)
  auth: 2048, // 2KB (JWT tokens can be large)

  // Default limit for unspecified events
  _default: 10240, // 10KB
};

/**
 * Validates that a payload is within size limits
 * @param data - Payload data to validate
 * @param event - Event name (for event-specific limits)
 * @returns true if payload is valid, false if too large
 */
export function validatePayloadSize(data: unknown, event: string): boolean {
  try {
    // Calculate payload size
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString, 'utf8');

    // Get size limit for this event type
    const limit = PAYLOAD_SIZE_LIMITS[event] || PAYLOAD_SIZE_LIMITS._default;

    if (size > limit) {
      console.warn(`[PAYLOAD] Rejected oversized payload for ${event}`, {
        event,
        size,
        limit,
        sizeKB: (size / 1024).toFixed(2),
        limitKB: (limit / 1024).toFixed(2),
      });
      return false;
    }

    return true;
  } catch (error) {
    // If we can't serialize the data, reject it
    console.error(`[PAYLOAD] Failed to serialize payload for ${event}:`, error);
    return false;
  }
}

/**
 * Validates payload structure exists and is an object
 * @param data - Payload to validate
 * @returns true if payload has valid structure
 */
export function validatePayloadStructure(data: unknown): boolean {
  // Check that data exists and is an object
  if (typeof data !== 'object' || data === null) {
    console.warn('[PAYLOAD] Invalid payload structure: not an object');
    return false;
  }

  return true;
}

/**
 * Comprehensive payload validation
 * Combines size and structure validation
 * @param data - Payload to validate
 * @param event - Event name
 * @returns true if payload is valid, false otherwise
 */
export function validatePayload(data: unknown, event: string): boolean {
  // First check structure
  if (!validatePayloadStructure(data)) {
    return false;
  }

  // Then check size
  if (!validatePayloadSize(data, event)) {
    return false;
  }

  return true;
}

/**
 * Get payload size limit for an event type
 * @param event - Event name
 * @returns Size limit in bytes
 */
export function getPayloadLimit(event: string): number {
  return PAYLOAD_SIZE_LIMITS[event] || PAYLOAD_SIZE_LIMITS._default;
}

/**
 * Export configured limits for reference
 */
export const CONFIGURED_PAYLOAD_LIMITS = PAYLOAD_SIZE_LIMITS;
