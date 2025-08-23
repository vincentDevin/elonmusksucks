import type {
  User as PrismaUser,
  EmailVerification as PrismaEmailVerification,
  PasswordReset as PrismaPasswordReset,
  Prediction as PrismaPrediction,
  PredictionOption as PrismaPredictionOption,
  Bet as PrismaBet,
  AITweet as PrismaAITweet,
  RefreshToken as PrismaRefreshToken,
  LeaderboardEntry as PrismaLeaderboardEntry,
  Badge as PrismaBadge,
  UserBadge as PrismaUserBadge,
  Follow as PrismaFollow,
  Parlay as PrismaParlay,
  ParlayLeg as PrismaParlayLeg,
  Transaction as PrismaTransaction,
  Role as PrismaRole,
  BetOption as PrismaBetOption,
  BetStatus as PrismaBetStatus,
  TransactionType as PrismaTransactionType,
  // Homepage Timeline Models
  FeedSource as PrismaFeedSource,
  FeedStatus as PrismaFeedStatus,
  Article as PrismaArticle,
  ArticleStatus as PrismaArticleStatus,
  Tweet as PrismaTweet,
  PredictionSourceLink as PrismaPredictionSourceLink,
} from '@prisma/client';

// ——— Enums ——————————————————————————————————————————————
export type Role            = PrismaRole;
export type BetOption       = PrismaBetOption;
export type BetStatus       = PrismaBetStatus;
export type TransactionType = PrismaTransactionType;
export type FeedStatus      = PrismaFeedStatus;
export type ArticleStatus   = PrismaArticleStatus;

// ——— User ——————————————————————————————————————————————
export type DbUser     = PrismaUser;
export type PublicUser = Omit<
  PrismaUser,
  | 'passwordHash'
  | 'emailVerifications'
  | 'passwordResets'
  | 'refreshTokens'
>;

// ——— EmailVerification & PasswordReset (internal) ————————————————
export type DbEmailVerification = PrismaEmailVerification;
export type DbPasswordReset      = PrismaPasswordReset;

// ——— Prediction & Options ————————————————————————————————————————
export type DbPrediction   = PrismaPrediction;
export type PublicPrediction = Pick<
  PrismaPrediction,
  | 'id'
  | 'title'
  | 'description'
  | 'category'
  | 'expiresAt'
  | 'resolved'
  | 'resolvedAt'
  | 'approved'
  | 'type'
  | 'threshold'
  | 'creatorId'
  | 'createdAt'
> & {
  /** which option actually won when resolved */
  winningOptionId?: number | null;
};

export type DbPredictionOption     = PrismaPredictionOption;
export type PublicPredictionOption = Pick<
  PrismaPredictionOption,
  | 'id'
  | 'label'
  | 'odds'
  | 'predictionId'
  | 'createdAt'
>;

export const PredictionType = {
  MULTIPLE:   'MULTIPLE',
  BINARY:     'BINARY',
  OVER_UNDER: 'OVER_UNDER',
} as const;
export type PredictionType =
  (typeof PredictionType)[keyof typeof PredictionType];

// ——— Bet ——————————————————————————————————————————————
export type DbBet     = PrismaBet;
export type PublicBet = Omit<Pick<
  PrismaBet,
  | 'id'
  | 'userId'
  | 'predictionId'
  | 'amount'
  | 'oddsAtPlacement'
  | 'potentialPayout'
  | 'status'
  | 'optionId'
  | 'won'
  | 'payout'
  | 'createdAt'
>, 'amount' | 'potentialPayout' | 'payout'> & {
  amount: string;
  potentialPayout: string | null;
  payout: string | null;
};

export interface BetWithUser extends PublicBet {
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  /** optional contextual info */
  optionLabel?: string;
  predictionTitle?: string;
}

// ——— Parlay & ParlayLeg ——————————————————————————————————————
// NEW: Unified parlay leg with user details for client/server
export type ParlayLegWithUser = {
  parlayId: number;
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey?: string | null;
  };
  stake: string;
  optionId: number;
  createdAt: Date;
  /** parent prediction id for context */
  predictionId?: number;
  optionLabel?: string;
  predictionTitle?: string;
};

