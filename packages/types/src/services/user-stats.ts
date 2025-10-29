/**
 * Services Layer - User Stats Service Types
 *
 * Types for user statistics calculation, tracking, and analytics
 */

// ============================================================================
// User Stats Calculation Types
// ============================================================================

/**
 * User Stats Calculation Input
 */
export interface UserStatsCalculationInput {
  userId: number;
  includeHistorical?: boolean;
  includePongStats?: boolean;
  includeAchievements?: boolean;
}

/**
 * User Stats Calculation Result
 */
export interface UserStatsCalculationResult {
  betting: BettingStats;
  pong?: PongStats;
  achievements?: AchievementStats;
  financial: FinancialStats;
  activity: ActivityStats;
  rankings: RankingStats;
}

/**
 * Betting Statistics
 */
export interface BettingStats {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  betsPending: number;
  winRate: number; // Percentage
  totalWagered: string; // BigInt as string
  totalWon: string; // BigInt as string
  totalLost: string; // BigInt as string
  profit: string; // BigInt as string
  roi: number; // Return on investment percentage
  averageBetSize: string; // BigInt as string
  largestWin: string; // BigInt as string
  largestLoss: string; // BigInt as string
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  favoriteCategory?: {
    categoryId: number;
    categoryName: string;
    betCount: number;
  };
  bestCategory?: {
    categoryId: number;
    categoryName: string;
    winRate: number;
  };
}

/**
 * Pong Statistics
 */
export interface PongStats {
  totalMatches: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number; // Percentage
  currentElo: number;
  peakElo: number;
  lowestElo: number;
  tier: string;
  totalWagered: string; // BigInt as string
  totalWon: string; // BigInt as string
  totalLost: string; // BigInt as string
  profit: string; // BigInt as string
  currentStreak: number;
  longestWinStreak: number;
  averageScoreDiff: number;
  largestVictoryMargin: number;
  comebackWins: number;
  perfectWins: number; // Wins where opponent scored 0
  vsAIRecord: {
    easy: { wins: number; losses: number };
    medium: { wins: number; losses: number };
    hard: { wins: number; losses: number };
    impossible: { wins: number; losses: number };
  };
  vsPlayerRecord: {
    wins: number;
    losses: number;
  };
}

/**
 * Achievement Statistics
 */
export interface AchievementStats {
  totalUnlocked: number;
  totalAvailable: number;
  completionPercentage: number;
  recentUnlocks: Array<{
    achievementId: string;
    unlockedAt: Date;
  }>;
  categoryCounts: Record<string, number>;
  rarity: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

/**
 * Financial Statistics
 */
export interface FinancialStats {
  currentBalance: string; // BigInt as string
  peakBalance: string; // BigInt as string
  lowestBalance: string; // BigInt as string
  totalDeposits: string; // BigInt as string (if applicable)
  totalWithdrawals: string; // BigInt as string (if applicable)
  netWorth: string; // BigInt as string
  balanceChange24h: string; // BigInt as string
  balanceChange7d: string; // BigInt as string
  balanceChange30d: string; // BigInt as string
  profitChange24h: number; // Percentage
  profitChange7d: number; // Percentage
  profitChange30d: number; // Percentage
}

/**
 * Activity Statistics
 */
export interface ActivityStats {
  accountAge: number; // Days
  lastActive: Date;
  daysActive: number;
  loginStreak: number;
  longestLoginStreak: number;
  totalSessions: number;
  averageSessionDuration: number; // Minutes
  predictionsCreated: number;
  parlaysCreated: number;
  commentsPosted: number;
  reactionsGiven: number;
  chatMessagesSent: number;
  followersCount: number;
  followingCount: number;
}

/**
 * Ranking Statistics
 */
export interface RankingStats {
  allTimeRank: number | null;
  allTimePercentile: number | null;
  dailyRank: number | null;
  dailyPercentile: number | null;
  pongRank: number | null;
  pongPercentile: number | null;
  categoryRanks?: Array<{
    categoryId: number;
    categoryName: string;
    rank: number;
    percentile: number;
  }>;
}

// ============================================================================
// Stats Update Types
// ============================================================================

/**
 * Stats Update Event
 */
export interface StatsUpdateEvent {
  userId: number;
  changes: {
    betting?: Partial<BettingStats>;
    pong?: Partial<PongStats>;
    financial?: Partial<FinancialStats>;
    activity?: Partial<ActivityStats>;
    rankings?: Partial<RankingStats>;
  };
  trigger: StatsUpdateTrigger;
  timestamp: Date;
}

/**
 * Stats Update Triggers
 */
export const StatsUpdateTrigger = {
  BET_PLACED: 'bet:placed',
  BET_RESOLVED: 'bet:resolved',
  PARLAY_PLACED: 'parlay:placed',
  PARLAY_RESOLVED: 'parlay:resolved',
  PONG_MATCH_COMPLETED: 'pong:match:completed',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  BALANCE_CHANGED: 'balance:changed',
  LEADERBOARD_UPDATED: 'leaderboard:updated',
  MANUAL_REFRESH: 'manual:refresh',
} as const;

export type StatsUpdateTrigger =
  (typeof StatsUpdateTrigger)[keyof typeof StatsUpdateTrigger];

// ============================================================================
// Stats Comparison Types
// ============================================================================

/**
 * User Stats Comparison
 */
export interface UserStatsComparison {
  user1: {
    userId: number;
    stats: UserStatsCalculationResult;
  };
  user2: {
    userId: number;
    stats: UserStatsCalculationResult;
  };
  comparison: {
    bettingWinRate: number; // Difference in percentage points
    pongWinRate?: number;
    roi: number;
    profitDifference: string; // BigInt as string
    eloDifference?: number;
    rankDifference?: number;
  };
}

// ============================================================================
// Stats Historical Types
// ============================================================================

/**
 * Stats Snapshot
 */
export interface StatsSnapshot {
  userId: number;
  timestamp: Date;
  stats: UserStatsCalculationResult;
}

/**
 * Stats Time Series
 */
export interface StatsTimeSeries {
  userId: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataPoints: Array<{
    timestamp: Date;
    balance: string; // BigInt as string
    profit: string; // BigInt as string
    winRate: number;
    elo?: number;
    rank?: number;
  }>;
}

/**
 * Stats Trend Analysis
 */
export interface StatsTrendAnalysis {
  userId: number;
  metric: 'balance' | 'profit' | 'winRate' | 'elo' | 'rank';
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number; // Percentage change per period
  volatility: number; // Standard deviation
  forecast?: {
    next7d: number;
    next30d: number;
    confidence: number; // Percentage
  };
}
