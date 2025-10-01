/**
 * Admin Database Layer Types
 *
 * Types for admin-specific repository operations including user management,
 * prediction moderation, financial operations, badge management, and analytics.
 */

import type {
  PrismaRole,
  PrismaUser,
  PrismaPrediction,
  PrismaBet,
  PrismaTransaction,
  PrismaBadge,
  PrismaUserBadge,
  PrismaUserStats,
  PrismaBanType,
} from '../prisma';

// ============================================================================
// Search & Query Parameters
// ============================================================================

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

// Note: These are repository-layer params, different from API request DTOs
// API layer has UserSearchParams, PredictionSearchParams, etc. in api/requests/admin.ts

export interface DbUserSearchParams {
  query?: string;
  role?: PrismaRole;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DbPredictionSearchParams {
  query?: string;
  category?: string;
  resolved?: boolean;
  approved?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DbFinancialSearchParams {
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

export interface DbBadgeSearchParams {
  query?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// User Management Types
// ============================================================================

export interface DetailedUser extends PrismaUser {
  stats?: PrismaUserStats;
  badges?: Array<PrismaUserBadge & { badge: PrismaBadge }>;
  _count?: {
    bets?: number;
    predictions?: number;
    followers?: number;
    following?: number;
  };
}

export interface PaginatedUsers {
  users: DetailedUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface BulkUserOperation {
  userIds: number[];
  operation:
    | 'activate'
    | 'deactivate'
    | 'changeRole'
    | 'adjustBalance'
    | 'assignBadge'
    | 'revokeBadge';
  params?: {
    role?: PrismaRole;
    amount?: number;
    badgeId?: number;
  };
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: number; error: string }>;
  updatedUsers: DetailedUser[];
}

// ============================================================================
// Prediction Management Types
// ============================================================================

export interface DetailedPrediction
  extends Omit<PrismaPrediction, 'createdAt' | 'expiresAt' | 'resolvedAt'> {
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  analytics?: {
    totalBets: number;
    totalVolume: number;
    uniqueBettors: number;
    controversyScore: number;
    popularityScore: number;
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
    avgResolutionTime: number;
  };
}

export interface BulkPredictionOperation {
  predictionIds: number[];
  operation: 'approve' | 'reject' | 'resolve' | 'delete' | 'feature';
  params?: {
    reason?: string;
    winningOptionId?: number;
    evidence?: string;
  };
}

export interface BulkPredictionResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ predictionId: number; error: string }>;
  updatedPredictions: DetailedPrediction[];
}

// ============================================================================
// Financial Operations Types
// ============================================================================

export interface DetailedBet extends PrismaBet {
  userName?: string;
  userEmail?: string;
  prediction?: {
    id: number;
    title: string;
    category: string;
    resolved: boolean;
  };
  option?: {
    id: number;
    label: string;
  };
  parlayLegs?: Array<{
    id: number;
    optionLabel: string;
    predictionTitle: string;
    oddsAtPlacement: number;
  }>;
  analytics?: {
    riskScore: number;
    profitability: number;
    suspiciousPatterns: string[];
  };
}

export interface DetailedTransaction extends PrismaTransaction {
  userName?: string;
  userEmail?: string;
  relatedBet?: {
    id: number;
    predictionTitle: string;
    amount: number;
  };
  relatedParlay?: {
    id: number;
    legsCount: number;
    amount: number;
  };
}

export interface PaginatedFinancialData {
  bets: DetailedBet[];
  transactions: DetailedTransaction[];
  totalBets: number;
  totalTransactions: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FinancialAnalyticsParams {
  startDate?: string;
  endDate?: string;
  category?: string;
}

export interface FinancialAnalytics {
  overview: {
    totalBettingVolume: number;
    totalPayouts: number;
    totalRefunds: number;
    netRevenue: number;
    activeBettors: number;
    avgBetSize: number;
  };
  timeSeriesData: Array<{
    date: string;
    volume: number;
    payouts: number;
    profit: number;
    betCount: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    volume: number;
    betCount: number;
    profitMargin: number;
  }>;
  userSegments: Array<{
    segment: string;
    userCount: number;
    avgLifetimeValue: number;
    churnRate: number;
  }>;
  fraudDetection: {
    suspiciousBets: number;
    flaggedUsers: number;
    riskPatterns: Array<{
      pattern: string;
      count: number;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
}

export interface BulkFinancialOperation {
  betIds?: number[];
  userIds?: number[];
  operation: 'refund' | 'adjustBalance' | 'flagSuspicious' | 'block';
  params?: {
    reason?: string;
    amount?: number;
    flagType?: string;
  };
}

export interface BulkFinancialResult {
  successCount: number;
  failureCount: number;
  totalProcessed: number;
  totalRefunded?: number;
  errors: Array<{ id: number; error: string }>;
}

export interface FinancialExportParams {
  format: 'csv' | 'excel';
  dataType: 'bets' | 'transactions' | 'analytics';
  filters?: DbFinancialSearchParams;
}

// ============================================================================
// Badge & Achievement System Types
// ============================================================================

export interface BadgeCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  iconUrl?: string;
  badgeCount: number;
  createdAt: Date;
}

export interface DetailedBadge extends PrismaBadge {
  category?: BadgeCategory;
  analytics: {
    totalUsers: number;
    awardedThisMonth: number;
    popularityScore: number;
    rarityLevel: 'common' | 'rare' | 'epic' | 'legendary';
  };
  rules?: {
    autoAward: boolean;
    requirements: Record<string, any>;
    maxAwards?: number;
  };
  recentAwards: Array<{
    userId: number;
    userName: string;
    awardedAt: Date;
    reason?: string;
  }>;
}

export interface PaginatedBadges {
  badges: DetailedBadge[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  categoryBreakdown: Array<{
    categoryId: number;
    categoryName: string;
    count: number;
  }>;
}

export interface CreateBadgeData {
  name: string;
  description?: string;
  iconUrl?: string;
  categoryId?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  autoAward?: boolean;
  requirements?: Record<string, any>;
  maxAwards?: number;
}

export interface UpdateBadgeData {
  name?: string;
  description?: string;
  iconUrl?: string;
  categoryId?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  autoAward?: boolean;
  requirements?: Record<string, any>;
  maxAwards?: number;
  isActive?: boolean;
}

export interface CreateBadgeCategoryData {
  name: string;
  description?: string;
  color?: string;
  iconUrl?: string;
}

export interface BadgeAnalytics {
  overview: {
    totalBadges: number;
    totalCategories: number;
    totalAwards: number;
    activeUsers: number;
    mostPopularBadge: {
      id: number;
      name: string;
      userCount: number;
    };
  };
  categoryDistribution: Array<{
    categoryId: number;
    categoryName: string;
    badgeCount: number;
    totalAwards: number;
  }>;
  rarityDistribution: Array<{
    rarity: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    badgeId: number;
    badgeName: string;
    userId: number;
    userName: string;
    awardedAt: Date;
  }>;
  topPerformers: Array<{
    userId: number;
    userName: string;
    badgeCount: number;
    rareCount: number;
  }>;
}

export interface BulkBadgeOperation {
  badgeIds?: number[];
  userIds?: number[];
  operation: 'award' | 'revoke' | 'activate' | 'deactivate' | 'delete' | 'changeCategory';
  params?: {
    reason?: string;
    categoryId?: number;
    targetUserIds?: number[];
  };
}

export interface BulkBadgeResult {
  successCount: number;
  failureCount: number;
  totalProcessed: number;
  errors: Array<{ id: number; error: string }>;
  updatedBadges?: DetailedBadge[];
  updatedUsers?: Array<{ userId: number; badgeCount: number }>;
}

// ============================================================================
// Analytics & Reporting Types
// ============================================================================

export interface AnalyticsParams {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  userId?: number;
  granularity?: 'day' | 'week' | 'month';
}

export interface ExecutiveDashboardData {
  platformHealth: {
    activeUsers24h: number;
    activeUsers7d: number;
    activeUsers30d: number;
    userGrowthRate: number;
    retentionRate: number;
  };
  financialMetrics: {
    totalRevenue: number;
    totalPayouts: number;
    netProfit: number;
    avgTransactionValue: number;
    totalVolume: number;
  };
  contentMetrics: {
    totalPredictions: number;
    activePredictions: number;
    resolutionRate: number;
    avgBetsPerPrediction: number;
  };
  engagementMetrics: {
    totalComments: number;
    totalReactions: number;
    avgSessionDuration: number;
    pongMatchesPlayed: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    severity: number;
    timestamp: Date;
  }>;
}

export interface UserBehaviorAnalytics {
  demographics: {
    ageDistribution: Array<{ ageRange: string; count: number; percentage: number }>;
    activityLevels: Array<{ level: string; count: number; avgValue: number }>;
    retentionCohorts: Array<{ cohort: string; users: number; retentionRate: number }>;
  };
  bettingPatterns: {
    avgBetsPerUser: number;
    avgBetAmount: number;
    preferredCategories: Array<{ category: string; count: number; volume: number }>;
    winRateBySegment: Array<{ segment: string; winRate: number; avgStake: number }>;
    timePatterns: Array<{ hour: number; betCount: number; volume: number }>;
  };
  engagement: {
    sessionMetrics: { avgLength: number; avgActions: number };
    featureUsage: Array<{ feature: string; usage: number; satisfaction: number }>;
    churnRisk: Array<{ userId: number; riskScore: number; factors: string[] }>;
  };
}

export interface PredictiveAnalytics {
  userChurnPrediction: Array<{
    userId: number;
    userName: string;
    churnProbability: number;
    riskFactors: string[];
    recommendations: string[];
  }>;
  engagementForecasting: Array<{
    date: string;
    predictedUsers: number;
    predictedRevenue: number;
    confidence: number;
  }>;
  trendAnalysis: {
    emergingCategories: Array<{ category: string; growthRate: number; potential: number }>;
    seasonalPatterns: Array<{ period: string; trend: string; impact: number }>;
    marketSentiment: { score: number; factors: string[] };
  };
}

export interface CustomReportData {
  reportId: string;
  reportType: string;
  generatedAt: Date;
  parameters: Record<string, any>;
  data: any[];
  summary: Record<string, any>;
  metadata: {
    totalRecords: number;
    processingTime: number;
    dataSource: string;
  };
}

export interface RealtimeMetrics {
  activeUsers: number;
  activeBets: number;
  recentTransactions: number;
  systemHealth: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    severity: number;
  }>;
}
