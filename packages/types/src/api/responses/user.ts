/**
 * User Response DTOs
 *
 * Response types for user endpoints
 */

import type { PublicUserBadge } from '../../database/social';

// ============================================================================
// User Profile View
// ============================================================================

export interface UserProfileView {
  id: number;
  name: string;
  role: string;
  muskBucks: string; // BigInt → string
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
  badges: PublicUserBadge[];
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    isUnlocked: boolean;
  }>;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  createdAt: string; // Date → ISO string
  updatedAt: string; // Date → ISO string
}

// ============================================================================
// User Stats View
// ============================================================================

export interface UserStatsView {
  totalBets: number;
  betsWon: number;
  betsLost: number;
  totalParlays: number;
  parlaysWon: number;
  parlaysLost: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  parlayLegsLost: number;
  totalWagered: string; // BigInt → string
  totalWon: string; // BigInt → string
  profit: string; // BigInt → string
  roi: number;
  currentStreak: number;
  longestStreak: number;
  mostCommonBet: string | null;
  biggestWin: string; // BigInt → string
  updatedAt: string; // Date → ISO string
}

// ============================================================================
// Enhanced User Stats View
// ============================================================================

export interface CategoryAccuracy {
  category: string;
  accuracy: number;
  totalBets: number;
  wins: number;
}

export interface Streak {
  type: 'win' | 'lose';
  count: number;
  isActive: boolean;
}

export interface CategoryStats {
  category: string;
  betCount: number;
  winRate: number;
  profitLoss: number;
  avgBetSize: number;
}

export interface UserRanking {
  rank: number | null;
  percentile: number;
  rankChange: number | null;
  totalUsers: number;
  category: 'allTime' | 'daily';
}

export interface EnhancedUserStats {
  // Performance metrics
  totalBets: number;
  winRate: number;
  profitLoss: number;
  categoryAccuracy: CategoryAccuracy[];
  currentStreak: Streak;
  bestCategory: string;
  totalWagered: number;
  avgBetSize: number;

  // Ranking data
  ranking: {
    allTime: UserRanking;
    daily: UserRanking;
  };

  // Achievement progress
  achievementProgress: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    isCompleted: boolean;
  }>;
  achievementCompletionRate: number;

  // Trend data
  weeklyVolume: Array<{ date: string; value: number }>;
  monthlyProfitLoss: Array<{ date: string; value: number }>;
  categoryStats: CategoryStats[];
}

// ============================================================================
// User Achievement Progress View
// ============================================================================

export interface UserAchievementProgressView {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  isCompleted: boolean;
  completedAt: string | null; // Date → ISO string
  iconUrl?: string | null;
  rarity: string;
}
