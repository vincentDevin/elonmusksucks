import type { Server as SocketServer } from 'socket.io';
import { AchievementSocketEvents } from '@ems/types';
import type { IAchievementSocketEmitter } from './AchievementEngine';

/**
 * Socket.IO implementation of the achievement emitter
 * Handles real-time achievement unlock notifications
 */
export class AchievementSocketEmitter implements IAchievementSocketEmitter {
  constructor(private readonly io: SocketServer) {}

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
      // Emit to user-specific room
      this.io.to(`user:${userId}`).emit(AchievementSocketEvents.UNLOCKED, {
        type: AchievementSocketEvents.UNLOCKED,
        userId,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      // Also emit to general achievement room for celebration effects
      this.io.to('achievements').emit(AchievementSocketEvents.CELEBRATION, {
        type: AchievementSocketEvents.CELEBRATION,
        userId,
        achievementName: payload.achievement.name,
        rarity: payload.achievement.rarity,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to emit achievement unlock:', error);
      // Don't throw - socket failures shouldn't break achievement processing
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
      this.io.to(`user:${userId}`).emit(AchievementSocketEvents.PROGRESS, {
        type: AchievementSocketEvents.PROGRESS,
        userId,
        timestamp: new Date().toISOString(),
        data: payload,
      });
    } catch (error) {
      console.error('Failed to emit achievement progress:', error);
    }
  }

  /**
   * Emit batch unlock (for backfill scenarios)
   */
  async emitBatchUnlock(userId: number, achievements: any[]): Promise<void> {
    try {
      if (achievements.length === 0) return;

      this.io.to(`user:${userId}`).emit(AchievementSocketEvents.BATCH_UNLOCKED, {
        type: AchievementSocketEvents.BATCH_UNLOCKED,
        userId,
        count: achievements.length,
        achievements,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to emit batch unlock:', error);
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
