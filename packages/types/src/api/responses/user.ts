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

// Alias for backwards compatibility
export type PublicUserProfile = UserProfileView;

// ============================================================================
// User Feed (using unified content system)
// ============================================================================

// Re-export from database layer for controller convenience
export type { DbUserFeedContent as UserFeedPost } from '../../database/content';

// ============================================================================
// Unified Activity Event
// ============================================================================

export interface UnifiedActivityEvent {
  id: string | number;
  type: string;
  userId: number;
  userName?: string;
  userAvatar?: string;
  title: string;
  description: string;
  timestamp: string | Date;
  priority: 'high' | 'medium' | 'low';
  icon?: string;
  color?: string;
  isPersonal: boolean;
  isHighValue?: boolean;

  // Betting-related fields
  amount?: number;
  odds?: number;
  predictionId?: number;
  predictionTitle?: string;
  category?: string;
  optionLabel?: string;
  isWin?: boolean;
  streak?: number;

  // Additional metadata
  meta?: Record<string, any>;
  details?: Record<string, any>;
}

// Alias for backwards compatibility
export type UserActivity = UnifiedActivityEvent;

// ============================================================================
// User Activity Stats
// ============================================================================

export interface UserActivityStats {
  today: {
    posts: number;
    reactions: number;
    comments: number;
    predictions: number;
  };
  week: {
    posts: number;
    reactions: number;
    comments: number;
    predictions: number;
    streak: number;
  };
  allTime: {
    totalPosts: number;
    totalReactions: number;
    totalComments: number;
    totalPredictions: number;
    accountAge: number; // in days
    bestStreak: number;
  };
}

// ============================================================================
// User Search
// ============================================================================

export interface SearchUserResult {
  id: number;
  name: string;
  avatarUrl?: string | null;
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

// Alias for backwards compatibility
export type UserEnhancedStatsView = EnhancedUserStats;

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
