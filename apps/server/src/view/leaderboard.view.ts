import type { LeaderboardEntryView } from '@ems/types';

/**
 * Maps PublicLeaderboardEntry to standardized LeaderboardEntryView DTO
 * PublicLeaderboardEntry already has BigInt → string conversion, adds rank field
 */
export const toLeaderboardEntryView = (
  entry: {
    userId: number;
    userName: string;
    avatarUrl: string | null;
    balance: string;
    totalBets: number;
    winRate: number;
    profitAll: string;
    profitPeriod: string;
    roi: number;
    longestStreak: number;
  },
  rank: number,
): LeaderboardEntryView => ({
  userId: entry.userId,
  userName: entry.userName,
  avatarUrl: entry.avatarUrl,
  balance: entry.balance,
  totalBets: entry.totalBets,
  winRate: entry.winRate,
  profitAll: entry.profitAll,
  profitPeriod: entry.profitPeriod,
  roi: entry.roi,
  longestStreak: entry.longestStreak,
  rank: rank,
});
