// apps/server/src/repositories/LeaderboardRepository.ts
import prisma from '../db';
import type { PublicLeaderboardEntry } from '@ems/types';
import type { ILeaderboardRepository } from './ILeaderboardRepository';

export class LeaderboardRepository implements ILeaderboardRepository {
  async getTopAllTime(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = await prisma.$queryRaw<PublicLeaderboardEntry[]>`
      SELECT * FROM leaderboard_view
      ORDER BY profit_all DESC
      LIMIT ${limit};
    `;
    return rows;
  }

  async getTopDaily(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = await prisma.$queryRaw<PublicLeaderboardEntry[]>`
      SELECT * FROM leaderboard_view
      ORDER BY profit_period DESC
      LIMIT ${limit};
    `;
    return rows;
  }

  /**
   * Refreshes the Postgres materialized view
   */
  async refreshMaterializedView(): Promise<void> {
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;`;
  }
}
