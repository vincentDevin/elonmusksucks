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
  BanType as PrismaBanType,
  ModerationAction as PrismaModerationAction,
} from '@prisma/client';

// ——— Pagination & Query Types ——————————————————————————————————————————————
export interface PageQuery {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface CursorPage<T> {
  items: T[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type SortOrder = typeof SORT_ORDERS[keyof typeof SORT_ORDERS];

export interface DateRange {
  from?: Date | string;
  to?: Date | string;
}

// ——— Socket ACK Payloads ——————————————————————————————————————————————
export interface AckOk {
  success: true;
  data?: unknown;
}

export interface AckErr {
  success: false;
  error: string;
  code?: string;
}

export type AckResult<T = unknown> = AckOk & { data?: T } | AckErr;

// Node-style ACK callback type (current pattern in betSocketHandlers.ts)
export type AckCallback = (err: string | null, data?: unknown) => void;

// Object-style ACK callback type (alternative pattern)
export type AckCallbackObj<T = unknown> = (result: AckResult<T>) => void;

// ——— Auth REST Payloads ————————————————————————————————————————————
export interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
}

export interface LoginPayload {
  email?: string;
  password?: string;
}

export interface PasswordResetRequestPayload {
  email?: string;
}

export interface PasswordResetPayload {
  token?: string;
  newPassword?: string;
}

// ——— Predictions REST Payloads ————————————————————————————————————————————
export interface CreatePredictionPayload {
  title: string;
  description: string;
  category: string;
  expiresAt: string;
  options?: Array<{ label: string }>;
  type: PredictionType;
  threshold?: number;
}

export interface ResolvePredictionPayload {
  winningOptionId: number;
}

// ——— Users REST Payloads ———————————————————————————————————————————————————
export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  profileImageUrl?: string;
}

export interface CreateUserPostPayload {
  content: string;
  parentId?: number;
}

// ——— Queue Options & Names ————————————————————————————————————————————————————
export const QUEUE_NAMES = {
  LEADERBOARD_REFRESH: 'leaderboard-refresh',
  LEADERBOARD_EVENTS: 'leaderboard-events',
  PAYOUTS: 'payouts',
  FEED: 'feed',
} as const;
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export interface QueueOptions {
  connection: any;
  concurrency?: number;
  defaultJobOptions?: JobOptions;
}

export interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: string | { type: string; delay: number };
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  priority?: number;
}

export interface RetryPolicy {
  attempts: number;
  backoffType: 'fixed' | 'exponential';
  backoffDelay: number;
}

// ——— Primitives & Branding ———————————————————————————————————————————————————
declare const UserIdBrand: unique symbol;
export type UserId = number & { readonly [UserIdBrand]: true };

declare const PredictionIdBrand: unique symbol;
export type PredictionId = number & { readonly [PredictionIdBrand]: true };

export type ISODateString = string & { readonly __isoDateBrand: true };
export type TimestampMs = number & { readonly __timestampMsBrand: true };

// Helper functions for creating branded types (zero runtime cost)
export const createUserId = (id: number): UserId => id as UserId;
export const createPredictionId = (id: number): PredictionId => id as PredictionId;
export const createISODateString = (date: string): ISODateString => date as ISODateString;
export const createTimestampMs = (ms: number): TimestampMs => ms as TimestampMs;

// ——— Admin Repository Types ————————————————————————————————————————————————————
export interface ExecutiveDashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalPredictions: number;
    totalBets: number;
    totalRevenue: number;
    totalPayouts: number;
    netProfit: number;
    avgUserValue: number;
  };
  growthMetrics: {
    userGrowthRate: number;
    revenueGrowthRate: number;
    engagementGrowthRate: number;
    retentionRate: number;
  };
  currentPeriodComparison: {
    newUsers: { current: number; previous: number; change: number };
    revenue: { current: number; previous: number; change: number };
    bets: { current: number; previous: number; change: number };
    engagement: { current: number; previous: number; change: number };
  };
}

export interface CustomReportData {
  reportId: string;
  title: string;
  data: Array<Record<string, any>>;
  metadata: {
    totalRows: number;
    generatedAt: string;
    parameters: Record<string, any>;
  };
}

