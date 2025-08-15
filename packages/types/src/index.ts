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