export type DbParlay     = PrismaParlay;
export type PublicParlay = Omit<Pick<
  PrismaParlay,
  | 'id'
  | 'userId'
  | 'amount'
  | 'combinedOdds'
  | 'potentialPayout'
  | 'status'
  | 'createdAt'
>, 'amount' | 'potentialPayout'> & {
  amount: string;
  potentialPayout: string;
};

export type DbParlayLeg     = PrismaParlayLeg;
export interface PublicParlayLeg {
  id:            number;
  parlayId:      number;
  optionId:      number;
  oddsAtPlacement:number;
  createdAt:     string;
  parlay: {
    id:            number;
    user:          { id: number; name: string };
    amount:        string;
    combinedOdds:  number;
  };
}

// ——— AITweet ——————————————————————————————————————————————
export type DbAITweet    = PrismaAITweet;
export type PublicAITweet = PrismaAITweet;

// ——— RefreshToken (internal) —————————————————————————————————————
export type DbRefreshToken = PrismaRefreshToken;

// ——— LeaderboardEntry —————————————————————————————————————————
export type DbLeaderboardEntry = PrismaLeaderboardEntry;
export interface PublicLeaderboardEntry {
  userId:           number;
  userName:         string;
  avatarUrl:        string | null;
  balance:          string;
  totalBets:        number;
  winRate:          number;
  profitAll:        string;
  profitPeriod:     string;
  roi:              number;
  longestStreak:    number;
  currentStreak:    number;
  parlaysStarted:   number;
  parlaysWon:       number;
  totalParlayLegs:  number;
  parlayLegsWon:    number;
  rankChange:       number | null;
}

// ——— Badge & UserBadge ————————————————————————————————————————
export type DbBadge     = PrismaBadge;
export type PublicBadge = {
  id:         number;
  name:       string;
  description:string | null;
  iconUrl:    string | null;
  createdAt:  string;
};
export type DbUserBadge     = PrismaUserBadge;
export type PublicUserBadge = PublicBadge & { awardedAt: string };

// ——— Follow ——————————————————————————————————————————————
export type DbFollow     = PrismaFollow;
export type PublicFollow = Pick<
  PrismaFollow,
  | 'id'
  | 'followerId'
  | 'followingId'
  | 'createdAt'
>;

// ——— Transaction ————————————————————————————————————————————
export type DbTransaction   = PrismaTransaction;
export type PublicTransaction = Omit<Pick<
  PrismaTransaction,
  | 'id'
  | 'userId'
  | 'type'
  | 'amount'
  | 'balanceAfter'
  | 'relatedBetId'
  | 'relatedParlayId'
  | 'createdAt'
>, 'amount' | 'balanceAfter'> & {
  amount: string;
  balanceAfter: string;
};

// ——— UserStats (internal) ——————————————————————————————————————
export type DbUserStats = {
  id:               number;
  userId:           number;
  // single-bet metrics
  totalBets:        number;
  betsWon:          number;
  betsLost:         number;
  // parlay metrics
  totalParlays:     number;
  parlaysWon:       number;
  parlaysLost:      number;
  totalParlayLegs:  number;
  parlayLegsWon:    number;
  parlayLegsLost:   number;
  // combined metrics  
  totalWagered:     bigint;
  totalWon:         bigint;
  profit:           bigint;
  roi:              number;
  // streak tracking
  currentStreak:    number;
  longestStreak:    number;
  // extras
  mostCommonBet:    string | null;
  biggestWin:       bigint;
  updatedAt:        Date;
};