// ===============================================
// Report Filters & Search Parameters
// ===============================================

/** Enhanced search and pagination parameters for user management */
export interface UserSearchParams {
  search?: string; // Search name/email with fuzzy matching
  role?: ('ADMIN' | 'USER' | 'MODERATOR')[]; // Filter by multiple roles
  active?: boolean; // Filter by active status
  bannedOnly?: boolean; // Show only banned users
  page: number; // Pagination support (0-based)
  limit: number; // Results per page (max 100)
  sortBy?: 'name' | 'email' | 'createdAt' | 'muskBucks' | 'role';
  sortOrder?: 'asc' | 'desc';
}

/** Prediction search and filtering parameters */
export interface PredictionSearchParams {
  search?: string; // Search title and description
  category?: string[]; // Filter by categories
  status?: ('pending' | 'approved' | 'rejected' | 'resolved')[];
  creatorId?: number; // Filter by specific creator
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  bettingVolume?: {
    min?: number;
    max?: number;
  };
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'title' | 'category' | 'expiresAt' | 'bettingVolume';
  sortOrder?: 'asc' | 'desc';
}

/** Financial search and filtering parameters */
export interface FinancialSearchParams {
  search?: string; // Search user names, prediction titles
  userId?: number;
  predictionId?: number;
  betType?: ('single' | 'parlay')[];
  status?: ('pending' | 'won' | 'lost' | 'refunded')[];
  transactionType?: ('DEBIT' | 'CREDIT')[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  suspiciousOnly?: boolean;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'amount' | 'potentialPayout' | 'userName' | 'profit';
  sortOrder?: 'asc' | 'desc';
}

/** Badge search and filtering parameters */
export interface BadgeSearchParams {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  rarity?: ('common' | 'rare' | 'epic' | 'legendary')[];
  userCount?: {
    min?: number;
    max?: number;
  };
  page: number;
  limit: number;
  sortBy?: 'name' | 'createdAt' | 'userCount' | 'category';
  sortOrder?: 'asc' | 'desc';
}

/** Simple key/value map for query filters from req.query */
export interface QueryParams {
  [key: string]: any;
}

// Export grouped as ReportFilters for easy consumption
export type ReportFilters = UserSearchParams | PredictionSearchParams | FinancialSearchParams | BadgeSearchParams;

// ===============================================
// User Summary Rows & Table Views
// ===============================================

/** Paginated user results with metadata */
export interface PaginatedUsers {
  users: DetailedUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Enhanced user data with aggregated information */
export interface DetailedUser {
  // Note: In practice this extends the Prisma User model
  // but we define it standalone to avoid Prisma imports in @ems/types
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
  muskBucks: bigint;
  profileComplete: boolean;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  timezone?: string | null;
  notifyOnResolve: boolean;
  theme: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date | null;
  emailVerified: boolean;
  feedPrivate: boolean;
  
