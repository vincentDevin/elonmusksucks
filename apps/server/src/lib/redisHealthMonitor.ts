// apps/server/src/lib/redisHealthMonitor.ts
// -----------------------------------------------------------------------------
// Redis health monitoring system optimized for managed Redis (Upstash)
// Provides connection health, memory usage, and performance metrics
// -----------------------------------------------------------------------------

import redisClient from './redis';
import { eventBus as defaultEventBus } from './EventBus';
import type { IEventBus } from '@ems/types';

export interface RedisHealthMetrics {
  isConnected: boolean;
  responseTime: number;
  memoryUsage: {
    used: string;
    peak: string;
    fragmentation: number;
  };
  connectionStats: {
    connected: number;
    blocked: number;
    rejected: number;
  };
  commandStats: {
    totalCommands: number;
    opsPerSecond: number;
    slowLogCount: number;
  };
  keyspaceStats: {
    totalKeys: number;
    expiringKeys: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRatio: number;
  };
  poolStats?: {
    active: number;
    idle: number;
    total: number;
  };
  timestamp: string;
  uptime: number;
}

export class RedisHealthMonitor {
  private eventBus: IEventBus;
  private monitoringInterval?: NodeJS.Timeout;
  private lastMetrics?: RedisHealthMetrics;

  // Health thresholds for alerting
  private readonly HEALTH_THRESHOLDS = {
    maxResponseTime: 1000, // 1 second
    minHitRatio: 0.8, // 80% cache hit ratio
    maxMemoryUsage: 0.9, // 90% memory usage
    maxFragmentation: 2.0, // 2x fragmentation ratio
  };

