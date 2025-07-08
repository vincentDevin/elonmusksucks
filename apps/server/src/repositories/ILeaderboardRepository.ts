import type { PublicLeaderboardEntry } from '@ems/types';

/**
 * Abstraction for fetching leaderboard data from the database.
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

  // Future extensions:
  // getTopWeekly(limit: number): Promise<PublicLeaderboardEntry[]>;
  // getTopMonthly(limit: number): Promise<PublicLeaderboardEntry[]>;
}
