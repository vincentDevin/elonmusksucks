// apps/server/src/lib/EventBus.ts
import type { IEventBus, IRedisPool, RedisChannel } from '@ems/types';
import redisClient from './redis';
import { RedisPool } from './RedisPool';

/**
 * Redis-based event bus implementation with connection pooling
 * Provides dependency-injectable abstraction over Redis pub/sub
 */
export class EventBus implements IEventBus {
  private redisPool?: IRedisPool;
  private subscribers: Map<string, Set<(buffer: Buffer) => void>> = new Map();
  private subscriberClient = redisClient.duplicate();

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

    // Set up subscriber client message handling
    this.subscriberClient.on('messageBuffer', (channel, buffer) => {
      const channelStr = channel.toString();
      const handlers = this.subscribers.get(channelStr);
      if (handlers) {
        handlers.forEach((handler) => handler(buffer));
      }
    });
  }

  async publish<T>(channel: RedisChannel, payload: T): Promise<void> {
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

  async subscribe(channel: RedisChannel, handler: (buffer: Buffer) => void): Promise<void> {
    // Add handler to subscribers map
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
      // Subscribe to channel if this is the first handler
      await this.subscriberClient.subscribe(channel);
    }
    this.subscribers.get(channel)!.add(handler);
  }

  async unsubscribe(channel: RedisChannel): Promise<void> {
    // Remove all handlers for this channel
    this.subscribers.delete(channel);
    // Unsubscribe from Redis channel
    await this.subscriberClient.unsubscribe(channel);
  }

  async publishBatch<T>(events: Array<{ channel: RedisChannel; payload: T }>): Promise<void> {
    // Use pipeline for batch publishing
    if (this.redisPool) {
      const connection = await this.redisPool.getConnection();
      try {
        const pipeline = connection.pipeline();
        for (const event of events) {
          pipeline.publish(event.channel, JSON.stringify(event.payload));
        }
        await pipeline.exec();
      } finally {
        await this.redisPool.releaseConnection(connection);
      }
    } else {
      const pipeline = redisClient.pipeline();
      for (const event of events) {
        pipeline.publish(event.channel, JSON.stringify(event.payload));
      }
      await pipeline.exec();
    }
  }

  async destroy(): Promise<void> {
    // Clean up subscribers
    await this.subscriberClient.quit();
    this.subscribers.clear();

    // Destroy pool if exists
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

  async publish<T>(channel: RedisChannel, payload: T): Promise<void> {
    this.publishedEvents.push({
      channel,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  async subscribe(_channel: RedisChannel, _handler: (buffer: Buffer) => void): Promise<void> {
    // Mock implementation - no-op for testing
  }

  async unsubscribe(_channel: RedisChannel): Promise<void> {
    // Mock implementation - no-op for testing
  }

  async publishBatch<T>(events: Array<{ channel: RedisChannel; payload: T }>): Promise<void> {
    for (const event of events) {
      await this.publish(event.channel, event.payload);
    }
  }

  clear(): void {
    this.publishedEvents = [];
  }

  getEventsForChannel(channel: string) {
    return this.publishedEvents.filter((e) => e.channel === channel);
  }
}
