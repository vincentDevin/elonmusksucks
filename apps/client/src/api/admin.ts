// apps/client/src/api/admin.ts
import api from './axios';
import type {
  PublicUser,
  PublicPrediction,
  PublicBet,
  PublicTransaction,
  PublicBadge,
  PublicUserBadge,
  UserStatsDTO,
  Role,
  AdminFinancialAnalyticsResponse,
  UserSearchParams,
  AdminUserView,
  AdminUserSearchResponse,
  AdminFinancialDataResponse,
} from '@ems/types';

/** — Enhanced User Management — **/
export async function listUsers(): Promise<AdminUserView[]> {
  const res = await api.get<AdminUserView[]>('/api/admin/users');
  return res.data;
}

export interface PaginatedUsers {
  users: DetailedUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DetailedUser extends PublicUser {
  banStatus?: {
    isBanned: boolean;
    banType?: string;
    reason?: string;
    expiresAt?: string;
  };
  stats?: UserStatsDTO;
  badges?: PublicBadge[];
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
    role?: Role;
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

// Enhanced user search with pagination
export async function searchUsers(params: UserSearchParams): Promise<AdminUserSearchResponse> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.role) params.role.forEach((r) => queryParams.append('role', r));
  if (params.active !== undefined) queryParams.append('active', params.active.toString());
  if (params.bannedOnly) queryParams.append('bannedOnly', 'true');
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get<AdminUserSearchResponse>(`/api/admin/users/search?${queryParams}`);
  return res.data;
}

// Get detailed user information
export async function getUserDetails(userId: number): Promise<DetailedUser> {
  const res = await api.get<DetailedUser>(`/api/admin/users/${userId}/details`);
  return res.data;
}

// Bulk user operations
export async function bulkUpdateUsers(operation: BulkUserOperation): Promise<BulkOperationResult> {
  const res = await api.post<BulkOperationResult>('/api/admin/users/bulk', operation);
  return res.data;
}

