// System constants
export const SYSTEM_AI_USER_ID = -1; // Canonical AI user ID for Pong matches

// Rollback: Remove StatsSocketEvents, TimelineSocketEvents, and payload types
// Socket Event Constants - centralized type-safe event names
export const SocketEvents = {
  // Core connection events
  Connect: 'connect',
  Disconnect: 'disconnect',
  Error: 'error',
  
  // Betting events
  BetPlace: 'bet:place',
  BetPlaced: 'betPlaced',
  BetUpdate: 'betUpdate',
  
  // Parlay events
  ParlayPlace: 'parlay:place',
  ParlayPlaced: 'parlayPlaced',
  
  // Stats events
  StatsUpdate: 'stats:update',
  StatsUpdated: 'stats:updated',
  RankingChanged: 'ranking:changed',
  
  // Activity events
  ActivityUpdate: 'unified:activity:update',
  ActivityResponse: 'unified:activity:response',
  
  // Leaderboard events
  LeaderboardAllTime: 'leaderboardAllTime',
  LeaderboardDaily: 'leaderboardDaily',
  LeaderboardRankChange: 'leaderboard:rankChange',
} as const;

// Stats socket events with typed payloads
export const StatsSocketEvents = {
  StatsUpdate: 'stats:update',
  RankingUpdate: 'ranking:update',
  AchievementUnlock: 'achievement:unlock',
  CURRENT: 'stats:current',
  ERROR: 'stats:error',
  UPDATED: 'stats:updated',
  RANKING: 'stats:ranking',
  ACHIEVEMENT: 'stats:achievement',
  REFRESHED: 'stats:refreshed',
  RANKING_CHANGED: 'ranking:changed',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked'
} as const;

export type StatsSocketEvent = typeof StatsSocketEvents[keyof typeof StatsSocketEvents];

// Timeline socket events with typed payloads
export const TimelineSocketEvents = {
  ArticleAdded: 'timeline:article:added',
  ArticleUpdated: 'timeline:article:updated',
  ArticleRemoved: 'timeline:article:removed',
} as const;

export type TimelineSocketEvent = typeof TimelineSocketEvents[keyof typeof TimelineSocketEvents];

// Rollback: Remove AdminSocketEvents constant and type export
// Admin socket events with typed payloads
export const AdminSocketEvents = {
  // Moderation events
  ModerationUserBan: 'adminModerationUserBan',
  ModerationUserUnban: 'adminModerationUserUnban', 
  ModerationUserMute: 'adminModerationUserMute',
  ModerationUserKick: 'adminModerationUserKick',
  ModerationMessageDelete: 'adminModerationMessageDelete',
  ModerationPostDelete: 'adminModerationPostDelete',
  ModerationBulk: 'admin:moderation:bulk',
  RetaggingBulk: 'admin:retagging:bulk',
  
  // Feed management events
  FeedRefresh: 'admin:feed:refresh',
  
  // Metrics events
  MetricsUpdate: 'admin:metrics:update',
} as const;

export type AdminSocketEvent = typeof AdminSocketEvents[keyof typeof AdminSocketEvents];

// Socket payload interfaces
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

// Event-specific payload types can be added here as needed
export type SocketEventMap = typeof SocketEvents;

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

// ——— Auth Response DTOs ————————————————————————————————————————————————————
export interface AuthUserView {
  id: number;
  name: string;
  email: string;
  role: string;
  muskBucks: string;              // BigInt → string
  profileComplete: boolean;
  avatarUrl: string | null;
  theme: string;
  createdAt: string;              // Date → ISO string
  updatedAt: string;              // Date → ISO string
}

