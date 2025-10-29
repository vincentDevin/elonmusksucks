/**
 * Domain Layer - Analytics Types
 *
 * Dashboard analytics, metrics, insights, and reporting types
 */

// ============================================================================
// Dashboard Analytics
// ============================================================================

/**
 * Dashboard Overview Analytics
 */
export interface DashboardOverviewAnalytics {
  user: UserAnalytics;
  platform: PlatformAnalytics;
  trending: TrendingAnalytics;
  insights: SmartInsight[];
}

/**
 * User Analytics
 */
export interface UserAnalytics {
  balance: string; // BigInt as string
  balanceChange24h: BalanceChange;
  balanceChange7d: BalanceChange;
  performance: PerformanceMetrics;
  activity: ActivityMetrics;
  rankings: RankingMetrics;
}

/**
 * Balance Change
 */
export interface BalanceChange {
  absolute: string; // BigInt as string
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  winRate: number;
  roi: number;
  totalBets: number;
  profitLoss: string; // BigInt as string
  streak: {
    current: number;
    type: 'win' | 'loss';
    longest: number;
  };
  bestCategory?: {
    categoryId: number;
    categoryName: string;
    winRate: number;
  };
}

/**
 * Activity Metrics
 */
export interface ActivityMetrics {
  betsToday: number;
  betsThisWeek: number;
  predictionsCreated: number;
  pongMatchesToday: number;
  loginStreak: number;
  lastActive: Date;
}

/**
 * Ranking Metrics
 */
export interface RankingMetrics {
  allTimeRank: number | null;
  allTimePercentile: number | null;
  dailyRank: number | null;
  pongRank: number | null;
  movement24h: number; // Change in rank (positive = improvement)
}

// ============================================================================
// Platform Analytics
// ============================================================================

/**
 * Platform Analytics
 */
export interface PlatformAnalytics {
  overview: PlatformOverview;
  betting: BettingAnalytics;
  predictions: PredictionAnalytics;
  pong: PongAnalytics;
  social: SocialAnalytics;
}

/**
 * Platform Overview
 */
export interface PlatformOverview {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalVolume: string; // BigInt as string
  totalBets: number;
  totalPredictions: number;
  platformRevenue: string; // BigInt as string
}

/**
 * Betting Analytics
 */
export interface BettingAnalytics {
  total24h: number;
  volume24h: string; // BigInt as string
  averageBetSize: string; // BigInt as string
  mostPopularCategory: {
    categoryId: number;
    categoryName: string;
    betCount: number;
  };
  largestBet24h?: {
    amount: string; // BigInt as string
    predictionTitle: string;
  };
}

/**
 * Prediction Analytics
 */
export interface PredictionAnalytics {
  active: number;
  resolved24h: number;
  created24h: number;
  averageVolume: string; // BigInt as string
  trending: Array<{
    predictionId: number;
    title: string;
    volume: string; // BigInt as string
    betCount: number;
  }>;
}

/**
 * Pong Analytics
 */
export interface PongAnalytics {
  matchesActive: number;
  matches24h: number;
  averageMatchDuration: number; // seconds
  topPlayers: Array<{
    userId: number;
    name: string;
    elo: number;
    tier: string;
  }>;
}

/**
 * Social Analytics
 */
export interface SocialAnalytics {
  comments24h: number;
  reactions24h: number;
  newFollows24h: number;
  chatMessages24h: number;
}

// ============================================================================
// Trending Analytics
// ============================================================================

/**
 * Trending Analytics
 */
export interface TrendingAnalytics {
  predictions: TrendingPrediction[];
  categories: TrendingCategory[];
  users: TrendingUser[];
}

/**
 * Trending Prediction
 */
export interface TrendingPrediction {
  predictionId: number;
  title: string;
  category: string;
  volume: string; // BigInt as string
  betCount: number;
  momentum: number; // Change in bet rate
  expiresAt: Date;
}

/**
 * Trending Category
 */
export interface TrendingCategory {
  categoryId: number;
  categoryName: string;
  activePredictions: number;
  volume24h: string; // BigInt as string
  growth: number; // Percentage growth
}

/**
 * Trending User
 */
export interface TrendingUser {
  userId: number;
  name: string;
  avatarUrl: string | null;
  winRate: number;
  roi: number;
  rankChange: number;
}

// ============================================================================
// Smart Insights
// ============================================================================

/**
 * Smart Insight
 */
export interface SmartInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  action?: InsightAction;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Insight Types
 */
export const InsightType = {
  PERFORMANCE: 'performance',
  OPPORTUNITY: 'opportunity',
  WARNING: 'warning',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
  TREND: 'trend',
  RECOMMENDATION: 'recommendation',
} as const;

export type InsightType = (typeof InsightType)[keyof typeof InsightType];

/**
 * Insight Severity
 */
export const InsightSeverity = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export type InsightSeverity = (typeof InsightSeverity)[keyof typeof InsightSeverity];

/**
 * Insight Action
 */
export interface InsightAction {
  label: string;
  url?: string;
  action?: string;
}

// ============================================================================
// Time Series Analytics
// ============================================================================

/**
 * Time Series Data Point
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number | string;
  label?: string;
}

/**
 * Time Series Data
 */
export interface TimeSeriesData {
  metric: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataPoints: TimeSeriesDataPoint[];
  aggregate?: {
    min: number | string;
    max: number | string;
    avg: number | string;
    total: number | string;
  };
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Analytics Report
 */
export interface AnalyticsReport {
  id: string;
  type: ReportType;
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  sections: ReportSection[];
  generatedAt: Date;
  generatedBy?: number; // userId
}

/**
 * Report Types
 */
export const ReportType = {
  USER_PERFORMANCE: 'user_performance',
  PLATFORM_OVERVIEW: 'platform_overview',
  FINANCIAL_SUMMARY: 'financial_summary',
  BETTING_PATTERNS: 'betting_patterns',
  ENGAGEMENT: 'engagement',
  CUSTOM: 'custom',
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

/**
 * Report Section
 */
export interface ReportSection {
  title: string;
  type: 'chart' | 'table' | 'summary' | 'text';
  data: unknown;
  order: number;
}

// ============================================================================
// Predictive Analytics
// ============================================================================

/**
 * Prediction Forecast
 */
export interface PredictionForecast {
  metric: string;
  current: number;
  forecast7d: number;
  forecast30d: number;
  confidence: number; // 0-100
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: ForecastFactor[];
}

/**
 * Forecast Factor
 */
export interface ForecastFactor {
  name: string;
  impact: number; // -1 to 1 (negative to positive impact)
  description: string;
}

/**
 * Risk Assessment
 */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  name: string;
  severity: number; // 0-100
  description: string;
  mitigation?: string;
}

// ============================================================================
// User Stats DTO
// ============================================================================

/**
 * User Statistics DTO
 *
 * Raw user statistics data transfer object
 */
export interface UserStatsDTO {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  totalParlays: number;
  parlaysWon: number;
  parlaysLost: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  parlayLegsLost: number;
  totalWagered: string; // BigInt as string
  totalWinnings: string; // BigInt as string
  totalLosses: string; // BigInt as string
  netProfit: string; // BigInt as string
  currentStreak: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  averageBetSize: string; // BigInt as string
  averageOdds: number;
  biggestWin: string; // BigInt as string
  biggestLoss: string; // BigInt as string
  winRate: number;
  roi: number;
}

/**
 * Trend Data Point
 *
 * Simple time-series data point for charts and graphs
 */
export interface TrendData {
  date: string;
  value: number;
}
