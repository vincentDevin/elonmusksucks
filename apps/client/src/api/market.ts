// apps/client/src/api/market.ts
// Rollback: Remove axios import change and restore original API configuration
import api from './axios';

export interface MarketStats {
  totalVolume: number;
  activeMarkets: number;
  totalUsers: number;
  volumeChange: number;
  trending: {
    category: string;
    icon: string;
    growth: number;
  }[];
  cached?: boolean;
}

export interface TrendingPrediction {
  id: number;
  title: string;
  category: string;
  volume: number;
  betCount: number;
  expiresAt: string;
}

export interface MarketHealth {
  liquidity: number;
  activity: number;
  volatility: number;
  satisfaction: number;
  metrics: {
    recentActivity: number;
    avgBetSize: number;
    uniqueBettors: number;
    activeCategories: number;
  };
}

/**
 * Get real-time market overview statistics
 */
export const getMarketOverview = async (): Promise<MarketStats> => {
  try {
    const response = await api.get<MarketStats>('/api/market/overview');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch market overview:', error);
    throw new Error('Failed to load market overview');
  }
};

/**
 * Get trending predictions by volume
 */
export const getTrendingPredictions = async (limit = 10): Promise<TrendingPrediction[]> => {
  const response = await api.get<TrendingPrediction[]>('/market/trending', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get market health indicators
 */
export const getMarketHealth = async (): Promise<MarketHealth> => {
  const response = await api.get<MarketHealth>('/market/health');
  return response.data;
};

export default {
  getMarketOverview,
  getTrendingPredictions,
  getMarketHealth,
};
