// apps/client/src/api/leaderboard.ts

import api from './axios';
import type {
  PublicLeaderboardEntry,
  PaginatedLeaderboardResponse,
  UserRankResponse,
  LeaderboardStatsResponse,
  LeaderboardQueryParams,
  PongLeaderboardView,
} from '@ems/types';

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
  params: LeaderboardQueryParams = {},
): Promise<PaginatedLeaderboardResponse> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.metric) queryParams.set('metric', params.metric);

  const url = queryParams.toString()
    ? `/api/leaderboard/all-time/paginated?${queryParams}`
    : '/api/leaderboard/all-time/paginated';

  const { data } = await api.get<PaginatedLeaderboardResponse>(url);
  return data;
}

/**
 * Fetch paginated daily leaderboard with advanced options.
 */
export async function getTopDailyPaginated(
  params: LeaderboardQueryParams = {},
): Promise<PaginatedLeaderboardResponse> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.metric) queryParams.set('metric', params.metric);

  const url = queryParams.toString()
    ? `/api/leaderboard/daily/paginated?${queryParams}`
    : '/api/leaderboard/daily/paginated';

  const { data } = await api.get<PaginatedLeaderboardResponse>(url);
  return data;
}

/**
 * Get specific user's rank.
 */
export async function getUserRank(
  userId: number,
  period: 'allTime' | 'daily' = 'allTime',
): Promise<UserRankResponse> {
  const { data } = await api.get<UserRankResponse>(
    `/api/leaderboard/user/${userId}/rank?period=${period}`,
  );
  return data;
}

/**
 * Get leaderboard statistics.
 */
export async function getLeaderboardStats(): Promise<LeaderboardStatsResponse> {
  const { data } = await api.get<LeaderboardStatsResponse>('/api/leaderboard/stats');
  return data;
}

/**
 * Trigger manual refresh of leaderboard.
 */
export async function refreshLeaderboard(): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/api/leaderboard/refresh');
  return data;
}

/**
 * Fetch Pong leaderboard by metric.
 * @param metric The metric to sort by (elo, wins, winStreak, totalWon, totalWagered, perfectGames)
 * @param limit Number of entries to return (default: 50)
 */
export async function getPongLeaderboard(
  metric: string = 'elo',
  limit: number = 50,
): Promise<PongLeaderboardView[]> {
  const { data } = await api.get<PongLeaderboardView[]>(
    `/api/leaderboard/pong/${metric}?limit=${limit}`,
  );
  return data;
}
