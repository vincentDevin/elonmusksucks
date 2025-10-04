// apps/client/src/api/market.ts
import api from './axios';
import type {
  MarketStatsResponse,
  TrendingPredictionResponse,
  MarketHealthResponse,
} from '@ems/types';

/**
 * Get real-time market overview statistics
 */
export const getMarketOverview = async (): Promise<MarketStatsResponse> => {
  try {
    const response = await api.get<MarketStatsResponse>('/api/market/overview');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch market overview:', error);
    throw new Error('Failed to load market overview');
  }
};

/**
 * Get trending predictions by volume
 */
export const getTrendingPredictions = async (limit = 10): Promise<TrendingPredictionResponse[]> => {
  const response = await api.get<TrendingPredictionResponse[]>('/api/market/trending', {
    params: { limit },
  });
  return response.data;
};

/**
 * Get market health indicators
 */
export const getMarketHealth = async (): Promise<MarketHealthResponse> => {
  const response = await api.get<MarketHealthResponse>('/api/market/health');
  return response.data;
};

export default {
  getMarketOverview,
  getTrendingPredictions,
  getMarketHealth,
};
