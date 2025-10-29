/**
 * Domain Layer - Activity Event Types
 *
 * Unified activity stream events, tracking, and aggregation
 */

// ============================================================================
// Activity Event Types
// ============================================================================

/**
 * Activity Event
 */
export interface ActivityEvent {
  id: string;
  userId: number;
  type: ActivityEventType;
  action: string;
  description: string;
  metadata: ActivityMetadata;
  visibility: ActivityVisibility;
  timestamp: Date;
}

// ActivityEventType is exported from shared/enums.ts - import it when needed
import type { ActivityEventType } from '../shared/enums';

/**
 * Activity Visibility
 */
export const ActivityVisibility = {
  PUBLIC: 'public', // Visible to everyone
  FOLLOWERS: 'followers', // Visible to followers only
  PRIVATE: 'private', // Visible to user only
} as const;

export type ActivityVisibility =
  (typeof ActivityVisibility)[keyof typeof ActivityVisibility];

// ============================================================================
// Activity Metadata
// ============================================================================

/**
 * Base Activity Metadata
 */
export interface ActivityMetadata {
  [key: string]: unknown;
}

/**
 * Bet Activity Metadata
 */
export interface BetActivityMetadata extends ActivityMetadata {
  predictionId: number;
  predictionTitle: string;
  optionLabel: string;
  wager: string; // BigInt as string
  odds: number;
  payout?: string; // BigInt as string (for won/lost bets)
  category: string;
}

/**
 * Parlay Activity Metadata
 */
export interface ParlayActivityMetadata extends ActivityMetadata {
  parlayId: number;
  legCount: number;
  wager: string; // BigInt as string
  combinedOdds: number;
  payout?: string; // BigInt as string (for won/lost parlays)
}

/**
 * Pong Activity Metadata
 */
export interface PongActivityMetadata extends ActivityMetadata {
  matchId: string;
  opponent?: {
    userId: number;
    name: string;
  };
  vsAI: boolean;
  aiDifficulty?: string;
  wager: number;
  score: string; // "11-7"
  eloChange?: number;
  newElo?: number;
  tier?: string;
}

/**
 * Achievement Activity Metadata
 */
export interface AchievementActivityMetadata extends ActivityMetadata {
  achievementId: string;
  achievementTitle: string;
  category: string;
  rarity: string;
}

/**
 * Social Activity Metadata
 */
export interface SocialActivityMetadata extends ActivityMetadata {
  targetId: number; // Content ID, User ID, etc.
  targetType: 'content' | 'user' | 'prediction' | 'article';
  contentPreview?: string;
}

/**
 * Rank Activity Metadata
 */
export interface RankActivityMetadata extends ActivityMetadata {
  oldRank: number;
  newRank: number;
  rankChange: number;
  percentile: number;
  category: 'allTime' | 'daily' | 'pong';
}

/**
 * Financial Activity Metadata
 */
export interface FinancialActivityMetadata extends ActivityMetadata {
  balance: string; // BigInt as string
  change: string; // BigInt as string
  milestone?: string; // e.g., "1000000"
}

// ============================================================================
// Activity Stream
// ============================================================================

/**
 * Activity Stream Entry
 */
export interface ActivityStreamEntry {
  event: ActivityEvent;
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  isLive: boolean;
  age: number; // milliseconds since event
}

/**
 * Activity Stream Filters
 */
export interface ActivityStreamFilters {
  userId?: number; // Filter to specific user
  types?: ActivityEventType[];
  visibility?: ActivityVisibility[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Activity Stream Options
 */
export interface ActivityStreamOptions {
  filters?: ActivityStreamFilters;
  sortBy?: 'timestamp:desc' | 'timestamp:asc';
  includeUser?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Activity Aggregation
// ============================================================================

/**
 * Activity Summary
 */
export interface ActivitySummary {
  userId: number;
  period: {
    start: Date;
    end: Date;
  };
  counts: {
    total: number;
    byType: Record<ActivityEventType, number>;
  };
  highlights: ActivityEvent[];
  streaks: {
    current: number;
    longest: number;
  };
}

/**
 * Activity Heatmap Data
 */
export interface ActivityHeatmapData {
  userId: number;
  period: 'daily' | 'weekly' | 'monthly';
  data: Array<{
    date: Date;
    count: number;
    types: Record<ActivityEventType, number>;
  }>;
}

/**
 * Activity Pattern
 */
export interface ActivityPattern {
  userId: number;
  pattern: 'morning' | 'afternoon' | 'evening' | 'night' | 'weekend' | 'weekday';
  frequency: number; // Events per period
  averageGap: number; // milliseconds between events
  peakHours: number[]; // Hours of day (0-23)
}

// ============================================================================
// Activity Notifications
// ============================================================================

/**
 * Activity Notification
 */
export interface ActivityNotification {
  id: string;
  userId: number; // Recipient
  activityEvent: ActivityEvent;
  type: ActivityNotificationType;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Activity Notification Types
 */
export const ActivityNotificationType = {
  FOLLOWER_ACTIVITY: 'follower_activity',
  MENTION: 'mention',
  REPLY: 'reply',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
  RANK_CHANGE: 'rank_change',
} as const;

export type ActivityNotificationType =
  (typeof ActivityNotificationType)[keyof typeof ActivityNotificationType];

// ============================================================================
// Activity Feed Settings
// ============================================================================

/**
 * Activity Feed Settings
 */
export interface ActivityFeedSettings {
  userId: number;
  visibility: ActivityVisibility; // Default visibility for user's activities
  enabledTypes: ActivityEventType[]; // Which types to show in feed
  notificationPreferences: {
    type: ActivityNotificationType;
    enabled: boolean;
  }[];
  muteList: number[]; // User IDs to mute
}
