// apps/server/src/repositories/UserRepository.ts
// Prisma implementation of IUserRepository

import { PrismaClient } from '@prisma/client';
import type { IUserRepository } from './IUserRepository';
import type { DbUser, DbUserBadge, DbBadge } from '@ems/types';

const prisma = new PrismaClient();

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<DbUser | null> {
    return prisma.user.findUnique({ where: { id } }) as Promise<DbUser | null>;
  }

  async getFollowersCount(userId: number): Promise<number> {
    return prisma.follow.count({ where: { followingId: userId } });
  }

  async getFollowingCount(userId: number): Promise<number> {
    return prisma.follow.count({ where: { followerId: userId } });
  }

  async findUserBadges(userId: number): Promise<Array<DbUserBadge & { badge: DbBadge }>> {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    }) as Promise<Array<DbUserBadge & { badge: DbBadge }>>;
  }

  async existsFollow(followerId: number, followingId: number): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
    return Boolean(follow);
  }

  async createFollow(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.create({ data: { followerId, followingId } });
  }

  async deleteFollow(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  }

  async updateProfile(
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
  ): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data });
  }
}
