import type {
  UserProfileView,
  UserStatsView,
  UserEnhancedStatsView,
  UserAchievementProgressView,
} from '@ems/types';

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

/**
 * Maps EnhancedUserStats to standardized UserEnhancedStatsView DTO
 * Matches actual EnhancedUserStats interface structure
 */
export const toUserEnhancedStatsView = (stats: {
  totalBets: number;
  winRate: number;
  profitLoss: number;
  categoryAccuracy: Array<{
    category: string;
    accuracy: number;
  }>;
  currentStreak: {
    count: number;
    type: 'win' | 'loss';
  };
  bestCategory: string;
  totalWagered: number;
  avgBetSize: number;
  ranking: {
    allTime: {
      rank: number;
      percentile: number;
      tier: string;
    };
    daily: {
      rank: number;
      percentile: number;
      tier: string;
    };
  };
}): UserEnhancedStatsView => ({
  totalBets: stats.totalBets,
  totalWon: Math.round(stats.totalBets * stats.winRate), // Calculate from available data
  totalAmount: stats.totalWagered.toString(),
  totalPayout: (stats.totalWagered + stats.profitLoss).toString(),
  winRate: stats.winRate,
  accuracy: {
    overall: stats.winRate,
    categories: stats.categoryAccuracy.reduce(
      (acc, cat) => {
        acc[cat.category] = cat.accuracy;
        return acc;
      },
      {} as Record<string, number>,
    ),
  },
  streak: {
    current: stats.currentStreak.count,
    type: stats.currentStreak.type,
    best: stats.currentStreak.count, // Use current as best for now
  },
  trends: {
    winRate: {
      current: stats.winRate,
      change: 0, // Would need historical data
      period: '30d',
    },
    volume: {
      current: stats.totalWagered,
      change: 0, // Would need historical data
      period: '30d',
    },
  },
  ranking: {
    overall: stats.ranking.allTime.rank,
    percentile: stats.ranking.allTime.percentile,
    tier: stats.ranking.allTime.tier,
  },
});

/**
 * Maps AchievementProgress to standardized UserAchievementProgressView DTO
 * Matches actual AchievementProgress interface structure
 */
export const toUserAchievementProgressView = (achievement: {
  id: string; // id is string in AchievementProgress
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string; // Already a string
}): UserAchievementProgressView => ({
  id: achievement.achievementId, // Use achievementId as the numeric id
  name: achievement.name,
  title: achievement.title,
  description: achievement.description,
  category: achievement.category,
  targetValue: achievement.targetValue,
  currentValue: Math.round(achievement.progress * achievement.targetValue), // Calculate from progress
  progress: achievement.progress,
  isCompleted: achievement.isCompleted,
  completedAt: achievement.completedAt || null,
  iconUrl: null, // Not available in current interface
  rarity: 'common', // Default rarity since not available
});
