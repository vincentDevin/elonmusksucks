import {
  AchievementSocketEvents,
  REDIS_CHANNELS,
  type IEventBus,
  type IEventCoalescer,
} from '@ems/types';
import type { IAchievementSocketEmitter } from './achievementEngine.service';
import { eventBus } from '../../lib/EventBus';
import { EventCoalescer } from '../../lib/EventCoalescer';

/**
 * EventBus-based implementation of the achievement emitter
 * Uses unified event system with coalescing for performance optimization
 */
export class AchievementSocketEmitter implements IAchievementSocketEmitter {
  private eventCoalescer: IEventCoalescer;
  private eventBus: IEventBus;

  constructor(eventBusParam?: IEventBus) {
    this.eventBus = eventBusParam || eventBus;

    // Configure coalescing for achievement events
    this.eventCoalescer = new EventCoalescer(this.eventBus, {
      windowMs: 1000, // 1s default window for achievements
      topicWindows: {
        // Achievement unlocks: immediate delivery (no coalescing) for celebration
        [REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED]: 100, // 100ms minimal batching for unlocks
        // Achievement progress: longer batching to reduce noise during active periods
        'achievement:progress': 2000, // 2s for progress updates
      },
    });
  }

  /**
   * Emit achievement unlock to specific user
   */
  async emitUnlocked(
    userId: number,
    payload: {
      achievement: any;
      progress: number;
      progressMax: number;
      unlockedAt: string;
    },
  ): Promise<void> {
    try {
      console.log(
        `[AchievementSocketEmitter] emitUnlocked called for user ${userId}, achievement: ${payload.achievement.name}`,
      );

      // Transform payload to match AchievementUnlockedPayload interface
      const transformedPayload = {
        userId,
        achievement: {
          id: String(payload.achievement.id),
          title: payload.achievement.name, // Map 'name' to 'title'
          description: payload.achievement.description,
          category: payload.achievement.category,
          iconUrl: payload.achievement.iconUrl,
        },
        progress: {
          previous: 0, // Previous progress not available in current payload
          current: payload.progress,
          target: payload.progressMax,
        },
        timestamp: payload.unlockedAt,
      };

      // Use coalescer with minimal batching (100ms) for achievement unlocks
      // This provides near-immediate delivery while allowing micro-batching
      await this.eventCoalescer.addEvent(
        REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
        transformedPayload,
        userId,
      );
    } catch (error) {
      console.error('Failed to publish achievement unlock event:', error);
      // Don't throw - event bus failures shouldn't break achievement processing
    }
  }

  /**
   * Emit achievement progress update (for incremental progress)
   */
  async emitProgress(
    userId: number,
    payload: {
      achievementId: number;
      progress: number;
      progressMax: number;
      achievementName: string;
    },
  ): Promise<void> {
    try {
      // Use coalescer with longer batching (2s) for progress updates
      // Progress updates are frequent and can be safely batched for better performance
      await this.eventCoalescer.addEvent(
        'achievement:progress',
        {
          type: AchievementSocketEvents.PROGRESS,
          userId,
          timestamp: new Date().toISOString(),
          data: payload,
        },
        userId,
      );
    } catch (error) {
      console.error('Failed to publish achievement progress event:', error);
    }
  }

  /**
   * Emit batch unlock (for backfill scenarios)
   */
  async emitBatchUnlock(userId: number, achievements: any[]): Promise<void> {
    try {
      if (achievements.length === 0) return;

      // Batch unlocks use minimal batching since they're typically rare events
      await this.eventCoalescer.addEvent(
        REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
        {
          type: AchievementSocketEvents.BATCH_UNLOCKED,
          userId,
          count: achievements.length,
          achievements,
          timestamp: new Date().toISOString(),
        },
        userId,
      );
    } catch (error) {
      console.error('Failed to publish batch unlock event:', error);
      // Don't throw - event bus failures shouldn't break achievement processing
    }
  }
}

/**
 * Mock implementation for testing
 */
export class MockAchievementSocketEmitter implements IAchievementSocketEmitter {
  public emittedEvents: Array<{
    type: 'unlocked' | 'progress' | 'batch';
    userId: number;
    payload: any;
    timestamp: string;
  }> = [];

  async emitUnlocked(userId: number, payload: any): Promise<void> {
    this.emittedEvents.push({
      type: 'unlocked',
      userId,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  async emitProgress(userId: number, payload: any): Promise<void> {
    this.emittedEvents.push({
      type: 'progress',
      userId,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  async emitBatchUnlock(userId: number, achievements: any[]): Promise<void> {
    this.emittedEvents.push({
      type: 'batch',
      userId,
      payload: { achievements, count: achievements.length },
      timestamp: new Date().toISOString(),
    });
  }

  clear(): void {
    this.emittedEvents = [];
  }

  getEventsForUser(userId: number) {
    return this.emittedEvents.filter((e) => e.userId === userId);
  }
}
