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
    currentStreak?: number;
    parlaysStarted?: number;
    parlaysWon?: number;
    totalParlayLegs?: number;
    parlayLegsWon?: number;
    rankChange?: number | null;
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
  currentStreak: entry.currentStreak ?? 0,
  parlaysStarted: entry.parlaysStarted ?? 0,
  parlaysWon: entry.parlaysWon ?? 0,
  totalParlayLegs: entry.totalParlayLegs ?? 0,
  parlayLegsWon: entry.parlayLegsWon ?? 0,
  rank: rank,
  rankChange: entry.rankChange ?? null,
});
