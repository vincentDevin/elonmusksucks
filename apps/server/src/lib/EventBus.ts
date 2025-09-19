// apps/server/src/lib/EventBus.ts
import type { IEventBus, IRedisPool } from '@ems/types';
import redisClient from './redis';
import { RedisPool } from './RedisPool';

/**
 * Redis-based event bus implementation with connection pooling
 * Provides dependency-injectable abstraction over Redis pub/sub
 */
export class EventBus implements IEventBus {
  private redisPool?: IRedisPool;

  constructor(usePooling = true) {
    // Enable pooling by default for production
    if (usePooling) {
      // Extract connection config from existing client for pooling
      const options = {
        host: redisClient.options.host,
        port: redisClient.options.port,
        password: redisClient.options.password,
        username: redisClient.options.username, // Support ACL usernames
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
        // Optimize for managed Redis (Upstash) with longer keepalive
        keepAlive: 30000, // 30 seconds
        connectTimeout: 10000, // 10 seconds
        lazyConnect: true, // Connect when first command is issued
      };
      this.redisPool = new RedisPool(options, {
        maxConnections: 8, // Optimized for Upstash connection limits
        minConnections: 2,
        acquireTimeoutMs: 10000, // Longer timeout for managed Redis
        idleTimeoutMs: 60000, // Keep connections alive longer
      });
    }
  }

  async publish<T>(channel: string, payload: T): Promise<void> {
    if (this.redisPool) {
      // Use pooled connection for high-frequency publishing
      const connection = await this.redisPool.getConnection();
      try {
        await connection.publish(channel, JSON.stringify(payload));
      } finally {
        await this.redisPool.releaseConnection(connection);
      }
    } else {
      // Use singleton client for normal operations
      await redisClient.publish(channel, JSON.stringify(payload));
    }
  }

  async destroy(): Promise<void> {
    if (this.redisPool) {
      await this.redisPool.destroy();
    }
  }

  getPoolStats() {
    return this.redisPool?.getStats() || { active: 0, idle: 0, total: 1 };
  }

  getPoolHealthStats() {
    return this.redisPool?.getHealthStats?.() || null;
  }
}

/**
 * Singleton event bus instance
 */
export const eventBus = new EventBus();

/**
 * Mock implementation for testing
 */
export class MockEventBus implements IEventBus {
  public publishedEvents: Array<{
    channel: string;
    payload: any;
    timestamp: string;
  }> = [];

  async publish<T>(channel: string, payload: T): Promise<void> {
    this.publishedEvents.push({
      channel,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  clear(): void {
    this.publishedEvents = [];
  }

  getEventsForChannel(channel: string) {
    return this.publishedEvents.filter((e) => e.channel === channel);
  }
}
