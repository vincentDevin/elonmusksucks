// apps/server/src/workers/leaderboard.worker.ts
import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import {
  RefreshJobData,
  IncrementalUpdateData,
  BatchUserUpdateData,
  REDIS_CHANNELS,
} from '@ems/types';
import redisClient from '../lib/redis';

// Configurable concurrency to keep CPU saturation <70%
const REFRESH_CONCURRENCY = parseInt(process.env.WORKER_LEADERBOARD_REFRESH_CONCURRENCY || '1');
const EVENT_CONCURRENCY = parseInt(process.env.WORKER_LEADERBOARD_EVENT_CONCURRENCY || '3');
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';
import type { Job } from 'bullmq';
import type { LeaderboardMetrics } from '@ems/types';
import { metricsCollector } from '../lib/metrics';
import { eventBus } from '../lib/EventBus';

const repo = new LeaderboardRepository();

// Create queue instance for metrics collection
const leaderboardQueue = new Queue('leaderboard-refresh', { connection: redisClient });

// Note: Job data interfaces now imported from @ems/types

/**
 * Enhanced worker that handles different types of leaderboard updates
 */
const refreshWorker = new Worker(
  'leaderboard-refresh',
  async (job: Job<RefreshJobData>) => {
    const { trigger, batchData, config } = job.data;

    console.log('[leaderboard] Processing refresh job:', {
      trigger: trigger?.event,
      batchSize: batchData ? Object.keys(batchData).length : 0,
      scheduled: !!config,
    });

    const startTime = Date.now();

    // Update queue depth before processing
    const waiting = await leaderboardQueue.getWaiting();
    const oldestWaiting = waiting.length > 0 ? Date.now() - waiting[0].timestamp : 0;
    metricsCollector.updateQueueDepth('leaderboard-refresh', waiting.length, oldestWaiting);

    try {
      // Get previous rankings before refresh (for comparison)
      const previousTopAllTime = await repo.getTopAllTime(100);
      const previousRankings = new Map(
        previousTopAllTime.map((entry, index) => [entry.userId, index + 1]),
      );

      // Refresh materialized view
      await repo.refreshMaterializedView();

      // Fetch updated data with enhanced limits
      const topAllTime = await repo.getTopAllTime(50); // Increased from 25
      const topDaily = await repo.getTopDaily(50);

      // Check for ranking changes and trigger achievements
      const currentTopAllTime = await repo.getTopAllTime(100);
      for (let i = 0; i < currentTopAllTime.length; i++) {
        const entry = currentTopAllTime[i];
        const currentRank = i + 1;
        const previousRank = previousRankings.get(entry.userId) || 999;

        // If user's ranking changed (improved or declined)
        if (previousRank !== currentRank) {
          console.log(
            `[leaderboard] User ${entry.userId} rank changed from ${previousRank} to ${currentRank}`,
          );

          // Publish JSON rule achievement event for leaderboard rank update
          try {
            await eventBus.publish('leaderboard:rank:update', {
              key: 'leaderboard:rank:update',
              userId: entry.userId,
              occurredAt: new Date().toISOString(),
              idempotencyKey: `leaderboard:rank:${entry.userId}:${currentRank}:${Date.now()}`,
              payload: {
                rank: currentRank,
                previousRank,
                rankChange: previousRank - currentRank, // positive = improved, negative = declined
                isImprovement: previousRank > currentRank,
                profitAll: entry.profitAll,
                profitPeriod: entry.profitPeriod,
                winRate: entry.winRate,
                totalBets: entry.totalBets,
                balance: entry.balance,
                roi: entry.roi,
                currentStreak: entry.currentStreak,
                longestStreak: entry.longestStreak,
                // Include tier breakpoints for achievements
                isTopHundred: currentRank <= 100,
                isTopFifty: currentRank <= 50,
                isTopTwenty: currentRank <= 20,
                isTopTen: currentRank <= 10,
                isTopFive: currentRank <= 5,
                isTopThree: currentRank <= 3,
                isFirst: currentRank === 1,
              },
            });
          } catch (achievementError) {
            console.error(
              '[leaderboard] Error publishing rank update achievement event:',
              achievementError,
            );
            // Don't fail the leaderboard refresh if achievement event fails
          }
        }
      }

      // Publish to Redis channels
      await Promise.all([
        eventBus.publish(REDIS_CHANNELS.LEADERBOARD_ALL_TIME, topAllTime),
        eventBus.publish(REDIS_CHANNELS.LEADERBOARD_DAILY, topDaily),
      ]);

      const duration = Date.now() - startTime;
      console.log(`[leaderboard] Refresh completed in ${duration}ms`);

      // Store performance metrics
      await redisClient.setex(
        'leaderboard:last_refresh',
        3600,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          duration,
          trigger: trigger?.event || 'manual',
          entriesUpdated: Math.max(topAllTime.length, topDaily.length),
        }),
      );

      // Record successful job completion
      metricsCollector.recordJobComplete('leaderboard-refresh', true);
    } catch (error) {
      console.error('[leaderboard] Refresh failed:', error);
      // Record failed job completion
      metricsCollector.recordJobComplete('leaderboard-refresh', false);
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: REFRESH_CONCURRENCY,
  },
);

