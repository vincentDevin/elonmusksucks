/**
 * Socket.IO Event Payloads
 *
 * Payload interfaces for all socket events
 */

// ============================================================================
// Stats Update Payloads
// ============================================================================

export interface StatsUpdatePayload {
  userId: number;
  stats?: {
    totalBets?: number;
    winRate?: number;
    totalWinnings?: number;
    currentStreak?: number;
  };
  changes?: {
    winRate?: number;
    profit?: number;
    rank?: number;
    streak?: number;
    totalBets?: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    isUnlocked: boolean;
  }>;
  timestamp?: string;
}

export interface RankingChangePayload {
  userId: number;
  oldRank: number;
  newRank: number;
  change: number;
  category: 'allTime' | 'daily';
  percentile: number;
}

// ============================================================================
// Timeline Update Payloads
// ============================================================================

export interface TimelineUpdatePayload {
  articleId: string;
  action: 'added' | 'updated' | 'removed';
  data?: {
    title?: string;
    url?: string;
    publishedAt?: string;
    feedName?: string;
  };
}

// ============================================================================
// Achievement Payloads
// ============================================================================

export interface AchievementUnlockedPayload {
  userId: number;
  achievement: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  progress: {
    previous: number;
    current: number;
    target: number;
  };
  timestamp: string;
}

export interface PongAchievementContext {
  matchId: string;
  winnerId: number;
  loserId?: number;
  vsAI: boolean;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
  wager: number;
  winnerScore: number;
  loserScore: number;
  duration: number;
  eloChange?: number;
  newElo?: number;
  streak?: number;
}

// ============================================================================
// Pong Socket Event Payloads
// ============================================================================

export interface ClientEvents {
  auth: { token: string };
  join_lobby: {};
  create_match: { wager: number; type: import('../../shared/enums').MatchType; aiDifficulty?: string };
  join_match: { matchId: string };
  player_input: import('../../database/pong').PlayerInput;
  player_ready: { ready: boolean };
  leave_match: {};
  spectate_match: { gameId: string };
}

export interface ServerEvents {
  auth_result: { success: boolean; player?: import('../../database/pong').Player; error?: string };
  lobby_state: { lobbies: import('../../database/pong').LobbyEntry[] };
  active_games: { games: import('../../database/pong').ActiveGameEntry[] };
  stats_update: { playersOnline: number; activeGames: number; availableMatches: number };
  match_joined: {
    gameId: string;
    playerSlot: 0 | 1;
    opponent?: import('../../database/pong').Player;
    wager: number;
    pot: number;
  };
  match_waiting: { gameId: string; message: string };
  opponent_joined: { opponent: import('../../database/pong').Player };
  ready_state_update: { readyStates: [boolean, boolean] };
  countdown: { seconds: number; message?: string };
  spectator_joined: { gameId: string; spectatorCount: number };
  game_state: {
    ball: import('../../database/pong').Ball;
    opponentPaddleY?: number;
    player1PaddleY?: number;
    player2PaddleY?: number;
    scores: [number, number];
    tick: number;
    timestamp: number;
    wager?: number;
    pot?: number;
  };
  score_update: { scores: [number, number]; scorer: 0 | 1 };
  match_end: {
    winner: 0 | 1 | null;
    scores: [number, number];
    reason: string;
    duration: number;
    payout?: number;
  };
  player_disconnected: { playerSlot: 0 | 1; reconnectTime: number };
  error: { code: string; message: string };
}

// ============================================================================
// Chat Event Payloads
// ============================================================================

// User information in chat messages
export interface ChatUserInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
}

// Chat message DTO (used in history and broadcasts)
export interface ChatMessageDTO {
  id: number;
  user: ChatUserInfo;
  message: string;
  timestamp: string;
}

// Client-to-Server Request Payloads
export type ChatHistoryRequest = void; // No payload

export interface ChatMessageSendRequest {
  message: string;
}

