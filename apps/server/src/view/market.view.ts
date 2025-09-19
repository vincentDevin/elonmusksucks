import type { MarketOverviewView } from '@ems/types';

/**
 * Maps market overview data to standardized MarketOverviewView DTO
 * Service already handles BigInt conversions, just ensures shape consistency
 */
export const toMarketOverviewView = (
  stats: {
    totalVolume: number;
    activeMarkets: number;
    totalUsers: number;
    volumeChange: number;
    trending?: Array<{
      category: string;
      icon: string;
      growth: number;
    }>;
  },
  cached: boolean,
): MarketOverviewView => ({
  cached,
  totalVolume: stats.totalVolume,
  activeMarkets: stats.activeMarkets,
  totalUsers: stats.totalUsers,
  volumeChange: stats.volumeChange,
  trending: stats.trending || [],
});
