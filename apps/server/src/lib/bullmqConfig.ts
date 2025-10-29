/**
 * Centralized BullMQ Configuration with Job Retention Policies
 *
 * This configuration implements aggressive job retention to prevent Redis accumulation
 * while maintaining enough history for debugging and monitoring.
 */

import { QueueOptions, DefaultJobOptions } from 'bullmq';
import { QUEUE_NAMES } from '@ems/types';
import redisClient from './redis';

/**
 * Default job retention policies to prevent Redis accumulation
 * Based on Redis audit findings: 142 stale BullMQ jobs consuming unnecessary memory
 */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  removeOnComplete: 10, // Keep last 10 successful jobs (down from unlimited)
  removeOnFail: 5, // Keep last 5 failed jobs (down from unlimited)
  attempts: 3, // Retry failed jobs up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2s delay, exponential backoff
  },

  // Additional cleanup options
  delay: 0, // No delay by default
};

/**
 * Queue-specific configurations with tailored retention policies
 */
export const QUEUE_CONFIGURATIONS = {
  [QUEUE_NAMES.PAYOUTS]: {
    removeOnComplete: 20, // Keep more payout history for financial audit
    removeOnFail: 10, // Keep failed payouts for debugging
    attempts: 2, // Be conservative with payout retries
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // Longer delay for financial operations
    },
  },

  [QUEUE_NAMES.PONG_PAYOUTS]: {
    removeOnComplete: 5, // Pong payouts are less critical
    removeOnFail: 3, // Fewer failed job records needed
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },

  [QUEUE_NAMES.LEADERBOARD_REFRESH]: {
    removeOnComplete: 5, // Keep few refresh records
    removeOnFail: 3,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },

  [QUEUE_NAMES.LEADERBOARD_EVENTS]: {
    removeOnComplete: 3, // Frequent events, minimal retention
    removeOnFail: 2,
    attempts: 2,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },

  [QUEUE_NAMES.FEED_FETCH]: {
    removeOnComplete: 10, // Keep feed processing history
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 3000,
    },
  },
} as const;

/**
 * Create standardized queue options with retention policies
 */
export function createQueueOptions(
  queueName: keyof typeof QUEUE_NAMES,
  overrides?: Partial<DefaultJobOptions>,
): QueueOptions {
  const queueValue = QUEUE_NAMES[queueName];
  const queueSpecificOptions =
    QUEUE_CONFIGURATIONS[queueValue as keyof typeof QUEUE_CONFIGURATIONS];

  return {
    connection: redisClient,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      ...queueSpecificOptions,
      ...overrides,
    },
  };
}

/**
 * Create standardized worker options
 */
export function createWorkerOptions(_queueName: keyof typeof QUEUE_NAMES, concurrency?: number) {
  return {
    connection: redisClient,
    concurrency: concurrency || 1,
  };
}

/**
 * Queue health monitoring configuration
 */
export const QUEUE_HEALTH_THRESHOLDS = {
  // Maximum number of jobs in waiting state before alerting
  MAX_WAITING_JOBS: {
    [QUEUE_NAMES.PAYOUTS]: 50, // Financial operations are critical
    [QUEUE_NAMES.PONG_PAYOUTS]: 100, // Gaming can handle more backlog
    [QUEUE_NAMES.LEADERBOARD_REFRESH]: 5, // Should process quickly
    [QUEUE_NAMES.LEADERBOARD_EVENTS]: 20,
    [QUEUE_NAMES.FEED_FETCH]: 30,
  },

  // Maximum age of oldest waiting job (in milliseconds)
  MAX_JOB_AGE: {
    [QUEUE_NAMES.PAYOUTS]: 5 * 60 * 1000, // 5 minutes
    [QUEUE_NAMES.PONG_PAYOUTS]: 10 * 60 * 1000, // 10 minutes
    [QUEUE_NAMES.LEADERBOARD_REFRESH]: 15 * 60 * 1000, // 15 minutes
    [QUEUE_NAMES.LEADERBOARD_EVENTS]: 30 * 60 * 1000, // 30 minutes
    [QUEUE_NAMES.FEED_FETCH]: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Utility function to clean up existing accumulated jobs
 * This should be run once during deployment to clean up the current 142 stale jobs
 */
export async function cleanupStaleJobs(
  queueName: string,
): Promise<{ cleaned: number; errors: number }> {
  try {
    const { Queue } = await import('bullmq');
    const queue = new Queue(queueName, { connection: redisClient });

    // Clean completed jobs beyond retention limit
    const completed = await queue.getJobs(['completed'], 0, -1);
    const retentionLimit =
      QUEUE_CONFIGURATIONS[queueName as keyof typeof QUEUE_CONFIGURATIONS]?.removeOnComplete ||
      DEFAULT_JOB_OPTIONS.removeOnComplete!;

    let cleaned = 0;
    let errors = 0;

    // Remove jobs beyond retention limit
    if (completed.length > retentionLimit) {
      const jobsToRemove = completed.slice(retentionLimit);

      for (const job of jobsToRemove) {
        try {
          await job.remove();
          cleaned++;
        } catch (error) {
          console.error(`[BullMQ Cleanup] Failed to remove job ${job.id}:`, error);
          errors++;
        }
      }
    }

    // Clean failed jobs beyond retention limit
    const failed = await queue.getJobs(['failed'], 0, -1);
    const failedRetentionLimit =
      QUEUE_CONFIGURATIONS[queueName as keyof typeof QUEUE_CONFIGURATIONS]?.removeOnFail ||
      DEFAULT_JOB_OPTIONS.removeOnFail!;

    if (failed.length > failedRetentionLimit) {
      const jobsToRemove = failed.slice(failedRetentionLimit);

      for (const job of jobsToRemove) {
        try {
          await job.remove();
          cleaned++;
        } catch (error) {
          console.error(`[BullMQ Cleanup] Failed to remove failed job ${job.id}:`, error);
          errors++;
        }
      }
    }

    console.log(`[BullMQ Cleanup] Queue ${queueName}: Cleaned ${cleaned} jobs, ${errors} errors`);
    return { cleaned, errors };
  } catch (error) {
    console.error(`[BullMQ Cleanup] Failed to cleanup queue ${queueName}:`, error);
    return { cleaned: 0, errors: 1 };
  }
}

/**
 * Run cleanup for all queues
 */
export async function cleanupAllQueues(): Promise<void> {
  console.log('[BullMQ Cleanup] Starting cleanup of all queues...');

  let totalCleaned = 0;
  let totalErrors = 0;

  for (const queueName of Object.values(QUEUE_NAMES)) {
    const result = await cleanupStaleJobs(queueName);
    totalCleaned += result.cleaned;
    totalErrors += result.errors;
  }

  console.log(`[BullMQ Cleanup] Completed: ${totalCleaned} jobs cleaned, ${totalErrors} errors`);

  // Log memory impact
  const estimatedMemorySaved = totalCleaned * 1024; // Rough estimate: 1KB per job
  console.log(
    `[BullMQ Cleanup] Estimated memory saved: ${(estimatedMemorySaved / 1024).toFixed(1)}KB`,
  );
}