export type ChatTypingSendRequest = void; // No payload
export type ChatStopTypingSendRequest = void; // No payload

// Server-to-Client Response Payloads
export type ChatHistoryResponse = ChatMessageDTO[];

export interface ChatErrorResponse {
  message: string;
  limit?: number;
  actual?: number;
}

// Redis Event Payloads (for internal pub/sub)
export interface ChatJoinPayload {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface ChatLeavePayload {
  id: number;
  name: string;
}

export interface ChatTypingPayload {
  id: number;
  name: string;
}

export interface ChatStopTypingPayload {
  id: number;
  expired?: boolean;
}

export interface ChatUserOnlineInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export type ChatUsersOnlinePayload = ChatUserOnlineInfo[];

// ============================================================================
// Moderation Event Payloads
// ============================================================================

// Import Prisma BanType for request payloads
import type { BanType as PrismaBanType } from '@prisma/client';

// Client-to-Server Request Payloads
export interface AdminBanUserRequest {
  userId: number;
  banType: PrismaBanType;
  reason: string;
  duration?: number;
}

export interface AdminUnbanUserRequest {
  userId: number;
}

export interface AdminMuteUserRequest {
  userId: number;
  duration: number;
  reason: string;
}

export interface AdminKickUserRequest {
  userId: number;
  reason: string;
}

export interface AdminDeleteMessageRequest {
  messageId: number;
  reason: string;
}

export interface AdminDeletePostRequest {
  postId: number;
  reason: string;
}

export type AdminGetActiveBansRequest = void; // No payload

export interface AdminGetModerationHistoryRequest {
  targetUserId?: number;
  moderatorId?: number;
}

export interface AdminGetRecentActionsRequest {
  limit?: number;
}

// Server-to-Client Response Payloads (callback responses)
export interface ModerationSuccessResponse<T = void> {
  success: true;
  data?: T;
  ban?: any; // Will be typed as Ban from service layer
  bans?: any[]; // Will be typed as Ban[] from service layer
  history?: any[]; // Will be typed as ModerationAction[] from service layer
  actions?: any[]; // Will be typed as ModerationAction[] from service layer
}

export interface ModerationErrorResponse {
  success: false;
  error: string;
}

export type ModerationResponse<T = void> = ModerationSuccessResponse<T> | ModerationErrorResponse;

// Specific response types for each action
export type AdminBanUserResponse =
  | { success: true; ban: any }
  | { success: false; error: string };

export type AdminUnbanUserResponse =
  | { success: true }
  | { success: false; error: string };

export type AdminMuteUserResponse =
  | { success: true; ban: any }
  | { success: false; error: string };

export type AdminKickUserResponse =
  | { success: true }
  | { success: false; error: string };

export type AdminDeleteMessageResponse =
  | { success: true }
  | { success: false; error: string };

export type AdminDeletePostResponse =
  | { success: true }
  | { success: false; error: string };

export type AdminGetActiveBansResponse =
  | { success: true; bans: any[] }
  | { success: false; error: string };

export type AdminGetModerationHistoryResponse =
  | { success: true; history: any[] }
  | { success: false; error: string };

export type AdminGetRecentActionsResponse =
  | { success: true; actions: any[] }
  | { success: false; error: string };

// Server-to-Client Broadcast Payloads (user notifications)
export interface UserBannedNotification {
  reason: string;
  banType: PrismaBanType;
}

export interface UserMutedNotification {
  reason: string;
  duration: number;
  expiresAt: Date | null;
}

export interface UserKickedNotification {
  reason: string;
}

// ============================================================================
// Betting Event Payloads
// ============================================================================

// Client-to-Server Request Payloads
export interface BetPlaceRequest {
  optionId: number;
  amount: number;
}

export interface ParlayPlaceRequest {
  legs: { optionId: number }[];
  amount: number;
}

// ACK Response Types (string error codes or null for success)
export type BetPlaceAck = string | null;
export type ParlayPlaceAck = string | null;

// Error codes that can be returned
export type BetErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_PAYLOAD'
  | 'SYSTEM_OVERLOADED'
  | 'OPERATION_TIMEOUT'
  | 'OPTION_NOT_FOUND'
  | 'PREDICTION_CLOSED'
  | 'INSUFFICIENT_FUNDS'
  | 'BET_FAILED'
  | `RATE_LIMIT_EXCEEDED:${string}`; // Dynamic rate limit with wait time

// ============================================================================
// Post/Content Event Payloads
// ============================================================================

// Import types for post content
import type { PostContentType, PostVisibility } from '../../shared/enums.js';

// Client-to-Server Request Payloads
export interface PostCreateRequest {
  content: string;
  contentType?: PostContentType;
  visibility?: PostVisibility;
  mediaUrls?: string[];
  linkPreview?: any;
  parentId?: number | null;
}

export interface PostEditRequest {
  postId: number;
  content: string;
}

export interface PostDeleteRequest {
  postId: number;
}

export interface PostReactRequest {
  postId: number;
  type: string;
}

export interface PostShareRequest {
  postId: number;
}

export interface CommentCreateRequest {
  postId: number;
  content: string;
}

export interface CommentDeleteRequest {
  commentId: number;
}

// Server-to-Client Response Payloads (callback responses)
export type PostCreateResponse =
  | { success: true; post: any }
  | { error: string };

export type PostEditResponse =
  | { success: true; post: any }
  | { error: string };

export type PostDeleteResponse =
  | { success: true }
  | { error: string };

export type PostReactResponse =
  | { success: true }
  | { error: string };

export type PostShareResponse =
  | { success: true; sharesCount: number }
  | { error: string };

export type CommentCreateResponse =
  | { success: true; comment: any }
  | { error: string };

export type CommentDeleteResponse =
  | { success: true }
  | { error: string };

// Redis Event Payloads (internal)
export interface PostData {
  id: number;
  authorId: number;
  content: string;
  contentType?: string;
  visibility?: string;
  mediaUrls?: string[];
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
  };
  parentId?: number | null;
  reactionsCount?: number;
  sharesCount?: number;
  repliesCount?: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  author?: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  mentions?: Array<{
    id: number;
    userId: number;
    userName?: string;
  }>;
}

