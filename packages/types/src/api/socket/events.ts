/**
 * Socket.IO Event Names
 *
 * Redis channel names for event publishing (75+ channels)
 */

// ============================================================================
// Redis Channels for Pub/Sub
// ============================================================================

export const REDIS_CHANNELS = {
  // Prediction channels
  PREDICTION_CREATE: 'prediction:create',
  PREDICTION_CREATED: 'prediction:created',
  PREDICTION_REJECTED: 'prediction:rejected',
  PREDICTION_RESOLVE: 'prediction:resolve',
  PREDICTION_RESOLVED: 'prediction:resolved',
  PREDICTION_RESOLVED_FAST: 'prediction:resolved:fast',
  PREDICTION_APPROVED: 'prediction:approved',
  PREDICTION_STATUS_CHANGE: 'prediction:status_change',
  PREDICTION_VIEWED: 'prediction:viewed',
  PREDICTION_VIRAL: 'prediction:viral',
  PREDICTION_FIRST_CORRECT_BET: 'prediction:first:correct:bet',

  // Betting channels
  BET_PLACE: 'bet:place',
  BET_PLACED: 'bet:placed',
  BET_STATUS_CHANGE: 'bet:status_change',
  BET_RESOLVED: 'bet:resolved',
  BET_WON: 'bet:won',
  BET_LOST: 'bet:lost',

  // Parlay channels
  PARLAY_PLACE: 'parlay:place',
  PARLAY_PLACED: 'parlay:placed',
  PARLAY_STATUS_CHANGE: 'parlay:status_change',
  PARLAY_RESOLVED: 'parlay:resolved',
  PARLAY_WON: 'parlay:won',
  PARLAY_LOST: 'parlay:lost',

  // Odds channels
  ODDS_UPDATE_ENHANCED: 'odds:update:enhanced',

  // Leaderboard channels
  LEADERBOARD_ALL_TIME: 'leaderboard:allTime',
  LEADERBOARD_DAILY: 'leaderboard:daily',
  LEADERBOARD_RANK_CHANGE: 'leaderboard:rankChange',
  LEADERBOARD_RANK_UPDATE: 'leaderboard:rank:update',
  LEADERBOARD_MILESTONE: 'leaderboard:milestone',
  LEADERBOARD_POSITION_REACHED: 'leaderboard:position:reached',
  LEADERBOARD_REFRESH_NEEDED: 'leaderboard:refresh_needed',
  LEADERBOARD_COMEBACK_MAJOR: 'leaderboard:comeback:major',
  LEADERBOARD_COMEBACK_MODERATE: 'leaderboard:comeback:moderate',

  // Stats channels
  STATS_UPDATE: 'stats:update',
  STATS_REFRESH: 'stats:refresh',
  RANKING_CHANGE: 'ranking:change',
  USER_STATS_UPDATE: 'user:stats_update',

  // Achievement channels
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  ACHIEVEMENT_STATISTICAL_ANOMALY: 'achievement:statistical:anomaly',
  ACHIEVEMENT_PROBABILITY_DEFIER: 'achievement:probability:defier',
  ACHIEVEMENT_YOLO_ALL_IN: 'achievement:yolo:all:in',
  ACHIEVEMENT_GALAXY_BRAIN_PARLAY: 'achievement:galaxy:brain:parlay',
  ACHIEVEMENT_PONG_COMEBACK: 'achievement:pong:comeback',

  // Activity channels
  UNIFIED_ACTIVITY_GLOBAL: 'unified:activity:global',
  UNIFIED_ACTIVITY_UPDATE: 'unified:activity:update',
  UNIFIED_ACTIVITY_RESPONSE: 'unified:activity:response',
  ACTIVITY_GLOBAL: 'activity:global',
  ACTIVITY_PERSONAL: 'activity:personal',
  ACTIVITY_SPEED_BURST: 'activity:speed:burst',
  ACTIVITY_TIME_PATTERN: 'activity:time:pattern',

  // Financial channels
  BALANCE_UPDATE: 'balance:update',
  BALANCE_MILESTONE_REACHED: 'balance:milestone:reached',
  BANKRUPTCY_DETECTED: 'bankruptcy:detected',
  RAGS_TO_RICHES: 'rags:to:riches',
  MASSIVE_LOSS_DETECTED: 'massive:loss:detected',
  MASSIVE_GAIN_DETECTED: 'massive:gain:detected',
  COMEBACK_DETECTED: 'comeback:detected',
  PROFIT_SNAPSHOT_DAILY: 'profit:snapshot:daily',

  // Chat channels
  CHAT_MESSAGE: 'chat:message',
  CHAT_MESSAGE_SENT: 'chat:message:sent',
  CHAT_TYPING: 'chat:typing',
  CHAT_TYPING_START: 'chat:typing:start',
  CHAT_STOP_TYPING: 'chat:stopTyping',
  CHAT_TYPING_STOP: 'chat:typing:stop',
  CHAT_USERS_ONLINE: 'chat:usersOnline',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_HISTORY: 'chat:history',
  CHAT_ERROR: 'chat:error',

  // Pong channels
  PONG_WAGER: 'pong:wager',
  PONG_PAYOUT: 'pong:payout',
  PONG_ELO_UPDATE: 'pong:elo:update',
  PONG_TIER_CHANGE: 'pong:tier:change',
  PONG_STATS_UPDATE: 'pong:stats:update',
  PONG_LEADERBOARD_UPDATE: 'pong:leaderboard:update',
  PONG_MATCH_COMPLETED: 'pong:match:completed',
  PONG_MATCH_LOST: 'pong:match:lost',
  PONG_ELO_MILESTONE: 'pong:elo:milestone',

  // User activity channels
  USER_ACTIVITY_LOG: 'user:activity:log',
  USER_DAILY_LOGIN: 'user:daily:login',
  USER_WEEKEND_LOGIN: 'user:weekend:login',
  USER_BALANCE_SNAPSHOT: 'user:balance:snapshot',
  USER_FOLLOWED: 'user:followed',

  // Post/Content channels
  POST_CREATED: 'post:created',
  POST_UPDATED: 'post:updated',
  POST_DELETED: 'post:deleted',
  POST_REACTION: 'post:reaction',
  COMMENT_CREATED: 'comment:created',
  COMMENT_DELETED: 'comment:deleted',

  // Timeline/Feed channels
  FEED_ARTICLE_APPROVED: 'feed:article:approved',
  FEED_ARTICLE_REJECTED: 'feed:article:rejected',
  FEED_ARTICLE_NEW: 'feed:article:new',
  FEED_TWEET_NEW: 'feed:tweet:new',
  FEED_TWEET_HIDDEN: 'feed:tweet:hidden',
  FEED_SOURCE_CREATED: 'feed:source:created',
  FEED_SOURCE_UPDATED: 'feed:source:updated',
  FEED_SOURCE_DELETED: 'feed:source:deleted',
  TIMELINE_ARTICLE_NEW: 'timeline:article:new',
  TIMELINE_ARTICLES_NEW: 'timeline:articles:new',
  TIMELINE_ARTICLES_APPROVED: 'timeline:articles:approved',
  TIMELINE_MODERATION_BULK: 'timeline:moderation:bulk',
  TIMELINE_FEED_REFRESH: 'timeline:feed:refresh',

  // Admin channels
  ADMIN_METRICS_UPDATE: 'admin:metrics:update',
  ADMIN_MODERATION_BULK: 'admin:moderation:bulk',
  ADMIN_RETAGGING_BULK: 'admin:retagging:bulk',
  ADMIN_FEED_REFRESH: 'admin:feed:refresh',
  CONTENT_UPDATED: 'content:updated',
  CONTENT_MODERATED: 'content:moderated',
  FEEDS_UPDATED: 'feeds:updated',
  ARTICLES_BULK_MODERATED: 'articles:bulk-moderated',
  MODERATION_USER_BAN: 'moderation:userBan',
  MODERATION_USER_UNBAN: 'moderation:userUnban',
  MODERATION_USER_MUTE: 'moderation:userMute',
  MODERATION_USER_KICK: 'moderation:userKick',
  MODERATION_MESSAGE_DELETE: 'moderation:messageDelete',
  MODERATION_POST_DELETE: 'moderation:postDelete',

  // Streak channels
  STREAK_UPDATED: 'streak:updated',
  STREAK_BROKEN: 'streak:broken',
  STREAK_RESET: 'streak:reset',
  STREAK_MILESTONE_REACHED: 'streak:milestone:reached',

  // Prediction comment channels (will migrate to unified content)
  PREDICTION_COMMENT_CREATE: 'prediction:comment:create',
  PREDICTION_COMMENT_UPDATE: 'prediction:comment:update',
  PREDICTION_COMMENT_DELETE: 'prediction:comment:delete',
  PREDICTION_COMMENT_LIKE: 'prediction:comment:like',

  // Redis health monitoring channels
  REDIS_HEALTH_METRICS: 'redis:health:metrics',
  REDIS_HEALTH_ERROR: 'redis:health:error',
  REDIS_HEALTH_ALERT: 'redis:health:alert',

  // Other channels
  PAYOUT_COMPLETED: 'payout:completed',
  EVENT_SEQUENCE_COMPLETED: 'event:sequence:completed',
  PATTERN_MATCHED: 'pattern:matched',
  EMOJI_USED: 'emoji:used',
  THREAD_PARTICIPATION: 'thread:participation',
} as const;

