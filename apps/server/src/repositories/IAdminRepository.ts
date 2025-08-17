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
  search?: string; // Search name/email with fuzzy matching
  role?: Role[]; // Filter by multiple roles
  active?: boolean; // Filter by active status
  bannedOnly?: boolean; // Show only banned users
  page: number; // Pagination support (0-based)
  limit: number; // Results per page (max 100)
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
  operation:
    | 'activate'
    | 'deactivate'
    | 'changeRole'
    | 'adjustBalance'
    | 'assignBadge'
    | 'revokeBadge';
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
    popularityScore: number; // Based on betting activity
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

// -- Enhanced Financial Operations Dashboard Interfaces --

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

/** Enhanced bet with user and prediction details */
export interface DetailedBet extends Bet {
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

/** Enhanced transaction with context */
export interface DetailedTransaction extends Transaction {
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

/** Paginated financial data result */
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

/** Financial analytics parameters */
export interface FinancialAnalyticsParams {
  startDate?: string;
  endDate?: string;
  category?: string;
}

/** Comprehensive financial analytics */
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

/** Bulk financial operation */
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

/** Bulk financial operation result */
export interface BulkFinancialResult {
  successCount: number;
  failureCount: number;
  totalProcessed: number;
  totalRefunded?: number;
  errors: Array<{ id: number; error: string }>;
}

/** Financial data export parameters */
export interface FinancialExportParams {
  format: 'csv' | 'excel';
  dataType: 'bets' | 'transactions' | 'analytics';
  filters?: FinancialSearchParams;
}

// -- Enhanced Badge & Achievement System Interfaces --

/** Badge category for organization */
export interface BadgeCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  iconUrl?: string;
  badgeCount: number;
  createdAt: Date;
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

/** Enhanced badge with analytics and usage data */
export interface DetailedBadge extends Badge {
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

/** Paginated badge results */
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

/** Badge creation data */
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

/** Badge update data */
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

/** Badge category creation data */
export interface CreateBadgeCategoryData {
  name: string;
  description?: string;
  color?: string;
  iconUrl?: string;
}

/** Badge analytics data */
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

/** Bulk badge operation */
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

/** Bulk badge operation result */
export interface BulkBadgeResult {
  successCount: number;
  failureCount: number;
  totalProcessed: number;
  errors: Array<{ id: number; error: string }>;
  updatedBadges?: DetailedBadge[];
  updatedUsers?: Array<{ userId: number; badgeCount: number }>;
}

// -- Advanced Analytics & Reporting Types --
export interface AnalyticsParams {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  userId?: number;
  granularity?: 'day' | 'week' | 'month';
}

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
  title: string;
  data: Array<Record<string, any>>;
  metadata: {
    totalRows: number;
    generatedAt: string;
    parameters: Record<string, any>;
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
  resolvePredictionWithDetails(
    predictionId: number,
    winningOptionId: number,
    evidence?: string,
  ): Promise<DetailedPrediction>;

  // -- Enhanced Financial Operations Dashboard --
  searchFinancialData(params: FinancialSearchParams): Promise<PaginatedFinancialData>;
  getFinancialAnalytics(params?: FinancialAnalyticsParams): Promise<FinancialAnalytics>;
  bulkFinancialOperation(operation: BulkFinancialOperation): Promise<BulkFinancialResult>;
  exportFinancialData(params: FinancialExportParams): Promise<string>;

  // -- Legacy Bet & Transaction Oversight (deprecated) --
  findBets(filters?: QueryParams): Promise<Bet[]>;
  refundBet(betId: number): Promise<Bet>;
  findTransactions(filters?: QueryParams): Promise<Transaction[]>;

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
  findPosts(filters?: QueryParams): Promise<UserPost[]>;
  deletePost(postId: number): Promise<void>;
  findAllBadges(): Promise<Badge[]>;
  insertBadge(data: { name: string; description?: string; iconUrl?: string }): Promise<Badge>;
  addBadgeToUser(userId: number, badgeId: number): Promise<UserBadge>;
  removeBadgeFromUser(userId: number, badgeId: number): Promise<void>;

  // -- Advanced Analytics & Reporting --
  getExecutiveDashboard(params: AnalyticsParams): Promise<ExecutiveDashboardData>;
  getUserBehaviorAnalytics(params: AnalyticsParams): Promise<UserBehaviorAnalytics>;
  getPredictiveAnalytics(params: AnalyticsParams): Promise<PredictiveAnalytics>;
  generateCustomReport(reportType: string, params: Record<string, any>): Promise<CustomReportData>;
  getRealtimeMetrics(): Promise<RealtimeMetrics>;
  exportAnalyticsData(params: {
    reportType: string;
    format: 'csv' | 'excel' | 'pdf';
    filters?: Record<string, any>;
  }): Promise<Buffer>;

  // -- Leaderboard & Stats --
  recalculateLeaderboard(): Promise<void>;
  findUserStats(userId: number): Promise<UserStats | null>;

  // -- Miscellaneous --
  triggerAITweet(): Promise<AITweet>;
}
