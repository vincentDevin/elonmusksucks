// apps/pong-server/src/middleware/socketRateLimiter.ts
// ══════════════════════════════════════════════════════════════════════════════
// Socket.IO Rate Limiting Middleware
// ══════════════════════════════════════════════════════════════════════════════
// Protects against DoS attacks by limiting the rate of socket events per client.
// Uses a sliding window algorithm to track requests over time.
// ══════════════════════════════════════════════════════════════════════════════

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
}

/**
 * Rate limit configuration for each socket event type
 * These limits are designed to allow normal gameplay while preventing abuse
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Game input - high limit for smooth gameplay (200 inputs/sec = ~3x normal max)
  player_input: { windowMs: 1000, maxRequests: 200 },

  // Match management - prevent lobby spam
  create_match: { windowMs: 60000, maxRequests: 5 }, // 5 matches per minute
  join_match: { windowMs: 10000, maxRequests: 10 }, // 10 joins per 10 seconds
  leave_match: { windowMs: 5000, maxRequests: 10 }, // 10 leaves per 5 seconds

  // Ready state - prevent rapid toggling
  player_ready: { windowMs: 5000, maxRequests: 20 }, // 20 toggles per 5 seconds

  // Spectator - prevent spectator hopping spam
  spectate_match: { windowMs: 10000, maxRequests: 10 }, // 10 spectate joins per 10 seconds

  // Lobby - prevent lobby state spam
  join_lobby: { windowMs: 5000, maxRequests: 20 }, // 20 lobby joins per 5 seconds

  // Authentication - prevent auth spam
  auth: { windowMs: 60000, maxRequests: 3 }, // 3 auth attempts per minute
};

/**
 * Socket.IO Rate Limiter
 * Tracks requests per socket and enforces rate limits
 */
export class SocketRateLimiter {
  private requests = new Map<string, number[]>(); // key -> array of timestamps
  private violations = new Map<string, number>(); // Track violation counts

  /**
   * Check if a socket event should be rate limited
   * @param socketId - Socket identifier
   * @param event - Event name
   * @returns true if request is allowed, false if rate limited
   */
  checkLimit(socketId: string, event: string): boolean {
    const config = RATE_LIMITS[event];
    if (!config) {
      // No rate limit configured for this event - allow it
      return true;
    }

    const key = `${socketId}:${event}`;
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the time window
    const validRequests = requests.filter((time) => now - time < config.windowMs);

    // Check if limit exceeded
    if (validRequests.length >= config.maxRequests) {
      // Rate limit exceeded
      this.logViolation(socketId, event, config);
      return false;
    }

    // Add current request timestamp
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Log rate limit violation
   */
  private logViolation(socketId: string, event: string, config: RateLimitConfig): void {
    const key = `${socketId}:${event}`;
    const violationCount = (this.violations.get(key) || 0) + 1;
    this.violations.set(key, violationCount);

    console.warn(`[RATE_LIMIT] Socket ${socketId} exceeded limit for ${event}`, {
      event,
      limit: config.maxRequests,
      windowMs: config.windowMs,
      violationCount,
    });

    // Check for persistent violators (more than 10 violations in short time)
    if (violationCount >= 10) {
      console.error(
        `[RATE_LIMIT:ALERT] Socket ${socketId} has ${violationCount} violations for ${event} - possible attack`,
      );
    }
  }

  /**
   * Reset rate limit data for a socket (call on disconnect)
   */
  resetSocket(socketId: string): void {
    // Remove all entries for this socket
    const keysToDelete: string[] = [];
    for (const key of this.requests.keys()) {
      if (key.startsWith(`${socketId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.requests.delete(key);
      this.violations.delete(key);
    }
  }

  /**
   * Get statistics about rate limiting
   */
  getStats(): {
    trackedSockets: number;
    totalViolations: number;
    topViolators: Array<{ key: string; count: number }>;
  } {
    const uniqueSockets = new Set<string>();
    for (const key of this.requests.keys()) {
      const socketId = key.split(':')[0];
      uniqueSockets.add(socketId);
    }

    let totalViolations = 0;
    for (const count of this.violations.values()) {
      totalViolations += count;
    }

    const topViolators = Array.from(this.violations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    return {
      trackedSockets: uniqueSockets.size,
      totalViolations,
      topViolators,
    };
  }

  /**
   * Cleanup old data (call periodically)
   * Removes entries for sockets that haven't made requests recently
   */
  cleanup(): void {
    const now = Date.now();
    const CLEANUP_AGE = 5 * 60 * 1000; // 5 minutes

    const keysToDelete: string[] = [];
    for (const [key, timestamps] of this.requests.entries()) {
      // If all timestamps are old, remove this entry
      const hasRecentRequest = timestamps.some((time) => now - time < CLEANUP_AGE);
      if (!hasRecentRequest) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.requests.delete(key);
      this.violations.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[RATE_LIMIT] Cleaned up ${keysToDelete.length} old entries`);
    }
  }
}

/**
 * Export configured rate limits for reference
 */
export const CONFIGURED_RATE_LIMITS = RATE_LIMITS;