export interface UserBalanceView {
  muskBucks: string;              // BigInt → string
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
  PONG_PAYOUTS: 'pong-payouts',
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
// FeedStatus moved to standardized section
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

// ——— User Betting Response DTOs ————————————————————————————————————————————
export interface UserBetView {
  id: number;
  predictionId: number;
  predictionTitle: string;
  optionId: number | null;
  optionLabel: string | null;
  amount: string;              // BigInt → string
  potentialPayout: string | null;
  payout: string | null;
  status: BetStatus;
  won: boolean | null;
  oddsAtPlacement: number;
  createdAt: string;           // Date → ISO
}

export interface UserParlayView {
  id: number;
  amount: string;              // BigInt → string
  combinedOdds: number;
  potentialPayout: string;     // BigInt → string
  status: BetStatus;
  createdAt: string;           // Date → ISO
  legs: Array<{
    id: number;
    predictionId: number;
    predictionTitle: string;
    optionId: number;
    optionLabel: string;
    oddsAtPlacement: number;
  }>;
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

// Standardized User Profile Response
export interface UserProfileView {
  id: number;
  name: string;
  role: string;
  muskBucks: string;            // BigInt → string
  profileComplete: boolean;
  rank?: number;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  timezone?: string | null;
  notifyOnResolve: boolean;
  theme: string;
  twoFactorEnabled: boolean;
  stats: {
    successRate: number;
    totalPredictions: number;
    currentStreak: number;
    longestStreak: number;
  };
  badges: PublicUserBadge[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  createdAt: string;            // Date → ISO string
  updatedAt: string;            // Date → ISO string
}

// Standardized User Stats Response  
export interface UserStatsView {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  totalParlays: number;
  parlaysWon: number;
  parlaysLost: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  parlayLegsLost: number;
  totalWagered: string;         // BigInt → string
  totalWon: string;             // BigInt → string
  profit: string;               // BigInt → string
  roi: number;
  currentStreak: number;
  longestStreak: number;
  mostCommonBet: string | null;
  biggestWin: string;           // BigInt → string
  updatedAt: string;            // Date → ISO string
}

// Standardized Prediction Response
export interface PredictionView {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;              // 'PENDING' | 'APPROVED' | 'RESOLVED'
  type: string;
  threshold?: number | null;
  createdAt: string;            // Date → ISO string
  expiresAt: string;            // Date → ISO string (kept as expiresAt for client compatibility)  
  resolvedAt: string | null;    // Date → ISO string
  creatorUserId: number;
  winningOptionId: number | null;
  options: Array<{
    id: number;
    label: string;
    odds: number;
    predictionId: number;
  }>;
  bets: Array<{
    id: number;
    userId: number;
    userName: string;
    amount: string;             // BigInt → string
    potentialPayout: string | null;  // BigInt → string
    payout: string | null;      // BigInt → string
    status: string;
    createdAt: string;          // Date → ISO string
  }>;
  sourceLinks?: Array<{
    id: number;
    url: string;
    title: string;
    description: string | null;
  }>;
}

// Standardized Leaderboard Entry Response  
export interface LeaderboardEntryView {
  userId: number;
  userName: string;
  avatarUrl: string | null;
  balance: string;              // BigInt → string
  totalBets: number;
  winRate: number;
  profitAll: string;            // BigInt → string
  profitPeriod: string;         // BigInt → string
  roi: number;
  longestStreak: number;
  rank: number;
}

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

// API Request/Response Types moved to standardized section

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
  topicWindows?: Record<string, number>; // Per-topic window overrides in ms
}

export interface IEventCoalescer {
  addEvent<T>(channel: string, payload: T, userId?: number): Promise<void>;
  flush(): Promise<void>;
}

// Socket.IO heartbeat configuration
export interface SocketHeartbeatConfig {
  pingInterval: number; // How often to send a ping packet (ms)
  pingTimeout: number; // How long to wait for pong before disconnect (ms)
}

// Slow query tracking
export interface SlowQueryRecord {
  traceId: string;
  model: string;
  action: string;
  duration: number;
  timestamp: string;
  params?: string; // Sanitized params (no PII)
}

// Payload size guardrails
export interface PayloadSizeConfig {
  softLimitBytes: number; // Warn threshold
  hardLimitBytes: number; // Reject threshold
  enforceMode: 'warn' | 'strict'; // Enforcement level
}

// JWT Rotation & Dual-Key Support
export interface JWTKeyConfig {
  keyId: string; // Key identifier (kid header)
  secret: string; // JWT secret
  algorithm: string; // Signing algorithm
  createdAt: Date; // Key creation timestamp
  expiresAt?: Date; // Optional key expiration
}

export interface JWTRotationConfig {
  currentKeyId: string; // Active signing key
  keys: Record<string, JWTKeyConfig>; // All valid keys (current + previous)
  overlapPeriodMs: number; // How long to accept old keys during rotation
}

// ACK Timeout/Retry Policy Standardization
export interface ACKTimeoutConfig {
  timeoutMs: number; // Base timeout for ACK response
  maxRetries: number; // Maximum retry attempts
  backoffMultiplier: number; // Exponential backoff multiplier
  maxBackoffMs: number; // Cap on backoff delay
}

export interface ACKRetryPolicy {
  attempt: number; // Current attempt number (1-based)
  nextRetryDelayMs: number; // Delay before next retry
}

// Admin RBAC Audit
export const AdminActions = {
  ManageUsers: 'manage_users',
  ManagePredictions: 'manage_predictions',
  ManageBets: 'manage_bets',
  ViewAnalytics: 'view_analytics',
  ManageFeeds: 'manage_feeds',
  SystemMaintenance: 'system_maintenance',
} as const;
export type AdminAction = typeof AdminActions[keyof typeof AdminActions];

export interface AdminPermissionCheck {
  action: AdminAction;
  userRole: string;
  userId?: number;
  allowed: boolean;
  reason?: string;
}

// Input Size Caps for Chat/Predictions
export const InputSizeLimits = {
  ChatMessage: 1000, // Characters
  PredictionTitle: 200, // Characters
  PredictionDescription: 2000, // Characters
  PredictionOptionText: 100, // Characters per option
} as const;
export type InputSizeLimit = typeof InputSizeLimits[keyof typeof InputSizeLimits];

// CSRF Protection Configuration
export interface CSRFConfig {
  enabled: boolean; // Enable CSRF protection
  tokenHeader: string; // Header name for CSRF token
  cookieName: string; // Cookie name for CSRF token
  exemptPaths: string[]; // Paths exempt from CSRF protection
}

// Feature Flag Configuration
export const FeatureFlags = {
  PONG_BETA: 'pong_beta',
  ENHANCED_CHAT: 'enhanced_chat',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPERIMENTAL_UI: 'experimental_ui',
} as const;
export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

export interface FeatureFlagConfig {
  [key: string]: boolean;
}

// Beta Cohort Configuration
export interface BetaCohortConfig {
  enabled: boolean;
  percentage: number; // 1-5% of users
  features: string[]; // which features require beta cohort
}

export interface BetaCohortInfo {
  inBetaCohort: boolean;
  cohortPercentage: number;
}

// Pong Match Result Idempotency
export interface MatchResultSubmission {
  matchId: string;
  userId: number;
  score: number;
  won: boolean;
  idempotencyKey: string; // format: matchId|userId
  submittedAt: Date;
}

export type IdempotencyKey = string; // matchId|userId format

// Leaderboard Reconciliation
export interface ReconciliationResult {
  usersDrifted: number;
  driftDetails: DriftDetail[];
  fixesApplied: number;
  dryRun: boolean;
}

export interface DriftDetail {
  userId: number;
  expectedRank: number;
  actualRank: number;
  eloRating: number;
}

export interface PayloadSizeResult {
  size: number;
  exceedsSoft: boolean;
  exceedsHard: boolean;
  message?: string;
}

// Redis connection pooling interfaces
export interface RedisPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
}

export interface RedisPoolHealth {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  failedAcquisitions: number;
  avgAcquisitionTime: number;
  lastHealthCheck: number;
}

export interface IRedisPool {
  getConnection(): Promise<any>;
  releaseConnection(connection: any): Promise<void>;
  destroy(): Promise<void>;
  getStats(): { active: number; idle: number; total: number };
  getHealthStats?(): RedisPoolHealth;
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

// Removed duplicate StatsSocketEvents enum - using const object instead

// ——— Socket Payloads ——————————————————————————————————————

// Removed duplicate StatsUpdatePayload interface - using the one defined earlier

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
  winnerName: string;
  winnerScore: number;
  loserId: number | null;
  loserName: string | null;
  loserScore: number;
  duration: number;
  wagerAmount: number;
  payoutAmount: number;
  isAI: boolean;
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
  TICK_RATE: 128, // FPS - Internal game simulation rate
  NETWORK_UPDATE_RATE: 60, // Hz - Network broadcast frequency (30-60 Hz optimized)
} as const;

// AI difficulty settings - Balanced for fair gameplay
export const AI_DIFFICULTIES = {
  easy: { reactionTime: 450, accuracy: 0.45, speed: 0.35 },      // Very beatable - slow reactions, many errors
  medium: { reactionTime: 200, accuracy: 0.82, speed: 0.85 },    // Moderate challenge - more competitive but fair
  hard: { reactionTime: 120, accuracy: 0.88, speed: 0.92 },      // Challenging but beatable - skilled play required
  impossible: { reactionTime: 80, accuracy: 0.95, speed: 1.0 },  // Expert level - very difficult but humanly possible
} as const;

export type AIDifficulty = keyof typeof AI_DIFFICULTIES;

// ——— Pong Response DTOs ————————————————————————————————————————————
export interface UserPongStatsView {
  userId: number;
  userName: string;
  eloRating: number;
  tier: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
  bestStreak: number;
  perfectGames: number;
  comebacks: number;
  totalWagered: string;        // BigInt → string
  totalWon: string;            // BigInt → string
  profit: string;              // BigInt → string
  biggestWin: string;          // BigInt → string
  averagePing: number;
  createdAt: string;           // Date → ISO
  updatedAt: string;           // Date → ISO
}

export interface PongMatchHistoryView {
  id: string;
  playerOneId: number;
  playerTwoId: number | null;
  playerOneScore: number;
  playerTwoScore: number;
  currentUserScore: number;    // Current user's score in context
  opponentScore: number;       // Opponent's score in context
  currentUserName: string;     // Current user's name
  opponentName: string;        // Opponent's name
  playerWon: boolean;
  wagerAmount: string;         // BigInt → string
  payoutAmount: string;        // BigInt → string  
  eloChange: number;
  duration: number;
  aiDifficulty?: string;
  opponent?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  } | null;
  isAiMatch: boolean;
  completedAt: string;
  skillComponent?: number;
  economyComponent?: number;
}

