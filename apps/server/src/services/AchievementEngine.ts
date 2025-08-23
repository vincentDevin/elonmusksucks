import type { AchievementEvent } from '@ems/types';
import type { IAchievementRepository } from '../repositories/AchievementRepository';
import type { IActivityRepository } from '../repositories/IActivityRepository';
import { RuleEvaluator } from './RuleEvaluator';

// Socket emitter interface for dependency injection
export interface IAchievementSocketEmitter {
  emitUnlocked(
    userId: number,
    payload: {
      achievement: any;
      progress: number;
      progressMax: number;
      unlockedAt: string;
    },
  ): Promise<void>;
}

// Stats repository interface for user counters
export interface IStatsRepository {
  getUserCounters(userId: number): Promise<Record<string, number>>;
  updateUserCounters(userId: number, updates: Record<string, number>): Promise<void>;
}

export interface AchievementEngineHandleResult {
  eventsProcessed: number;
  achievementsUnlocked: number;
  rulesEvaluated: number;
  errors: string[];
}

/**
 * Core achievement engine that processes events and manages unlocks
 * Uses dependency injection for all external dependencies
 */
export class AchievementEngine {
  private rulesCache = new Map<string, any[]>();
  private lastCacheRefresh = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly ruleEvaluator = new RuleEvaluator();

  constructor(
    private readonly achievementRepo: IAchievementRepository,
    private readonly activityRepo: IActivityRepository,
    private readonly statsRepo: IStatsRepository,
    private readonly socketEmitter: IAchievementSocketEmitter,
  ) {}

