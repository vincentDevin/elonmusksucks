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

// ============================================================================
// Paginated Leaderboard (Phase 3 functionality)
// ============================================================================

export interface PaginatedLeaderboardResponse {
  entries: PublicLeaderboardEntry[];
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
}

// ============================================================================
// User Rank
// ============================================================================

export interface UserRankResponse {
  userId: number;
  allTimeRank: number | null;
  dailyRank: number | null;
  weeklyRank?: number | null;
  monthlyRank?: number | null;
}

// ============================================================================
// Leaderboard Stats
// ============================================================================

export interface LeaderboardStatsResponse {
  totalUsers: number;
  activeUsers: number;
  totalBets: number;
  totalVolume: number;
  lastRefresh: Date | null;
}

// ============================================================================
// Leaderboard Query Parameters
// ============================================================================

export interface LeaderboardQueryParams {
  limit?: number;
  offset?: number;
  period?: string;
  metric?: 'profit' | 'winRate' | 'volume' | 'roi';
}