export interface PongLeaderboardView {
  userId: number;
  userName: string;
  eloRating: number;
  tier: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  totalWon: string;            // BigInt → string
  rank: number;
}

// ——— Shame Wall Response DTOs —————————————————————————————————————————————
export interface ShameWallEntryView {
  id: number;
  userId: number;
  userName: string;
  reason: string;
  startDate: string;           // Date → ISO
  endDate: string | null;      // Date → ISO (null for permanent)
  moderatorId: number;
  moderatorName: string;
  shameAchievements: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface ShameWallStatsView {
  totalBanned: number;
  permanentBans: number;
  temporaryBans: number;
  mostCommonReasons: Array<{
    reason: string;
    count: number;
  }>;
  shameAchievementCounts: Array<{
    slug: string;
    title: string;
    count: number;
  }>;
}

// ——— Market Response DTOs ——————————————————————————————————————————————————
export interface MarketOverviewView {
  cached: boolean;
  totalVolume: number;
  activeMarkets: number;
  totalUsers: number;
  volumeChange: number;
  trending: Array<{
    category: string;
    icon: string;
    growth: number;
  }>;
}

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

// ——— Timeline Response DTOs ————————————————————————————————————————————
export interface TimelineArticlesResponse {
  items: TimelineItem[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

export interface ArticleReactionResponse {
  action: 'added' | 'removed';
  type: string;
  totalReactions: number;
}

export interface ArticleCommentResponse {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  articleId: number;
  createdAt: string; // Date → ISO string
}

// ——— Admin Response DTOs ————————————————————————————————————————————
export interface AdminUserSearchResponse {
  users: AdminUserView[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminFinancialDataResponse {
  transactions: AdminTransactionView[];
  bets: AdminBetView[];
  summary: {
    totalTransactions: number;
    totalBets: number;
    totalVolume: string;        // BigInt → string
    totalPayouts: string;       // BigInt → string
    netRevenue: string;         // BigInt → string
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ——— Feed Response DTOs —————————————————————————————————————————————
export const FeedStatuses = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', ERROR: 'ERROR' } as const;
export type FeedStatus = typeof FeedStatuses[keyof typeof FeedStatuses];

export interface FeedView {
  id: number;
  name: string;
  url: string;
  siteUrl: string | null;
  status: FeedStatus;
  allowImages: boolean;
  lastFetchedAt: string | null;   // Date → ISO string
  lastSuccessAt: string | null;   // Date → ISO string  
  lastErrorAt: string | null;     // Date → ISO string
  lastErrorMsg: string | null;
  fetchCount: number;
  errorCount: number;
  createdAt: string;              // Date → ISO string
  updatedAt: string;              // Date → ISO string
}

export interface FeedsListResponse {
  feeds: FeedView[];
}

export interface CreateFeedRequest {
  name: string;
  url: string;
  siteUrl?: string;
  allowImages?: boolean;
}

export interface UpdateFeedRequest {
  name?: string;
  url?: string;
  siteUrl?: string;
  status?: FeedStatus;
  allowImages?: boolean;
}

// ——— Monitoring Response DTOs ———————————————————————————————————————————
export interface DatabaseStatus {
  connected: boolean;
  timestamp: string;              // Date → ISO string
}

export interface RedisStatus {
  connected: boolean;
  memory?: string;
  error?: string;
}

export interface QueryMetrics {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: string;
  }>;
}

export interface DatabaseMetricsResponse {
  database: {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    status: DatabaseStatus;
  };
  redis: RedisStatus;
  timestamp: string;              // Date → ISO string
}

export interface ClearMetricsResponse {
  success: boolean;
  message: string;
  timestamp: string;              // Date → ISO string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
  };
  timestamp: string;              // Date → ISO string
}

// ——— Admin Analytics Response DTOs ———————————————————————————————————————
export interface AdminFinancialAnalyticsResponse {
  totalRevenue: string;           // BigInt → string
  totalVolume: string;            // BigInt → string
  totalPayouts: string;           // BigInt → string
  netRevenue: string;             // BigInt → string
  totalTransactions: number;
  totalBets: number;
  avgBetAmount: string;           // BigInt → string
  profitMargin: number;
  revenueByDay: Array<{
    date: string;                 // Date → ISO string
    revenue: string;              // BigInt → string
    volume: string;               // BigInt → string
    bets: number;
  }>;
  topUsers: Array<{
    userId: number;
    userName: string;
    totalWagered: string;         // BigInt → string
    totalWon: string;             // BigInt → string
    netLoss: string;              // BigInt → string
  }>;
  generatedAt: string;            // Date → ISO string
}

export interface AdminPredictionSearchResponse {
  predictions: Array<{
    id: number;
    title: string;
    status: string;
    totalBets: number;
    totalVolume: string;          // BigInt → string
    expectedPayout: string;       // BigInt → string
    createdAt: string;            // Date → ISO string
    closesAt: string | null;      // Date → ISO string
    resolvedAt: string | null;    // Date → ISO string
  }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AdminBulkPredictionsResponse {
  updated: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
  summary: {
    totalProcessed: number;
    successRate: number;
  };
  processedAt: string;            // Date → ISO string
}

export interface AdminAchievementView {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;             // Date → ISO string
  updatedAt: string;             // Date → ISO string
  totalUsers?: number;           // Optional stats fields
  completedUsers?: number;
  completionRate?: number;
  recentUnlocks?: Array<{
    userId: number;
    userName: string;
    completedAt: string;         // Date → ISO string
  }>;
}

export interface AdminBulkOperationResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    userId: number;
    error: string;
  }>;
  updatedUsers: AdminUserView[];
}

export interface AdminUserAchievementView {
  userId: number;
  userName: string;
  progress: number;
  completedAt: string | null;    // Date → ISO string
}

export interface AdminAchievementAnalyticsResponse {
  overview: {
    totalAchievements: number;
    totalCategories: number;
    totalUnlocks: number;
    activeUsers: number;
    averageCompletion: number;
  };
  categoryBreakdown: Array<{
    category: string;
    achievementCount: number;
    totalUnlocks: number;
    averageCompletion: number;
  }>;
  topAchievements: Array<{
    id: number;
    name: string;
    title: string;
    completedUsers: number;
    completionRate: number;
  }>;
  recentActivity: Array<{
    achievementId: number;
    achievementTitle: string;
    userId: number;
    userName: string;
    completedAt: string;         // Date → ISO string
  }>;
}

export interface AdminBanHistoryView {
  id: number;
  userId: number;
  userName: string;
  banType: BanType;
  reason: string;
  startDate: string;             // Date → ISO string
  endDate?: string;              // Date → ISO string
  isActive: boolean;
  moderatorName: string;
  shameAchievementsAwarded: string[];
}

export interface UserEnhancedStatsView {
  totalBets: number;
  totalWon: number;
  totalAmount: string;           // BigInt → string
  totalPayout: string;           // BigInt → string
  winRate: number;
  accuracy: {
    overall: number;
    categories: Record<string, number>;
  };
  streak: {
    current: number;
    type: 'win' | 'loss';
    best: number;
  };
  trends: {
    winRate: {
      current: number;
      change: number;
      period: string;
    };
    volume: {
      current: number;
      change: number;
      period: string;
    };
  };
  ranking: {
    overall: number;
    percentile: number;
    tier: string;
  };
}

export interface UserAchievementProgressView {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  isCompleted: boolean;
  completedAt: string | null;     // Date → ISO string
  iconUrl?: string | null;
  rarity: string;
}

export interface PongTierDistributionView {
  tiers: Record<string, number>;
  totalPlayers: number;
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

// Socket Handler Metrics
export interface SocketHandlerMetrics {
  handlerName: string;
  count: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  errorCount: number;
  errorRate: number;
}

// BullMQ Queue Metrics
export interface BullMQMetrics {
  queueName: string;
  depth: number;
  ageMs: number;
  processed: number;
  failed: number;
  successRate: number;
  lastUpdated: number;
}

// Distributed Tracing
export interface TraceSpan {
  traceId: string;
  spanId: string;
  operationName: string;
  metadata: Record<string, any>;
}

export interface TraceContext {
  traceId: string;
  parentSpanId: string;
}

// Structured Error Handling
export interface StructuredError {
  code: string;
  message: string;
  context: Record<string, any>;
  statusCode: number;
  timestamp: string;
}

export interface ErrorContext {
  [key: string]: any;
}

// Alert Thresholds
export interface AlertThreshold {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
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

// Admin View DTOs
export type AdminUserView = {
  id: number;
  name: string;
  email: string;
  muskBucks: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminBetView = {
  id: number;
  userId: number;
  userName: string;
  predictionId: number;
  predictionTitle: string;
  optionId: number | null;
  optionLabel: string | null;
  amount: string;
  potentialPayout: string | null;
  payout: string | null;
  status: string;
  createdAt: string;
};

export type AdminTransactionView = {
  id: number;
  userId: number;
  userName: string;
  type: string;
  amount: string;
  balanceAfter: string;
  relatedBetId: number | null;
  relatedParlayId: number | null;
  createdAt: string;
};

// ——— Pong Payout Worker Types ——————————————————————————————————————————
export interface PongPayoutData {
  matchId: string;
  winnerId: number;
  mode: 'PVP' | 'PVE_AI';
  stakeAmount: number;
}

export interface PongPayoutResult {
  success: boolean;
  payoutAmount?: bigint;
  transactionId?: number;
  error?: string;
}
