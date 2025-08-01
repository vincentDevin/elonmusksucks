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
  operation: 'activate' | 'deactivate' | 'changeRole' | 'adjustBalance' | 'assignBadge' | 'revokeBadge';
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
  if (params.role) params.role.forEach(r => queryParams.append('role', r));
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
export async function searchPredictions(params: PredictionSearchParams): Promise<PaginatedPredictions> {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.append('search', params.search);
  if (params.category) params.category.forEach(c => queryParams.append('category', c));
  if (params.status) params.status.forEach(s => queryParams.append('status', s));
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
export async function bulkUpdatePredictions(operation: BulkPredictionOperation): Promise<BulkPredictionResult> {
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

/** — Bet & Transaction Oversight — **/
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