export interface PostCreatedRedisPayload {
  post: PostData;
  authorId: number;
}

export interface PostUpdatedRedisPayload {
  post: PostData;
  editedBy: number;
}

export interface PostDeletedRedisPayload {
  postId: number;
  deletedBy: number;
}

export interface PostSharedRedisPayload {
  postId: number;
  sharesCount: number;
  sharedBy: number;
}

export interface PostReactionRedisPayload {
  postId: number;
  userId: number;
  type: string;
}

export interface CommentCreatedRedisPayload {
  comment: PostData;
  postId: number;
  authorId: number;
}

export interface CommentDeletedRedisPayload {
  commentId: number;
  deletedBy: number;
}

// Server-to-Client Broadcast Payloads
export interface PostNewBroadcast extends PostData {}

export interface PostUpdatedBroadcast {
  id: number;
  content: string;
  editedAt: string;
  editedBy: number;
}

export interface PostDeletedBroadcast {
  postId: number;
  deletedBy: number;
  timestamp: string;
}

export interface PostSharedBroadcast {
  postId: number;
  sharesCount: number;
  sharedBy: number;
  timestamp: string;
}

export interface PostReactionBroadcast {
  postId: number;
  userId: number;
  type: string;
  timestamp: string;
}

export interface CommentNewBroadcast {
  comment: PostData;
  postId: number;
  authorId: number;
}

export interface CommentDeletedBroadcast {
  commentId: number;
  deletedBy: number;
  timestamp: string;
}

// ============================================================================
// Unified Activity Event Payloads
// ============================================================================

