// apps/client/src/api/leaderboard.ts

import api from './axios';
import type { PublicLeaderboardEntry } from '@ems/types';

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

// Future: getTopWeekly, getTopMonthly, etc.