  // Enhanced admin fields  
  banStatus?: {
    isBanned: boolean;
    banType?: string;
    reason?: string;
    expiresAt?: Date;
  };
  stats?: {
    totalBets: number;
    totalWagered: number;
    totalWon: number;
    winRate: number;
  };
  recentActivity?: {
    lastLogin?: Date;
    lastBet?: Date;
    totalLogins: number;
  };
  badges?: any[]; // Badge type from Prisma
}

// ===============================================
// Moderation Types
// ===============================================

/** Data for creating a user ban */
export interface CreateBanData {
  userId: number;
  banType: PrismaBanType;
  reason: string;
  expiresAt?: Date;
  isActive?: boolean;
}

/** Data for creating a moderation log entry */
export interface CreateModerationLogData {
  moderatorId: number;
  targetUserId?: number;
  action: PrismaModerationAction;
  reason?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

/** Request data for banning a user */
export interface BanRequest {
  userId: number;
  reason: string;
  durationDays?: number; // undefined = permanent
  moderatorId: number;
}

// ===============================================
// Leaderboard Service Types
// ===============================================

/** Trigger for leaderboard updates with priority and metadata */
export interface LeaderboardTrigger {
  event: 'bet:resolved' | 'prediction:completed' | 'user:milestone' | 'scheduled:refresh';
  priority: 'immediate' | 'batched' | 'scheduled';
  userId?: number;
  affectedMetrics: ('profit' | 'winRate' | 'streak' | 'volume')[];
  metadata?: Record<string, any>;
}

/** Core metrics tracked by the leaderboard system */
export interface LeaderboardMetrics {
  profit: number;
  winRate: number;
  streak: number;
  volume: number;
  roi: number;
}

/** Configuration for scheduled leaderboard refreshes */
export interface ScheduleConfig {
  interval: string; // cron expression
  timezone?: string;
  enabled: boolean;
}

// Export grouped as LeaderboardServiceTypes for easy consumption
export type LeaderboardServiceTypes = LeaderboardTrigger | LeaderboardMetrics | ScheduleConfig;

// ——— Enums ——————————————————————————————————————————————
export type Role            = PrismaRole;
export type BetOption       = PrismaBetOption;
export type BetStatus       = PrismaBetStatus;
export type TransactionType = PrismaTransactionType;
export type FeedStatus      = PrismaFeedStatus;
export type ArticleStatus   = PrismaArticleStatus;
export type ModerationAction = PrismaModerationAction;

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

// ——— Socket.IO Room Names & Event Types ———————————————————————————————

/**
 * Socket.IO room names for targeted event emission
 */
export const SOCKET_ROOMS = {
  PREDICTIONS: 'predictions',
  BETTING: 'betting',
  LEADERBOARD: 'leaderboard',
  ADMIN: 'admin',
  ACHIEVEMENTS: 'achievements',
} as const;
export type SocketRoom = typeof SOCKET_ROOMS[keyof typeof SOCKET_ROOMS];

/**
 * Redis channel names for event publishing
 */
export const REDIS_CHANNELS = {
  PREDICTION_CREATE: 'prediction:create',
  PREDICTION_RESOLVE: 'prediction:resolve',
  BET_PLACE: 'bet:place',
  PARLAY_PLACE: 'parlay:place',
  ODDS_UPDATE_ENHANCED: 'odds:update:enhanced',
  LEADERBOARD_ALL_TIME: 'leaderboard:allTime',
  LEADERBOARD_DAILY: 'leaderboard:daily',
  LEADERBOARD_RANK_CHANGE: 'leaderboard:rankChange',
  LEADERBOARD_MILESTONE: 'leaderboard:milestone',
  STATS_UPDATE: 'stats:update',
  STATS_REFRESH: 'stats:refresh',
  RANKING_CHANGE: 'ranking:change',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  USER_STATS_UPDATE: 'user:stats_update',
} as const;
export type RedisChannel = typeof REDIS_CHANNELS[keyof typeof REDIS_CHANNELS];

/**
 * Socket.IO event names with type safety
 * Maps to the events emitted in redisEventHandlers.ts
 */
export enum SocketEvent {
  // Prediction events
  PREDICTION_CREATED = 'predictionCreated',
  PREDICTION_RESOLVED = 'predictionResolved',
  ODDS_UPDATED = 'oddsUpdatedEnhanced',
  
  // Betting events  
  BET_PLACED = 'betPlaced',
  PARLAY_PLACED = 'parlayPlaced',
  
