// apps/server/src/repositories/LeaderboardRepository.ts
import prisma from '../db';
import type { PublicLeaderboardEntry } from '@ems/types';
import type { ILeaderboardRepository } from './ILeaderboardRepository';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class LeaderboardRepository implements ILeaderboardRepository {
  async getTopAllTime(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM leaderboard_view ORDER BY profit_all DESC LIMIT ${limit}
    `;

    // For each user, get a signed avatar URL if avatar_key is present.
    return Promise.all(
      rows.map(async (r) => {
        let avatarUrl: string | null = null;
        if (r.avatar_key) {
          avatarUrl = await userService.getCachedProfileImageUrl(r.user_id, r.avatar_key, 3600);
        } else if (r.avatar_url) {
          avatarUrl = r.avatar_url;
        }
        return {
          userId: Number(r.user_id),
          userName: r.user_name,
          avatarUrl,
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
        };
      }),
    );
  }

  async getTopDaily(limit: number): Promise<PublicLeaderboardEntry[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM leaderboard_view ORDER BY profit_period DESC LIMIT ${limit}
    `;

    return Promise.all(
      rows.map(async (r) => {
        let avatarUrl: string | null = null;
        if (r.avatar_key) {
          avatarUrl = await userService.getCachedProfileImageUrl(r.user_id, r.avatar_key, 3600);
        } else if (r.avatar_url) {
          avatarUrl = r.avatar_url;
        }
        return {
          userId: Number(r.user_id),
          userName: r.user_name,
          avatarUrl,
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
        };
      }),
    );
  }

  async refreshMaterializedView(): Promise<void> {
    await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;`;
  }
}