// Client-to-Server Request Payload
export interface UnifiedActivityRequest {
  limit?: number;
  includePersonal?: boolean;
  includeSocial?: boolean;
  includePlatform?: boolean;
  includeLive?: boolean;
  timeframe?: '1h' | '6h' | '24h' | '7d' | 'all';
}

// Activity item in response
export interface VerboseActivity {
  id: string;
  type: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';

  // User context
  userId?: number;
  userName: string;
  userAvatar?: string;

  // Rich content
  title: string;
  description: string;
  icon: string;
  color: string;

  // Financial context (from bet details if available)
  amount?: number;
  odds?: number;
  payout?: number;

  // Prediction context (from prediction relation if available)
  predictionId?: number;
  predictionTitle?: string;
  category?: string;
  optionLabel?: string;

  // Meta flags
  isPersonal: boolean;
  isHighValue: boolean;
  isWin?: boolean;
  streak?: number;
}

// Server-to-Client Response Payload
export type UnifiedActivityResponse = VerboseActivity[];

// Server-to-Client Update Payload (real-time broadcasts)
export type UnifiedActivityUpdate = VerboseActivity;

// ============================================================================
// Statistics Event Payloads
// ============================================================================

// Client-to-Server Request Payloads (subscription events)
export type StatsSubscribeRequest = void; // No payload
export type StatsUnsubscribeRequest = void; // No payload
export type RankingSubscribeRequest = void; // No payload
export type AchievementsSubscribeRequest = void; // No payload

// Server-to-Client Response Payloads
export interface StatsCurrentResponse {
  stats: any; // EnhancedUserStats from service
  timestamp: string;
}

export interface StatsErrorResponse {
  message: string;
}

export interface StatsUpdatedBroadcast {
  changes?: {
    winRate?: number;
    profit?: number;
    rank?: number;
    streak?: number;
    totalBets?: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    isUnlocked: boolean;
  }>;
  timestamp?: string;
}

export interface RankingChangedBroadcast {
  oldRank: number;
  newRank: number;
  change: number;
  category: 'allTime' | 'daily';
  percentile: number;
  timestamp: string;
}

export interface StatsRankingBroadcast {
  rank: number;
  change: number;
  category: 'allTime' | 'daily';
  percentile: number;
}

export interface AchievementUnlockedBroadcast {
  achievement: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  progress: {
    previous: number;
    current: number;
    target: number;
  };
  timestamp: string;
}

export interface StatsAchievementBroadcast {
  achievement: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  progress: {
    previous: number;
    current: number;
    target: number;
  };
}

export interface StatsRefreshedBroadcast {
  stats: any; // EnhancedUserStats from service
  timestamp: string;
}

// ============================================================================
// Timeline Event Payloads
// ============================================================================

// Client-to-Server Request Payloads
export type TimelineJoinRequest = void; // No payload
export type TimelineLeaveRequest = void; // No payload
export type AdminTimelineJoinRequest = void; // No payload
export type AdminTimelineLeaveRequest = void; // No payload

export interface AdminFeedRefreshRequest {
  feedId: number;
}

