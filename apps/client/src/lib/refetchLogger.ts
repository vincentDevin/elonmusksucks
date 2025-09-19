// apps/client/src/lib/refetchLogger.ts
// Refetch reason logging utility for debugging redundant API calls
// Helps identify when and why contexts are making API calls

interface RefetchLogEntry {
  context: string;
  endpoint: string;
  reason: string;
  timestamp: number;
  userId?: number;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

class RefetchLogger {
  private logs: RefetchLogEntry[] = [];
  private maxLogs = 100; // Keep last 100 refetch logs
  private isEnabled: boolean;

  constructor() {
    // Enable logging in development mode
    this.isEnabled =
      process.env.NODE_ENV === 'development' ||
      import.meta.env.DEV ||
      localStorage.getItem('refetch_logging') === 'true';
  }

  /**
   * Log a refetch event with reason and context
   */
  log(params: {
    context: string;
    endpoint: string;
    reason: string;
    userId?: number;
    metadata?: Record<string, any>;
    includeStack?: boolean;
  }) {
    if (!this.isEnabled) return;

    const entry: RefetchLogEntry = {
      context: params.context,
      endpoint: params.endpoint,
      reason: params.reason,
      timestamp: Date.now(),
      userId: params.userId,
      metadata: params.metadata,
    };

    // Optionally include stack trace for deep debugging
    if (params.includeStack) {
      entry.stackTrace = new Error().stack;
    }

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console log for immediate visibility
    console.group(`🔄 [REFETCH] ${params.context} → ${params.endpoint}`);
    console.log(`📋 Reason: ${params.reason}`);
    if (params.userId) {
      console.log(`👤 User ID: ${params.userId}`);
    }
    if (params.metadata) {
      console.log(`📊 Metadata:`, params.metadata);
    }
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    console.groupEnd();

    // Alert for suspicious patterns
    this.detectSuspiciousPatterns(params.context, params.endpoint);
  }

  /**
   * Detect potentially redundant refetch patterns
   */
  private detectSuspiciousPatterns(context: string, endpoint: string) {
    const recentLogs = this.logs.filter(
      (log) =>
        log.context === context && log.endpoint === endpoint && Date.now() - log.timestamp < 30000, // Last 30 seconds
    );

    if (recentLogs.length >= 3) {
      console.warn(
        `⚠️ [REFETCH WARNING] ${context} has called ${endpoint} ${recentLogs.length} times in 30s!`,
      );
      console.table(
        recentLogs.map((log) => ({
          reason: log.reason,
          time: new Date(log.timestamp).toLocaleTimeString(),
          metadata: JSON.stringify(log.metadata || {}),
        })),
      );
    }
  }

  /**
   * Get refetch statistics for analysis
   */
  getStats() {
    const contextStats = new Map<string, number>();
    const endpointStats = new Map<string, number>();
    const reasonStats = new Map<string, number>();

    this.logs.forEach((log) => {
      contextStats.set(log.context, (contextStats.get(log.context) || 0) + 1);
      endpointStats.set(log.endpoint, (endpointStats.get(log.endpoint) || 0) + 1);
      reasonStats.set(log.reason, (reasonStats.get(log.reason) || 0) + 1);
    });

    return {
      totalRefetches: this.logs.length,
      byContext: Object.fromEntries(contextStats),
      byEndpoint: Object.fromEntries(endpointStats),
      byReason: Object.fromEntries(reasonStats),
      recentLogs: this.logs.slice(-10), // Last 10 logs
    };
  }

  /**
   * Get all logs for a specific context
   */
  getLogsForContext(context: string): RefetchLogEntry[] {
    return this.logs.filter((log) => log.context === context);
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    console.log('🧹 [REFETCH] Cleared all refetch logs');
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('refetch_logging', enabled.toString());
    console.log(`🔄 [REFETCH] Logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Print summary statistics to console
   */
  printStats() {
    const stats = this.getStats();

    console.group('📊 Refetch Statistics');
    console.log(`Total refetches: ${stats.totalRefetches}`);

    console.log('\n📂 By Context:');
    console.table(stats.byContext);

    console.log('\n🔗 By Endpoint:');
    console.table(stats.byEndpoint);

    console.log('\n❓ By Reason:');
    console.table(stats.byReason);

    console.log('\n⏰ Recent Activity:');
    console.table(
      stats.recentLogs.map((log) => ({
        context: log.context,
        endpoint: log.endpoint.replace('/api/', ''),
        reason: log.reason,
        time: new Date(log.timestamp).toLocaleTimeString(),
      })),
    );

    console.groupEnd();
  }
}

// Global singleton instance
export const refetchLogger = new RefetchLogger();

// Convenience functions for common refetch reasons
export const RefetchReasons = {
  // User state changes
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CHANGE: 'user_change',

  // Navigation and lifecycle
  COMPONENT_MOUNT: 'component_mount',
  NAVIGATION: 'navigation',
  TAB_VISIBLE: 'tab_visible',
  HYDRATION_GUARD: 'hydration_guard',

  // Cache-related
  CACHE_MISS: 'cache_miss',
  CACHE_EXPIRED: 'cache_expired',
  CACHE_INVALIDATED: 'cache_invalidated',

  // Manual triggers
  MANUAL_REFRESH: 'manual_refresh',
  PULL_TO_REFRESH: 'pull_to_refresh',
  RETRY_ERROR: 'retry_error',

  // Real-time updates
  SOCKET_RECONNECT: 'socket_reconnect',
  SYNC_REQUIRED: 'sync_required',

  // Data dependencies
  DEPENDENCY_CHANGE: 'dependency_change',
  STALE_DATA: 'stale_data',
} as const;

// Add to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).refetchLogger = refetchLogger;
}
