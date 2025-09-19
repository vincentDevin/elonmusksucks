// apps/client/src/types/events.ts
// -----------------------------------------------------------------------------
// Centralized event registry with all 73+ Redis channels from backend
// Foundation for complete event system integration
// -----------------------------------------------------------------------------

// Import all Redis channels and types from shared package
import { REDIS_CHANNELS } from '@ems/types';
import type {
  RedisChannel,
  StatsUpdatePayload,
  TimelineUpdatePayload,
  RankingChangePayload,
  AchievementUnlockedPayload,
  BetPlacedPayload,
  BetResolvedPayload,
  PredictionResolvedPayload,
  PayoutCompletedPayload,
  ParlayWonPayload,
  PongMatchRecordedPayload,
  PongEloUpdatePayload,
  UserLoginPayload,
  UserFollowPayload,
  PredictionCreatedPayload,
  BalanceUpdatePayload,
  PongWagerPayload,
  PongPayoutPayload,
} from '@ems/types';

// Define ChatMessagePayload locally since it's not in shared types yet
export interface ChatMessagePayload {
  id: number;
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
  message: string;
  timestamp: string;
}

// Re-export Redis channels for client use
export { REDIS_CHANNELS };
export type { RedisChannel };

// Event priority levels for EventBus
export type EventPriority = 'high' | 'normal' | 'low';

// Event subscription options
export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: EventPriority;
}

// Event handler function type
export type EventHandler<T = any> = (payload: T) => void;

// Event unsubscribe function type
export type EventUnsubscriber = () => void;

// Event metrics interface
export interface EventMetrics {
  eventsReceived: number;
  eventsProcessed: number;
  errors: number;
  averageProcessingTime: number;
  lastEventTime: number | null;
}

// ============================================================================
// Event Payload Type Mapping
// ============================================================================

// Map Redis channels to their payload types for type safety
export interface EventPayloadMap {
  // Betting & Prediction Events
  [REDIS_CHANNELS.PREDICTION_CREATE]: PredictionCreatedPayload;
  [REDIS_CHANNELS.PREDICTION_CREATED]: PredictionCreatedPayload;
  [REDIS_CHANNELS.PREDICTION_RESOLVE]: PredictionResolvedPayload;
  [REDIS_CHANNELS.BET_PLACE]: BetPlacedPayload;
  [REDIS_CHANNELS.BET_PLACED]: BetPlacedPayload;
  [REDIS_CHANNELS.BET_WON]: BetResolvedPayload;
  [REDIS_CHANNELS.BET_LOST]: BetResolvedPayload;
  [REDIS_CHANNELS.PARLAY_PLACE]: ParlayWonPayload;
  [REDIS_CHANNELS.PARLAY_PLACED]: ParlayWonPayload;
  [REDIS_CHANNELS.PARLAY_WON]: ParlayWonPayload;
  [REDIS_CHANNELS.PARLAY_LOST]: ParlayWonPayload;
  [REDIS_CHANNELS.PAYOUT_COMPLETED]: PayoutCompletedPayload;

  // Achievement Events
  [REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED]: AchievementUnlockedPayload;
  [REDIS_CHANNELS.ACHIEVEMENT_STATISTICAL_ANOMALY]: AchievementUnlockedPayload;
  [REDIS_CHANNELS.ACHIEVEMENT_PROBABILITY_DEFIER]: AchievementUnlockedPayload;
  [REDIS_CHANNELS.ACHIEVEMENT_YOLO_ALL_IN]: AchievementUnlockedPayload;
  [REDIS_CHANNELS.ACHIEVEMENT_GALAXY_BRAIN_PARLAY]: AchievementUnlockedPayload;
  [REDIS_CHANNELS.ACHIEVEMENT_PONG_COMEBACK]: AchievementUnlockedPayload;