// Server-to-Client Response Payloads
export interface AdminFeedRefreshAck {
  feedId: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

// Server-to-Client Broadcast Payloads
export interface FeedArticleApprovedBroadcast {
  articleId: number;
  card: any; // TimelineItem payload
  timestamp: string;
}

export interface FeedArticleRejectedBroadcast {
  articleId: number;
  reason?: string;
  timestamp: string;
}

export interface FeedArticleNewBroadcast {
  articleId: number;
  title: string;
  publisher: string;
  timestamp: string;
}

export interface FeedTweetNewBroadcast {
  tweet: any; // TimelineItem payload
  timestamp: string;
}

export interface FeedTweetHiddenBroadcast {
  tweetId: string;
  timestamp: string;
}

export interface FeedManagementUpdateBroadcast {
  event: string;
  data: any;
  timestamp: string;
}

// ============================================================================
// Pong Event Payloads
// ============================================================================

// Client-to-Server Request Payloads
export interface PongSubscribeLeaderboardRequest {
  metric: string;
}

export interface PongUnsubscribeLeaderboardRequest {
  metric: string;
}

export type PongSubscribeEloRequest = void; // No payload
export type PongUnsubscribeEloRequest = void; // No payload
export type PongSubscribeStatsRequest = void; // No payload
export type PongUnsubscribeStatsRequest = void; // No payload

// Redis Event Payloads (internal)
export interface PongEloUpdateRedisPayload {
  userId: number;
  oldRating: number;
  newRating: number;
  change: number;
  tier: string;
  matchId: string;
}

export interface PongTierChangeRedisPayload {
  userId: number;
  oldTier: string;
  newTier: string;
  eloRating: number;
  isPromotion: boolean;
}

export interface PongMatchSummary {
  matchId: string;
  winner: 'player' | 'opponent';
  score: {
    player: number;
    opponent: number;
  };
  duration: number;
}

export interface PongUserStats {
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
  currentStreak: number;
  bestStreak: number;
  eloRating: number;
  tier: string;
}

export interface PongStatsUpdateRedisPayload {
  userId: number;
  stats: PongUserStats;
  matchResult?: PongMatchSummary;
}

export interface PongLeaderboardEntry {
  userId: number;
  userName: string;
  eloRating: number;
  tier: string;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
}

export interface PongLeaderboardUpdateRedisPayload {
  metric: string;
  rankings: PongLeaderboardEntry[];
  totalPlayers: number;
}

// Server-to-Client Broadcast Payloads
export interface PongEloUpdatedBroadcast {
  userId: number;
  oldRating: number;
  newRating: number;
  change: number;
  tier: string;
  matchId: string;
  timestamp: string;
}

export interface PongPlayerEloChangedBroadcast {
  userId: number;
  newRating: number;
  change: number;
  tier: string;
}

export interface PongTierChangedBroadcast {
  userId: number;
  oldTier: string;
  newTier: string;
  eloRating: number;
  isPromotion: boolean;
  timestamp: string;
}

export interface PongTierAnnouncementBroadcast {
  userId: number;
  newTier: string;
  isPromotion: boolean;
  eloRating: number;
}

export interface PongStatsUpdatedBroadcast {
  userId: number;
  stats: PongUserStats;
  matchResult?: PongMatchSummary;
  timestamp: string;
}

export interface PongLeaderboardUpdatedBroadcast {
  metric: string;
  rankings: PongLeaderboardEntry[];
  totalPlayers: number;
  timestamp: string;
}

// ============================================================================
// Prediction & Betting Event Payloads
// ============================================================================

export interface ChatErrorPayload {
  error: string;
  code?: string;
  timestamp: string;
}

export interface PredictionCreatedPayload {
  key: 'prediction:created';
  userId: number;
  occurredAt: string;
  idempotencyKey: string;
  payload: {
    predictionId: number;
    title: string;
    category: string | null;
    description: string;
    type: string;
    threshold: number | null;
    expiresAt: string;
    optionCount: number;
  };
}

export interface BetPlacedPayload {
  key: 'bet:placed';
  userId: number;
  occurredAt: string;
  idempotencyKey: string;
  payload: {
    betId: number;
    predictionId: number;
    amount: number;
    category: string | null;
    odds: number;
    optionLabel: string;
  };
}

export interface PredictionResolvedPayload {
  predictionId: number;
  winningOptionId: number;
  resolvedAt: string;
  outcome: string;
}

export interface ParlayPlacedPayload {
  key: 'parlay:placed';
  userId: number;
  occurredAt: string;
  idempotencyKey: string;
  payload: {
    parlayId: number;
    amount: number;
    legCount: number;
    combinedOdds: number;
    predictions: Array<{
      id: number;
      title: string;
      category: string | null;
    }>;
  };
}

export interface BalanceUpdatePayload {
  userId: number;
  newBalance: number;
  previousBalance: number;
  change: number;
  reason: string;
  timestamp: string;
}

export interface BetResolvedPayload {
  betId: number;
  userId: number;
  predictionId: number;
  won: boolean;
  payout?: number;
  timestamp: string;
}

export interface ParlayResolvedPayload {
  parlayId: number;
  userId: number;
  won: boolean;
  amount: number;
  payout?: number;
  timestamp: string;
}

export interface PongWagerPayload {
  userId: number;
  amount: number;
  matchId: string;
  timestamp: string;
}

export interface PongPayoutPayload {
  userId: number;
  payout: number;
  matchId: string;
  won: boolean;
  timestamp: string;
}

// ============================================================================
// Reaction Payloads
// ============================================================================

export interface ReactionUpdatePayload {
  contentType: 'post' | 'article';
  contentId: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  reactionType: string; // ReactionType: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY'
  action: 'added' | 'removed' | 'changed';
  previousReaction?: string; // Only present when action is 'changed'
  reactionCounts: Record<string, number>;
  timestamp: string;
}

// ============================================================================
// Event System Types
// ============================================================================

export type EventPriority = 'high' | 'normal' | 'low';

export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: EventPriority;
}