export async function updateUserRole(userId: number, role: Role): Promise<PublicUser> {
  const res = await api.patch<PublicUser>(`/api/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function activateUser(userId: number, active: boolean): Promise<PublicUser> {
  const res = await api.patch<PublicUser>(`/api/admin/users/${userId}/activate`, { active });
  return res.data;
}

export async function updateUserBalance(userId: number, amount: number): Promise<PublicUser> {
  const res = await api.patch<PublicUser>(`/api/admin/users/${userId}/balance`, { amount });
  return res.data;
}

/** — Enhanced Prediction Management — **/
export async function listPredictions(params?: Record<string, any>): Promise<PublicPrediction[]> {
  const res = await api.get<PublicPrediction[]>('/api/admin/predictions', { params });
  return res.data;
}

// Enhanced prediction search and pagination types
export interface PredictionSearchParams {
  search?: string;
  category?: string[];
  status?: ('pending' | 'approved' | 'rejected' | 'resolved')[];
  creatorId?: number;
  startDate?: string;
  endDate?: string;
  minVolume?: number;
  maxVolume?: number;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'title' | 'category' | 'expiresAt' | 'bettingVolume';
  sortOrder?: 'asc' | 'desc';
}

export interface DetailedPrediction extends PublicPrediction {
  // Properties from PublicPrediction are already included
  options?: Array<{
    id: number;
    label: string;
    odds: number;
  }>;
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
    resolvedAt?: string;
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

// Enhanced prediction search with pagination
export async function searchPredictions(
  params: PredictionSearchParams,
): Promise<PaginatedPredictions> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.category) params.category.forEach((c) => queryParams.append('category', c));
  if (params.status) params.status.forEach((s) => queryParams.append('status', s));
  if (params.creatorId) queryParams.append('creatorId', params.creatorId.toString());
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.minVolume) queryParams.append('minVolume', params.minVolume.toString());
  if (params.maxVolume) queryParams.append('maxVolume', params.maxVolume.toString());
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get<PaginatedPredictions>(`/api/admin/predictions/search?${queryParams}`);
  return res.data;
}

// Get detailed prediction information
export async function getPredictionDetails(predictionId: number): Promise<DetailedPrediction> {
  const res = await api.get<DetailedPrediction>(`/api/admin/predictions/${predictionId}/details`);
  return res.data;
}

// Bulk prediction operations
export async function bulkUpdatePredictions(
  operation: BulkPredictionOperation,
): Promise<BulkPredictionResult> {
  const res = await api.post<BulkPredictionResult>('/api/admin/predictions/bulk', operation);
  return res.data;
}

export async function approvePrediction(id: number): Promise<PublicPrediction> {
  const res = await api.patch<PublicPrediction>(`/api/admin/predictions/${id}/approve`);
  return res.data;
}

export async function rejectPrediction(id: number): Promise<PublicPrediction> {
  const res = await api.patch<PublicPrediction>(`/api/admin/predictions/${id}/reject`);
  return res.data;
}

/**
 * Resolve a prediction by supplying the winning option ID.
 */
export async function resolvePrediction(
  id: number,
  winningOptionId: number,
): Promise<PublicPrediction> {
  const res = await api.patch<PublicPrediction>(`/api/admin/predictions/${id}/resolve`, {
    winningOptionId,
  });
  return res.data;
}

/** — Enhanced Financial Operations Dashboard — **/

// Enhanced financial search and filtering types
export interface FinancialSearchParams {
  search?: string; // Search user names, prediction titles
  userId?: number;
  predictionId?: number;
  betType?: ('single' | 'parlay')[];
  status?: ('pending' | 'won' | 'lost' | 'refunded')[];
  transactionType?: ('DEBIT' | 'CREDIT')[];
  transactionSubtype?: (
    | 'BET_WAGER'
    | 'BET_PAYOUT'
    | 'PARLAY_WAGER'
    | 'PARLAY_PAYOUT'
    | 'PONG_WAGER'
    | 'PONG_PAYOUT'
  )[];
  includePongTransactions?: boolean;
  includeMetadata?: boolean;
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

export interface DetailedBet extends PublicBet {
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

export interface DetailedTransaction extends PublicTransaction {
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  subtype?: string;
  description?: string;
  metadata?: any;
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
  relatedPongMatch?: {
    id: string;
    wagerAmount: number;
    payoutAmount?: number;
    status: string;
    playerOneId: number;
    playerTwoId?: number;
    winnerId?: number;
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
  pageSize?: number;
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

// Enhanced financial data endpoints
export async function searchFinancialData(
  params: FinancialSearchParams,
): Promise<AdminFinancialDataResponse> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.userId) queryParams.append('userId', params.userId.toString());
  if (params.predictionId) queryParams.append('predictionId', params.predictionId.toString());
  if (params.betType) params.betType.forEach((t) => queryParams.append('betType', t));
  if (params.status) params.status.forEach((s) => queryParams.append('status', s));
  if (params.transactionType)
    params.transactionType.forEach((t) => queryParams.append('transactionType', t));
  if (params.transactionSubtype)
    params.transactionSubtype.forEach((s) => queryParams.append('transactionSubtype', s));
  if (params.includePongTransactions) queryParams.append('includePongTransactions', 'true');
  if (params.includeMetadata) queryParams.append('includeMetadata', 'true');
  if (params.minAmount) queryParams.append('minAmount', params.minAmount.toString());
  if (params.maxAmount) queryParams.append('maxAmount', params.maxAmount.toString());
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.suspiciousOnly) queryParams.append('suspiciousOnly', 'true');
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get<AdminFinancialDataResponse>(
    `/api/admin/financial/search?${queryParams}`,
  );
  return res.data;
}

export async function getFinancialAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<AdminFinancialAnalyticsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.category) queryParams.append('category', params.category);

  const res = await api.get<AdminFinancialAnalyticsResponse>(
    `/api/admin/financial/analytics?${queryParams}`,
  );
  return res.data;
}

// NEW: Unified analytics endpoint for cross-transaction insights
export async function getUnifiedAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  includeHourlyTrends?: boolean;
  includeRiskMetrics?: boolean;
  topUsersLimit?: number;
}): Promise<import('@ems/types').UnifiedAnalyticsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.includeHourlyTrends) queryParams.append('includeHourlyTrends', 'true');
  if (params?.includeRiskMetrics) queryParams.append('includeRiskMetrics', 'true');
  if (params?.topUsersLimit) queryParams.append('topUsersLimit', params.topUsersLimit.toString());

  const res = await api.get<import('@ems/types').UnifiedAnalyticsResponse>(
    `/api/admin/financial/unified-analytics?${queryParams}`,
  );
  return res.data;
}

export async function bulkFinancialOperation(
  operation: BulkFinancialOperation,
): Promise<BulkFinancialResult> {
  const res = await api.post<BulkFinancialResult>('/api/admin/financial/bulk', operation);
  return res.data;
}

export async function exportFinancialData(params: {
  format: 'csv' | 'excel';
  dataType: 'bets' | 'transactions' | 'analytics';
  filters?: FinancialSearchParams;
}): Promise<Blob> {
  const queryParams = new URLSearchParams();
  queryParams.append('format', params.format);
  queryParams.append('dataType', params.dataType);

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
  }

  const res = await api.get(`/api/admin/financial/export?${queryParams}`, {
    responseType: 'blob',
  });
  return res.data;
}

/** — Enhanced Badge & Achievement System — **/

// Badge search and filtering types
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

export interface BadgeCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  iconUrl?: string;
  badgeCount: number;
  createdAt: string;
}

export interface DetailedBadge extends PublicBadge {
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
    awardedAt: string;
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
    awardedAt: string;
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

export interface CreateBadgeCategoryData {
  name: string;
  description?: string;
  color?: string;
  iconUrl?: string;
}

// Enhanced badge API endpoints
export async function searchBadges(params: BadgeSearchParams): Promise<PaginatedBadges> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
  if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
  if (params.rarity) params.rarity.forEach((r) => queryParams.append('rarity', r));
  if (params.userCount?.min) queryParams.append('userCountMin', params.userCount.min.toString());
  if (params.userCount?.max) queryParams.append('userCountMax', params.userCount.max.toString());
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get<PaginatedBadges>(`/api/admin/badges/search?${queryParams}`);
  return res.data;
}

export async function getBadgeDetails(badgeId: number): Promise<DetailedBadge> {
  const res = await api.get<DetailedBadge>(`/api/admin/badges/${badgeId}/details`);
  return res.data;
}

export async function createBadgeWithCategories(data: CreateBadgeData): Promise<DetailedBadge> {
  const res = await api.post<DetailedBadge>('/api/admin/badges/create', data);
  return res.data;
}

export async function updateBadge(badgeId: number, data: UpdateBadgeData): Promise<DetailedBadge> {
  const res = await api.put<DetailedBadge>(`/api/admin/badges/${badgeId}`, data);
  return res.data;
}

export async function deleteBadge(badgeId: number): Promise<void> {
  await api.delete(`/api/admin/badges/${badgeId}`);
}

export async function getBadgeAnalytics(badgeId?: number): Promise<BadgeAnalytics> {
  const queryParams = new URLSearchParams();
  if (badgeId) queryParams.append('badgeId', badgeId.toString());

  const res = await api.get<BadgeAnalytics>(`/api/admin/badges/analytics?${queryParams}`);
  return res.data;
}

export async function bulkBadgeOperation(operation: BulkBadgeOperation): Promise<BulkBadgeResult> {
  const res = await api.post<BulkBadgeResult>('/api/admin/badges/bulk', operation);
  return res.data;
}

export async function getBadgeCategories(): Promise<BadgeCategory[]> {
  const res = await api.get<BadgeCategory[]>('/api/admin/badge-categories');
  return res.data;
}

export async function createBadgeCategory(data: CreateBadgeCategoryData): Promise<BadgeCategory> {
  const res = await api.post<BadgeCategory>('/api/admin/badge-categories', data);
  return res.data;
}

/** — Legacy Bet & Transaction Oversight (deprecated) — **/
export async function listBets(params?: Record<string, any>): Promise<PublicBet[]> {
  const res = await api.get<PublicBet[]>('/api/admin/bets', { params });
  return res.data;
}

export async function refundBet(id: number): Promise<PublicBet> {
  const res = await api.patch<PublicBet>(`/api/admin/bets/${id}/refund`);
  return res.data;
}

export async function listTransactions(params?: Record<string, any>): Promise<PublicTransaction[]> {
  const res = await api.get<PublicTransaction[]>('/api/admin/transactions', { params });
  return res.data;
}

/** — Content Moderation — **/
export async function listPosts(params?: Record<string, any>): Promise<any[]> {
  const res = await api.get<any[]>('/api/admin/posts', { params });
  return res.data;
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/api/admin/posts/${id}`);
}

