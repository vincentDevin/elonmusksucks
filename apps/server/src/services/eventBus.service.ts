import { IEventBus } from '@ems/types';
import redisClient from '../lib/redis';

/**
 * Redis-based event bus implementation for dependency injection
 * Centralizes all Redis publishing to prevent direct client coupling
 */
export class RedisEventBus implements IEventBus {
  async publish<T>(channel: string, payload: T): Promise<void> {
    await redisClient.publish(channel, JSON.stringify(payload));
  }

  /**
   * Subscribe to events (server-internal only, not exposed in IEventBus)
   */
  async subscribe(channel: string, handler: (buf: Buffer) => void): Promise<void> {
    const subscriber = redisClient.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        handler(Buffer.from(message));
      }
    });
  }
}

// Singleton instance for dependency injection
export const eventBus = new RedisEventBus();
