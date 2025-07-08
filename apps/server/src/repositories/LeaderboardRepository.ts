// apps/server/src/repositories/LeaderboardRepository.ts
import prisma from '../db';
import type { PublicLeaderboardEntry } from '@ems/types';
import type { ILeaderboardRepository } from './ILeaderboardRepository';

export class LeaderboardRepository implements ILeaderboardRepository {
  async getTopAllTime(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = await prisma.leaderboardEntry.findMany({
      orderBy: { profitAll: 'desc' },
      take: limit,
    });
    return rows as PublicLeaderboardEntry[];
  }

  async getTopDaily(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = await prisma.leaderboardEntry.findMany({
      orderBy: { profitPeriod: 'desc' },
      take: limit,
    });
    return rows as PublicLeaderboardEntry[];
  }

  // Future: getTopWeekly, getTopMonthly, etc.
}
