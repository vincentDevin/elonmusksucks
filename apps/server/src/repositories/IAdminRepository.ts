// apps/server/src/repositories/IAdminRepository.ts

import type {
  Role,
  User,
  Prediction,
  Bet,
  Transaction,
  Badge,
  UserBadge,
  UserStats,
  AITweet,
  UserPost,
} from '@prisma/client';

/** Simple key/value map for query filters from req.query */
export type QueryParams = Record<string, any>;

/** Enhanced search and pagination parameters for user management */
export interface UserSearchParams {
  search?: string;          // Search name/email with fuzzy matching
  role?: Role[];           // Filter by multiple roles
  active?: boolean;        // Filter by active status
  bannedOnly?: boolean;    // Show only banned users
  page: number;            // Pagination support (0-based)
  limit: number;           // Results per page (max 100)
  sortBy?: 'name' | 'email' | 'createdAt' | 'muskBucks' | 'role';
  sortOrder?: 'asc' | 'desc';
}

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
export interface DetailedUser extends User {
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
  badges?: Badge[];
}

/** Bulk operation request */
export interface BulkUserOperation {
  userIds: number[];
  operation: 'activate' | 'deactivate' | 'changeRole' | 'adjustBalance' | 'assignBadge' | 'revokeBadge';
  params?: {
    role?: Role;
    amount?: number;
    badgeId?: number;
  };
}

/** Bulk operation result */
export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: number; error: string }>;
  updatedUsers: DetailedUser[];
}

// -- Enhanced Prediction Management Interfaces --

/** Prediction search and filtering parameters */
export interface PredictionSearchParams {
  search?: string;          // Search title and description
  category?: string[];      // Filter by categories
  status?: ('pending' | 'approved' | 'rejected' | 'resolved')[];
  creatorId?: number;       // Filter by specific creator
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

/** Enhanced prediction with aggregated data */
export interface DetailedPrediction extends Prediction {
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  analytics?: {
    totalBets: number;
    totalVolume: number;
    uniqueBettors: number;
    controversyScore: number; // Based on bet distribution
    popularityScore: number;  // Based on betting activity
  };
  qualityFlags?: {
    isDuplicate: boolean;
    hasOffensiveContent: boolean;
    hasSuspiciousActivity: boolean;
    needsReview: boolean;
  };
  resolutionData?: {
    resolvedBy?: number;
    resolvedAt?: Date;
    evidence?: string;
    winningOptionId?: number;
  };
}

/** Paginated prediction results */
export interface PaginatedPredictions {
  predictions: DetailedPrediction[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  analytics?: {
    totalPending: number;
    totalApproved: number;
    totalResolved: number;
    totalRejected: number;
    avgResolutionTime: number; // in hours
  };
}

/** Bulk prediction operation */
export interface BulkPredictionOperation {
  predictionIds: number[];
  operation: 'approve' | 'reject' | 'resolve' | 'delete' | 'feature';
  params?: {
    reason?: string;
    winningOptionId?: number;
    evidence?: string;
  };
}

/** Bulk prediction operation result */
export interface BulkPredictionResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ predictionId: number; error: string }>;
  updatedPredictions: DetailedPrediction[];
}

export interface IAdminRepository {
  // -- Enhanced User Management --
  findAllUsers(): Promise<User[]>; // Legacy method - kept for backward compatibility
  searchUsers(params: UserSearchParams): Promise<PaginatedUsers>;
  getUserWithDetails(userId: number): Promise<DetailedUser | null>;
  bulkUpdateUsers(operation: BulkUserOperation): Promise<BulkOperationResult>;
  updateUserRole(userId: number, role: Role): Promise<User>;
  updateUserActive(userId: number, active: boolean): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;

  // -- Enhanced Prediction Management --
  findPredictions(filters?: QueryParams): Promise<Prediction[]>; // Legacy method
  searchPredictions(params: PredictionSearchParams): Promise<PaginatedPredictions>;
  getPredictionWithDetails(predictionId: number): Promise<DetailedPrediction | null>;
  bulkUpdatePredictions(operation: BulkPredictionOperation): Promise<BulkPredictionResult>;
  updatePredictionStatus(
    predictionId: number,
    status: 'approved' | 'rejected',
  ): Promise<Prediction>;
  resolvePredictionWithDetails(predictionId: number, winningOptionId: number, evidence?: string): Promise<DetailedPrediction>;

  // -- Bet & Transaction Oversight --
  findBets(filters?: QueryParams): Promise<Bet[]>;
  refundBet(betId: number): Promise<Bet>;
  findTransactions(filters?: QueryParams): Promise<Transaction[]>;

  // -- Badge & Content Moderation --
  findPosts(filters?: QueryParams): Promise<UserPost[]>;
  deletePost(postId: number): Promise<void>;
  findAllBadges(): Promise<Badge[]>;
  insertBadge(data: { name: string; description?: string; iconUrl?: string }): Promise<Badge>;
  addBadgeToUser(userId: number, badgeId: number): Promise<UserBadge>;
  removeBadgeFromUser(userId: number, badgeId: number): Promise<void>;

  // -- Leaderboard & Stats --
  recalculateLeaderboard(): Promise<void>;
  findUserStats(userId: number): Promise<UserStats | null>;

  // -- Miscellaneous --
  triggerAITweet(): Promise<AITweet>;
}
