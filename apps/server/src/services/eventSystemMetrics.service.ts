// Event System Metrics Monitoring Service
// Provides comprehensive monitoring of Redis pub/sub events, Socket.IO connections, and event bus health

import { REDIS_CHANNELS } from '@ems/types';
import redisClient from '../lib/redis';
import { eventBus } from '../lib/EventBus';

interface EventMetric {
  channel: string;
  count: number;
  lastReceived: number;
  averageInterval: number;
  errors: number;
  processingTimes: number[];
  totalProcessingTime: number;
}

interface SystemHealthMetrics {
  // Event metrics
  totalEvents: number;
  totalErrors: number;
  avgProcessingTime: number;
  errorRate: number;

  // Redis metrics
  redisConnected: boolean;
  redisMemoryUsage?: string;
  redisConnectedClients?: number;

  // Socket.IO metrics (will be populated by socket server)
  socketConnections: number;
  activeRooms: string[];

  // Event Bus metrics
  eventBusPoolStats: {
    active: number;
    idle: number;
    total: number;
  };

  // System status
  uptime: number;
  lastUpdated: number;
}

export class EventSystemMetricsService {
  private eventMetrics: Map<string, EventMetric> = new Map();
  private systemStartTime: number = Date.now();
  private monitoringSubscriber?: any;
  private socketIO?: any;
  private isMonitoring: boolean = false;

  private readonly MAX_PROCESSING_TIMES = 100; // Keep last 100 processing times

  /**
   * Start monitoring all Redis events for admin oversight
   * Creates a dedicated Redis subscriber that listens to all channels
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[EventSystemMetrics] Already monitoring');
      return;
    }

    try {
      // Create dedicated subscriber for monitoring (doesn't interfere with main event handling)
      this.monitoringSubscriber = redisClient.duplicate();

      // Subscribe to ALL Redis channels for comprehensive monitoring
      const allChannels = Object.values(REDIS_CHANNELS);
      console.log(
        `[EventSystemMetrics] Subscribing to ${allChannels.length} Redis channels for monitoring`,
      );

      await this.monitoringSubscriber.subscribe(...allChannels);

      // Set up message handler to track all events
      this.monitoringSubscriber.on('message', (channel: string, message: string) => {
        this.trackEvent(channel, message);
      });

      this.isMonitoring = true;
      console.log('[EventSystemMetrics] Event monitoring started');
    } catch (error) {
      console.error('[EventSystemMetrics] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring and cleanup resources
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring || !this.monitoringSubscriber) {
      return;
    }

    try {
      await this.monitoringSubscriber.quit();
      this.monitoringSubscriber = undefined;
      this.isMonitoring = false;
      console.log('[EventSystemMetrics] Event monitoring stopped');
    } catch (error) {
      console.error('[EventSystemMetrics] Error stopping monitoring:', error);
    }
  }

  /**
   * Track individual event for metrics collection
   */
  private trackEvent(channel: string, message: string): void {
    const now = Date.now();
    const processingStart = performance.now();

    try {
      // Parse the message to ensure it's valid JSON
      JSON.parse(message);

      // Calculate processing time (minimal for monitoring)
      const processingTime = performance.now() - processingStart;

      // Get or create metric for this channel
      let metric = this.eventMetrics.get(channel);
      if (!metric) {
        metric = {
          channel,
          count: 0,
          lastReceived: now,
          averageInterval: 0,
          errors: 0,
          processingTimes: [],
          totalProcessingTime: 0,
        };
        this.eventMetrics.set(channel, metric);
      }

      // Update metrics
      const interval = metric.lastReceived ? now - metric.lastReceived : 0;
      metric.averageInterval =
        metric.count === 0
          ? interval
          : (metric.averageInterval * metric.count + interval) / (metric.count + 1);

      metric.count++;
      metric.lastReceived = now;
      metric.totalProcessingTime += processingTime;

      // Track processing times (keep last N)
      metric.processingTimes.push(processingTime);
      if (metric.processingTimes.length > this.MAX_PROCESSING_TIMES) {
        metric.processingTimes.shift();
      }
    } catch (error) {
      // Track parsing errors
      let metric = this.eventMetrics.get(channel);
      if (metric) {
        metric.errors++;
      }
      console.warn(`[EventSystemMetrics] Error tracking event on ${channel}:`, error);
    }
  }

  /**
   * Set Socket.IO instance for connection metrics
   */
  setSocketIO(io: any): void {
    this.socketIO = io;
  }

