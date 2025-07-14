// apps/server/src/services/leaderboard.service.ts
import { Queue } from 'bullmq';
import redisClient from '../lib/redis';
import type { PublicLeaderboardEntry } from '@ems/types';
import type { ILeaderboardRepository } from '../repositories/ILeaderboardRepository';
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';

/**
 * Offloads leaderboard refresh to a background worker
 */
export class LeaderboardService {
  private refreshQueue = new Queue('leaderboard-refresh', { connection: redisClient });
  private repo: ILeaderboardRepository;

  constructor(repo: ILeaderboardRepository = new LeaderboardRepository()) {
    this.repo = repo;
  }

  /**
   * Enqueue a full leaderboard refresh job
   */
  async enqueueRefresh(): Promise<void> {
    await this.refreshQueue.add('refreshAll', {});
  }

  /**
   * Synchronous fetch (from materialized view) by limit
   */
  async getTopAllTime(limit = 25): Promise<PublicLeaderboardEntry[]> {
    return this.repo.getTopAllTime(limit);
  }

  async getTopDaily(limit = 25): Promise<PublicLeaderboardEntry[]> {
    return this.repo.getTopDaily(limit);
  }
}

export const leaderboardService = new LeaderboardService();