  constructor(eventBus: IEventBus = defaultEventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs = 60000): void {
    // Default 1 minute
    if (this.monitoringInterval) {
      console.warn('[redis-health] Monitoring already started');
      return;
    }

    console.log(`[redis-health] Starting health monitoring (${intervalMs}ms interval)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        await this.checkHealthThresholds(metrics);
        this.lastMetrics = metrics;

        // Emit metrics for external monitoring
        await this.eventBus.publish('redis:health:metrics', metrics);
      } catch (error) {
        console.error('[redis-health] Error collecting metrics:', error);
        await this.eventBus.publish('redis:health:error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('[redis-health] Monitoring stopped');
    }
  }

  /**
   * Collect comprehensive Redis health metrics
   */
  async collectMetrics(): Promise<RedisHealthMetrics> {
    const startTime = Date.now();

    try {
      // Test connection and measure response time
      await redisClient.ping();
      const responseTime = Date.now() - startTime;

      // Get Redis info
      const [memoryInfo, statsInfo, keyspaceInfo, slowlogResult] = await Promise.all([
        redisClient.info('memory'),
        redisClient.info('stats'),
        redisClient.info('keyspace'),
        redisClient.call('SLOWLOG', 'LEN'),
      ]);

      // Parse memory info
      const memoryUsage = this.parseMemoryInfo(memoryInfo);

      // Parse connection and command stats
      const connectionStats = this.parseConnectionStats(statsInfo);
      const commandStats = this.parseCommandStats(statsInfo, Number(slowlogResult) || 0);

      // Parse keyspace stats
      const keyspaceStats = this.parseKeyspaceStats(keyspaceInfo, statsInfo);

      // Get pool stats if available (optional method)
      const poolStats = (this.eventBus as any).getPoolStats?.();

      return {
        isConnected: true,
        responseTime,
        memoryUsage,
        connectionStats,
        commandStats,
        keyspaceStats,
        poolStats,
        timestamp: new Date().toISOString(),
        uptime: this.parseUptime(statsInfo),
      };
    } catch (error) {
      console.error('[redis-health] Failed to collect metrics:', error);
      return {
        isConnected: false,
        responseTime: Date.now() - startTime,
        memoryUsage: { used: '0', peak: '0', fragmentation: 0 },
        connectionStats: { connected: 0, blocked: 0, rejected: 0 },
        commandStats: { totalCommands: 0, opsPerSecond: 0, slowLogCount: 0 },
        keyspaceStats: {
          totalKeys: 0,
          expiringKeys: 0,
          keyspaceHits: 0,
          keyspaceMisses: 0,
          hitRatio: 0,
        },
        timestamp: new Date().toISOString(),
        uptime: 0,
      };
    }
  }

  /**
   * Check metrics against health thresholds
   */
  private async checkHealthThresholds(metrics: RedisHealthMetrics): Promise<void> {
    const alerts: string[] = [];

    // Response time check
    if (metrics.responseTime > this.HEALTH_THRESHOLDS.maxResponseTime) {
      alerts.push(`High response time: ${metrics.responseTime}ms`);
    }

    // Hit ratio check
    if (metrics.keyspaceStats.hitRatio < this.HEALTH_THRESHOLDS.minHitRatio) {
      alerts.push(`Low cache hit ratio: ${(metrics.keyspaceStats.hitRatio * 100).toFixed(1)}%`);
    }

    // Memory fragmentation check
    if (metrics.memoryUsage.fragmentation > this.HEALTH_THRESHOLDS.maxFragmentation) {
      alerts.push(`High memory fragmentation: ${metrics.memoryUsage.fragmentation}x`);
    }

    // Emit alerts if any
    if (alerts.length > 0) {
      await this.eventBus.publish('redis:health:alert', {
        alerts,
        metrics,
        timestamp: new Date().toISOString(),
      });

      console.warn(`[redis-health] Health alerts: ${alerts.join(', ')}`);
    }
  }

  /**
   * Parse memory information from Redis info
   */
  private parseMemoryInfo(info: string) {
    const used = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || '0';
    const peak = info.match(/used_memory_peak_human:([^\r\n]+)/)?.[1] || '0';
    const fragmentation = parseFloat(info.match(/mem_fragmentation_ratio:([^\r\n]+)/)?.[1] || '1');

    return { used, peak, fragmentation };
  }

  /**
   * Parse connection statistics
   */
  private parseConnectionStats(info: string) {
    const connected = parseInt(info.match(/connected_clients:([^\r\n]+)/)?.[1] || '0');
    const blocked = parseInt(info.match(/blocked_clients:([^\r\n]+)/)?.[1] || '0');
    const rejected = parseInt(info.match(/rejected_connections:([^\r\n]+)/)?.[1] || '0');

    return { connected, blocked, rejected };
  }

  /**
   * Parse command statistics
   */
  private parseCommandStats(info: string, slowLogCount: number) {
    const totalCommands = parseInt(info.match(/total_commands_processed:([^\r\n]+)/)?.[1] || '0');
    const opsPerSecond = parseInt(info.match(/instantaneous_ops_per_sec:([^\r\n]+)/)?.[1] || '0');

    return { totalCommands, opsPerSecond, slowLogCount };
  }

  /**
   * Parse keyspace statistics
   */
  private parseKeyspaceStats(keyspaceInfo: string, statsInfo: string) {
    // Parse keyspace info (db0:keys=X,expires=Y,avg_ttl=Z)
    const db0Match = keyspaceInfo.match(/db0:keys=(\d+),expires=(\d+)/);
    const totalKeys = db0Match ? parseInt(db0Match[1]) : 0;
    const expiringKeys = db0Match ? parseInt(db0Match[2]) : 0;

    // Parse hit/miss stats
    const keyspaceHits = parseInt(statsInfo.match(/keyspace_hits:([^\r\n]+)/)?.[1] || '0');
    const keyspaceMisses = parseInt(statsInfo.match(/keyspace_misses:([^\r\n]+)/)?.[1] || '0');
    const hitRatio =
      keyspaceHits + keyspaceMisses > 0 ? keyspaceHits / (keyspaceHits + keyspaceMisses) : 0;

    return { totalKeys, expiringKeys, keyspaceHits, keyspaceMisses, hitRatio };
  }

  /**
   * Parse uptime from stats info
   */
  private parseUptime(info: string): number {
    return parseInt(info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1] || '0');
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const metrics = await this.collectMetrics();

      if (!metrics.isConnected) {
        return 'unhealthy';
      }

      // Check if any thresholds are exceeded
      const isSlowResponse = metrics.responseTime > this.HEALTH_THRESHOLDS.maxResponseTime;
      const isLowHitRatio = metrics.keyspaceStats.hitRatio < this.HEALTH_THRESHOLDS.minHitRatio;
      const isHighFragmentation =
        metrics.memoryUsage.fragmentation > this.HEALTH_THRESHOLDS.maxFragmentation;

      if (isSlowResponse || isHighFragmentation) {
        return 'degraded';
      }

      if (isLowHitRatio) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      console.error('[redis-health] Error checking health status:', error);
      return 'unhealthy';
    }
  }

  /**
   * Get the last collected metrics
   */
  getLastMetrics(): RedisHealthMetrics | undefined {
    return this.lastMetrics;
  }
}

// Export singleton instance
export const redisHealthMonitor = new RedisHealthMonitor();