export type RedisChannel = (typeof REDIS_CHANNELS)[keyof typeof REDIS_CHANNELS];

// ============================================================================
// Socket.IO Room Names
// ============================================================================

export const SOCKET_ROOMS = {
  PREDICTIONS: 'predictions',
  BETTING: 'betting',
  LEADERBOARD: 'leaderboard',
  ADMIN: 'admin',
  ACHIEVEMENTS: 'achievements',
} as const;

export type SocketRoom = (typeof SOCKET_ROOMS)[keyof typeof SOCKET_ROOMS];

// ============================================================================
// Socket.IO Event Names (non-Redis fan-out slugs)
// ============================================================================

export const SOCKET_EVENTS = {
  // Prediction lifecycle fan-out to public sockets
  PREDICTION_CREATED: 'predictionCreated',
  PREDICTION_RESOLVED: 'predictionResolved',

  // Betting events consumed by widgets/dashboards
  BET_PLACED: 'betPlaced',
  PARLAY_PLACED: 'parlayPlaced',
  ODDS_UPDATE_ENHANCED: 'oddsUpdatedEnhanced',

  // Leaderboard events for legacy listeners
  LEADERBOARD_ALL_TIME: 'leaderboardAllTime',
  LEADERBOARD_DAILY: 'leaderboardDaily',

  // Moderation broadcasts (public + admin scoped)
  MODERATION_USER_BAN: 'moderationUserBan',
  MODERATION_USER_UNBAN: 'moderationUserUnban',
  MODERATION_USER_MUTE: 'moderationUserMute',
  MODERATION_USER_KICK: 'moderationUserKick',
  MODERATION_MESSAGE_DELETE: 'moderationMessageDelete',
  ADMIN_MODERATION_USER_BAN: 'adminModerationUserBan',
  ADMIN_MODERATION_USER_UNBAN: 'adminModerationUserUnban',
  ADMIN_MODERATION_USER_MUTE: 'adminModerationUserMute',
  ADMIN_MODERATION_USER_KICK: 'adminModerationUserKick',
  ADMIN_MODERATION_MESSAGE_DELETE: 'adminModerationMessageDelete',

  // Activity stream events
  USER_ACTIVITY: 'userActivity',
  ADMIN_USER_ACTIVITY: 'adminUserActivity',

  // Pong realtime updates
  PONG_ELO_UPDATE: 'pong:elo:update',
  PONG_TIER_CHANGE: 'pong:tier:change',
  PONG_STATS_UPDATE: 'pong:stats:update',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ============================================================================
// Achievement Socket Events (enum for backward compatibility)
// ============================================================================

export enum AchievementSocketEvents {
  UNLOCKED = 'achievement:unlocked',
  PROGRESS = 'achievement:progress',
  CELEBRATION = 'achievement:celebration',
  BATCH_UNLOCKED = 'achievement:batch_unlocked',
}
