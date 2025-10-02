/**
 * Services Layer - Event Coalescer Interface
 *
 * Abstract interface for batching high-frequency events to reduce noise.
 * Prevents event flooding by combining multiple events within time windows.
 */

/**
 * Event Coalescer Configuration
 */
export interface EventCoalescerConfig {
  /**
   * Default batching window in milliseconds
   */
  windowMs: number;

  /**
   * Maximum events per batch
   */
  maxBatchSize: number;

  /**
   * Per-topic window overrides
   */
  topicWindows?: Record<string, number>;
}

/**
 * Coalesced Event
 */
export interface CoalescedEvent<T = unknown> {
  /**
   * Event channel
   */
  channel: string;

  /**
   * Event payload
   */
  payload: T;

  /**
   * Timestamp when event was created
   */
  timestamp: string;

  /**
   * Optional user ID for user-specific batching
   */
  userId?: number;
}

/**
 * Event Coalescer Interface
 *
 * Services depend on this interface for batching high-frequency events.
 * Implementation handles time windowing and batch publishing.
 */
export interface IEventCoalescer {
  /**
   * Add event to coalescing batch
   *
   * @param channel - Event channel
   * @param payload - Event payload
   * @param userId - Optional user ID for user-specific batching
   * @returns Promise that resolves when event is added
   */
  addEvent<T>(channel: string, payload: T, userId?: number): Promise<void>;

  /**
   * Flush all pending batches immediately
   *
   * @returns Promise that resolves when all batches are flushed
   */
  flush(): Promise<void>;
}

/**
 * Event Coalescer Factory
 *
 * Used for dependency injection in service constructors
 */
export type EventCoalescerFactory = () => IEventCoalescer;
