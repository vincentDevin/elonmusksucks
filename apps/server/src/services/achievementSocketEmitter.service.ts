import { AchievementSocketEvents, REDIS_CHANNELS } from '@ems/types';
import type { IAchievementSocketEmitter } from './achievementEngine.service';
import { eventBus } from './eventBus.service';

/**
 * EventBus-based implementation of the achievement emitter
 * Uses unified event system instead of direct Socket.IO emissions
 */
export class AchievementSocketEmitter implements IAchievementSocketEmitter {
  constructor() {
    // Events now go through eventBus → Redis → redisEventHandlers.ts → Socket.IO
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
      // Publish through unified event system - redisEventHandlers.ts will handle Socket.IO emission
      await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, {
        type: AchievementSocketEvents.UNLOCKED,
        userId,
        timestamp: new Date().toISOString(),
        data: payload,
        achievementName: payload.achievement.name,
        rarity: payload.achievement.rarity,
      });
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
      // Note: Progress updates may need a dedicated REDIS_CHANNELS constant
      // For now using ACHIEVEMENT_UNLOCKED with type differentiation
      await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, {
        type: AchievementSocketEvents.PROGRESS,
        userId,
        timestamp: new Date().toISOString(),
        data: payload,
      });
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

      // Publish through unified event system - redisEventHandlers.ts will handle Socket.IO emission
      await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, {
        type: AchievementSocketEvents.BATCH_UNLOCKED,
        userId,
        count: achievements.length,
        achievements,
        timestamp: new Date().toISOString(),
      });
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
