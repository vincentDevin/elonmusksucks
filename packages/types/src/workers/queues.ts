/**
 * Workers Layer - Queue Configuration Types
 *
 * Queue names, options, and configuration for BullMQ workers
 */

// ============================================================================
// Queue Names
// ============================================================================

/**
 * BullMQ Queue Names
 */
export const QUEUE_NAMES = {
  /**
   * Payout processing queue
   */
  PAYOUTS: 'payouts',

  /**
   * Pong match payout processing
   */
  PONG_PAYOUTS: 'pong-payouts',

  /**
   * Leaderboard refresh queue
   */
  LEADERBOARD_REFRESH: 'leaderboard-refresh',

  /**
   * Leaderboard event processing queue
   */
  LEADERBOARD_EVENTS: 'leaderboard-events',

  /**
   * Feed fetching queue
   */
  FEED_FETCH: 'feed-fetch',

  /**
   * Email sending queue
   */
  EMAIL: 'email',

  /**
   * Achievement processing queue
   */
  ACHIEVEMENTS: 'achievements',

  /**
   * User stats calculation queue
   */
  USER_STATS: 'user-stats',

  /**
   * Notification delivery queue
   */
  NOTIFICATIONS: 'notifications',

  /**
   * Content moderation queue
   */
  MODERATION: 'moderation',

  /**
   * Analytics processing queue
   */
  ANALYTICS: 'analytics',

  /**
   * Cleanup/maintenance queue
   */
  CLEANUP: 'cleanup',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ============================================================================
// Queue Options
// ============================================================================

/**
 * Base Queue Options
 */
export interface BaseQueueOptions {
  /**
   * Maximum number of retry attempts
   */
  attempts?: number;

  /**
   * Backoff strategy for retries
   */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number; // milliseconds
  };

  /**
   * Job timeout in milliseconds
   */
  timeout?: number;

  /**
   * Remove job on completion
   */
  removeOnComplete?: boolean | number;

  /**
   * Remove job on failure
   */
  removeOnFail?: boolean | number;

  /**
   * Job priority (lower number = higher priority)
   */
  priority?: number;

  /**
   * Job delay in milliseconds
   */
  delay?: number;
}

/**
 * Queue-Specific Options
 */
export const QueueOptions: Record<QueueName, BaseQueueOptions> = {
  [QUEUE_NAMES.PAYOUTS]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 30000,
    removeOnComplete: 100,
    removeOnFail: false,
    priority: 1, // High priority
  },

  [QUEUE_NAMES.PONG_PAYOUTS]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 30000,
    removeOnComplete: 100,
    removeOnFail: false,
    priority: 1, // High priority
  },

  [QUEUE_NAMES.LEADERBOARD_REFRESH]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    timeout: 120000, // 2 minutes
    removeOnComplete: 10,
    removeOnFail: false,
    priority: 5, // Medium priority
  },

  [QUEUE_NAMES.LEADERBOARD_EVENTS]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 2000 },
    timeout: 30000,
    removeOnComplete: 100,
    removeOnFail: false,
    priority: 6, // Medium priority
  },

  [QUEUE_NAMES.FEED_FETCH]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 60000, // 1 minute
    removeOnComplete: 50,
    removeOnFail: false,
    priority: 10, // Low priority
  },

  [QUEUE_NAMES.EMAIL]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 30000,
    removeOnComplete: 1000,
    removeOnFail: false,
    priority: 3, // High-medium priority
  },

  [QUEUE_NAMES.ACHIEVEMENTS]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 2000 },
    timeout: 15000,
    removeOnComplete: 100,
    removeOnFail: false,
    priority: 7, // Medium-low priority
  },

  [QUEUE_NAMES.USER_STATS]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 3000 },
    timeout: 30000,
    removeOnComplete: 50,
    removeOnFail: false,
    priority: 5, // Medium priority
  },

  [QUEUE_NAMES.NOTIFICATIONS]: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    timeout: 15000,
    removeOnComplete: 500,
    removeOnFail: false,
    priority: 4, // High-medium priority
  },

  [QUEUE_NAMES.MODERATION]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    timeout: 60000,
    removeOnComplete: 100,
    removeOnFail: false,
    priority: 8, // Low priority
  },

  [QUEUE_NAMES.ANALYTICS]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    timeout: 120000, // 2 minutes
    removeOnComplete: 10,
    removeOnFail: false,
    priority: 15, // Very low priority
  },

  [QUEUE_NAMES.CLEANUP]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 30000 },
    timeout: 300000, // 5 minutes
    removeOnComplete: 5,
    removeOnFail: false,
    priority: 20, // Lowest priority
  },
};

// ============================================================================
// Repeatable Job Options
// ============================================================================

/**
 * Repeatable Job Pattern
 */
export interface RepeatableJobPattern {
  /**
   * Cron expression for scheduling
   */
  cron?: string;

  /**
   * Timezone for cron
   */
  tz?: string;

  /**
   * Interval in milliseconds
   */
  every?: number;

  /**
   * Start date for the pattern
   */
  startDate?: Date | string | number;

  /**
   * End date for the pattern
   */
  endDate?: Date | string | number;

  /**
   * Maximum number of iterations
   */
  limit?: number;
}

/**
 * Common Repeatable Job Patterns
 */
export const RepeatablePatterns = {
  /**
   * Every minute
   */
  EVERY_MINUTE: { every: 60 * 1000 } as RepeatableJobPattern,

  /**
   * Every 5 minutes
   */
  EVERY_5_MINUTES: { every: 5 * 60 * 1000 } as RepeatableJobPattern,

  /**
   * Every 15 minutes
   */
  EVERY_15_MINUTES: { every: 15 * 60 * 1000 } as RepeatableJobPattern,

  /**
   * Every hour
   */
  EVERY_HOUR: { every: 60 * 60 * 1000 } as RepeatableJobPattern,

  /**
   * Daily at midnight UTC
   */
  DAILY_MIDNIGHT_UTC: { cron: '0 0 * * *', tz: 'UTC' } as RepeatableJobPattern,

  /**
   * Daily at 3 AM UTC
   */
  DAILY_3AM_UTC: { cron: '0 3 * * *', tz: 'UTC' } as RepeatableJobPattern,

  /**
   * Weekly on Sunday at midnight
   */
  WEEKLY_SUNDAY_MIDNIGHT: { cron: '0 0 * * 0', tz: 'UTC' } as RepeatableJobPattern,

  /**
   * Monthly on the 1st at midnight
   */
  MONTHLY_FIRST_MIDNIGHT: { cron: '0 0 1 * *', tz: 'UTC' } as RepeatableJobPattern,
} as const;

// ============================================================================
// Job Priority Levels
// ============================================================================

/**
 * Job Priority Constants
 */
export const JOB_PRIORITY = {
  CRITICAL: 1,
  HIGH: 3,
  NORMAL: 5,
  LOW: 10,
  BACKGROUND: 20,
} as const;

export type JobPriority = (typeof JOB_PRIORITY)[keyof typeof JOB_PRIORITY];
