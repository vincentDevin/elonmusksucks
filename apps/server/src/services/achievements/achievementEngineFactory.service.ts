import { PrismaClient } from '@prisma/client';

import { AchievementEngine } from './achievementEngine.service';
import { AchievementSocketEmitter } from './achievementSocketEmitter.service';
import { AchievementRepository } from '../../repositories/AchievementRepository';
import { ActivityRepository } from '../../repositories/ActivityRepository';
import { StatsRepository } from '../../repositories/StatsRepository';
import type { IAchievementRepository } from '../../repositories/interfaces/IAchievementRepository';
import type { IActivityRepository } from '../../repositories/interfaces/IActivityRepository';
import type { IStatsRepository } from '../../repositories/interfaces/IStatsRepository';

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
      const achievementRepo: IAchievementRepository = new AchievementRepository(client);
      const activityRepo: IActivityRepository = new ActivityRepository();
      const statsRepo: IStatsRepository = new StatsRepository(client);

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
    achievementRepo: IAchievementRepository,
    activityRepo: IActivityRepository,
    statsRepo: IStatsRepository,
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