/** — Badge & Content Moderation — **/
export async function listBadges(): Promise<PublicBadge[]> {
  const res = await api.get<PublicBadge[]>('/api/admin/badges');
  return res.data;
}

export async function createBadge(data: {
  name: string;
  description?: string | null;
  iconUrl?: string | null;
}): Promise<PublicBadge> {
  const res = await api.post<PublicBadge>('/api/admin/badges', data);
  return res.data;
}

export async function assignBadge(userId: number, badgeId: number): Promise<PublicUserBadge> {
  const res = await api.patch<PublicUserBadge>(`/api/admin/users/${userId}/badges`, {
    badgeId,
  });
  return res.data;
}

export async function revokeBadge(userId: number, badgeId: number): Promise<void> {
  await api.delete(`/api/admin/users/${userId}/badges/${badgeId}`);
}

/** — Leaderboard & Stats — **/
export async function refreshLeaderboard(): Promise<void> {
  await api.post('/api/admin/leaderboard/refresh');
}

export async function getUserStats(userId: number): Promise<UserStatsDTO | null> {
  const res = await api.get<UserStatsDTO>(`/api/admin/stats/${userId}`);
  return res.data;
}

/** — Advanced Analytics & Reporting — **/

// Analytics parameter types
export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
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

// Analytics API functions
export async function getExecutiveDashboard(
  params?: AnalyticsParams,
): Promise<ExecutiveDashboardData> {
  const queryParams = new URLSearchParams();

  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.userId) queryParams.append('userId', params.userId.toString());
  if (params?.granularity) queryParams.append('granularity', params.granularity);

  const res = await api.get<ExecutiveDashboardData>(
    `/api/admin/analytics/executive-dashboard?${queryParams}`,
  );
  return res.data;
}

