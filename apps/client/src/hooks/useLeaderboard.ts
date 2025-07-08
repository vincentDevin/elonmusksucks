// apps/client/src/hooks/useLeaderboard.ts
import { useState, useEffect, useCallback } from 'react';
import type { PublicLeaderboardEntry } from '@ems/types';
import { getTopAllTime, getTopDaily } from '../api/leaderboard';

export type LeaderboardPeriod = 'all-time' | 'daily';

export function useLeaderboard(period: LeaderboardPeriod = 'all-time', limit: number = 25) {
  const [data, setData] = useState<PublicLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = period === 'all-time' ? await getTopAllTime(limit) : await getTopDaily(limit);
      setData(entries);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [period, limit]);

  // Fetch on mount and whenever `period` or `limit` changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    data,
    loading,
    error,
    /** call this to manually re-fetch the leaderboard */
    refresh: fetchLeaderboard,
  };
}
