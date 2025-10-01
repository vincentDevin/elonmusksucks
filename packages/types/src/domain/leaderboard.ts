/**
 * Domain Layer - Leaderboard Types
 *
 * Leaderboard rankings, calculations, and display logic
 */

// ============================================================================
// Leaderboard Entry Types
// ============================================================================

/**
 * Leaderboard Entry
 */
export interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  avatarUrl: string | null;
  score: number | string; // Depends on leaderboard type
  stats: LeaderboardEntryStats;
  change?: RankChange;
  tier?: string;
  badge?: string;
}

/**
 * Leaderboard Entry Stats
 */
export interface LeaderboardEntryStats {
  // Betting stats
  totalBets?: number;
  winRate?: number;
  roi?: number;
  profit?: string; // BigInt as string

  // Pong stats
  pongElo?: number;
  pongWinRate?: number;
  pongMatches?: number;

  // Engagement stats
  streak?: number;
  achievements?: number;
  followers?: number;
}

/**
 * Rank Change
 */
export interface RankChange {
  direction: 'up' | 'down' | 'same';
  amount: number;
  percentile: number;
  previousRank: number;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

/**
 * Leaderboard Type
 */
export const LeaderboardType = {
  ALL_TIME: 'allTime',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  PONG: 'pong',
  CATEGORY: 'category', // Category-specific leaderboards
} as const;

export type LeaderboardType = (typeof LeaderboardType)[keyof typeof LeaderboardType];

/**
 * Leaderboard Metric
 */
export const LeaderboardMetric = {
  PROFIT: 'profit',
  ROI: 'roi',
  WIN_RATE: 'win_rate',
  TOTAL_WAGERED: 'total_wagered',
  PONG_ELO: 'pong_elo',
  ACHIEVEMENTS: 'achievements',
  STREAK: 'streak',
} as const;

export type LeaderboardMetric =
  (typeof LeaderboardMetric)[keyof typeof LeaderboardMetric];

// ============================================================================
// Leaderboard Configuration
// ============================================================================

/**
 * Leaderboard Configuration
 */
export interface LeaderboardConfig {
  type: LeaderboardType;
  metric: LeaderboardMetric;
  minBets?: number; // Minimum bets required to qualify
  categoryId?: number; // For category-specific leaderboards
  limit?: number;
  refreshInterval?: number; // milliseconds
  displayPodium?: boolean; // Show top 3 with special styling
}

/**
 * Leaderboard Filters
 */
export interface LeaderboardFilters {
  type?: LeaderboardType;
  categoryId?: number;
  search?: string; // Search by username
  minRank?: number;
  maxRank?: number;
  tier?: string; // For Pong leaderboard
}

// ============================================================================
// Leaderboard Calculation
// ============================================================================

/**
 * Leaderboard Calculation Input
 */
export interface LeaderboardCalculationInput {
  type: LeaderboardType;
  metric: LeaderboardMetric;
  period?: {
    start: Date;
    end: Date;
  };
  categoryId?: number;
  limit?: number;
}

/**
 * Leaderboard Calculation Result
 */
export interface LeaderboardCalculationResult {
  type: LeaderboardType;
  metric: LeaderboardMetric;
  entries: LeaderboardEntry[];
  totalEntries: number;
  calculatedAt: Date;
  nextRefresh?: Date;
}

// ============================================================================
// Rank Calculation
// ============================================================================

/**
 * User Rank Calculation Input
 */
export interface UserRankCalculationInput {
  userId: number;
  type: LeaderboardType;
  metric: LeaderboardMetric;
  categoryId?: number;
}

/**
 * User Rank Result
 */
export interface UserRankResult {
  userId: number;
  rank: number;
  percentile: number;
  score: number | string;
  totalEntries: number;
  change?: RankChange;
  neighbors?: {
    above?: LeaderboardEntry;
    below?: LeaderboardEntry;
  };
}

// ============================================================================
// Leaderboard Events
// ============================================================================

/**
 * Rank Change Event
 */
export interface RankChangeEvent {
  userId: number;
  leaderboardType: LeaderboardType;
  oldRank: number;
  newRank: number;
  change: number;
  percentile: number;
  metric: LeaderboardMetric;
  score: number | string;
  timestamp: Date;
  milestone?: boolean;
}

/**
 * Leaderboard Milestone
 */
export interface LeaderboardMilestone {
  type: MilestoneType;
  rank: number;
  description: string;
  reward?: {
    type: 'musk_bucks' | 'badge' | 'title';
    value: number | string;
  };
}

/**
 * Milestone Types
 */
export const MilestoneType = {
  TOP_10: 'top_10',
  TOP_100: 'top_100',
  TOP_1000: 'top_1000',
  TOP_1_PERCENT: 'top_1_percent',
  TOP_10_PERCENT: 'top_10_percent',
} as const;

export type MilestoneType = (typeof MilestoneType)[keyof typeof MilestoneType];

// ============================================================================
// Leaderboard Display
// ============================================================================

/**
 * Leaderboard View
 */
export interface LeaderboardView {
  config: LeaderboardConfig;
  entries: LeaderboardEntry[];
  podium?: {
    first: LeaderboardEntry;
    second?: LeaderboardEntry;
    third?: LeaderboardEntry;
  };
  userEntry?: LeaderboardEntry;
  stats: LeaderboardStats;
  lastUpdated: Date;
  nextUpdate?: Date;
}

/**
 * Leaderboard Statistics
 */
export interface LeaderboardStats {
  totalUsers: number;
  qualifiedUsers: number; // Users meeting minimum requirements
  averageScore: number | string;
  topScore: number | string;
  scoreRange: {
    min: number | string;
    max: number | string;
  };
}

// ============================================================================
// Category Leaderboard
// ============================================================================

/**
 * Category Leaderboard Entry
 */
export interface CategoryLeaderboardEntry extends LeaderboardEntry {
  categoryId: number;
  categoryName: string;
  categoryStats: {
    betsInCategory: number;
    winRateInCategory: number;
    profitInCategory: string; // BigInt as string
  };
}

/**
 * Multi-Category Ranking
 */
export interface MultiCategoryRanking {
  userId: number;
  rankings: Array<{
    categoryId: number;
    categoryName: string;
    rank: number;
    percentile: number;
    score: number | string;
  }>;
  bestCategory: {
    categoryId: number;
    categoryName: string;
    rank: number;
  };
}

// ============================================================================
// Leaderboard Refresh
// ============================================================================

/**
 * Leaderboard Refresh Job
 */
export interface LeaderboardRefreshJob {
  type: LeaderboardType;
  categoryId?: number;
  force?: boolean; // Force refresh even if not scheduled
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Leaderboard Refresh Result
 */
export interface LeaderboardRefreshResult {
  type: LeaderboardType;
  entriesUpdated: number;
  ranksChanged: number;
  duration: number; // milliseconds
  completedAt: Date;
  errors?: string[];
}