export async function getUserBehaviorAnalytics(
  params?: AnalyticsParams,
): Promise<UserBehaviorAnalytics> {
  const queryParams = new URLSearchParams();

  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.userId) queryParams.append('userId', params.userId.toString());
  if (params?.granularity) queryParams.append('granularity', params.granularity);

  const res = await api.get<UserBehaviorAnalytics>(
    `/api/admin/analytics/user-behavior?${queryParams}`,
  );
  return res.data;
}

export async function getPredictiveAnalytics(
  params?: AnalyticsParams,
): Promise<PredictiveAnalytics> {
  const queryParams = new URLSearchParams();

  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.userId) queryParams.append('userId', params.userId.toString());
  if (params?.granularity) queryParams.append('granularity', params.granularity);

  const res = await api.get<PredictiveAnalytics>(`/api/admin/analytics/predictive?${queryParams}`);
  return res.data;
}

export async function generateCustomReport(
  reportType: string,
  params?: Record<string, any>,
): Promise<CustomReportData> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
  }

  const res = await api.get<CustomReportData>(
    `/api/admin/analytics/reports/${reportType}?${queryParams}`,
  );
  return res.data;
}

export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const res = await api.get<RealtimeMetrics>('/api/admin/analytics/realtime');
  return res.data;
}

export async function exportAnalyticsData(params: {
  reportType: string;
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
}): Promise<Blob> {
  const queryParams = new URLSearchParams();
  queryParams.append('reportType', params.reportType);
  queryParams.append('format', params.format);

  if (params.filters) {
    queryParams.append('filters', JSON.stringify(params.filters));
  }

  const res = await api.get(`/api/admin/analytics/export?${queryParams}`, {
    responseType: 'blob',
  });
  return res.data;
}

/** — New Achievement Management System — **/

// Achievement types for the new unified system
export interface Achievement {
  id: number;
  name: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  targetValue: number;
  iconUrl: string | null;
  isActive: boolean;
  autoAward: boolean;
  manualOnly: boolean;
  isShame: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementWithStats extends Achievement {
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  recentUnlocks: Array<{
    userId: number;
    userName: string;
    completedAt: string;
  }>;
}

export interface AchievementAnalytics {
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
    completedAt: string;
  }>;
}

export interface CreateAchievementData {
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  targetValue: number;
  iconUrl?: string;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  sortOrder?: number;
}

export interface UpdateAchievementData {
  title?: string;
  description?: string;
  category?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  targetValue?: number;
  iconUrl?: string;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface BulkGrantResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: number; error: string }>;
}

// Achievement API functions
export async function getAllAchievements(): Promise<AchievementWithStats[]> {
  const res = await api.get<AchievementWithStats[]>('/api/admin/achievements');
  return res.data;
}

export async function getAchievementById(achievementId: number): Promise<AchievementWithStats> {
  const res = await api.get<AchievementWithStats>(`/api/admin/achievements/${achievementId}`);
  return res.data;
}

export async function createAchievement(
  data: CreateAchievementData,
): Promise<AchievementWithStats> {
  const res = await api.post<AchievementWithStats>('/api/admin/achievements', data);
  return res.data;
}

