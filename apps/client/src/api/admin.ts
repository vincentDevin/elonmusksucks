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
  PublicAITweet,
  Role,
} from '@ems/types';

/** — Enhanced User Management — **/
export async function listUsers(): Promise<PublicUser[]> {
  const res = await api.get<PublicUser[]>('/api/admin/users');
  return res.data;
}

// Enhanced search and pagination types
export interface UserSearchParams {
  search?: string;
  role?: string[];
  active?: boolean;
  bannedOnly?: boolean;
  page: number;
  limit: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'muskBucks' | 'role';
  sortOrder?: 'asc' | 'desc';
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
  stats?: {
    totalBets: number;
    totalWagered: number;
    totalWon: number;
    winRate: number;
  };
  recentActivity?: {
    lastLogin?: string;
    lastBet?: string;
    totalLogins: number;
  };
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
export async function searchUsers(params: UserSearchParams): Promise<PaginatedUsers> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.role) params.role.forEach((r) => queryParams.append('role', r));
  if (params.active !== undefined) queryParams.append('active', params.active.toString());
  if (params.bannedOnly) queryParams.append('bannedOnly', 'true');
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get<PaginatedUsers>(`/api/admin/users/search?${queryParams}`);
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

// Enhanced financial data endpoints
export async function searchFinancialData(
  params: FinancialSearchParams,
): Promise<PaginatedFinancialData> {
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.append('search', params.search);
  if (params.userId) queryParams.append('userId', params.userId.toString());
  if (params.predictionId) queryParams.append('predictionId', params.predictionId.toString());
  if (params.betType) params.betType.forEach((t) => queryParams.append('betType', t));
  if (params.status) params.status.forEach((s) => queryParams.append('status', s));
  if (params.transactionType)
    params.transactionType.forEach((t) => queryParams.append('transactionType', t));
  if (params.minAmount) queryParams.append('minAmount', params.minAmount.toString());
  if (params.maxAmount) queryParams.append('maxAmount', params.maxAmount.toString());
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.suspiciousOnly) queryParams.append('suspiciousOnly', 'true');
  queryParams.append('page', params.page.toString());
  queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const res = await api.get<PaginatedFinancialData>(`/api/admin/financial/search?${queryParams}`);
  return res.data;
}

export async function getFinancialAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<FinancialAnalytics> {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.category) queryParams.append('category', params.category);

  const res = await api.get<FinancialAnalytics>(`/api/admin/financial/analytics?${queryParams}`);
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

/** — Miscellaneous — **/
export async function triggerAITweet(): Promise<PublicAITweet> {
  const res = await api.post<PublicAITweet>('/api/admin/aitweet');
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
