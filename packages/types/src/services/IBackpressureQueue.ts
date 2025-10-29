/**
 * Services Layer - Backpressure Queue Interface
 *
 * Abstract interface for handling heavy operations with concurrency control.
 * Prevents system overload by limiting concurrent operations and queueing excess requests.
 */

/**
 * Backpressure Queue Configuration
 */
export interface BackpressureQueueConfig {
  /**
   * Maximum number of concurrent operations
   */
  maxConcurrency: number;

  /**
   * Maximum number of operations in queue
   */
  maxQueueSize: number;

  /**
   * Timeout in milliseconds for queued operations
   */
  timeoutMs: number;

  /**
   * Number of priority levels (0 = highest priority)
   */
  priorityLevels?: number;
}

/**
 * Queued Operation
 */
export interface QueuedOperation<T = unknown> {
  /**
   * Unique operation identifier
   */
  id: string;

  /**
   * Priority level (lower = higher priority)
   */
  priority: number;

  /**
   * The operation to execute
   */
  operation: () => Promise<T>;

  /**
   * Resolve callback
   */
  resolve: (value: T) => void;

  /**
   * Reject callback
   */
  reject: (error: Error) => void;

  /**
   * Timestamp when operation was queued
   */
  timestamp: number;

  /**
   * Timeout ID for cleanup
   */
  timeoutId?: NodeJS.Timeout;
}

/**
 * Backpressure Queue Interface
 *
 * Services depend on this interface for managing heavy operations.
 * Implementation handles concurrency control, priority queuing, and timeouts.
 */
export interface IBackpressureQueue {
  /**
   * Enqueue an operation with optional priority
   *
   * @param operation - Async operation to execute
   * @param priority - Priority level (0 = highest, default 1)
   * @returns Promise that resolves when operation completes
   * @throws Error if queue is full or operation times out
   */
  enqueue<T>(operation: () => Promise<T>, priority?: number): Promise<T>;

  /**
   * Get queue statistics
   *
   * @returns Current queue stats
   */
  getStats(): { queued: number; running: number; capacity: number };

  /**
   * Wait for all running operations to complete
   *
   * @returns Promise that resolves when queue is empty
   */
  drain(): Promise<void>;
}

/**
 * Backpressure Queue Factory
 *
 * Used for dependency injection in service constructors
 */
export type BackpressureQueueFactory = () => IBackpressureQueue;
