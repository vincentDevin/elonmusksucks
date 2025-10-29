import type { AchievementEvent } from '@ems/types';
import type { IAchievementRepository } from '../../repositories/interfaces/IAchievementRepository';
import type { IActivityRepository } from '../../repositories/interfaces/IActivityRepository';
import type { IStatsRepository } from '../../repositories/interfaces/IStatsRepository';
import { RuleEvaluator } from './ruleEvaluator.service';

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

      //console.log(
      //  `[AchievementEngine] Processing ${event.key} for user ${event.userId}: ${rules.length} rules`,
      //);
      //console.log(`[AchievementEngine] Event payload:`, JSON.stringify(event.payload, null, 2));

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
            console.log(`[AchievementEngine] ✅ ${rule.achievementName} UNLOCKED`);
          }
        } catch (error) {
          console.error(`[AchievementEngine] ❌ Error evaluating ${rule.achievementName}:`, error);
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
      // Debug logging for Bot Breaker: Easy
      const isBotBreakerEasy = rule.achievementId === 292;
      if (isBotBreakerEasy) {
        //console.log(`[AchievementEngine] 🐛 DEBUG Bot Breaker: Easy rule evaluation`);
        //console.log(`[AchievementEngine] 🐛 Rule:`, JSON.stringify(rule.ruleData, null, 2));
      }

      // Compile the rule
      const compiledRule = this.ruleEvaluator.compileRule(rule.ruleData);
      if (!compiledRule) {
        //console.warn(`Invalid rule structure for achievement ${rule.achievementId}`);
        if (isBotBreakerEasy) {
          //console.log(`[AchievementEngine] 🐛 Bot Breaker: Easy rule compilation FAILED`);
        }
        return false;
      }

      if (isBotBreakerEasy) {
        //console.log(`[AchievementEngine] 🐛 Bot Breaker: Easy rule compiled successfully`);
        //console.log(`[AchievementEngine] 🐛 Compiled rule:`, JSON.stringify(compiledRule, null, 2));
      }

      // Get current user achievement progress
      const userAchievements = await this.achievementRepo.findUserAchievementsByAchievementId(
        rule.achievementId,
        { userId: event.userId },
      );

      let currentProgress = 0;
      let isCompleted = false;

      if (userAchievements.length > 0) {
        const userAchievement = userAchievements[0];
        currentProgress = userAchievement.progress;
        isCompleted = !!userAchievement.completedAt;
      }

      if (isBotBreakerEasy) {
        console.log(
          `[AchievementEngine] 🐛 Bot Breaker: Easy user progress: ${currentProgress}, completed: ${isCompleted}`,
        );
      }

      // Skip if already completed
      if (isCompleted) {
        if (isBotBreakerEasy) {
          //console.log(`[AchievementEngine] 🐛 Bot Breaker: Easy already completed, skipping`);
        }
        return false;
      }

      const evaluation = this.ruleEvaluator.evaluateRule(
        event,
        compiledRule,
        currentProgress,
        userCounters,
      );

      if (isBotBreakerEasy) {
        //console.log(
        //  `[AchievementEngine] 🐛 Bot Breaker: Easy evaluation result:`,
        //  JSON.stringify(evaluation, null, 2),
        //);
      }

      // Update progress if needed
      if (evaluation.newProgress !== currentProgress) {
        if (isBotBreakerEasy) {
          //console.log(
          //  `[AchievementEngine] 🐛 Bot Breaker: Easy updating progress: ${currentProgress} -> ${evaluation.newProgress}`,
          //);
        }
        await this.updateUserAchievementProgress(
          event.userId,
          rule.achievementId,
          evaluation.newProgress,
        );
      }

      // Handle achievement unlock
      if (evaluation.shouldUnlock && !isCompleted) {
        if (isBotBreakerEasy) {
          //console.log(`[AchievementEngine] 🐛 Bot Breaker: Easy UNLOCKING!`);
        }
        await this.unlockAchievement(event.userId, rule.achievementId, evaluation.newProgress);

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
              iconUrl: achievement.iconUrl,
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
      console.error(
        `[AchievementEngine] ❌ EXCEPTION in rule evaluation for achievement ${rule.achievementName}:`,
        error,
      );
      console.error(
        `[AchievementEngine] Exception stack:`,
        (error as Error)?.stack || 'No stack trace available',
      );
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
  ): Promise<void> {
    // Repository handles upsert internally
    await this.achievementRepo.updateUserAchievement({
      userId,
      achievementId,
      progress: newProgress,
    });
  }

  /**
   * Mark achievement as completed/unlocked
   */
  private async unlockAchievement(
    userId: number,
    achievementId: number,
    finalProgress: number,
  ): Promise<void> {
    const completedAt = new Date();

    // Repository handles upsert internally
    await this.achievementRepo.updateUserAchievement({
      userId,
      achievementId,
      progress: finalProgress,
      completedAt,
    });
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
