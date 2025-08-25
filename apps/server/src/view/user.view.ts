import type { UserProfileView, UserStatsView } from '@ems/types';

/**
 * Maps PublicUserProfile to standardized UserProfileView DTO
 * PublicUserProfile already has muskBucks as string, adds timestamp fields
 */
export const toUserProfileView = (user: {
  id: number;
  name: string;
  role: string;
  muskBucks: string;
  profileComplete: boolean;
  rank?: number;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  timezone?: string | null;
  notifyOnResolve: boolean;
  theme: string;
  twoFactorEnabled: boolean;
  stats: {
    successRate: number;
    totalPredictions: number;
    currentStreak: number;
    longestStreak: number;
  };
  badges: any[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}): UserProfileView => ({
  id: user.id,
  name: user.name,
  role: user.role,
  muskBucks: user.muskBucks,
  profileComplete: user.profileComplete,
  rank: user.rank,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  location: user.location,
  timezone: user.timezone,
  notifyOnResolve: user.notifyOnResolve,
  theme: user.theme,
  twoFactorEnabled: user.twoFactorEnabled,
  stats: user.stats,
  badges: user.badges,
  followersCount: user.followersCount,
  followingCount: user.followingCount,
  isFollowing: user.isFollowing,
  createdAt: new Date().toISOString(), // Default timestamp
  updatedAt: new Date().toISOString(), // Default timestamp
});

/**
 * Maps UserStatsDTO to standardized UserStatsView DTO
 * UserStatsDTO already has BigInt → string conversion, just need to handle updatedAt
 */
export const toUserStatsView = (stats: {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  totalParlays: number;
  parlaysWon: number;
  parlaysLost: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  parlayLegsLost: number;
  totalWagered: string;
  totalWon: string;
  profit: string;
  roi: number;
  currentStreak: number;
  longestStreak: number;
  mostCommonBet: string | null;
  biggestWin: string;
  updatedAt: string;
}): UserStatsView => ({
  totalBets: stats.totalBets,
  betsWon: stats.betsWon,
  betsLost: stats.betsLost,
  totalParlays: stats.totalParlays,
  parlaysWon: stats.parlaysWon,
  parlaysLost: stats.parlaysLost,
  totalParlayLegs: stats.totalParlayLegs,
  parlayLegsWon: stats.parlayLegsWon,
  parlayLegsLost: stats.parlayLegsLost,
  totalWagered: stats.totalWagered,
  totalWon: stats.totalWon,
  profit: stats.profit,
  roi: stats.roi,
  currentStreak: stats.currentStreak,
  longestStreak: stats.longestStreak,
  mostCommonBet: stats.mostCommonBet,
  biggestWin: stats.biggestWin,
  updatedAt: stats.updatedAt,
});
