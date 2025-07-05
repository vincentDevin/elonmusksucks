// apps/client/src/hooks/useLeaderboard.ts
import { useState, useEffect, useCallback } from 'react';
import type { PublicLeaderboardEntry } from '@ems/types';
import { getTopAllTime, getTopDaily } from '../api/leaderboard';

export type LeaderboardPeriod = 'all-time' | 'daily';

export function useLeaderboard(period: LeaderboardPeriod = 'all-time', limit: number = 25) {
  const [data, setData] = useState<PublicLeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
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

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
