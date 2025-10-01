/**
 * Workers Layer - Job Data Types
 *
 * Type definitions for all BullMQ job payloads
 */

import type { ModActionType } from '../domain/moderation';

// ============================================================================
// Payout Job Types
// ============================================================================

/**
 * Payout Job Data
 */
export interface PayoutJobData {
  betId: number;
  userId: number;
  predictionId: number;
  optionId: number;
  wager: string; // BigInt as string
  payout: string; // BigInt as string
  odds: number;
  isWin: boolean;
  processedAt?: Date;
}

/**
 * Batch Payout Job Data
 */
export interface BatchPayoutJobData {
  predictionId: number;
  winningOptionId: number;
  totalBets: number;
  totalPayout: string; // BigInt as string
  betIds: number[];
}

// ============================================================================
// Pong Payout Job Types
// ============================================================================

/**
 * Pong Payout Job Data
 */
export interface PongPayoutJobData {
  matchId: string;
  winnerId: number;
  loserId: number | null;
  wager: number;
  payout: string; // BigInt as string
  houseRake: string; // BigInt as string
  vsAI: boolean;
  aiDifficulty?: string;
  winnerScore: number;
  loserScore: number;
  duration: number;
  eloChange: number;
  newElo: number;
}

// ============================================================================
// Leaderboard Job Types
// ============================================================================

/**
 * Leaderboard Refresh Job Data
 */
export interface LeaderboardRefreshJobData {
  type: 'allTime' | 'daily' | 'weekly' | 'monthly' | 'pong';
  limit?: number;
  force?: boolean;
}

/**
 * User Rank Update Job Data
 */
export interface UserRankUpdateJobData {
  userId: number;
  category?: 'betting' | 'pong' | 'overall';
  trigger: 'bet_resolved' | 'pong_match' | 'manual';
}

// ============================================================================
// Feed Fetch Job Types
// ============================================================================

/**
 * Feed Fetch Job Data
 */
export interface FeedFetchJobData {
  feedId: number;
  url: string;
  type: 'RSS' | 'ATOM';
  lastFetchedAt?: Date;
  forceRefresh?: boolean;
}

/**
 * Batch Feed Fetch Job Data
 */
export interface BatchFeedFetchJobData {
  feedIds: number[];
  forceRefresh?: boolean;
}

/**
 * Article Processing Job Data
 */
export interface ArticleProcessingJobData {
  articleId: number;
  feedId: number;
  url: string;
  title: string;
  content?: string;
  publishedAt: Date;
  autoApprove?: boolean;
}

// ============================================================================
// Email Job Types
// ============================================================================

/**
 * Email Job Data
 */
export interface EmailJobData {
  to: string;
  subject: string;
  template: EmailTemplate;
  variables: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Email Templates
 */
export const EmailTemplate = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  BET_WON: 'bet-won',
  BET_LOST: 'bet-lost',
  PONG_MATCH_RESULT: 'pong-match-result',
  ACHIEVEMENT_UNLOCKED: 'achievement-unlocked',
  LEADERBOARD_POSITION: 'leaderboard-position',
  PREDICTION_RESOLVED: 'prediction-resolved',
  WEEKLY_SUMMARY: 'weekly-summary',
  MODERATION_ACTION: 'moderation-action',
} as const;

export type EmailTemplate = (typeof EmailTemplate)[keyof typeof EmailTemplate];

// ============================================================================
// Achievement Job Types
// ============================================================================

/**
 * Achievement Check Job Data
 */
export interface AchievementCheckJobData {
  userId: number;
  trigger: AchievementTrigger;
  context: Record<string, unknown>;
}

/**
 * Achievement Triggers
 */
export const AchievementTrigger = {
  BET_PLACED: 'bet_placed',
  BET_WON: 'bet_won',
  PREDICTION_CREATED: 'prediction_created',
  PONG_MATCH_WON: 'pong_match_won',
  STREAK_UPDATED: 'streak_updated',
  BALANCE_MILESTONE: 'balance_milestone',
  RANK_ACHIEVED: 'rank_achieved',
  SOCIAL_INTERACTION: 'social_interaction',
  MANUAL_CHECK: 'manual_check',
} as const;

export type AchievementTrigger =
  (typeof AchievementTrigger)[keyof typeof AchievementTrigger];

