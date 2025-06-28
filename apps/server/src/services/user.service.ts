// apps/server/src/services/user.service.ts
// Service layer for user-related operations, using a repository for data access

import { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../repositories/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';
import type { DbUser, DbUserBadge, DbBadge } from '@ems/types';

const prisma = new PrismaClient();

/**
 * Data Transfer Object for returning user profile data
 */
export type UserProfileDTO = {
  id: number;
  name: string;
  muskBucks: number;
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
  badges: {
    id: number;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    awardedAt: Date;
  }[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export class UserService {
  constructor(private repo: IUserRepository = new UserRepository()) {}

  /**
   * Fetch profile data for a given user, including follow counts and badges
   */
  async getUserProfile(userId: number, viewerId?: number): Promise<UserProfileDTO> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');

    // Parallel fetch of counts and badges
    const [followersCount, followingCount, userBadges] = await Promise.all([
      this.repo.getFollowersCount(userId),
      this.repo.getFollowingCount(userId),
      this.repo.findUserBadges(userId),
    ]);

    // Compute rank via raw SQL window function
    const rawRank = (await prisma.$queryRawUnsafe(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY "muskBucks" DESC) AS rank
         FROM "User"
       ) u WHERE u.id = $1;`,
      userId,
    )) as { rank: bigint }[];
    let rank: number | undefined;
    if (Array.isArray(rawRank) && rawRank.length > 0) {
      const r = rawRank[0].rank;
      rank = typeof r === 'bigint' ? Number(r) : r;
    }

    // Check if viewer is following this user
    const isFollowing = viewerId ? await this.repo.existsFollow(viewerId, userId) : false;

    return {
      id: user.id,
      name: user.name,
      muskBucks: user.muskBucks,
      rank,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      location: user.location,
      timezone: user.timezone,
      notifyOnResolve: user.notifyOnResolve,
      theme: user.theme,
      twoFactorEnabled: user.twoFactorEnabled,
      stats: {
        successRate: user.successRate,
        totalPredictions: user.totalPredictions,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      badges: userBadges.map((ub: DbUserBadge & { badge: DbBadge }) => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        iconUrl: ub.badge.iconUrl,
        awardedAt: ub.awardedAt,
      })),
      followersCount,
      followingCount,
      isFollowing,
    };
  }

  /**
   * Follow another user
   */
  followUser(followerId: number, followingId: number): Promise<void> {
    return this.repo.createFollow(followerId, followingId);
  }

  /**
   * Unfollow a user
   */
  unfollowUser(followerId: number, followingId: number): Promise<void> {
    return this.repo.deleteFollow(followerId, followingId);
  }

  /**
   * Update profile fields for a user and return updated profile
   */
  async updateUserProfile(
    userId: number,
    data: Partial<
      Pick<
        DbUser,
        | 'bio'
        | 'avatarUrl'
        | 'location'
        | 'timezone'
        | 'notifyOnResolve'
        | 'theme'
        | 'twoFactorEnabled'
        | 'profileComplete'
      >
    >,
  ): Promise<UserProfileDTO> {
    await this.repo.updateProfile(userId, data);
    return this.getUserProfile(userId, userId);
  }
}