  /**
   * Handle a single achievement event
   */
  async handle(event: AchievementEvent): Promise<AchievementEngineHandleResult> {
    const result: AchievementEngineHandleResult = {
      eventsProcessed: 0,
      achievementsUnlocked: 0,
      rulesEvaluated: 0,
      errors: [],
    };

    try {
      // Check idempotency first
      const alreadyProcessed = await this.achievementRepo.hasProcessedEvent(event.idempotencyKey);
      if (alreadyProcessed) {
        return result; // Already processed, skip
      }

      // Record event for idempotency
      const recorded = await this.achievementRepo.recordEventIdempotency(
        event.idempotencyKey,
        event.userId,
        event.key,
      );
      if (!recorded) {
        return result; // Race condition, another process handled it
      }

      result.eventsProcessed = 1;

      // Get relevant rules for this event
      await this.refreshRulesCache();
      const rules = this.rulesCache.get(event.key) || [];
      result.rulesEvaluated = rules.length;

      if (rules.length === 0) {
        return result; // No rules for this event type
      }

      // Load user counters for rule evaluation
      const userCounters = await this.statsRepo.getUserCounters(event.userId);

      // Evaluate each rule
      for (const rule of rules) {
        try {
          const unlocked = await this.evaluateRule(event, rule, userCounters);
          if (unlocked) {
            result.achievementsUnlocked++;
          }
        } catch (error) {
          result.errors.push(`Rule evaluation failed: ${error}`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Event processing failed: ${error}`);
      return result;
    }
  }

  /**
   * Batch handle multiple events (for backfill scenarios)
   */
  async handleBatch(events: AchievementEvent[]): Promise<AchievementEngineHandleResult> {
    const batchResult: AchievementEngineHandleResult = {
      eventsProcessed: 0,
      achievementsUnlocked: 0,
      rulesEvaluated: 0,
      errors: [],
    };

    for (const event of events) {
      const result = await this.handle(event);
      batchResult.eventsProcessed += result.eventsProcessed;
      batchResult.achievementsUnlocked += result.achievementsUnlocked;
      batchResult.rulesEvaluated += result.rulesEvaluated;
      batchResult.errors.push(...result.errors);
    }

    return batchResult;
  }

  /**
   * Refresh the in-memory rules cache
   */
  private async refreshRulesCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheRefresh < this.CACHE_TTL_MS) {
      return; // Cache still valid
    }

    try {
      this.rulesCache = await this.achievementRepo.findActiveRulesIndexedByEventKey();
      this.lastCacheRefresh = now;
    } catch (error) {
      console.error('Failed to refresh rules cache:', error);
      // Keep using stale cache rather than failing
    }
  }

  /**
   * Force cache refresh (for admin operations)
   */
  async invalidateCache(): Promise<void> {
    this.lastCacheRefresh = 0;
    await this.refreshRulesCache();
  }

  /**
   * Evaluate a single rule against an event
   */
  private async evaluateRule(
    event: AchievementEvent,
    rule: any,
    userCounters: Record<string, number>,
  ): Promise<boolean> {
    try {
      // Compile the rule
      const compiledRule = this.ruleEvaluator.compileRule(rule.rule);
      if (!compiledRule) {
        console.warn(`Invalid rule structure for achievement ${rule.achievementId}`);
        return false;
      }

      // Get current user achievement progress
      const userAchievements = await this.achievementRepo.findUserAchievementsByAchievementId(
        rule.achievementId,
        { where: { userId: event.userId } },
      );

      let currentProgress = 0;
      let userAchievementId: number | null = null;
      let isCompleted = false;

      if (userAchievements.length > 0) {
        const userAchievement = userAchievements[0];
        currentProgress = userAchievement.progress;
        userAchievementId = userAchievement.id;
        isCompleted = !!userAchievement.completedAt;
      }

      // Skip if already completed
      if (isCompleted) {
        return false;
      }

      // Evaluate the rule
      const evaluation = this.ruleEvaluator.evaluateRule(
        event,
        compiledRule,
        currentProgress,
        userCounters,
      );

      // Update progress if needed
      if (evaluation.newProgress !== currentProgress) {
        await this.updateUserAchievementProgress(
          event.userId,
          rule.achievementId,
          evaluation.newProgress,
          userAchievementId,
        );
      }

      // Handle achievement unlock
      if (evaluation.shouldUnlock && !isCompleted) {
        await this.unlockAchievement(
          event.userId,
          rule.achievementId,
          evaluation.newProgress,
          userAchievementId,
        );

        // Emit socket event for unlock
        const achievement = await this.achievementRepo.findById(rule.achievementId);
        if (achievement) {
          await this.socketEmitter.emitUnlocked(event.userId, {
            achievement: {
              id: achievement.id,
              name: achievement.name,
              slug: achievement.slug,
              description: achievement.description,
              category: achievement.category,
              targetValue: achievement.targetValue,
              iconName: achievement.iconName,
              badgeColor: achievement.badgeColor,
            },
            progress: evaluation.newProgress,
            progressMax: achievement.targetValue || evaluation.newProgress,
            unlockedAt: new Date().toISOString(),
          });
        }

        // Log activity
        await this.activityRepo.createActivity({
          userId: event.userId,
          type: 'achievement_unlocked',
          title: `Achievement Unlocked: ${rule.achievementName}`,
          description: `Unlocked achievement "${rule.achievementName}" by ${event.key}`,
          details: {
            achievementId: rule.achievementId,
            achievementName: rule.achievementName,
            eventKey: event.key,
            progress: evaluation.newProgress,
          },
          isPersonal: false,
          priority: 'high',
        });

        return true; // Achievement was unlocked
      }

      return false; // No unlock occurred
    } catch (error) {
      console.error(`Rule evaluation failed for achievement ${rule.achievementId}:`, error);
      return false;
    }
  }

  /**
   * Update or create user achievement progress
   */
  private async updateUserAchievementProgress(
    userId: number,
    achievementId: number,
    newProgress: number,
    existingId: number | null,
  ): Promise<void> {
    if (existingId) {
      // Update existing progress
      await this.achievementRepo.updateUserAchievement({
        where: { id: existingId },
        data: { progress: newProgress },
        create: {
          userId,
          achievementId,
          progress: newProgress,
        },
      });
    } else {
      // Create new progress record
      await this.achievementRepo.createUserAchievement({
        userId,
        achievementId,
        progress: newProgress,
      });
    }
  }

  /**
   * Mark achievement as completed/unlocked
   */
  private async unlockAchievement(
    userId: number,
    achievementId: number,
    finalProgress: number,
    existingId: number | null,
  ): Promise<void> {
    const completedAt = new Date();

    if (existingId) {
      // Update existing record with completion
      await this.achievementRepo.updateUserAchievement({
        where: { id: existingId },
        data: {
          progress: finalProgress,
          completedAt,
        },
        create: {
          userId,
          achievementId,
          progress: finalProgress,
          completedAt,
        },
      });
    } else {
      // Create new completed achievement
      await this.achievementRepo.createUserAchievement({
        userId,
        achievementId,
        progress: finalProgress,
        completedAt,
      });
    }
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    cacheSize: number;
    lastCacheRefresh: number;
    cacheAge: number;
  } {
    return {
      cacheSize: Array.from(this.rulesCache.values()).reduce(
        (total, rules) => total + rules.length,
        0,
      ),
      lastCacheRefresh: this.lastCacheRefresh,
      cacheAge: Date.now() - this.lastCacheRefresh,
    };
  }
}

// Factory function for easy DI setup
export function createAchievementEngine(
  achievementRepo: IAchievementRepository,
  activityRepo: IActivityRepository,
  statsRepo: IStatsRepository,
  socketEmitter: IAchievementSocketEmitter,
): AchievementEngine {
  return new AchievementEngine(achievementRepo, activityRepo, statsRepo, socketEmitter);
}
