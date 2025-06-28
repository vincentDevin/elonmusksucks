// apps/server/src/repositories/IUserRepository.ts
// Interface for user-related data access operations

import type { DbUser, DbUserBadge, DbBadge } from '@ems/types';

/**
 * Defines the contract for user data operations.
 * Implementations (e.g. PrismaUserRepository) should fulfill these methods.
 */
export interface IUserRepository {
  /**
   * Find a user by their unique ID.
   * @param id - The user's ID
   * @returns The full database user record or null if not found
   */
  findById(id: number): Promise<DbUser | null>;

  /**
   * Count how many users are following the given user.
   * @param userId - The target user's ID
   * @returns Number of followers
   */
  getFollowersCount(userId: number): Promise<number>;

  /**
   * Count how many users the given user is following.
   * @param userId - The user's ID
   * @returns Number of followings
   */
  getFollowingCount(userId: number): Promise<number>;

  /**
   * Retrieve badges awarded to a user, including badge metadata.
   * @param userId - The user's ID
   * @returns Array of user badge records with badge details
   */
  findUserBadges(userId: number): Promise<Array<DbUserBadge & { badge: DbBadge }>>;

  /**
   * Check if followerId is following followingId.
   * @param followerId - The ID of the follower
   * @param followingId - The ID of the user being followed
   * @returns True if follow exists, false otherwise
   */
  existsFollow(followerId: number, followingId: number): Promise<boolean>;

  /**
   * Create a follow relationship.
   * @param followerId - The ID of the follower
   * @param followingId - The ID of the user to follow
   */
  createFollow(followerId: number, followingId: number): Promise<void>;

  /**
   * Delete a follow relationship.
   * @param followerId - The ID of the follower
   * @param followingId - The ID of the user being unfollowed
   */
  deleteFollow(followerId: number, followingId: number): Promise<void>;

  /**
   * Update profile fields for a user.
   * @param userId - The user's ID
   * @param data - Partial profile fields to update
   */
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
}
