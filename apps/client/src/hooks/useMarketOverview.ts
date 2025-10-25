import { getMarketOverview } from '../api/market';
import type { MarketStatsResponse } from '@ems/types';
import { useCachedFetch } from './useCachedFetch';

/**
 * Fetch market overview with caching
 * Cache TTL: 120 seconds (market stats don't change rapidly)
 */
export const useMarketOverview = () => {
  const { data, error, isLoading, refetch } = useCachedFetch<MarketStatsResponse>(
    async () => await getMarketOverview(),
    {
      cacheKey: 'market-overview',
      ttl: 120000, // 2 minutes - market stats are relatively stable
    },
  );

  return {
    data,
    loading: isLoading,
    error: error ? error.message : null,
    refresh: refetch,
  };
};