  // Leaderboard & Stats Events
  [REDIS_CHANNELS.LEADERBOARD_ALL_TIME]: RankingChangePayload;
  [REDIS_CHANNELS.LEADERBOARD_DAILY]: RankingChangePayload;
  [REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE]: RankingChangePayload;
  [REDIS_CHANNELS.LEADERBOARD_RANK_UPDATE]: RankingChangePayload;
  [REDIS_CHANNELS.STATS_UPDATE]: StatsUpdatePayload;
  [REDIS_CHANNELS.USER_STATS_UPDATE]: StatsUpdatePayload;
  [REDIS_CHANNELS.RANKING_CHANGE]: RankingChangePayload;

  // Activity Events
  [REDIS_CHANNELS.UNIFIED_ACTIVITY_RESPONSE]: any[]; // Array of activities
  [REDIS_CHANNELS.UNIFIED_ACTIVITY_UPDATE]: any; // Single activity
  [REDIS_CHANNELS.ACTIVITY_GLOBAL]: any;
  [REDIS_CHANNELS.ACTIVITY_PERSONAL]: any;

  // Pong Events
  [REDIS_CHANNELS.PONG_ELO_UPDATE]: PongEloUpdatePayload;
  [REDIS_CHANNELS.PONG_TIER_CHANGE]: PongEloUpdatePayload;
  [REDIS_CHANNELS.PONG_MATCH_COMPLETED]: PongMatchRecordedPayload;
  [REDIS_CHANNELS.PONG_MATCH_LOST]: PongMatchRecordedPayload;

  // User Events
  [REDIS_CHANNELS.USER_FOLLOWED]: UserFollowPayload;
  [REDIS_CHANNELS.USER_DAILY_LOGIN]: UserLoginPayload;
  [REDIS_CHANNELS.BALANCE_UPDATE]: BalanceUpdatePayload;
  [REDIS_CHANNELS.BET_RESOLVED]: BetResolvedPayload;
  [REDIS_CHANNELS.PARLAY_RESOLVED]: PayoutCompletedPayload;
  [REDIS_CHANNELS.PONG_WAGER]: PongWagerPayload;
  [REDIS_CHANNELS.PONG_PAYOUT]: PongPayoutPayload;

  // Timeline Events
  [REDIS_CHANNELS.TIMELINE_ARTICLES_NEW]: TimelineUpdatePayload;
  [REDIS_CHANNELS.TIMELINE_ARTICLES_APPROVED]: TimelineUpdatePayload;
  [REDIS_CHANNELS.FEED_ARTICLE_NEW]: TimelineUpdatePayload;

  // Chat Events
  [REDIS_CHANNELS.CHAT_MESSAGE]: ChatMessagePayload;
  [REDIS_CHANNELS.CHAT_TYPING]: any;
  [REDIS_CHANNELS.CHAT_STOP_TYPING]: any;
  [REDIS_CHANNELS.CHAT_USERS_ONLINE]: any;
  [REDIS_CHANNELS.CHAT_JOIN]: any;
  [REDIS_CHANNELS.CHAT_LEAVE]: any;
  [REDIS_CHANNELS.CHAT_HISTORY]: ChatMessagePayload[];
  [REDIS_CHANNELS.CHAT_ERROR]: { error: string; code?: string; timestamp: string };

  // Financial Events
  [REDIS_CHANNELS.BALANCE_MILESTONE_REACHED]: {
    userId: number;
    milestone: number;
    currentBalance: number;
    previousBalance: number;
    timestamp: string;
  };
  [REDIS_CHANNELS.BANKRUPTCY_DETECTED]: {
    userId: number;
    timestamp: string;
  };
  [REDIS_CHANNELS.MASSIVE_GAIN_DETECTED]: {
    userId: number;
    amount: number;
    timestamp: string;
  };
  [REDIS_CHANNELS.MASSIVE_LOSS_DETECTED]: {
    userId: number;
    amount: number;
    timestamp: string;
  };

  // Default fallback for unmapped events
  [key: string]: any;
}

