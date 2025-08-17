import type { PublicLeaderboardEntry } from '@ems/types';

// Enhanced interfaces for the modernised leaderboard system
export interface LeaderboardQuery {
  limit?: number; // Default: 25, Max: 100
  offset?: number; // For pagination
  period?: string; // '24h', '7d', '30d', 'allTime'
  metric?: 'profit' | 'winRate' | 'volume' | 'roi';
}

export interface PaginatedLeaderboard {
  entries: PublicLeaderboardEntry[];
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface UserRank {
  userId: number;
  allTimeRank: number | null;
  dailyRank: number | null;
  weeklyRank?: number | null;
  monthlyRank?: number | null;
}

export interface LeaderboardStats {
  totalUsers: number;
  activeUsers: number;
  totalBets: number;
  totalVolume: number;
  lastRefresh: Date | null;
}

/**
 * Enhanced abstraction for fetching leaderboard data from the database.
 */
export interface ILeaderboardRepository {
  /**
   * Get the top users by all-time profit.
   * @param limit how many entries to return
   */
  getTopAllTime(limit: number): Promise<PublicLeaderboardEntry[]>;

  /**
   * Get the top users by profit in the current period (e.g. last 24h).
   * @param limit how many entries to return
   */
  getTopDaily(limit: number): Promise<PublicLeaderboardEntry[]>;

  // Enhanced methods for modernized system
  /**
   * Get paginated leaderboard results with advanced querying
   */
  getTopAllTimePaginated(params: LeaderboardQuery): Promise<PaginatedLeaderboard>;
  getTopDailyPaginated(params: LeaderboardQuery): Promise<PaginatedLeaderboard>;

  /**
   * Get specific user's rank across different time periods
   */
  getUserRank(userId: number, period: 'allTime' | 'daily'): Promise<UserRank>;

  /**
   * Get overall leaderboard statistics
   */
  getLeaderboardStats(): Promise<LeaderboardStats>;

  /**
   * Refresh the materialized view
   */
  refreshMaterializedView(): Promise<void>;

  // Future extensions:
  // getTopWeekly(limit: number): Promise<PublicLeaderboardEntry[]>;
  // getTopMonthly(limit: number): Promise<PublicLeaderboardEntry[]>;
}
