/**
 * Leaderboard Response DTOs
 *
 * Response types for leaderboard endpoints
 */

// ============================================================================
// Leaderboard Entry View
// ============================================================================

export interface LeaderboardEntryView {
  userId: number;
  userName: string;
  avatarUrl: string | null;
  balance: string; // BigInt → string
  totalBets: number;
  winRate: number;
  profitAll: string; // BigInt → string
  profitPeriod: string; // BigInt → string
  roi: number;
  longestStreak: number;
  currentStreak: number;
  parlaysStarted: number;
  parlaysWon: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  rank: number;
  rankChange: number | null;
}

// ============================================================================
// Public Leaderboard Entry (with less data)
// ============================================================================

export interface PublicLeaderboardEntry {
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
  currentStreak: number;
  parlaysStarted: number;
  parlaysWon: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  rankChange: number | null;
}
