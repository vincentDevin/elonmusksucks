// apps/client/src/hooks/useLeaderboard.ts
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { PublicLeaderboardEntry } from '@ems/types';
import { getTopAllTime, getTopDaily } from '../api/leaderboard';

export type LeaderboardPeriod = 'all-time' | 'daily';

export function useLeaderboard(period: LeaderboardPeriod = 'all-time', limit: number = 25) {
  const socket = useSocket();
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

  // Initial fetch and re-fetch on parameter change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const handleAllTime = (entries: PublicLeaderboardEntry[]) => {
      if (period === 'all-time') {
        setData(entries);
      }
    };
    const handleDaily = (entries: PublicLeaderboardEntry[]) => {
      if (period === 'daily') {
        setData(entries);
      }
    };

    socket.on('leaderboardAllTime', handleAllTime);
    socket.on('leaderboardDaily', handleDaily);
    return () => {
      socket.off('leaderboardAllTime', handleAllTime);
      socket.off('leaderboardDaily', handleDaily);
    };
  }, [socket, period]);

  return {
    data,
    loading,
    error,
    /** Manually re-fetch the leaderboard */
    refresh: fetchLeaderboard,
  };
}