/**
 * Worker for handling incremental and batch updates
 */
const eventWorker = new Worker(
  'leaderboard-events',
  async (job: Job<IncrementalUpdateData | BatchUserUpdateData>) => {
    console.log(`[leaderboard] Processing event job: ${job.name}`);

    switch (job.name) {
      case 'incrementalUpdate':
        await handleIncrementalUpdate(job.data as IncrementalUpdateData);
        break;

      case 'batchUserUpdate':
        await handleBatchUserUpdate(job.data as BatchUserUpdateData);
        break;
    }
  },
  {
    connection: redisClient,
    concurrency: EVENT_CONCURRENCY, // Allow multiple incremental updates
  },
);

/**
 * Handle incremental update for a single user
 */
async function handleIncrementalUpdate(data: IncrementalUpdateData): Promise<void> {
  const { userId, metrics } = data;
  console.log(`[leaderboard] Incremental update for user ${userId}:`, metrics);

  // For now, we'll trigger a full refresh if the user is in top positions
  // In a future enhancement, we could implement true incremental updates

  // Check if user is in current top rankings
  const currentTop = await repo.getTopAllTime(100);
  const isTopUser = currentTop.some((entry) => entry.userId === userId);

  if (isTopUser) {
    console.log(`[leaderboard] User ${userId} is in top rankings, triggering refresh`);
    // We would trigger a refresh here, but to avoid circular dependencies,
    // we'll publish an event instead
    await eventBus.publish(REDIS_CHANNELS.LEADERBOARD_REFRESH_NEEDED, {
      reason: 'top_user_update',
      userId,
      metrics,
    });
  }
}

/**
 * Handle batch update for multiple user events
 */
async function handleBatchUserUpdate(data: BatchUserUpdateData): Promise<void> {
  const { userId, triggers } = data;
  console.log(`[leaderboard] Batch update for user ${userId} with ${triggers.length} events`);

  // Aggregate the effects of all triggers
  const aggregatedMetrics: Partial<LeaderboardMetrics> = {};

  for (const trigger of triggers) {
    // This would contain logic to calculate metric changes based on trigger type
    // For now, we'll just log the events
    console.log(`[leaderboard] Processing trigger: ${trigger.event} for user ${userId}`);
  }

  // Apply incremental update
  await handleIncrementalUpdate({
    userId,
    metrics: aggregatedMetrics,
    timestamp: data.timestamp,
  });
}

// Log configured concurrency on startup
console.log(
  `[leaderboard-worker] Configured concurrency - Refresh: ${REFRESH_CONCURRENCY}, Events: ${EVENT_CONCURRENCY}`,
);

// Event handlers
refreshWorker.on('completed', (job) => {
  console.log(`[leaderboard] Refresh job ${job.id} completed`);
});

refreshWorker.on('failed', (job, err) => {
  console.error(`[leaderboard] Refresh job ${job?.id} failed:`, err);
});

eventWorker.on('completed', (job) => {
  console.log(`[leaderboard] Event job ${job.name}:${job.id} completed`);
});

eventWorker.on('failed', (job, err) => {
  console.error(`[leaderboard] Event job ${job?.name}:${job?.id} failed:`, err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[leaderboard] Shutting down workers...');
  await Promise.all([refreshWorker.close(), eventWorker.close()]);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Export workers for external access if needed
export { refreshWorker, eventWorker };