// ——— User Profile & Stats DTOs ————————————————————————————————————
export interface PublicUserProfile {
  id:               number;
  name:             string;
  role: string;
  muskBucks:        string;
  profileComplete:  boolean;
  rank?:            number;
  bio?:             string | null;
  avatarUrl?:       string | null;
  location?:        string | null;
  timezone?:        string | null;
  notifyOnResolve:  boolean;
  theme:            string;
  twoFactorEnabled: boolean;
  stats: {
    successRate:     number;
    totalPredictions:number;
    currentStreak:   number;
    longestStreak:   number;
  };
  badges:           PublicUserBadge[];
  followersCount:   number;
  followingCount:   number;
  isFollowing:      boolean;
}

export type UserStatsDTO = {
  totalBets:        number;
  betsWon:          number;
  betsLost:         number;
  totalParlays:     number;
  parlaysWon:       number;
  parlaysLost:      number;
  totalParlayLegs:  number;
  parlayLegsWon:    number;
  parlayLegsLost:   number;
  totalWagered:     string;
  totalWon:         string;
  profit:           string;
  roi:              number;
  currentStreak:    number;
  longestStreak:    number;
  mostCommonBet:    string | null;
  biggestWin:       string;
  updatedAt:        string;
};

// ——— Feed Posts & Activity ————————————————————————————————————
export type DbUserPost = {
  id:         number;
  authorId:   number;
  ownerId:    number;
  content:    string;
  parentId:   number | null;
  createdAt:  Date;
  updatedAt:  Date;
  children?:  DbUserPost[];
  authorName?:string;
};
export type UserFeedPost = {
  id:         number;
  authorId:   number;
  ownerId:    number;
  content:    string;
  parentId:   number | null;
  createdAt:  string;
  updatedAt:  string;
  children?:  UserFeedPost[];
  authorName?:string;
};

// ——— Legacy Activity (for backwards compatibility) ————————————————————
export type DbUserActivity = {
  id:        number;
  userId:    number;
  type:      string;
  details?:  unknown;
  createdAt: Date;
};
export type UserActivity = {
  id:        number;
  userId:    number;
  type:      string;
  details?:  unknown;
  createdAt: string;
};

// ——— Normalized Activity Events ————————————————————————————————————
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
} as const;
export type ActivityEventType = (typeof ActivityEventType)[keyof typeof ActivityEventType];

export const ActivityPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
export type ActivityPriority = (typeof ActivityPriority)[keyof typeof ActivityPriority];

export type ActivityEventMeta = {
  // Display context
  title?: string;                // prediction title, post content preview  
  amount?: string;               // bet amount, payout amount, prize value
  option?: string;               // chosen option label
  category?: string;             // prediction category
  streak?: number;               // winning/losing streak context
  odds?: number;                 // odds at placement for context
  
  // Rich context for navigation/actions
  predictionId?: number;
  postId?: number;
  badgeId?: number;
  parlayId?: number;
  
  // Additional display hints
  isWin?: boolean;               // for styling win/loss events
  isHighValue?: boolean;         // for highlighting big bets/wins
};

export type NormalizedActivityEvent = {
  id: string;                    // unique event ID (string for better uniqueness)
  type: ActivityEventType;       // strongly-typed event types
  timestamp: string;             // ISO timestamp
  user: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
  meta: ActivityEventMeta;       // event-specific normalized metadata
  priority: ActivityPriority;    // for filtering/sorting in UI
};

// Helper type for creating events (optional fields)
export type CreateActivityEvent = Omit<NormalizedActivityEvent, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: string;
};

// ——— Moderation Types ——————————————————————————————————————————————
export enum BanType {
  TEMPORARY = 'TEMPORARY',
  PERMANENT = 'PERMANENT'
}

// ——— Prediction Full Type (Extended) ——————————————————————————————————————————————
export interface PredictionFull extends PublicPrediction {
  options: PublicPredictionOption[];
  bets: BetWithUser[];
  parlayLegs?: ParlayLegWithUser[];
  sourceLinks?: PublicPredictionSourceLink[];
}

// ——— Admin DTOs ——————————————————————————————————————————————
export interface AdminBet extends PublicBet {
  userName:   string;
  prediction: PublicPrediction;
}
export interface AdminTransaction extends PublicTransaction {
  userName:   string;
}

