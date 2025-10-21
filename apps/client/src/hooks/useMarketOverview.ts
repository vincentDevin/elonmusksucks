// Rollback: Delete this file and restore direct fetch usage in Home.tsx
import { useState, useEffect, useCallback } from 'react';
import { getMarketOverview } from '../api/market';
import type { MarketStatsResponse } from '@ems/types';

export const useMarketOverview = () => {
  const [data, setData] = useState<MarketStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketOverview = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const overview = await getMarketOverview();
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketOverview();
  }, [fetchMarketOverview]);

  return { data, loading, error, refresh: () => fetchMarketOverview(true) };
};