// Type-safe event payload getter
export type EventPayload<T extends RedisChannel> = T extends keyof EventPayloadMap
  ? EventPayloadMap[T]
  : unknown;

// ============================================================================
// Event Categories for Organization
// ============================================================================

export const EVENT_CATEGORIES = {
  BETTING: [
    REDIS_CHANNELS.BET_PLACE,
    REDIS_CHANNELS.BET_PLACED,
    REDIS_CHANNELS.BET_WON,
    REDIS_CHANNELS.BET_LOST,
    REDIS_CHANNELS.BET_STATUS_CHANGE,
  ],

  PARLAY: [
    REDIS_CHANNELS.PARLAY_PLACE,
    REDIS_CHANNELS.PARLAY_PLACED,
    REDIS_CHANNELS.PARLAY_WON,
    REDIS_CHANNELS.PARLAY_LOST,
    REDIS_CHANNELS.PARLAY_STATUS_CHANGE,
  ],

  PREDICTIONS: [
    REDIS_CHANNELS.PREDICTION_CREATE,
    REDIS_CHANNELS.PREDICTION_CREATED,
    REDIS_CHANNELS.PREDICTION_RESOLVE,
    REDIS_CHANNELS.PREDICTION_APPROVED,
    REDIS_CHANNELS.PREDICTION_VIRAL,
  ],

  ACHIEVEMENTS: [
    REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
    REDIS_CHANNELS.ACHIEVEMENT_STATISTICAL_ANOMALY,
    REDIS_CHANNELS.ACHIEVEMENT_PROBABILITY_DEFIER,
    REDIS_CHANNELS.ACHIEVEMENT_YOLO_ALL_IN,
    REDIS_CHANNELS.ACHIEVEMENT_GALAXY_BRAIN_PARLAY,
    REDIS_CHANNELS.ACHIEVEMENT_PONG_COMEBACK,
  ],

  FINANCIAL: [
    REDIS_CHANNELS.BALANCE_MILESTONE_REACHED,
    REDIS_CHANNELS.BANKRUPTCY_DETECTED,
    REDIS_CHANNELS.MASSIVE_GAIN_DETECTED,
    REDIS_CHANNELS.MASSIVE_LOSS_DETECTED,
    REDIS_CHANNELS.COMEBACK_DETECTED,
    REDIS_CHANNELS.PAYOUT_COMPLETED,
    REDIS_CHANNELS.BALANCE_UPDATE,
    REDIS_CHANNELS.BET_RESOLVED,
    REDIS_CHANNELS.PARLAY_RESOLVED,
    REDIS_CHANNELS.PONG_WAGER,
    REDIS_CHANNELS.PONG_PAYOUT,
  ],

  SOCIAL: [
    REDIS_CHANNELS.USER_FOLLOWED,
    REDIS_CHANNELS.POST_CREATED,
    REDIS_CHANNELS.POST_REACTION,
    REDIS_CHANNELS.COMMENT_CREATED,
    REDIS_CHANNELS.EMOJI_USED,
  ],

  LEADERBOARD: [
    REDIS_CHANNELS.LEADERBOARD_ALL_TIME,
    REDIS_CHANNELS.LEADERBOARD_DAILY,
    REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE,
    REDIS_CHANNELS.LEADERBOARD_RANK_UPDATE,
    REDIS_CHANNELS.LEADERBOARD_POSITION_REACHED,
    REDIS_CHANNELS.LEADERBOARD_COMEBACK_MAJOR,
  ],

  PONG: [
    REDIS_CHANNELS.PONG_ELO_UPDATE,
    REDIS_CHANNELS.PONG_TIER_CHANGE,
    REDIS_CHANNELS.PONG_MATCH_COMPLETED,
    REDIS_CHANNELS.PONG_MATCH_LOST,
    REDIS_CHANNELS.PONG_ELO_MILESTONE,
    REDIS_CHANNELS.PONG_STATS_UPDATE,
  ],

  CHAT: [
    REDIS_CHANNELS.CHAT_MESSAGE,
    REDIS_CHANNELS.CHAT_TYPING,
    REDIS_CHANNELS.CHAT_STOP_TYPING,
    REDIS_CHANNELS.CHAT_USERS_ONLINE,
    REDIS_CHANNELS.CHAT_JOIN,
    REDIS_CHANNELS.CHAT_LEAVE,
    REDIS_CHANNELS.CHAT_HISTORY,
    REDIS_CHANNELS.CHAT_ERROR,
  ],

  ACTIVITY: [
    REDIS_CHANNELS.UNIFIED_ACTIVITY_RESPONSE,
    REDIS_CHANNELS.UNIFIED_ACTIVITY_UPDATE,
    REDIS_CHANNELS.ACTIVITY_GLOBAL,
    REDIS_CHANNELS.ACTIVITY_PERSONAL,
  ],

  TIMELINE: [
    REDIS_CHANNELS.TIMELINE_ARTICLES_NEW,
    REDIS_CHANNELS.TIMELINE_ARTICLES_APPROVED,
    REDIS_CHANNELS.FEED_ARTICLE_NEW,
    REDIS_CHANNELS.FEED_TWEET_NEW,
    REDIS_CHANNELS.FEED_SOURCE_CREATED,
  ],
} as const;

