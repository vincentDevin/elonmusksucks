// apps/server/src/services/leaderboard.service.ts

import type { PublicLeaderboardEntry } from '@ems/types';
import type { ILeaderboardRepository } from '../repositories/ILeaderboardRepository';
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';

/**
 * Exposes leaderboard queries at the service level.
 */
export class LeaderboardService {
  constructor(private readonly repo: ILeaderboardRepository = new LeaderboardRepository()) {}

  /**
   * Get the all-time top N users by profit.
   * @param limit how many entries to return (defaults to 25)
   */
  async getTopAllTime(limit = 25): Promise<PublicLeaderboardEntry[]> {
    return this.repo.getTopAllTime(limit);
  }

  /**
   * Get the top N users by profit in the last day.
   * @param limit how many entries to return (defaults to 25)
   */
  async getTopDaily(limit = 25): Promise<PublicLeaderboardEntry[]> {
    return this.repo.getTopDaily(limit);
  }

  // Future: you can add methods for weekly/monthly, e.g.
  // async getTopWeekly(limit = 25): Promise<PublicLeaderboardEntry[]> {
  //   return this.repo.getTopWeekly(limit);
  // }
  //
  // async getTopMonthly(limit = 25): Promise<PublicLeaderboardEntry[]> {
  //   return this.repo.getTopMonthly(limit);
  // }
}

export const leaderboardService = new LeaderboardService();
