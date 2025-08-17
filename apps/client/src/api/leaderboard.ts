// apps/client/src/api/leaderboard.ts

import api from './axios';
import type { PublicLeaderboardEntry } from '@ems/types';

// Enhanced interfaces for Phase 3 functionality
export interface PaginatedLeaderboard {
  entries: PublicLeaderboardEntry[];
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface UserRank {
  userId: number;
  allTimeRank: number | null;
  dailyRank: number | null;
  weeklyRank?: number | null;
  monthlyRank?: number | null;
}

export interface LeaderboardStats {
  totalUsers: number;
  activeUsers: number;
  totalBets: number;
  totalVolume: number;
  lastRefresh: Date | null;
}

export interface LeaderboardQuery {
  limit?: number;
  offset?: number;
  period?: string;
  metric?: 'profit' | 'winRate' | 'volume' | 'roi';
}

/**
 * Fetch the all-time leaderboard.
 * @param limit number of entries to return (default: 25)
 */
export async function getTopAllTime(limit?: number): Promise<PublicLeaderboardEntry[]> {
  const url = limit ? `/api/leaderboard/all-time?limit=${limit}` : '/api/leaderboard/all-time';
  const { data } = await api.get<PublicLeaderboardEntry[]>(url);
  return data;
}

/**
 * Fetch the daily leaderboard.
 * @param limit number of entries to return (default: 25)
 */
export async function getTopDaily(limit?: number): Promise<PublicLeaderboardEntry[]> {
  const url = limit ? `/api/leaderboard/daily?limit=${limit}` : '/api/leaderboard/daily';
  const { data } = await api.get<PublicLeaderboardEntry[]>(url);
  return data;
}

/**
 * Fetch paginated all-time leaderboard with advanced options.
 */
export async function getTopAllTimePaginated(
  params: LeaderboardQuery = {},
): Promise<PaginatedLeaderboard> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.metric) queryParams.set('metric', params.metric);

  const url = queryParams.toString()
    ? `/api/leaderboard/all-time/paginated?${queryParams}`
    : '/api/leaderboard/all-time/paginated';

  const { data } = await api.get<PaginatedLeaderboard>(url);
  return data;
}

/**
 * Fetch paginated daily leaderboard with advanced options.
 */
export async function getTopDailyPaginated(
  params: LeaderboardQuery = {},
): Promise<PaginatedLeaderboard> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.metric) queryParams.set('metric', params.metric);

  const url = queryParams.toString()
    ? `/api/leaderboard/daily/paginated?${queryParams}`
    : '/api/leaderboard/daily/paginated';

  const { data } = await api.get<PaginatedLeaderboard>(url);
  return data;
}

/**
 * Get specific user's rank.
 */
export async function getUserRank(
  userId: number,
  period: 'allTime' | 'daily' = 'allTime',
): Promise<UserRank> {
  const { data } = await api.get<UserRank>(`/api/leaderboard/user/${userId}/rank?period=${period}`);
  return data;
}

/**
 * Get leaderboard statistics.
 */
export async function getLeaderboardStats(): Promise<LeaderboardStats> {
  const { data } = await api.get<LeaderboardStats>('/api/leaderboard/stats');
  return data;
}

/**
 * Trigger manual refresh of leaderboard.
 */
export async function refreshLeaderboard(): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/api/leaderboard/refresh');
  return data;
}
