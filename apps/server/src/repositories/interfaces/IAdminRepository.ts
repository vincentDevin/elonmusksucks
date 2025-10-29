// apps/server/src/repositories/IAdminRepository.ts

import type {
  PrismaRole,
  PrismaUser,
  PrismaPrediction,
  PrismaBet,
  PrismaTransaction,
  PrismaBadge,
  PrismaUserBadge,
  PrismaUserStats,
  PrismaContent,
  // Admin-specific types (all imported from @ems/types/database/admin.ts)
  ExecutiveDashboardData,
  CustomReportData,
  PaginatedUsers,
  DetailedUser,
  UserSearchParams,
  PredictionSearchParams,
  FinancialSearchParams,
  BadgeSearchParams,
  QueryParams,
  AnalyticsParams,
  UserBehaviorAnalytics,
  PredictiveAnalytics,
  RealtimeMetrics,
  BulkUserOperation,
  BulkOperationResult,
  DetailedPrediction,
  PaginatedPredictions,
  BulkPredictionOperation,
  BulkPredictionResult,
  PaginatedFinancialData,
  FinancialAnalyticsParams,
  FinancialAnalytics,
  BulkFinancialOperation,
  BulkFinancialResult,
  FinancialExportParams,
  BadgeCategory,
  DetailedBadge,
  PaginatedBadges,
  CreateBadgeData,
  UpdateBadgeData,
  CreateBadgeCategoryData,
  BadgeAnalytics,
  BulkBadgeOperation,
  BulkBadgeResult,
  DetailedBet,
  DetailedTransaction,
} from '@ems/types';

// TEMP: Re-export for backwards compatibility during migration
export type {
  ExecutiveDashboardData,
  CustomReportData,
  PaginatedUsers,
  DetailedUser,
  UserSearchParams,
  PredictionSearchParams,
  FinancialSearchParams,
  BadgeSearchParams,
  QueryParams,
  AnalyticsParams,
  UserBehaviorAnalytics,
  PredictiveAnalytics,
  RealtimeMetrics,
  BulkUserOperation,
  BulkOperationResult,
  DetailedPrediction,
  PaginatedPredictions,
  BulkPredictionOperation,
  BulkPredictionResult,
  PaginatedFinancialData,
  FinancialAnalyticsParams,
  FinancialAnalytics,
  BulkFinancialOperation,
  BulkFinancialResult,
  FinancialExportParams,
  BadgeCategory,
  DetailedBadge,
  PaginatedBadges,
  CreateBadgeData,
  UpdateBadgeData,
  CreateBadgeCategoryData,
  BadgeAnalytics,
  BulkBadgeOperation,
  BulkBadgeResult,
  DetailedBet,
  DetailedTransaction,
};

/**
 * Admin Repository Interface
 *
 * All admin-specific types have been moved to @ems/types/database/admin.ts
 * and are imported/re-exported above for backwards compatibility.
 */
export interface IAdminRepository {
  // -- Enhanced User Management --
  findAllUsers(): Promise<PrismaUser[]>; // Legacy method - kept for backward compatibility
  searchUsers(params: UserSearchParams): Promise<PaginatedUsers>;
  getUserWithDetails(userId: number): Promise<DetailedUser | null>;
  bulkUpdateUsers(operation: BulkUserOperation): Promise<BulkOperationResult>;
  updateUserRole(userId: number, role: PrismaRole): Promise<PrismaUser>;
  updateUserActive(userId: number, active: boolean): Promise<PrismaUser>;
  updateUserBalance(userId: number, amount: number): Promise<PrismaUser>;

  // -- Enhanced Prediction Management --
  findPredictions(filters?: QueryParams): Promise<PrismaPrediction[]>; // Legacy method
  searchPredictions(params: PredictionSearchParams): Promise<PaginatedPredictions>;
  getPredictionWithDetails(predictionId: number): Promise<DetailedPrediction | null>;
  bulkUpdatePredictions(operation: BulkPredictionOperation): Promise<BulkPredictionResult>;
  updatePredictionStatus(
    predictionId: number,
    status: 'approved' | 'rejected',
  ): Promise<PrismaPrediction>;
  resolvePredictionWithDetails(
    predictionId: number,
    winningOptionId: number,
    evidence?: string,
  ): Promise<DetailedPrediction>;

  // -- Enhanced Financial Operations Dashboard --
  searchFinancialData(params: FinancialSearchParams): Promise<PaginatedFinancialData>;
  getFinancialAnalytics(params?: FinancialAnalyticsParams): Promise<FinancialAnalytics>;
  getUnifiedAnalytics(params?: Record<string, unknown>): Promise<Record<string, unknown>>; // NEW: Unified analytics across all transaction types
  bulkFinancialOperation(operation: BulkFinancialOperation): Promise<BulkFinancialResult>;
  exportFinancialData(params: FinancialExportParams): Promise<string>;

  // -- Legacy Bet & Transaction Oversight (deprecated) --
  findBets(filters?: QueryParams): Promise<PrismaBet[]>;
  refundBet(betId: number): Promise<PrismaBet>;
  findTransactions(filters?: QueryParams): Promise<PrismaTransaction[]>;

  // -- Enhanced Badge & Achievement System --
  searchBadges(params: BadgeSearchParams): Promise<PaginatedBadges>;
  getBadgeWithDetails(badgeId: number): Promise<DetailedBadge | null>;
  createBadgeWithCategories(data: CreateBadgeData): Promise<DetailedBadge>;
  updateBadge(badgeId: number, data: UpdateBadgeData): Promise<DetailedBadge>;
  deleteBadge(badgeId: number): Promise<void>;
  getBadgeAnalytics(badgeId?: number): Promise<BadgeAnalytics>;
  bulkBadgeOperation(operation: BulkBadgeOperation): Promise<BulkBadgeResult>;
  getBadgeCategories(): Promise<BadgeCategory[]>;
  createBadgeCategory(data: CreateBadgeCategoryData): Promise<BadgeCategory>;

  // -- Legacy Badge & Content Moderation (deprecated) --
  findPosts(filters?: QueryParams): Promise<PrismaContent[]>;
  deletePost(postId: number): Promise<void>;
  findAllBadges(): Promise<PrismaBadge[]>;
  insertBadge(data: { name: string; description?: string; iconUrl?: string }): Promise<PrismaBadge>;
  addBadgeToUser(userId: number, badgeId: number): Promise<PrismaUserBadge>;
  removeBadgeFromUser(userId: number, badgeId: number): Promise<void>;

  // -- Advanced Analytics & Reporting --
  getExecutiveDashboard(params: AnalyticsParams): Promise<ExecutiveDashboardData>;
  getUserBehaviorAnalytics(params: AnalyticsParams): Promise<UserBehaviorAnalytics>;
  getPredictiveAnalytics(params: AnalyticsParams): Promise<PredictiveAnalytics>;
  generateCustomReport(
    reportType: string,
    params: Record<string, unknown>,
  ): Promise<CustomReportData>;
  getRealtimeMetrics(): Promise<RealtimeMetrics>;
  exportAnalyticsData(params: {
    reportType: string;
    format: 'csv' | 'excel' | 'pdf';
    filters?: Record<string, unknown>;
  }): Promise<Buffer>;

  // -- Leaderboard & Stats --
  findUserStats(userId: number): Promise<PrismaUserStats | null>;

  // -- Miscellaneous --
  // Removed: triggerAITweet (deprecated - AITweet model no longer exists)
}