  // Leaderboard events
  LEADERBOARD_ALL_TIME = 'leaderboardAllTime',
  LEADERBOARD_DAILY = 'leaderboardDaily',
  LEADERBOARD_RANK_CHANGE = 'leaderboard:rankChange',
  LEADERBOARD_MILESTONE = 'leaderboard:milestone',
}

/**
 * Event bus interface for Redis publish/subscribe abstraction
 * Enables dependency injection in services
 */
export interface IEventBus {
  /**
   * Publish event to Redis channel
   */
  publish<T>(channel: string, payload: T): Promise<void>;
}

// Event coalescing interfaces
export interface CoalescedEvent<T = any> {
  channel: string;
  payload: T;
  timestamp: string;
  userId?: number;
}

export interface EventCoalescerConfig {
  windowMs: number; // Time window for batching
  maxBatchSize: number; // Maximum events per batch
}

export interface IEventCoalescer {
  addEvent<T>(channel: string, payload: T, userId?: number): Promise<void>;
  flush(): Promise<void>;
}

// Redis connection pooling interfaces
export interface RedisPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
}

export interface IRedisPool {
  getConnection(): Promise<any>;
  releaseConnection(connection: any): Promise<void>;
  destroy(): Promise<void>;
  getStats(): { active: number; idle: number; total: number };
}

// Socket.IO rate limiting interfaces
export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  keyGenerator?: (userId: number, eventName: string) => string;
}

export interface IRateLimiter {
  checkLimit(userId: number, eventName: string): Promise<{ allowed: boolean; resetTime?: number }>;
  reset(userId: number, eventName: string): Promise<void>;
}

// Socket.IO cleanup management interfaces
export interface SocketEventListener {
  event: string;
  handler: Function;
  cleanup?: Function;
}

export interface ISocketCleanupManager {
  registerHandler(socketId: string, event: string, handler: Function, cleanup?: Function): void;
  cleanupSocket(socketId: string): Promise<void>;
  getListenerCount(socketId?: string): number;
}

// Backpressure handling interfaces
export interface BackpressureQueueConfig {
  maxConcurrency: number;  // Max concurrent operations
  maxQueueSize: number;    // Max queued operations
  timeoutMs: number;       // Operation timeout
  priorityLevels?: number; // Priority levels (default: 3)
}

export interface QueuedOperation<T = any> {
  id: string;
  priority: number;        // Higher number = higher priority
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

export interface IBackpressureQueue {
  enqueue<T>(operation: () => Promise<T>, priority?: number): Promise<T>;
  getStats(): { queued: number; running: number; capacity: number };
  drain(): Promise<void>;
}

// ——— Socket Event Names ———————————————————————————————————————

export enum AchievementSocketEvents {
  UNLOCKED = 'achievement:unlocked',
  PROGRESS = 'achievement:progress', 
  CELEBRATION = 'achievement:celebration',
  BATCH_UNLOCKED = 'achievement:batch_unlocked'
}

export enum StatsSocketEvents {
  CURRENT = 'stats:current',
  ERROR = 'stats:error',
  UPDATED = 'stats:updated',
  RANKING = 'stats:ranking',
  ACHIEVEMENT = 'stats:achievement',
  REFRESHED = 'stats:refreshed',
  RANKING_CHANGED = 'ranking:changed',
  ACHIEVEMENT_UNLOCKED = 'achievement:unlocked'
}

// ——— Socket Payloads ——————————————————————————————————————

export interface StatsUpdatePayload {
  userId: number;
  changes: {
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
  timestamp: string;
}

export interface RankingChangePayload {
  userId: number;
  oldRank: number;
  newRank: number;
  change: number;
  category: 'allTime' | 'daily';
  percentile: number;
}

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

// ——— BullMQ Job Data Types —————————————————————————————————————

export interface RefreshJobData {
  trigger?: any; // LeaderboardTrigger from service
  batchData?: Record<string, any[]>;
  config?: any;
}

export interface IncrementalUpdateData {
  userId: number;
  metrics: Record<string, any>;
  timestamp: string;
}

export interface BatchUserUpdateData {
  userId: number;
  triggers: any[];
  timestamp: string;
}

export interface FeedFetchJobData {
  feedId: number;
  url: string;
  forceRefresh?: boolean;
}

export interface FeedHealthCheckData {
  feedId: number;
  checkConnectivity?: boolean;
}

export interface PayoutJobData {
  predictionId: number;
  winningOptionId: number;
}

// ——— Service Interface Types ——————————————————————————————————

export interface AchievementTrigger {
  type:
    | 'bet_placed'
    | 'bet_won'
    | 'bet_lost'
    | 'parlay_completed'
    | 'prediction_created'
    | 'user_followed'
    | 'streak_updated'
    | 'accuracy_updated'
    | 'volume_updated'
    | 'profit_updated'
    | 'ranking_updated';
  userId: number;
  data: Record<string, any>;
}

export interface AchievementProgress {
  id: string; // Changed to string for frontend compatibility
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Achievement {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

// ——— Pong Service Interface Types ————————————————————————————————

export interface EloChangeComponents {
  skillChange: number;
  economyChange: number;
  economyComponent: number; // Added missing property
  totalChange: number;
  newRating: number;
  newTier: string;
}

export interface EloCalculationInput {
  playerElo: number;
  opponentElo: number;
  playerWon: boolean;
  wagerAmount: bigint;
  amountWon: bigint;
  isAiOpponent?: boolean;
  isPerfectGame?: boolean; // 11-0 victory
}

export interface PongMatchResult {
  matchId: string;
  winnerId: number;
  loserId?: number;
  winnerScore: number;
  loserScore: number;
  wagerAmount: bigint;
  payoutAmount: bigint;
  aiDifficulty?: any; // PongDifficulty from @prisma/client
  gameDuration?: number;
  winnerPing?: number;
  loserPing?: number;
}

export interface PongStatsUpdate {
  userId: number;
  won: boolean;
  wagerAmount: bigint;
  amountWon: bigint;
  opponentId?: number;
  opponentElo?: number;
  aiDifficulty?: any; // PongDifficulty from @prisma/client
  isPerfectGame: boolean;
  isComeback: boolean;
  gameDuration?: number;
  avgPing?: number;
}

// ——— User Stats Service Interface Types ——————————————————————————

export interface CategoryAccuracy {
  category: string;
  accuracy: number;
  totalBets: number;
  wins: number;
}

export interface Streak {
  type: 'win' | 'lose';
  count: number;
  isActive: boolean;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface CategoryStats {
  category: string;
  betCount: number;
  winRate: number;
  profitLoss: number;
  avgBetSize: number;
}

export interface UserRanking {
  rank: number | null;
  percentile: number;
  rankChange: number | null;
  totalUsers: number;
  category: 'allTime' | 'daily';
}

export interface EnhancedUserStats {
  // Performance metrics
  totalBets: number;
  winRate: number;
  profitLoss: number;
  categoryAccuracy: CategoryAccuracy[];
  currentStreak: Streak;
  bestCategory: string;
  totalWagered: number;
  avgBetSize: number;

  // Ranking data
  ranking: {
    allTime: UserRanking;
    daily: UserRanking;
  };

  // Achievement progress
  achievementProgress: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    isCompleted: boolean;
  }>;
  achievementCompletionRate: number;

  // Trend data
  weeklyVolume: TrendData[];
  monthlyProfitLoss: TrendData[];
  categoryStats: CategoryStats[];
}

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

// API Response Types
export interface APIResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Activity Stream Service Types
export interface ActivityEventData {
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  isPersonal?: boolean;
  priority?: 'low' | 'medium' | 'high';
  relatedUserId?: number;
  predictionId?: number;
  betId?: number;
}

export interface ActivityStreamQuery {
  userId?: number;
  includePersonal?: boolean;
  includePublic?: boolean;
  limit?: number;
  offset?: number;
  types?: string[];
  priority?: 'low' | 'medium' | 'high';
  since?: Date;
}

export interface ActivityStreamEntry {
  id: number;
  type: string;
  title: string;
  description?: string;
  details?: any;
  isPersonal: boolean;
  priority: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface UnifiedActivityEvent {
  id: string;
  type:
    | ActivityEventType
    | 'live_bet'
    | 'live_parlay'
    | 'market_movement'
    | 'big_bet_alert'
    | 'achievement_unlocked'
    | 'user_followed';
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  userId: number;
  userName: string;
  userAvatar?: string;
  title: string;
  description: string;
  icon: string;
  color?: string;
  amount?: number;
  odds?: number;
  predictionId?: number;
  predictionTitle?: string;
  category?: string;
  optionLabel?: string;
  isPersonal: boolean;
  isHighValue: boolean;
  isWin?: boolean;
  streak?: number;
  meta?: Record<string, any>;
}
