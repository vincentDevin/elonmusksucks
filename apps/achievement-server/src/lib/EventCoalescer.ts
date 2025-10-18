// apps/server/src/lib/EventCoalescer.ts
// -----------------------------------------------------------------------------
// Event coalescing utility to batch high-frequency events and reduce noise
// -----------------------------------------------------------------------------

import type { IEventBus, IEventCoalescer, CoalescedEvent, EventCoalescerConfig } from '@ems/types';

export class EventCoalescer implements IEventCoalescer {
  private events: Map<string, CoalescedEvent[]> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: EventCoalescerConfig;

  constructor(
    private eventBus: IEventBus,
    config: Partial<EventCoalescerConfig> = {},
  ) {
    this.config = {
      windowMs: config.windowMs || 2000, // 2 second batching window (default)
      maxBatchSize: config.maxBatchSize || 10, // Max 10 events per batch
      topicWindows: config.topicWindows || {}, // Per-topic windows
    };
  }

  async addEvent<T>(channel: string, payload: T, userId?: number): Promise<void> {
    const batchKey = this.getBatchKey(channel, userId);
    const event: CoalescedEvent<T> = {
      channel,
      payload,
      timestamp: new Date().toISOString(),
      userId,
    };

    // Initialize batch if needed
    if (!this.events.has(batchKey)) {
      this.events.set(batchKey, []);
    }

    const batch = this.events.get(batchKey)!;
    batch.push(event);

    // If batch is full, flush immediately
    if (batch.length >= this.config.maxBatchSize) {
      await this.flushBatch(batchKey);
      return;
    }

    // Reset timer for this batch
    const existingTimeout = this.timeouts.get(batchKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Use per-topic window if configured, otherwise default
    const windowMs = this.getWindowForChannel(channel);
    const timeout = setTimeout(() => {
      this.flushBatch(batchKey);
    }, windowMs);

    this.timeouts.set(batchKey, timeout);
  }

  async flush(): Promise<void> {
    const batchKeys = Array.from(this.events.keys());
    await Promise.all(batchKeys.map((key) => this.flushBatch(key)));
  }

  private async flushBatch(batchKey: string): Promise<void> {
    const batch = this.events.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear timeout
    const timeout = this.timeouts.get(batchKey);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(batchKey);
    }

    // Remove batch from memory
    this.events.delete(batchKey);

    // For stats updates, combine into single batched event
    if (batch[0].channel === 'user:stats_update' && batch.length > 1) {
      const latestEvent = batch[batch.length - 1];
      const batchedPayload =
        typeof latestEvent.payload === 'object' && latestEvent.payload !== null
          ? {
              ...(latestEvent.payload as object),
              batchCount: batch.length,
              batchedAt: new Date().toISOString(),
            }
          : {
              value: latestEvent.payload,
              batchCount: batch.length,
              batchedAt: new Date().toISOString(),
            };

      await this.eventBus.publish(batch[0].channel as any, batchedPayload);
    } else {
      // For other events or single events, emit individually
      for (const event of batch) {
        await this.eventBus.publish(event.channel as any, event.payload);
      }
    }
  }

  private getBatchKey(channel: string, userId?: number): string {
    return userId ? `${channel}:${userId}` : channel;
  }

  private getWindowForChannel(channel: string): number {
    // Check for per-topic override
    const topicWindow = this.config.topicWindows?.[channel];
    if (topicWindow !== undefined) {
      console.log(
        `[EventCoalescer] Using ${topicWindow}ms window for ${channel} (vs default ${this.config.windowMs}ms)`,
      );
      return topicWindow;
    }
    return this.config.windowMs;
  }
}
