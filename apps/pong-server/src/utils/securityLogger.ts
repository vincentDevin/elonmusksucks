// apps/pong-server/src/utils/securityLogger.ts
// ══════════════════════════════════════════════════════════════════════════════
// Security Event Logging Utility
// ══════════════════════════════════════════════════════════════════════════════
// Centralized security event logging and pattern detection.
// Tracks suspicious activity and alerts on potential attacks.
// ══════════════════════════════════════════════════════════════════════════════

export type SecurityEventType =
  | 'auth_failed'
  | 'rate_limit'
  | 'invalid_payload'
  | 'payload_too_large'
  | 'invalid_input'
  | 'wager_validation_failed'
  | 'cors_violation'
  | 'suspicious_activity';

export interface SecurityEvent {
  type: SecurityEventType;
  socketId: string;
  playerId?: number;
  details: Record<string, any>;
  timestamp: number;
}

/**
 * Security Event Logger
 * Logs security events, detects patterns, and provides alerting
 */
export class SecurityLogger {
  private events: SecurityEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory

  /**
   * Log a security event
   * Automatically detects patterns and logs warnings
   */
  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to events list
    this.events.push(fullEvent);

    // Trim old events if we exceed max
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log to console with structured format
    const logData = {
      type: event.type,
      socketId: event.socketId,
      playerId: event.playerId,
      details: event.details,
      timestamp: new Date(fullEvent.timestamp).toISOString(),
    };

    console.warn(`[SECURITY:${event.type}]`, logData);

    // Check for attack patterns
    this.detectPatterns(fullEvent);
  }

  /**
   * Detect suspicious patterns in security events
   */
  private detectPatterns(event: SecurityEvent): void {
    const now = Date.now();
    const PATTERN_WINDOW = 60000; // Look at last 60 seconds

    // Get recent events from this socket
    const recentEvents = this.events.filter(
      (e) => e.socketId === event.socketId && now - e.timestamp < PATTERN_WINDOW,
    );

    // Pattern 1: Rapid repeated violations of same type
    const sameTypeEvents = recentEvents.filter((e) => e.type === event.type);
    if (sameTypeEvents.length >= 10) {
      console.error(
        `[SECURITY:ALERT] Socket ${event.socketId} has ${sameTypeEvents.length} ${event.type} events in last minute`,
      );
      this.logAlert('rapid_violations', event.socketId, {
        eventType: event.type,
        count: sameTypeEvents.length,
        window: PATTERN_WINDOW,
      });
    }

    // Pattern 2: Multiple different violation types (indicates probing/scanning)
    const uniqueTypes = new Set(recentEvents.map((e) => e.type));
    if (uniqueTypes.size >= 4) {
      console.error(
        `[SECURITY:ALERT] Socket ${event.socketId} has ${uniqueTypes.size} different violation types - possible probing`,
      );
      this.logAlert('multiple_violation_types', event.socketId, {
        types: Array.from(uniqueTypes),
        count: recentEvents.length,
      });
    }

    // Pattern 3: Failed authentication followed by other violations (indicates stolen token attempt)
    const hasAuthFailure = recentEvents.some((e) => e.type === 'auth_failed');
    const hasOtherViolations = recentEvents.some((e) => e.type !== 'auth_failed');
    if (hasAuthFailure && hasOtherViolations && recentEvents.length >= 5) {
      console.error(
        `[SECURITY:ALERT] Socket ${event.socketId} failed auth then had ${recentEvents.length} violations - possible stolen token`,
      );
      this.logAlert('auth_then_violations', event.socketId, {
        totalViolations: recentEvents.length,
      });
    }

    // Pattern 4: High frequency of events (more than 50 events per minute)
    if (recentEvents.length >= 50) {
      console.error(
        `[SECURITY:ALERT] Socket ${event.socketId} has ${recentEvents.length} violations in last minute - possible DoS attempt`,
      );
      this.logAlert('high_frequency_violations', event.socketId, {
        count: recentEvents.length,
        eventsPerSecond: (recentEvents.length / (PATTERN_WINDOW / 1000)).toFixed(2),
      });
    }
  }

  /**
   * Log a security alert (high-priority event)
   */
  private logAlert(alertType: string, socketId: string, details: Record<string, any>): void {
    const alert = {
      alertType,
      socketId,
      details,
      timestamp: new Date().toISOString(),
    };

    console.error(`[SECURITY:ALERT:${alertType.toUpperCase()}]`, alert);

    // In production, this could:
    // - Send to external monitoring service (Sentry, DataDog, etc.)
    // - Trigger automatic IP ban
    // - Send email/SMS alerts
    // - Write to separate alert log file
  }

  /**
   * Get recent security events
   * @param filter - Optional filter criteria
   * @param limit - Maximum number of events to return
   */
  getEvents(filter?: Partial<SecurityEvent>, limit: number = 100): SecurityEvent[] {
    let filtered = this.events;

    if (filter) {
      filtered = this.events.filter((event) => {
        return Object.entries(filter).every(([key, value]) => {
          return event[key as keyof SecurityEvent] === value;
        });
      });
    }

    // Return most recent events first
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get statistics about security events
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    uniqueSockets: number;
    recentEvents: number; // Last hour
    topOffenders: Array<{ socketId: string; count: number }>;
  } {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // Count events by type
    const eventsByType: Record<string, number> = {};
    for (const event of this.events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    // Count unique sockets
    const uniqueSockets = new Set(this.events.map((e) => e.socketId));

    // Count recent events
    const recentEvents = this.events.filter((e) => now - e.timestamp < ONE_HOUR).length;

    // Find top offenders
    const socketCounts = new Map<string, number>();
    for (const event of this.events) {
      socketCounts.set(event.socketId, (socketCounts.get(event.socketId) || 0) + 1);
    }
    const topOffenders = Array.from(socketCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([socketId, count]) => ({ socketId, count }));

    return {
      totalEvents: this.events.length,
      eventsByType,
      uniqueSockets: uniqueSockets.size,
      recentEvents,
      topOffenders,
    };
  }

  /**
   * Clear all logged events (useful for testing)
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Cleanup old events (call periodically)
   * Removes events older than specified age
   */
  cleanup(maxAge: number = 60 * 60 * 1000): void {
    const now = Date.now();
    const beforeCount = this.events.length;

    this.events = this.events.filter((event) => now - event.timestamp < maxAge);

    const removedCount = beforeCount - this.events.length;
    if (removedCount > 0) {
      console.log(`[SECURITY] Cleaned up ${removedCount} old security events`);
    }
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();