/**
 * Batch Achievement Check Job Data
 */
export interface BatchAchievementCheckJobData {
  userIds: number[];
  trigger: AchievementTrigger;
}

// ============================================================================
// User Stats Job Types
// ============================================================================

/**
 * User Stats Calculation Job Data
 */
export interface UserStatsCalculationJobData {
  userId: number;
  includeHistorical?: boolean;
  includePongStats?: boolean;
  trigger: 'bet_resolved' | 'pong_match' | 'daily_refresh' | 'manual';
}

/**
 * Batch Stats Calculation Job Data
 */
export interface BatchStatsCalculationJobData {
  userIds: number[];
  includeHistorical?: boolean;
}

/**
 * Stats Snapshot Job Data
 */
export interface StatsSnapshotJobData {
  userId?: number; // If null, snapshot all users
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// Notification Job Types
// ============================================================================

/**
 * Notification Job Data
 */
export interface NotificationJobData {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
  channels: NotificationChannel[];
}

/**
 * Notification Types
 */
export const NotificationType = {
  BET_WON: 'bet_won',
  BET_LOST: 'bet_lost',
  PONG_MATCH_RESULT: 'pong_match_result',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  RANK_CHANGE: 'rank_change',
  PREDICTION_RESOLVED: 'prediction_resolved',
  COMMENT_REPLY: 'comment_reply',
  MENTION: 'mention',
  FOLLOW: 'follow',
  MODERATION: 'moderation',
  SYSTEM: 'system',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Notification Channels
 */
export const NotificationChannel = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  SOCKET: 'socket',
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

/**
 * Batch Notification Job Data
 */
export interface BatchNotificationJobData {
  userIds: number[];
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Moderation Job Types
// ============================================================================

/**
 * Moderation Job Data
 */
export interface ModerationJobData {
  contentId: number;
  contentType: 'article' | 'content' | 'prediction' | 'message';
  action: ModActionType;
  moderatorId: number;
  reason?: string;
}

/**
 * Bulk Moderation Job Data
 */
export interface BulkModerationJobData {
  contentIds: number[];
  contentType: 'article' | 'content' | 'prediction' | 'message';
  action: ModActionType;
  moderatorId: number;
  reason?: string;
}

// ============================================================================
// Analytics Job Types
// ============================================================================

/**
 * Analytics Processing Job Data
 */
export interface AnalyticsProcessingJobData {
  type: AnalyticsType;
  startDate: Date;
  endDate: Date;
  userId?: number; // If null, process all users
  categoryId?: number;
}

/**
 * Analytics Types
 */
export const AnalyticsType = {
  USER_BEHAVIOR: 'user_behavior',
  BETTING_PATTERNS: 'betting_patterns',
  PREDICTION_TRENDS: 'prediction_trends',
  REVENUE_ANALYSIS: 'revenue_analysis',
  ENGAGEMENT_METRICS: 'engagement_metrics',
  RETENTION_ANALYSIS: 'retention_analysis',
} as const;

export type AnalyticsType = (typeof AnalyticsType)[keyof typeof AnalyticsType];

/**
 * Daily Analytics Job Data
 */
export interface DailyAnalyticsJobData {
  date: Date;
  includeUserStats?: boolean;
  includePredictionStats?: boolean;
  includeFinancialStats?: boolean;
}

// ============================================================================
// Cleanup Job Types
// ============================================================================

/**
 * Cleanup Job Data
 */
export interface CleanupJobData {
  type: CleanupType;
  olderThan?: Date;
  batchSize?: number;
}

/**
 * Cleanup Types
 */
export const CleanupType = {
  EXPIRED_SESSIONS: 'expired_sessions',
  OLD_LOGS: 'old_logs',
  COMPLETED_JOBS: 'completed_jobs',
  EXPIRED_TOKENS: 'expired_tokens',
  ORPHANED_FILES: 'orphaned_files',
  STALE_CACHE: 'stale_cache',
} as const;

export type CleanupType = (typeof CleanupType)[keyof typeof CleanupType];

/**
 * Database Maintenance Job Data
 */
export interface DatabaseMaintenanceJobData {
  operations: Array<'vacuum' | 'analyze' | 'reindex'>;
  tables?: string[];
}
