/**
 * Market Response DTOs
 *
 * Response types for market overview and statistics endpoints
 */

// ============================================================================
// Market Overview
// ============================================================================

export interface MarketStatsResponse {
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

// ============================================================================
// Trending Predictions
// ============================================================================

export interface TrendingPredictionResponse {
  id: number;
  title: string;
  category: string;
  volume: number;
  betCount: number;
  expiresAt: string;
}

// ============================================================================
// Market Health
// ============================================================================

export interface MarketHealthResponse {
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