// ——— Homepage Timeline Types ——————————————————————————————————————————————
export type DbFeedSource = PrismaFeedSource;
export type PublicFeedSource = {
  id: number;
  name: string;
  url: string;
  siteUrl: string | null;
  status: FeedStatus;
  allowImages: boolean;
  lastFetchedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMsg: string | null;
  fetchCount: number;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DbArticle = PrismaArticle;
export type PublicArticle = {
  id: number;
  feedId: number;
  guid: string | null;
  url: string;
  canonicalUrl: string | null;
  title: string;
  excerpt: string | null;
  leadImageUrl: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  hash: string;
  status: ArticleStatus;
  tags: string[];
  modNotes: string | null;
  reactions: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
  feed?: PublicFeedSource;
};

export type DbTweet = PrismaTweet;
export type PublicTweet = {
  id: string;
  postedAt: string;
  text: string;
  permalink: string;
  authorHandle: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quotesCount: number;
  status: string;
  fetchedAt: string;
};

export type DbPredictionSourceLink = PrismaPredictionSourceLink;
export type PublicPredictionSourceLink = {
  id: number;
  predictionId: number;
  articleId: number | null;
  tweetId: string | null;
  url: string;
  title: string | null;
  publisher: string | null;
  capturedAt: string;
  prediction?: PublicPrediction;
  article?: PublicArticle;
  tweet?: PublicTweet;
};

// Timeline unified content types
export type TimelineItem = {
  id: string; // composite: 'article-123' or 'tweet-456'
  type: 'article' | 'tweet';
  timestamp: string;
  content: {
    title: string;
    excerpt?: string;
    url: string;
    imageUrl?: string | null;
    author?: string; // feed name or twitter handle
    source?: string; // domain or 'Twitter'
  };
  engagement: {
    reactions: number;
    comments: number;
  };
  tags: string[];
  sourceLinks?: PublicPredictionSourceLink[];
};

// Admin management types
export type FeedManagementData = {
  totalFeeds: number;
  activeFeeds: number;
  pausedFeeds: number;
  blockedFeeds: number;
  totalArticles: number;
  pendingArticles: number;
  approvedArticles: number;
  rejectedArticles: number;
  lastFetchedAt: string | null;
  averageFetchTime: number; // in minutes
  errorRate: number; // percentage
};

export type ArticleModerationData = {
  id: number;
  title: string;
  url: string;
  feedName: string;
  publishedAt: string | null;
  status: ArticleStatus;
  tags: string[];
  excerpt: string | null;
  modNotes: string | null;
  leadImageUrl: string | null;
};

// API Request/Response Types
export type CreateFeedRequest = {
  name: string;
  url: string;
  siteUrl?: string;
  allowImages?: boolean;
};

export type UpdateFeedRequest = Partial<CreateFeedRequest> & {
  status?: FeedStatus;
};

export type UpdateArticleRequest = {
  status: ArticleStatus;
  tags?: string[];
  modNotes?: string;
};

export type TimelineResponse = {
  items: TimelineItem[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
};

export type FeedStatsResponse = {
  feedId: number;
  totalArticles: number;
  recentArticles: number;
  errorRate: number;
  avgFetchTime: number;
  lastSuccess: string | null;
  lastError: string | null;
};

// OPML Import/Export Types
export type OPMLFeed = {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  type?: string;
};

export type OPMLCategory = {
  title: string;
  feeds: OPMLFeed[];
};

export type OPMLDocument = {
  title: string;
  categories: OPMLCategory[];
  feeds: OPMLFeed[]; // Root level feeds
};

export type OPMLImportResult = {
  imported: number;
  duplicates: number;
  errors: Array<{
    url: string;
    error: string;
  }>;
};

// Worker Job Types
export type FeedFetchJob = {
  feedId: number;
  url: string;
  forceRefresh?: boolean;
};

export type TwitterFetchJob = {
  tweetId: string;
  url: string;
};

export type ArticleProcessingJob = {
  articleId: number;
  extractImages?: boolean;
  generateTags?: boolean;
};

// ——— Pong Game Types ——————————————————————————————————————————————

// ——— Optimized Pong Game Types ——————————————————————————————————————————————
// Designed for minimal memory usage and fast operations

export interface Player {
  id: number;
  name: string;
  paddleY: number;
  score: number;
  ping: number;
  lastInputTime: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export type GameStatus = 'waiting' | 'waiting_for_opponent' | 'waiting_for_ready' | 'countdown' | 'active' | 'paused' | 'ended';
export type MatchType = 'ai' | 'pvp';
export type LobbyStatus = 'waiting' | 'full';

export interface GameState {
  id: string;
  players: [Player, Player | null]; // Always exactly 2 slots
  ball: Ball;
  status: GameStatus;
  tick: number;
  wager: number;
  isAI: boolean;
  aiDifficulty?: keyof typeof AI_DIFFICULTIES;
  aiState?: {
    targetY: number;
    lastReactionTime: number;
    errorBias: number; // Random bias for imperfect play
  };
  readyStates?: [boolean, boolean]; // Ready status for each player [player0, player1]
  startTime: number;
}

export interface LobbyEntry {
  id: string;
  creatorId: number;
  creatorName: string;
  wager: number;
  type: MatchType;
  status: LobbyStatus;
  createdAt: number;
}

export interface ActiveGameEntry {
  id: string;
  player1Name: string;
  player2Name: string | null; // null for AI
  type: MatchType;
  wager: number;
  pot: number;
  scores: [number, number];
  status: GameStatus;
  spectatorCount: number;
  startedAt: number;
  canSpectate: boolean;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  paddleY: number; // Client's authoritative paddle position
  seq: number; // Sequence number for input ordering
  timestamp: number;
}

// Socket Event Types (Client → Server)
export interface ClientEvents {
  auth: { token: string };
  join_lobby: {};
  create_match: { wager: number; type: MatchType; aiDifficulty?: string };
  join_match: { matchId: string };
  player_input: PlayerInput;
  player_ready: { ready: boolean };
  leave_match: {};
  spectate_match: { gameId: string };
}

// Socket Event Types (Server → Client)
export interface ServerEvents {
  auth_result: { success: boolean; player?: Player; error?: string };
  lobby_state: { lobbies: LobbyEntry[] };
  active_games: { games: ActiveGameEntry[] };
  stats_update: { playersOnline: number; activeGames: number; availableMatches: number };
  match_joined: { gameId: string; playerSlot: 0 | 1; opponent?: Player; wager: number; pot: number };
  match_waiting: { gameId: string; message: string };
  opponent_joined: { opponent: Player };
  ready_state_update: { readyStates: [boolean, boolean] };
  countdown: { seconds: number; message?: string };
  spectator_joined: { gameId: string; spectatorCount: number };
  game_state: {
    ball: Ball;
    opponentPaddleY?: number; // Only for players, not spectators
    player1PaddleY?: number; // For spectators
    player2PaddleY?: number; // For spectators
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

// Database result types
export interface MatchResult {
  matchId: string;
  winnerId: number | null;
  winnerSlot: 0 | 1 | null;
  playerOneId: number;
  playerTwoId: number | null;
  finalScores: [number, number];
  duration: number;
  wagerAmount: number;
  payoutAmount: number;
  reason: 'completed' | 'forfeit' | 'disconnect' | 'error';
}

// Physics constants (same as before but grouped for clarity)
export const PONG_PHYSICS = {
  FIELD_WIDTH: 800,
  FIELD_HEIGHT: 400,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 80,
  PADDLE_SPEED: 960, // pixels per second (960/128 = 7.5 pixels per frame - faster for accelerating ball)
  BALL_SIZE: 10,
  BALL_SPEED_INITIAL: 384, // 384/128 = 3.0 pixels per frame (smooth whole pixel movement)
  BALL_SPEED_INCREMENT: 32, // 32/128 = 0.25 pixels per frame increment
  WINNING_SCORE: 5,
  TICK_RATE: 128, // FPS
  NETWORK_UPDATE_RATE: 128, // Broadcast every tick for smoothest experience
} as const;

// AI difficulty settings - Balanced for fair gameplay
export const AI_DIFFICULTIES = {
  easy: { reactionTime: 450, accuracy: 0.45, speed: 0.35 },      // Very beatable - slow reactions, many errors
  medium: { reactionTime: 200, accuracy: 0.82, speed: 0.85 },    // Moderate challenge - more competitive but fair
  hard: { reactionTime: 120, accuracy: 0.88, speed: 0.92 },      // Challenging but beatable - skilled play required
  impossible: { reactionTime: 80, accuracy: 0.95, speed: 1.0 },  // Expert level - very difficult but humanly possible
} as const;

export type AIDifficulty = keyof typeof AI_DIFFICULTIES;

// ——— Achievement Events ————————————————————————————————————
export type AchievementEventKey =
  | 'bet:placed'
  | 'bet:resolved'
  | 'prediction:resolved'
  | 'payout:completed'
  | 'parlay:won'
  | 'pong:match:recorded'
  | 'pong:elo:update'
  | 'user:login'
  | 'user:follow'
  | 'prediction:created';

export interface AchievementEvent {
  key: AchievementEventKey;
  userId: number;
  occurredAt: string; // ISO 8601
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

// Typed payloads for each event
export interface BetPlacedPayload {
  betId: number;
  predictionId: number;
  amount: number;
  odds: number;
  category: string;
  optionLabel: string;
}

export interface BetResolvedPayload {
  betId: number;
  predictionId: number;
  won: boolean;
  payout: number;
  profit: number;
}

export interface PredictionResolvedPayload {
  predictionId: number;
  category: string;
  winningOptionId: number;
  totalPool: number;
}

export interface PayoutCompletedPayload {
  userId: number;
  betId?: number;
  parlayId?: number;
  amount: number;
  profit: number;
  roi: number;
  isBiggestWin?: boolean;
}

export interface ParlayWonPayload {
  parlayId: number;
  legs: number;
  combinedOdds: number;
  stake: number;
  payout: number;
  profit: number;
}

export interface PongMatchRecordedPayload {
  matchId: number;
  opponentId: number | null; // null for AI
  aiDifficulty?: 'easy' | 'medium' | 'hard' | 'impossible';
  result: 'win' | 'loss';
  playerScore: number;
  opponentScore: number;
  wager?: number;
  isPerfectGame: boolean;
  isComeback: boolean;
  rageQuit: boolean;
  duration: number; // seconds
}

export interface PongEloUpdatePayload {
  userId: number;
  oldElo: number;
  newElo: number;
  delta: number;
  matchId: number;
}

export interface UserLoginPayload {
  userId: number;
  consecutiveDays: number;
  isFirstLogin: boolean;
}

export interface UserFollowPayload {
  followerId: number;
  followingId: number;
}

export interface PredictionCreatedPayload {
  predictionId: number;
  category: string;
  type: PredictionType;
  creatorId: number;
}

// Achievement rule types
export type AchievementProgressKind = 'count' | 'streak' | 'threshold' | 'binary';

export interface AchievementRule {
  eventKeys: AchievementEventKey[];
  progress: {
    kind: AchievementProgressKind;
    incrementIf?: Record<string, unknown>;
    setIf?: Record<string, unknown>;
    resetIf?: Record<string, unknown>;
  };
  unlockWhen: Record<string, unknown>;
  counters?: string[];
}

// Achievement categories and rarity
export type AchievementCategory = 'betting' | 'pong' | 'social' | 'system';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'shame';

// User achievement progress
export interface UserAchievementProgress {
  userId: number;
  achievementId: number;
  progress: number;
  progressMax: number;
  unlockedAt: string | null;
  meta?: Record<string, unknown>;
}
