// apps/server/src/repositories/LeaderboardRepository.ts
import prisma from '../db';
import type { PublicLeaderboardEntry } from '@ems/types';
import type { ILeaderboardRepository } from './ILeaderboardRepository';

export class LeaderboardRepository implements ILeaderboardRepository {
  async getTopAllTime(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = (await prisma.$queryRaw<
      Array<Record<string, any>>
    >`SELECT * FROM leaderboard_view ORDER BY profit_all DESC LIMIT ${limit}`) as any[];

    return rows.map((r) => ({
      userId: Number(r.user_id),
      userName: r.user_name,
      avatarUrl: r.avatar_url,
      balance: Number(r.balance),
      totalBets: Number(r.total_bets),
      winRate: Number(r.win_rate),
      profitAll: Number(r.profit_all),
      profitPeriod: Number(r.profit_period),
      roi: Number(r.roi),
      longestStreak: Number(r.longest_streak),
      currentStreak: Number(r.current_streak),
      parlaysStarted: Number(r.parlays_started),
      parlaysWon: Number(r.parlays_won),
      totalParlayLegs: Number(r.total_parlay_legs),
      parlayLegsWon: Number(r.parlay_legs_won),
      rankChange: r.rank_change !== null ? Number(r.rank_change) : null,
    }));
  }

  async getTopDaily(limit: number): Promise<PublicLeaderboardEntry[]> {
    // Pull raw rows (may contain BigInt values)
    const rows = (await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT * FROM leaderboard_view
      ORDER BY profit_period DESC
      LIMIT ${limit};
    `) as Array<Record<string, any>>;

    // Convert each field to plain JS number (and string where appropriate)
    return rows.map((r) => ({
      userId: Number(r.user_id),
      userName: r.user_name,
      avatarUrl: r.avatar_url,
      balance: Number(r.balance),

      totalBets: Number(r.total_bets),
      winRate: Number(r.win_rate),
      profitAll: Number(r.profit_all),
      profitPeriod: Number(r.profit_period),
      roi: Number(r.roi),

      longestStreak: Number(r.longest_streak),
      currentStreak: Number(r.current_streak),

      parlaysStarted: Number(r.parlays_started),
      parlaysWon: Number(r.parlays_won),

      totalParlayLegs: Number(r.total_parlay_legs),
      parlayLegsWon: Number(r.parlay_legs_won),

      rankChange: r.rank_change !== null ? Number(r.rank_change) : null,
    }));
  }
  /**
   * Refreshes the Postgres materialized view
   */
  async refreshMaterializedView(): Promise<void> {
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;`;
  }
}