// Event priority mapping - critical events get high priority
export const EVENT_PRIORITIES: Record<string, EventPriority> = {
  // High priority - immediate user feedback
  [REDIS_CHANNELS.BET_PLACED]: 'high',
  [REDIS_CHANNELS.BET_WON]: 'high',
  [REDIS_CHANNELS.BET_LOST]: 'high',
  [REDIS_CHANNELS.PARLAY_WON]: 'high',
  [REDIS_CHANNELS.PARLAY_LOST]: 'high',
  [REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED]: 'high',
  [REDIS_CHANNELS.PONG_ELO_UPDATE]: 'high',
  [REDIS_CHANNELS.CHAT_MESSAGE]: 'high',
  [REDIS_CHANNELS.BALANCE_UPDATE]: 'high',
  [REDIS_CHANNELS.BET_RESOLVED]: 'high',
  [REDIS_CHANNELS.PARLAY_RESOLVED]: 'high',
  [REDIS_CHANNELS.PONG_WAGER]: 'high',
  [REDIS_CHANNELS.PONG_PAYOUT]: 'high',

  // Normal priority - standard updates
  [REDIS_CHANNELS.STATS_UPDATE]: 'normal',
  [REDIS_CHANNELS.LEADERBOARD_RANK_UPDATE]: 'normal',
  [REDIS_CHANNELS.USER_FOLLOWED]: 'normal',
  [REDIS_CHANNELS.POST_REACTION]: 'normal',

  // Low priority - background updates
  [REDIS_CHANNELS.FEED_ARTICLE_NEW]: 'low',
  [REDIS_CHANNELS.ADMIN_METRICS_UPDATE]: 'low',
  [REDIS_CHANNELS.PROFIT_SNAPSHOT_DAILY]: 'low',
};

// Get default priority for an event
export function getEventPriority(channel: RedisChannel): EventPriority {
  return EVENT_PRIORITIES[channel] || 'normal';
}

// ============================================================================
// Event System Constants
// ============================================================================

export const EVENT_SYSTEM_CONFIG = {
  // Event processing timeouts
  HIGH_PRIORITY_TIMEOUT: 0, // Immediate
  NORMAL_PRIORITY_TIMEOUT: 0, // Next tick
  LOW_PRIORITY_TIMEOUT: 10, // Small delay

  // Event deduplication window
  DEDUPLICATION_WINDOW_MS: 1000,

  // Event metrics collection
  METRICS_UPDATE_INTERVAL_MS: 5000,

  // Maximum event handlers per event
  MAX_HANDLERS_PER_EVENT: 50,

  // Event retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;