export async function updateAchievement(
  achievementId: number,
  data: UpdateAchievementData,
): Promise<AchievementWithStats> {
  const res = await api.put<AchievementWithStats>(`/api/admin/achievements/${achievementId}`, data);
  return res.data;
}

export async function deleteAchievement(achievementId: number): Promise<void> {
  await api.delete(`/api/admin/achievements/${achievementId}`);
}

export async function grantAchievement(achievementId: number, userId: number): Promise<void> {
  await api.post(`/api/admin/achievements/${achievementId}/grant/${userId}`);
}

export async function revokeAchievement(achievementId: number, userId: number): Promise<void> {
  await api.delete(`/api/admin/achievements/${achievementId}/revoke/${userId}`);
}

export async function bulkGrantAchievement(
  achievementId: number,
  userIds: number[],
): Promise<BulkGrantResult> {
  const res = await api.post<BulkGrantResult>(
    `/api/admin/achievements/${achievementId}/bulk-grant`,
    { userIds },
  );
  return res.data;
}

export async function getUsersWithAchievement(achievementId: number): Promise<
  Array<{
    userId: number;
    userName: string;
    progress: number;
    completedAt: string | null;
  }>
> {
  const res = await api.get(`/api/admin/achievements/${achievementId}/users`);
  return res.data;
}

export async function getAchievementAnalytics(): Promise<AchievementAnalytics> {
  const res = await api.get<AchievementAnalytics>('/api/admin/achievements/analytics');
  return res.data;
}

/** — Enhanced JSON Rule Achievement System — **/

// Enhanced interfaces for JSON rule-based achievements
export interface JsonRuleAchievement extends Achievement {
  ruleData: {
    eventKeys: string[];
    progress: {
      kind: 'count' | 'streak' | 'threshold' | 'binary';
      incrementIf?: Record<string, unknown>;
      setIf?: Record<string, unknown>;
      resetIf?: Record<string, unknown>;
    };
    unlockWhen: Record<string, unknown>;
    counters?: string[];
  };
}

export interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  ruleTemplate: JsonRuleAchievement['ruleData'];
  variables: Record<string, string>; // Template variables like {{streakLength}}
  usage: number; // How many times this template has been used
  createdAt: string;
  updatedAt: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  complexityScore: number;
  optimizationSuggestions: string[];
  estimatedPerformanceImpact: 'minimal' | 'moderate' | 'high';
}

export interface EventKeyOption {
  key: string;
  description: string;
  category: 'betting' | 'chat' | 'prediction' | 'leaderboard' | 'pong' | 'user' | 'admin';
  payloadSchema: Record<string, string>; // field name -> type
  volume: 'low' | 'medium' | 'high' | 'critical';
  examples: Record<string, unknown>[]; // Sample payloads
}

export interface SimulationResult {
  userId?: number;
  userName?: string;
  simulatedEvents: Array<{
    eventKey: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }>;
  progressHistory: Array<{
    step: number;
    progress: number;
    unlocked: boolean;
    timestamp: string;
    triggerEvent?: string;
  }>;
  finalProgress: number;
  unlocked: boolean;
  unlockTimestamp?: string;
  estimatedUnlockRate: number; // Percentage of users expected to unlock
}

export interface RuleMetrics {
  achievementId: number;
  achievementTitle: string;
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  averageTimeToComplete: number; // in hours
  processingLatency: {
    p50: number;
    p95: number;
    p99: number;
  };
  eventVolume: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  complexityScore: number;
  performanceScore: number; // 0-100, higher is better
  lastAnalyzed: string;
}

export interface CreateJsonRuleAchievementData {
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  iconUrl?: string;
  isActive?: boolean;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  sortOrder?: number;
  ruleData: JsonRuleAchievement['ruleData'];
}

export interface UpdateJsonRuleAchievementData {
  title?: string;
  description?: string;
  category?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  iconUrl?: string;
  isActive?: boolean;
  autoAward?: boolean;
  manualOnly?: boolean;
  isShame?: boolean;
  sortOrder?: number;
  ruleData?: JsonRuleAchievement['ruleData'];
}

// New API Functions for JSON Rule Achievement System

export async function validateAchievementRule(
  rule: JsonRuleAchievement['ruleData'],
): Promise<RuleValidationResult> {
  const res = await api.post<RuleValidationResult>('/api/admin/achievements/validate-rule', {
    rule,
  });
  return res.data;
}

