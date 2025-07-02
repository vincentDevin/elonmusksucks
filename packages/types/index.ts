// packages/types/index.ts

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
  Outcome as PrismaOutcome,
  BetOption as PrismaBetOption,
  BetStatus as PrismaBetStatus,
  TransactionType as PrismaTransactionType,
  Theme as PrismaTheme,
} from '@prisma/client';

// Enums
export type Role = PrismaRole;
export type Outcome = PrismaOutcome;
export type BetOption = PrismaBetOption;
export type BetStatus = PrismaBetStatus;
export type TransactionType = PrismaTransactionType;
export type Theme = PrismaTheme;

// ----- User -----
export type DbUser = PrismaUser;
export type PublicUser = Omit<PrismaUser, 
  | 'passwordHash'
  | 'emailVerifications'
  | 'passwordResets'
  | 'refreshTokens'
>;

// ----- EmailVerification & PasswordReset (internal) -----
export type DbEmailVerification = PrismaEmailVerification;
export type DbPasswordReset = PrismaPasswordReset;

export type DbPrediction       = PrismaPrediction;
export type PublicPrediction   = Pick<
  PrismaPrediction,
  | 'id'
  | 'title'
  | 'description'
  | 'category'
  | 'expiresAt'
  | 'resolved'
  | 'resolvedAt'
  | 'outcome'
  | 'approved'      // ← newly added
>;

// ----- PredictionOption -----
export type DbPredictionOption = PrismaPredictionOption;
export type PublicPredictionOption = Pick<
  PrismaPredictionOption,
  | 'id'
  | 'label'
  | 'odds'
  | 'predictionId'
  | 'createdAt'
>;

// ----- Bet -----
export type DbBet = PrismaBet;
export type PublicBet = Pick<
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
>;

// ----- AITweet -----
export type DbAITweet = PrismaAITweet;
export type PublicAITweet = PrismaAITweet;

// ----- RefreshToken (internal) -----
export type DbRefreshToken = PrismaRefreshToken;

// ----- LeaderboardEntry -----
export type DbLeaderboardEntry = PrismaLeaderboardEntry;
export type PublicLeaderboardEntry = PrismaLeaderboardEntry;

// ----- Badge & UserBadge -----
export type DbBadge = PrismaBadge;
export type PublicBadge = {
  id: number;
  name: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: string; // string, not Date!
};
export type DbUserBadge = PrismaUserBadge;

// ----- Follow -----
export type DbFollow = PrismaFollow;
export type PublicFollow = Pick<
  PrismaFollow,
  | 'id'
  | 'followerId'
  | 'followingId'
  | 'createdAt'
>;

// ----- Parlay & ParlayLeg -----
export type DbParlay = PrismaParlay;
export type PublicParlay = Pick<
  PrismaParlay,
  | 'id'
  | 'userId'
  | 'amount'
  | 'combinedOdds'
  | 'potentialPayout'
  | 'status'
  | 'createdAt'
>;

// ----- Transaction -----
export type DbTransaction = PrismaTransaction;
export type PublicTransaction = Pick<
  PrismaTransaction,
  | 'id'
  | 'userId'
  | 'type'
  | 'amount'
  | 'balanceAfter'
  | 'relatedBetId'
  | 'relatedParlayId'
  | 'createdAt'
>;

// For GET /api/predictions:
export type DbParlayLeg = PrismaParlayLeg;
export interface PublicParlayLeg {
  id: number;
  parlayId: number;
  optionId: number;
  oddsAtPlacement: number;
  createdAt: string;          // ISO timestamp from the backend
  parlay: {
    id: number;
    user: { id: number; name: string };
    amount: number;
    combinedOdds: number;
  };
}

/**
 * The shape returned by GET /api/users/:userId
 */
export interface PublicUserProfile {
  id: number;
  name: string;
  muskBucks: number;
  profileComplete: boolean;
  rank?: number;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  timezone?: string | null;
  notifyOnResolve: boolean;
  theme: Theme;
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
}

// A badge as returned on a user profile, including when it was awarded
export interface PublicUserBadge extends PublicBadge {
  awardedAt: string;   // ISO string for frontend
}

// -------------------
// CORRECTED FOR PRISMA: Dates are Date, not string.
// parentId: number | null (not optional, not undefined)
// -------------------

// DbUserPost (what you get from the DB)
export type DbUserPost = {
  id: number;
  authorId: number;
  ownerId: number;
  content: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  children?: DbUserPost[];
  authorName?: string; // if you ever join author data
};

// DbUserActivity (what you get from the DB)
export type DbUserActivity = {
  id: number;
  userId: number;
  type: string;
  details?: unknown;
  createdAt: Date;
};

// DbUserStats (what you get from the DB)
export type DbUserStats = {
  id: number;
  userId: number;
  totalBets: number;
  betsWon: number;
  betsLost: number;
  parlaysStarted: number;
  parlaysWon: number;
  totalWagered: number;
  totalWon: number;
  streak: number;
  maxStreak: number;
  profit: number;
  roi: number;
  mostCommonBet: string | null;
  biggestWin: number;
  updatedAt: Date;
};

// DTO for public user stats (used in API responses)
export type UserStatsDTO = {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  parlaysStarted: number;
  parlaysWon: number;
  totalWagered: number;
  totalWon: number;
  streak: number;
  maxStreak: number;
  profit: number;
  roi: number;
  mostCommonBet: string | null;
  biggestWin: number;
  updatedAt: string;
};

// --- User Feed Post DTO ---
export type UserFeedPost = {
  id: number;
  authorId: number;
  ownerId: number;
  content: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  children?: UserFeedPost[];
  authorName?: string;
};

// --- User Activity DTO ---
export type UserActivity = {
  id: number;
  userId: number;
  type: string;
  details?: unknown;
  createdAt: string;
};

/** Includes the extra fields your admin endpoints now return */
export interface AdminBet extends PublicBet {
  userName: string;
  prediction: PublicPrediction;
}

export interface AdminTransaction extends PublicTransaction {
  userName: string;
}