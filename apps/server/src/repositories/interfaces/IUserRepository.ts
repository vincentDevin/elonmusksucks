// apps/server/src/repositories/IUserRepository.ts

import type {
  PrismaUser,
  PrismaUserBadge,
  PrismaBadge,
  DbUserStats,
  DetailedUserAchievement,
  DbUserFeedContent,
  PrismaContent,
} from '@ems/types';
import type { Prisma } from '@prisma/client';

export interface IUserRepository {
  findById(id: number): Promise<PrismaUser | null>;
  findUserBasicById(id: number): Promise<{ id: number; name: string } | null>;
  getUserStats(userId: number): Promise<DbUserStats | null>;

  getFollowersCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  findUserBadges(userId: number): Promise<Array<PrismaUserBadge & { badge: PrismaBadge }>>;
  findUserAchievements(userId: number): Promise<DetailedUserAchievement[]>;
  existsFollow(followerId: number, followingId: number): Promise<boolean>;
  createFollow(followerId: number, followingId: number): Promise<void>;
  deleteFollow(followerId: number, followingId: number): Promise<void>;

  updateProfile(
    userId: number,
    data: Partial<
      Pick<
        PrismaUser,
        | 'bio'
        | 'avatarUrl'
        | 'location'
        | 'timezone'
        | 'notifyOnResolve'
        | 'theme'
        | 'twoFactorEnabled'
        | 'profileComplete'
        | 'profilePictureKey'
      >
    >,
  ): Promise<void>;

  /** now takes an optional filter for parentId */
  getUserFeed(userId: number, options?: { parentId: number | null }): Promise<DbUserFeedContent[]>;

  createUserPost(data: {
    authorId: number;
    content: string;
    parentId: number | null;
  }): Promise<DbUserFeedContent>;

  getUserPostThread(postId: number): Promise<DbUserFeedContent | null>;

  /** stats stored in the database */
  getUserStats(userId: number): Promise<DbUserStats | null>;
  updateUserStats(userId: number, data: Partial<Omit<DbUserStats, 'id' | 'userId'>>): Promise<void>;

  /** new helper to atomically increment stats fields */
  incrementUserStats(userId: number, data: Prisma.UserStatsUpdateInput): Promise<void>;

  setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void>;

  getUserRank(userId: number): Promise<number | undefined>;
  getUserActiveBets(userId: number): Promise<
    Array<{
      id: number;
      predictionId: number;
      predictionTitle: string;
      amount: string;
      odds: number;
      optionLabel?: string;
      status: string;
      createdAt: string;
    }>
  >;
  getUserActiveParlays(userId: number): Promise<
    Array<{
      id: number;
      amount: string;
      combinedOdds: number;
      potentialPayout: string;
      legCount: number;
      status: string;
      createdAt: string;
      legs: Array<{ predictionTitle: string; optionLabel: string }>;
    }>
  >;
  getUserPredictions(userId: number): Promise<
    Array<{
      id: number;
      title: string;
      category: string;
      type: string;
      approved: boolean;
      resolved: boolean;
      expiresAt: string;
      createdAt: string;
      totalBets?: number;
    }>
  >;

  // Achievement-related methods
  getUserTotalBetsCount(userId: number): Promise<number>;
  getUserCategoryWinsCount(userId: number, category: string): Promise<number>;
  getUserParlayWinsCount(userId: number): Promise<number>;

  // User search for mentions
  searchUsersByName(query: string): Promise<{ id: number; name: string; avatarUrl?: string }[]>;

  // Social features
  getUserFollowers(
    userId: number,
    params: { limit: number; cursor?: string },
  ): Promise<{
    followers: Array<{ id: number; name: string; avatarUrl?: string; followedAt: string }>;
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }>;

  getUserFollowing(
    userId: number,
    params: { limit: number; cursor?: string },
  ): Promise<{
    following: Array<{ id: number; name: string; avatarUrl?: string; followedAt: string }>;
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }>;
}
