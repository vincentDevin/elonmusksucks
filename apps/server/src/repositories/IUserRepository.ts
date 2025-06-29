// apps/server/src/repositories/IUserRepository.ts

import type {
  DbUser,
  DbUserBadge,
  DbBadge,
  DbUserStats,
  DbUserActivity,
  DbUserPost,
} from '@ems/types';
// Optionally import Prisma type for JSON fields
import type { Prisma } from '@prisma/client';

/**
 * Defines the contract for user data operations.
 * Implementations (e.g. PrismaUserRepository) should fulfill these methods.
 */
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

  /**
   * Get user feed posts (wall, with optional parentId for comments)
   */
  getUserFeed(userId: number, options?: { parentId: number | null }): Promise<DbUserPost[]>;

  /**
   * Create a new feed post (or comment)
   * Only accept the fields required for creation
   */
  createUserPost(data: {
    authorId: number;
    ownerId: number;
    content: string;
    parentId: number | null;
  }): Promise<DbUserPost>;

  /**
   * Get a single post with comments (threaded)
   */
  getUserPostThread(postId: number): Promise<(DbUserPost & { children: DbUserPost[] }) | null>;

  /**
   * Get user activity events
   */
  getUserActivity(userId: number): Promise<DbUserActivity[]>;

  /**
   * Create a new user activity event
   * Accepts details as JSON (type safe with Prisma.InputJsonValue if desired)
   */
  createUserActivity(data: {
    userId: number;
    type: string;
    details?: Prisma.InputJsonValue | null;
  }): Promise<DbUserActivity>;

  /**
   * Get stats for a user
   */
  getUserStats(userId: number): Promise<DbUserStats | null>;

  /**
   * Update stats for a user (partial)
   */
  updateUserStats(userId: number, data: Partial<Omit<DbUserStats, 'id' | 'userId'>>): Promise<void>;

  /**
   * Set feed privacy
   */
  setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void>;
}