  /**
   * Get comprehensive system health metrics
   */
  async getSystemMetrics(): Promise<SystemHealthMetrics> {
    // Calculate aggregate event metrics
    const allMetrics = Array.from(this.eventMetrics.values());
    const totalEvents = allMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);
    const totalProcessingTime = allMetrics.reduce((sum, m) => sum + m.totalProcessingTime, 0);
    const avgProcessingTime = totalEvents > 0 ? totalProcessingTime / totalEvents : 0;
    const errorRate = totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;

    // Get Redis status and metrics
    let redisConnected = false;
    let redisMemoryUsage: string | undefined;
    let redisConnectedClients: number | undefined;

    try {
      await redisClient.ping();
      redisConnected = true;

      // Get Redis info
      const info = await redisClient.info('memory');
      const clientInfo = await redisClient.info('clients');

      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      if (memoryMatch) {
        redisMemoryUsage = memoryMatch[1].trim();
      }

      // Parse connected clients
      const clientsMatch = clientInfo.match(/connected_clients:(\d+)/);
      if (clientsMatch) {
        redisConnectedClients = parseInt(clientsMatch[1]);
      }
    } catch (error) {
      console.warn('[EventSystemMetrics] Redis health check failed:', error);
    }

    // Get Socket.IO metrics
    let socketConnections = 0;
    let activeRooms: string[] = [];

    if (this.socketIO) {
      try {
        socketConnections = this.socketIO.engine.clientsCount || 0;
        activeRooms = Array.from(this.socketIO.sockets.adapter.rooms.keys())
          .map((room) => String(room))
          .filter((room) => !this.socketIO.sockets.sockets.has(room)); // Filter out socket IDs
      } catch (error) {
        console.warn('[EventSystemMetrics] Socket.IO metrics error:', error);
      }
    }

    // Get Event Bus pool statistics
    const eventBusPoolStats = eventBus.getPoolStats();

    return {
      totalEvents,
      totalErrors,
      avgProcessingTime,
      errorRate,
      redisConnected,
      redisMemoryUsage,
      redisConnectedClients,
      socketConnections,
      activeRooms,
      eventBusPoolStats,
      uptime: Date.now() - this.systemStartTime,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get detailed metrics for specific events
   */
  getEventMetrics(): Map<string, EventMetric> {
    return new Map(this.eventMetrics);
  }

  /**
   * Get top events by frequency
   */
  getTopEventsByCount(limit: number = 10): EventMetric[] {
    return Array.from(this.eventMetrics.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get slowest events by average processing time
   */
  getSlowestEvents(limit: number = 5): EventMetric[] {
    return Array.from(this.eventMetrics.values())
      .filter((metric) => metric.processingTimes.length > 0)
      .map((metric) => ({
        ...metric,
        avgProcessingTime:
          metric.processingTimes.reduce((sum, time) => sum + time, 0) /
          metric.processingTimes.length,
      }))
      .sort((a: any, b: any) => b.avgProcessingTime - a.avgProcessingTime)
      .slice(0, limit);
  }

  /**
   * Get event frequency (events per second)
   */
  getEventFrequency(channel: string): number {
    const metric = this.eventMetrics.get(channel);
    if (!metric || metric.averageInterval === 0) return 0;
    return 1000 / metric.averageInterval;
  }

  /**
   * Reset all metrics (for admin reset functionality)
   */
  resetMetrics(): void {
    this.eventMetrics.clear();
    this.systemStartTime = Date.now();
    console.log('[EventSystemMetrics] All metrics reset');
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): { isMonitoring: boolean; channelCount: number; eventCount: number } {
    return {
      isMonitoring: this.isMonitoring,
      channelCount: Object.keys(REDIS_CHANNELS).length,
      eventCount: Array.from(this.eventMetrics.values()).reduce((sum, m) => sum + m.count, 0),
    };
  }

  /**
   * Health check - determines if the event system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const metrics = await this.getSystemMetrics();

    // Define health thresholds
    const maxErrorRate = 5; // 5% error rate
    const maxAvgProcessingTime = 100; // 100ms average processing time

    return (
      metrics.redisConnected &&
      metrics.errorRate < maxErrorRate &&
      metrics.avgProcessingTime < maxAvgProcessingTime
    );
  }
}

// Singleton instance for global use
export const eventSystemMetricsService = new EventSystemMetricsService();
