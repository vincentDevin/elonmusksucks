/**
 * Shared Enums and Constants
 *
 * Type-safe enums using const objects (preferred over TypeScript enums)
 */

// ============================================================================
// Prediction Types
// ============================================================================

export const PredictionType = {
  MULTIPLE: 'MULTIPLE',
  BINARY: 'BINARY',
  OVER_UNDER: 'OVER_UNDER',
} as const;

export type PredictionType = (typeof PredictionType)[keyof typeof PredictionType];

export const PredictionStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;

export type PredictionStatus = (typeof PredictionStatus)[keyof typeof PredictionStatus];

// ============================================================================
// Content and Social Types
// ============================================================================

export const PostContentTypes = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  LINK: 'LINK',
  PREDICTION_SHARE: 'PREDICTION_SHARE',
  POLL: 'POLL',
} as const;

export type PostContentType = (typeof PostContentTypes)[keyof typeof PostContentTypes];

export const PostVisibilities = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  FOLLOWERS: 'FOLLOWERS',
  MENTIONED_ONLY: 'MENTIONED_ONLY',
} as const;

export type PostVisibility = (typeof PostVisibilities)[keyof typeof PostVisibilities];

export const ReactionTypes = {
  LIKE: 'LIKE',
  LOVE: 'LOVE',
  LAUGH: 'LAUGH',
  WOW: 'WOW',
  SAD: 'SAD',
  ANGRY: 'ANGRY',
} as const;

export type ReactionTypeName = (typeof ReactionTypes)[keyof typeof ReactionTypes];

// ============================================================================
// Moderation Types
// ============================================================================

export const ReportReasons = {
  SPAM: 'SPAM',
  HARASSMENT: 'HARASSMENT',
  HATE_SPEECH: 'HATE_SPEECH',
  MISINFORMATION: 'MISINFORMATION',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  COPYRIGHT: 'COPYRIGHT',
  OTHER: 'OTHER',
} as const;

export type ReportReason = (typeof ReportReasons)[keyof typeof ReportReasons];

export const ReportStatuses = {
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  ACTIONED: 'ACTIONED',
  DISMISSED: 'DISMISSED',
} as const;

export type ReportStatus = (typeof ReportStatuses)[keyof typeof ReportStatuses];

// ============================================================================
// Ban Types - Moved to domain/moderation.ts for comprehensive types
// ============================================================================

// ============================================================================
// Feed Types
// ============================================================================

export const FeedStatuses = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ERROR: 'ERROR',
} as const;

export type FeedStatus = (typeof FeedStatuses)[keyof typeof FeedStatuses];

// ============================================================================
// Activity Event Types
// ============================================================================

export const ActivityEventType = {
  BET_PLACED: 'bet_placed',
  PARLAY_STARTED: 'parlay_started',
  PREDICTION_CREATED: 'prediction_created',
  PREDICTION_RESOLVED: 'prediction_resolved',
  POST_CREATED: 'post_created',
  COMMENT_CREATED: 'comment_created',
  BADGE_EARNED: 'badge_earned',
  BIG_WIN: 'big_win',
  LEADERBOARD_UPDATE: 'leaderboard_update',
  USER_MENTIONED: 'user_mentioned',
  LIVE_BET: 'live_bet',
  LIVE_PARLAY: 'live_parlay',
  MARKET_MOVEMENT: 'market_movement',
  BIG_BET_ALERT: 'big_bet_alert',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  USER_FOLLOWED: 'user_followed',
  PONG_TIER_PROMOTION: 'pong_tier_promotion',
  PONG_IMPOSSIBLE_VICTORY: 'pong_impossible_victory',
} as const;

export type ActivityEventType = (typeof ActivityEventType)[keyof typeof ActivityEventType];

export const ActivityPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type ActivityPriority = (typeof ActivityPriority)[keyof typeof ActivityPriority];

// ============================================================================
// Pong Types
// ============================================================================

export type GameStatus =
  | 'waiting'
  | 'waiting_for_opponent'
  | 'waiting_for_ready'
  | 'countdown'
  | 'active'
  | 'paused'
  | 'ended';

export type MatchStatus = GameStatus; // Alias for backwards compatibility
export type MatchType = 'ai' | 'pvp';
export type LobbyStatus = 'waiting' | 'full';
export type AIDifficulty = keyof typeof AI_DIFFICULTIES;

export const AI_DIFFICULTIES = {
  EASY: { reactionTime: 450, accuracy: 0.45, speed: 0.35 },
  MEDIUM: { reactionTime: 200, accuracy: 0.82, speed: 0.85 },
  HARD: { reactionTime: 120, accuracy: 0.88, speed: 0.92 },
  IMPOSSIBLE: { reactionTime: 80, accuracy: 0.95, speed: 1.0 },
} as const;

/**
 * AI Player Database IDs (negative IDs for AI system accounts)
 * These correspond to actual User records in the database
 */
export const AI_PLAYER_IDS = {
  EASY: -1,       // Grimes' Laptop
  MEDIUM: -2,     // Zuck's Metaverse
  HARD: -3,       // Bezos' Rocket
  IMPOSSIBLE: -4, // X Æ A-XII
} as const;

/**
 * AI Player UI Metadata
 * All AI player data (names, avatars) are fetched from the database
 * UI components should fetch from /api/pong/ai-players/:id endpoint
 */

export const PONG_PHYSICS = {
  FIELD_WIDTH: 800,
  FIELD_HEIGHT: 400,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 80,
  PADDLE_SPEED: 960,
  BALL_SIZE: 10,
  BALL_SPEED_INITIAL: 384,
  BALL_SPEED_INCREMENT: 32,
  WINNING_SCORE: 5,
  TICK_RATE: 128,
  NETWORK_UPDATE_RATE: 60,
} as const;

// ============================================================================
// Admin Types
// ============================================================================

export const AdminActions = {
  ManageUsers: 'manage_users',
  ManagePredictions: 'manage_predictions',
  ManageBets: 'manage_bets',
  ViewAnalytics: 'view_analytics',
  ManageFeeds: 'manage_feeds',
  SystemMaintenance: 'system_maintenance',
} as const;

export type AdminAction = (typeof AdminActions)[keyof typeof AdminActions];

// ============================================================================
// Feature Flags
// ============================================================================

export const FeatureFlags = {
  PONG_BETA: 'pong_beta',
  ENHANCED_CHAT: 'enhanced_chat',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPERIMENTAL_UI: 'experimental_ui',
} as const;

export type FeatureFlagName = (typeof FeatureFlags)[keyof typeof FeatureFlags];
