/**
 * Services Layer - Event Bus Interface
 *
 * Abstract interface for event publishing/subscribing.
 * Prevents direct Redis client usage in service layer.
 */

import type { RedisChannel } from '../api/socket/events';

/**
 * Event Bus Interface
 *
 * Services depend on this interface instead of directly calling Redis.
 * Implementation handles Redis pub/sub details.
 */
export interface IEventBus {
  /**
   * Publish an event to a Redis channel
   *
   * @param channel - Redis channel name
   * @param payload - Event payload (will be JSON stringified)
   * @returns Promise that resolves when event is published
   */
  publish<T = unknown>(channel: RedisChannel, payload: T): Promise<void>;

  /**
   * Subscribe to a Redis channel (server-internal only)
   *
   * @param channel - Redis channel name
   * @param handler - Callback function to handle buffer payload
   * @returns Promise that resolves when subscription is established
   */
  subscribe(channel: RedisChannel, handler: (buffer: Buffer) => void): Promise<void>;

  /**
   * Unsubscribe from a Redis channel
   *
   * @param channel - Redis channel name
   * @returns Promise that resolves when unsubscribed
   */
  unsubscribe(channel: RedisChannel): Promise<void>;

  /**
   * Publish multiple events atomically (if supported by implementation)
   *
   * @param events - Array of channel/payload pairs
   * @returns Promise that resolves when all events are published
   */
  publishBatch<T = unknown>(
    events: Array<{ channel: RedisChannel; payload: T }>
  ): Promise<void>;
}

/**
 * Event Bus Factory
 *
 * Used for dependency injection in service constructors
 */
export type EventBusFactory = () => IEventBus;
