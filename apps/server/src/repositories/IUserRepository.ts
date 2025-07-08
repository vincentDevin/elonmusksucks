// apps/server/src/repositories/IUserRepository.ts

import type {
  DbUser,
  DbUserBadge,
  DbBadge,
  DbUserStats,
  DbUserActivity,
  DbUserPost,
} from '@ems/types';
import type { Prisma } from '@prisma/client';

export interface IUserRepository {
  findById(id: number): Promise<DbUser | null>;

  getFollowersCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  findUserBadges(userId: number): Promise<Array<DbUserBadge & { badge: DbBadge }>>;
  existsFollow(followerId: number, followingId: number): Promise<boolean>;
  createFollow(followerId: number, followingId: number): Promise<void>;
  deleteFollow(followerId: number, followingId: number): Promise<void>;

  updateProfile(
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
  ): Promise<void>;

  /** now takes an optional filter for parentId */
  getUserFeed(userId: number, options?: { parentId: number | null }): Promise<DbUserPost[]>;

  createUserPost(data: {
    authorId: number;
    ownerId: number;
    content: string;
    parentId: number | null;
  }): Promise<DbUserPost>;

  getUserPostThread(postId: number): Promise<(DbUserPost & { children: DbUserPost[] }) | null>;

  getUserActivity(userId: number): Promise<DbUserActivity[]>;
  createUserActivity(data: {
    userId: number;
    type: string;
    details?: Prisma.InputJsonValue | null;
  }): Promise<DbUserActivity>;

  /** stats stored in the database */
  getUserStats(userId: number): Promise<DbUserStats | null>;
  updateUserStats(userId: number, data: Partial<Omit<DbUserStats, 'id' | 'userId'>>): Promise<void>;

  /** new helper to atomically increment stats fields */
  incrementUserStats(userId: number, data: Prisma.UserStatsUpdateInput): Promise<void>;

  setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void>;
}