export async function getAchievementTemplates(): Promise<AchievementTemplate[]> {
  const res = await api.get<AchievementTemplate[]>('/api/admin/achievements/templates');
  return res.data;
}

export async function createAchievementTemplate(
  template: Omit<AchievementTemplate, 'id' | 'usage' | 'createdAt' | 'updatedAt'>,
): Promise<AchievementTemplate> {
  const res = await api.post<AchievementTemplate>('/api/admin/achievements/templates', template);
  return res.data;
}

export async function updateAchievementTemplate(
  templateId: string,
  updates: Partial<Omit<AchievementTemplate, 'id' | 'usage' | 'createdAt' | 'updatedAt'>>,
): Promise<AchievementTemplate> {
  const res = await api.put<AchievementTemplate>(
    `/api/admin/achievements/templates/${templateId}`,
    updates,
  );
  return res.data;
}

export async function deleteAchievementTemplate(templateId: string): Promise<void> {
  await api.delete(`/api/admin/achievements/templates/${templateId}`);
}

export async function simulateRuleProgress(
  rule: JsonRuleAchievement['ruleData'],
  userId?: number,
  scenarioType?: 'historical' | 'synthetic' | 'edge-case',
): Promise<SimulationResult> {
  const res = await api.post<SimulationResult>('/api/admin/achievements/simulate', {
    rule,
    userId,
    scenarioType,
  });
  return res.data;
}

export async function getEventKeyOptions(): Promise<EventKeyOption[]> {
  const res = await api.get<EventKeyOption[]>('/api/admin/achievements/event-keys');
  return res.data;
}

export async function getRulePerformanceMetrics(achievementId: number): Promise<RuleMetrics> {
  const res = await api.get<RuleMetrics>(`/api/admin/achievements/${achievementId}/metrics`);
  return res.data;
}

export async function createJsonRuleAchievement(
  data: CreateJsonRuleAchievementData,
): Promise<JsonRuleAchievement> {
  const res = await api.post<JsonRuleAchievement>('/api/admin/achievements/json-rule', data);
  return res.data;
}

export async function updateJsonRuleAchievement(
  achievementId: number,
  data: UpdateJsonRuleAchievementData,
): Promise<JsonRuleAchievement> {
  const res = await api.put<JsonRuleAchievement>(
    `/api/admin/achievements/${achievementId}/json-rule`,
    data,
  );
  return res.data;
}

export async function getJsonRuleAchievement(achievementId: number): Promise<JsonRuleAchievement> {
  const res = await api.get<JsonRuleAchievement>(
    `/api/admin/achievements/${achievementId}/json-rule`,
  );
  return res.data;
}

export async function getAllJsonRuleAchievements(): Promise<JsonRuleAchievement[]> {
  const res = await api.get<JsonRuleAchievement[]>('/api/admin/achievements/json-rule');
  return res.data;
}

export async function migrateAchievementToJsonRule(
  achievementId: number,
  rule: JsonRuleAchievement['ruleData'],
): Promise<JsonRuleAchievement> {
  const res = await api.post<JsonRuleAchievement>(
    `/api/admin/achievements/${achievementId}/migrate-to-json`,
    { rule },
  );
  return res.data;
}

export async function cloneAchievementFromTemplate(
  templateId: string,
  variables: Record<string, unknown>,
  metadata: {
    title: string;
    description?: string;
    category?: string;
    rarity?: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  },
): Promise<JsonRuleAchievement> {
  const res = await api.post<JsonRuleAchievement>('/api/admin/achievements/clone-from-template', {
    templateId,
    variables,
    metadata,
  });
  return res.data;
}

export async function bulkUpdateAchievementRules(
  updates: Array<{
    achievementId: number;
    ruleData: JsonRuleAchievement['ruleData'];
  }>,
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ achievementId: number; error: string }>;
}> {
  const res = await api.post('/api/admin/achievements/bulk-update-rules', { updates });
  return res.data;
}

export async function getAchievementRuleAnalytics(): Promise<{
  totalRuleAchievements: number;
  rulesByComplexity: Record<'low' | 'medium' | 'high', number>;
  rulesByCategory: Record<string, number>;
  averageProcessingLatency: number;
  topPerformingRules: Array<{
    achievementId: number;
    title: string;
    completionRate: number;
    performanceScore: number;
  }>;
  recentMigrations: Array<{
    achievementId: number;
    title: string;
    migratedAt: string;
  }>;
}> {
  const res = await api.get('/api/admin/achievements/rule-analytics');
  return res.data;
}
