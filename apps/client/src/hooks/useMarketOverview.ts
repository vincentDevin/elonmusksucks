// Rollback: Delete this file and restore direct fetch usage in Home.tsx
import { useState, useEffect, useCallback } from 'react';
import { getMarketOverview } from '../api/market';
import type { MarketStatsResponse } from '@ems/types';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

export const useMarketOverview = () => {
  const [data, setData] = useState<MarketStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketOverview = useCallback(async (force = false) => {
    const cacheKey = CACHE_KEYS.MARKET_OVERVIEW;

    // Check cache first unless forcing refresh
    if (!force && cache.has(cacheKey)) {
      const cachedData = cache.get<MarketStatsResponse>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const overview = await getMarketOverview();

      // Cache for 2 minutes
      cache.set(cacheKey, overview, CACHE_TTL.MEDIUM);
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
