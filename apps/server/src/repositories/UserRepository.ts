// apps/server/src/repositories/UserRepository.ts

import { PrismaClient, Prisma } from '@prisma/client';
import type { IUserRepository } from './IUserRepository';
import type {
  DbUser,
  DbUserBadge,
  DbBadge,
  DbUserStats,
  DbUserActivity,
  DbUserPost,
} from '@ems/types';

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
      where: { followerId_followingId: { followerId, followingId } },
    });
    return Boolean(follow);
  }

  async createFollow(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.create({ data: { followerId, followingId } });
  }

  async deleteFollow(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
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

  async getUserFeed(userId: number, options?: { parentId: number | null }): Promise<DbUserPost[]> {
    const where: any = { ownerId: userId };
    if (options && 'parentId' in options) {
      where.parentId = options.parentId;
    }

    const posts = await prisma.userPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: true },
    });

    // Nest into a tree
    const flat = posts.map((post) => ({
      ...mapUserPost(post),
      authorName: post.author?.name ?? `User #${post.authorId}`,
    }));
    const byId: Record<number, any> = {};
    flat.forEach((p) => (byId[p.id] = { ...p, children: [] }));
    const tree: typeof flat = [];
    flat.forEach((p) => {
      if (p.parentId != null) byId[p.parentId]?.children.push(byId[p.id]);
      else tree.push(byId[p.id]);
    });
    return tree;
  }

  async createUserPost(data: {
    authorId: number;
    ownerId: number;
    content: string;
    parentId: number | null;
  }): Promise<DbUserPost> {
    return prisma.userPost.create({ data }) as Promise<DbUserPost>;
  }

  async getUserPostThread(
    postId: number,
  ): Promise<(DbUserPost & { children: DbUserPost[] }) | null> {
    const post = await prisma.userPost.findUnique({
      where: { id: postId },
      include: { children: true },
    });
    if (!post) return null;
    return { ...post, children: post.children ?? [] };
  }

  async getUserActivity(userId: number): Promise<DbUserActivity[]> {
    return prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUserActivity(data: {
    userId: number;
    type: string;
    details?: Prisma.InputJsonValue | null;
  }): Promise<DbUserActivity> {
    // Build up the `data` payload, translating null -> Prisma.JsonNull
    const payload: Prisma.UserActivityUncheckedCreateInput = {
      userId: data.userId,
      type: data.type,
      // If details is exactly null, use Prisma.JsonNull. If undefined, omit entirely.
      ...(data.details === null
        ? { details: Prisma.JsonNull }
        : data.details !== undefined
          ? { details: data.details }
          : {}),
    };

    const activity = await prisma.userActivity.create({ data: payload });
    return activity as DbUserActivity;
  }

  async getUserStats(userId: number): Promise<DbUserStats | null> {
    return prisma.userStats.findUnique({ where: { userId } }) as Promise<DbUserStats | null>;
  }

  async updateUserStats(
    userId: number,
    data: Partial<Omit<DbUserStats, 'id' | 'userId'>>,
  ): Promise<void> {
    await prisma.userStats.update({ where: { userId }, data });
  }

 /**
   * Atomically increments one or more stats fields;
   * if no UserStats row exists yet, create it.
   */
 async incrementUserStats(
    userId: number,
    data: Prisma.UserStatsUpdateInput
  ): Promise<void> {
    try {
      await prisma.userStats.update({
        where: { userId },
        data,
      });
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        // extract just the 'increment' values into an unchecked create payload
        const createData: Prisma.UserStatsUncheckedCreateInput = { userId };
        for (const [key, val] of Object.entries(data)) {
          if (
            val &&
            typeof val === 'object' &&
            'increment' in val &&
            typeof (val as any).increment === 'number'
          ) {
            // @ts-ignore – this is fine because we're building an unchecked payload
            createData[key] = (val as any).increment;
          }
        }
        await prisma.userStats.create({
          // cast to the unchecked type so TS knows 'user' nested field isn't required
          data: createData as Prisma.UserStatsUncheckedCreateInput,
        });
        return;
      }
      throw e;
    }
  }


  async setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { feedPrivate } });
  }
}

function mapUserPost(post: any): DbUserPost {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    authorName: post.author?.name,
  };
}