export type EventHandler<T = any> = (payload: T) => void;

export type EventUnsubscriber = () => void;

export interface EventMetrics {
  eventsReceived: number;
  eventsProcessed: number;
  errors: number;
  averageProcessingTime: number;
  lastEventTime: number | null;
}

// ============================================================================
// Event Payload Mapping
// ============================================================================

/**
 * Maps each Redis channel to its corresponding payload type
 * This enables type-safe event subscriptions where the payload type
 * is automatically inferred from the channel name
 */
export interface EventPayloadMap {
  // Prediction events
  'prediction:created': PredictionCreatedPayload;
  'prediction:resolved': PredictionResolvedPayload;

  // Betting events
  'bet:placed': BetPlacedPayload;
  'bet:resolved': BetResolvedPayload;

  // Parlay events
  'parlay:placed': ParlayPlacedPayload;
  'parlay:resolved': ParlayResolvedPayload;

  // Balance events
  'balance:update': BalanceUpdatePayload;

  // Pong events
  'pong:wager': PongWagerPayload;
  'pong:payout': PongPayoutPayload;

  // Reaction events
  'post:reaction:update': ReactionUpdatePayload;
  'article:reaction:update': ReactionUpdatePayload;

  // Chat events
  'chat:error': ChatErrorPayload;
  'chat:message': any; // ChatMessageDTO from responses
  'chat:history': any[]; // Array of ChatMessageDTO
  'chat:typing': any; // ChatTypingPayload
  'chat:stopTyping': any; // ChatStopTypingPayload
  'chat:usersOnline': any[]; // ChatUsersOnlinePayload
  'chat:join': any; // ChatJoinPayload
  'chat:leave': any; // ChatLeavePayload

  // Stats events
  'user:stats_update': StatsUpdatePayload;

  // Activity events
  'unified:activity:update': any; // UnifiedActivityEvent
  'unified:activity:response': any[]; // Array of UnifiedActivityEvent

  // Leaderboard events
  'leaderboard:allTime': any;
  'leaderboard:daily': any;
  'leaderboard:rank:update': any;
  'leaderboard:rankChange': any;
  'leaderboard:milestone': any;
  'leaderboard:position:reached': any;
  'leaderboard:comeback:major': any;
  'leaderboard:comeback:moderate': any;
}

/**
 * Helper type to extract the payload type for a given Redis channel
 * Usage: EventPayload<'bet:placed'> returns BetPlacedPayload
 * Falls back to `any` for channels not in the map
 */
export type EventPayload<T extends string> = T extends keyof EventPayloadMap
  ? EventPayloadMap[T]
  : any;
