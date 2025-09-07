import { PrismaClient } from '@prisma/client';

import { AchievementEngine } from './achievementEngine.service';
import { AchievementSocketEmitter } from './achievementSocketEmitter.service';
import { AchievementRepository } from '../repositories/AchievementRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { StatsRepository } from '../repositories/StatsRepository';

/**
 * Factory for creating properly wired AchievementEngine instances
 * Handles dependency injection and configuration
 */
export class AchievementEngineFactory {
  private static instance: AchievementEngine | null = null;

  /**
   * Create or get singleton AchievementEngine instance
   */
  static create(prisma?: PrismaClient): AchievementEngine {
    if (!this.instance) {
      const client = prisma || new PrismaClient();

      // Create repositories
      const achievementRepo = new AchievementRepository(client);
      const activityRepo = new ActivityRepository();
      const statsRepo = new StatsRepository(client);

      // Create socket emitter
      const socketEmitter = new AchievementSocketEmitter();

      // Wire everything together
      this.instance = new AchievementEngine(
        achievementRepo,
        activityRepo,
        statsRepo,
        socketEmitter,
      );
    }

    return this.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Create engine for testing with mocks
   */
  static createForTesting(
    achievementRepo: any,
    activityRepo: any,
    statsRepo: any,
    socketEmitter: any,
  ): AchievementEngine {
    return new AchievementEngine(achievementRepo, activityRepo, statsRepo, socketEmitter);
  }
}

/**
 * Convenience function for getting the engine instance
 */
export function getAchievementEngine(): AchievementEngine {
  return AchievementEngineFactory.create();
}
