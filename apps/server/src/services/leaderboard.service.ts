// apps/server/src/services/leaderboard.service.ts
// -----------------------------------------------------------------------------
// Leaderboard Service - Drift Detection and Reconciliation
// -----------------------------------------------------------------------------

import type { ReconciliationResult, DriftDetail } from '@ems/types';

/**
 * Detect leaderboard drift by comparing expected vs actual rankings
 */
export async function detectLeaderboardDrift(repository: any): Promise<DriftDetail[]> {
  // Get current leaderboard from database
  const currentLeaderboard = await repository.getLeaderboard({ limit: 100 });

  // Sort by Elo rating to get expected order
  const expectedOrder = [...currentLeaderboard].sort((a: any, b: any) => b.eloRating - a.eloRating);

  const driftDetails: DriftDetail[] = [];

  // Check each user's position vs expected position
  currentLeaderboard.forEach((user: any, actualIndex: number) => {
    const expectedIndex = expectedOrder.findIndex((u: any) => u.userId === user.userId);
    if (expectedIndex !== actualIndex) {
      driftDetails.push({
        userId: user.userId,
        expectedRank: expectedIndex + 1,
        actualRank: actualIndex + 1,
        eloRating: user.eloRating,
      });
    }
  });

  return driftDetails;
}

/**
 * Reconcile leaderboard by fixing drift
 */
export async function reconcileLeaderboard(
  repository: any,
  dryRun: boolean = true,
): Promise<ReconciliationResult> {
  const driftDetails = await detectLeaderboardDrift(repository);

  let fixesApplied = 0;
  if (!dryRun && driftDetails.length > 0) {
    await repository.refreshLeaderboard();
    fixesApplied = driftDetails.length;
    console.log(`[leaderboard-reconcile] Applied ${fixesApplied} drift fixes`);
  }

  return {
    usersDrifted: driftDetails.length,
    driftDetails,
    fixesApplied,
    dryRun,
  };
}

import { Queue } from 'bullmq';
import { createQueueOptions } from '../lib/bullmqConfig';
import type { PublicLeaderboardEntry } from '@ems/types';
import type {
  ILeaderboardRepository,
  LeaderboardQuery,
  PaginatedLeaderboard,
  UserRank,
  LeaderboardStats,
} from '../repositories/interfaces/ILeaderboardRepository';
import type { LeaderboardTrigger, LeaderboardMetrics, ScheduleConfig } from '@ems/types';
import { QUEUE_NAMES } from '@ems/types';
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';

// TEMP: Re-export for backwards compatibility during migration
export type { LeaderboardTrigger, LeaderboardMetrics, ScheduleConfig } from '@ems/types';

// LeaderboardTrigger, LeaderboardMetrics, ScheduleConfig moved to @ems/types - see import above

/**
 * Enhanced leaderboard service with event-driven updates and intelligent scheduling
 */
export class LeaderboardService {
  private refreshQueue = new Queue(
    QUEUE_NAMES.LEADERBOARD_REFRESH,
    createQueueOptions('LEADERBOARD_REFRESH'),
  );
  private eventQueue = new Queue(
    QUEUE_NAMES.LEADERBOARD_EVENTS,
    createQueueOptions('LEADERBOARD_EVENTS'),
  );
  private repo: ILeaderboardRepository;
  private batchBuffer: Map<number, LeaderboardTrigger[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 5000; // 5 seconds

  constructor(repo: ILeaderboardRepository = new LeaderboardRepository()) {
    this.repo = repo;
    this.initializeScheduling();
  }

  /**
   * Initialize scheduled refresh jobs
   */
  private async initializeScheduling(): Promise<void> {
    // Default scheduled refresh every hour
    await this.scheduleRefresh('0 * * * *', 'UTC');
  }

  /**
   * Trigger leaderboard update based on event
   */
  async triggerUpdate(trigger: LeaderboardTrigger): Promise<void> {
    console.log(`[leaderboard] Triggered update:`, trigger);

    switch (trigger.priority) {
      case 'immediate':
        await this.enqueueRefresh({ trigger });
        break;

      case 'batched':
        await this.addToBatch(trigger);
        break;

      case 'scheduled':
        // Already handled by cron jobs
        break;
    }
  }

  /**
   * Schedule automatic refresh with cron expression
   */
  async scheduleRefresh(interval: string, timezone = 'UTC'): Promise<void> {
    const config: ScheduleConfig = { interval, timezone, enabled: true };

    await this.refreshQueue.add(
      'scheduledRefresh',
      { config },
      {
        repeat: { pattern: interval, tz: timezone },
      },
    );

    console.log(`[leaderboard] Scheduled refresh: ${interval} (${timezone})`);
  }

  /**
   * Perform incremental update for specific user
   */
  async incrementalUpdate(userId: number, metrics: Partial<LeaderboardMetrics>): Promise<void> {
    await this.eventQueue.add('incrementalUpdate', {
      userId,
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add trigger to batch for efficient processing
   */
  private async addToBatch(trigger: LeaderboardTrigger): Promise<void> {
    const userId = trigger.userId || 0; // Use 0 for global updates

    if (!this.batchBuffer.has(userId)) {
      this.batchBuffer.set(userId, []);
    }

    this.batchBuffer.get(userId)!.push(trigger);

    // Reset batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batched updates
   */
  private async processBatch(): Promise<void> {
    const batch = new Map(this.batchBuffer);
    this.batchBuffer.clear();
    this.batchTimeout = null;

    if (batch.size === 0) return;

    console.log(`[leaderboard] Processing batch with ${batch.size} user updates`);

    // If batch affects many users or global metrics, do full refresh
    const globalUpdates = batch.get(0) || [];
    const userUpdates = Array.from(batch.keys()).filter((id) => id > 0);

    if (globalUpdates.length > 0 || userUpdates.length > 10) {
      await this.enqueueRefresh({ batchData: Object.fromEntries(batch) });
    } else {
      // Process individual user updates
      for (const [userId, triggers] of batch) {
        if (userId > 0) {
          await this.eventQueue.add('batchUserUpdate', {
            userId,
            triggers,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * Enqueue a leaderboard refresh job
   */
  async enqueueRefresh(data: Record<string, any> = {}): Promise<void> {
    await this.refreshQueue.add('refreshAll', data);
  }

  /**
   * Synchronous fetch (from materialized view) by limit - Legacy method
   */
  async getTopAllTime(limit = 25): Promise<PublicLeaderboardEntry[]> {
    return this.repo.getTopAllTime(limit);
  }

  async getTopDaily(limit = 25): Promise<PublicLeaderboardEntry[]> {
    return this.repo.getTopDaily(limit);
  }

  /**
   * Enhanced methods with pagination and caching
   */
  async getTopAllTimePaginated(params: LeaderboardQuery): Promise<PaginatedLeaderboard> {
    return this.repo.getTopAllTimePaginated(params);
  }

  async getTopDailyPaginated(params: LeaderboardQuery): Promise<PaginatedLeaderboard> {
    return this.repo.getTopDailyPaginated(params);
  }

  /**
   * Get user's current ranking
   */
  async getUserRank(userId: number, period: 'allTime' | 'daily'): Promise<UserRank> {
    return this.repo.getUserRank(userId, period);
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats(): Promise<LeaderboardStats> {
    return this.repo.getLeaderboardStats();
  }
}

export const leaderboardService = new LeaderboardService();
