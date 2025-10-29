// apps/server/src/lib/BackpressureQueue.ts
// -----------------------------------------------------------------------------
// Backpressure queue for handling heavy operations triggered by socket events
// -----------------------------------------------------------------------------

import type { IBackpressureQueue, BackpressureQueueConfig, QueuedOperation } from '@ems/types';

export class BackpressureQueue implements IBackpressureQueue {
  private config: BackpressureQueueConfig;
  private queue: QueuedOperation<any>[] = [];
  private running: Set<string> = new Set();
  private operationCounter = 0;

  constructor(config: Partial<BackpressureQueueConfig> = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency || 5,
      maxQueueSize: config.maxQueueSize || 100,
      timeoutMs: config.timeoutMs || 30000, // 30 seconds
      priorityLevels: config.priorityLevels || 3,
    };
  }

  async enqueue<T>(operation: () => Promise<T>, priority = 1): Promise<T> {
    // Normalize priority to valid range
    const normalizedPriority = Math.max(0, Math.min(priority, this.config.priorityLevels! - 1));

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue full (${this.config.maxQueueSize} operations)`);
    }

    return new Promise<T>((resolve, reject) => {
      const id = `op_${++this.operationCounter}_${Date.now()}`;
      const queuedOp: QueuedOperation<T> = {
        id,
        priority: normalizedPriority,
        operation,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add timeout
      queuedOp.timeoutId = setTimeout(() => {
        this.removeFromQueue(id);
        reject(new Error(`Operation timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      // Insert into priority queue (higher priority first, then FIFO)
      this.insertByPriority(queuedOp);

      // Try to process immediately
      this.processNext();
    });
  }

  private insertByPriority(operation: QueuedOperation<any>): void {
    // Find insertion point - higher priority first, then by timestamp (FIFO)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existing = this.queue[i];
      if (operation.priority > existing.priority) {
        insertIndex = i;
        break;
      } else if (
        operation.priority === existing.priority &&
        operation.timestamp < existing.timestamp
      ) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, operation);
  }

  private async processNext(): Promise<void> {
    // Check if we have capacity and work to do
    if (this.running.size >= this.config.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const operation = this.queue.shift()!;
    this.running.add(operation.id);

    // Clear timeout since we're processing
    if (operation.timeoutId) {
      clearTimeout(operation.timeoutId);
    }

    try {
      const result = await operation.operation();
      operation.resolve(result);
    } catch (error) {
      operation.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running.delete(operation.id);

      // Process next operation if available
      if (this.queue.length > 0 && this.running.size < this.config.maxConcurrency) {
        setImmediate(() => this.processNext());
      }
    }
  }

  private removeFromQueue(operationId: string): void {
    const index = this.queue.findIndex((op) => op.id === operationId);
    if (index > -1) {
      const operation = this.queue.splice(index, 1)[0];
      if (operation.timeoutId) {
        clearTimeout(operation.timeoutId);
      }
    }
  }

  getStats(): { queued: number; running: number; capacity: number } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      capacity: this.config.maxConcurrency,
    };
  }

  async drain(): Promise<void> {
    // Wait for all running operations to complete
    while (this.running.size > 0 || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Create queue instances for different operation types
export const betOperationQueue = new BackpressureQueue({
  maxConcurrency: 3, // Max 3 concurrent bet operations
  maxQueueSize: 50, // Queue up to 50 bet requests
  timeoutMs: 15000, // 15 second timeout for bets
});

export const moderationQueue = new BackpressureQueue({
  maxConcurrency: 2, // Max 2 concurrent moderation operations
  maxQueueSize: 20, // Queue up to 20 moderation actions
  timeoutMs: 10000, // 10 second timeout
});

export const generalQueue = new BackpressureQueue({
  maxConcurrency: 5, // Max 5 concurrent general operations
  maxQueueSize: 100, // Queue up to 100 general operations
  timeoutMs: 30000, // 30 second timeout
});
