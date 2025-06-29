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

  async getUserFeed(userId: number): Promise<DbUserPost[]> {
    // 1. Fetch all posts for this user's wall, with author data
    const posts = await prisma.userPost.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { author: true },
    });

    // 2. Map authorName for each
    const flat = posts.map((post) => ({
      ...mapUserPost(post),
      authorName: post.author?.name || `User #${post.authorId}`,
    }));

    // 3. Build an id -> post map for O(1) lookup
    const byId: Record<number, DbUserPost & { authorName: string; children?: any[] }> = {};
    flat.forEach((p) => {
      byId[p.id] = { ...p, children: [] };
    });

    // 4. Nest children under parents
    const tree: typeof flat = [];
    flat.forEach((p) => {
      if (p.parentId) {
        byId[p.parentId]?.children?.push(byId[p.id]);
      } else {
        tree.push(byId[p.id]);
      }
    });

    // 5. Return only top-level posts, now with children attached
    return tree;
  }

  async createUserPost(data: {
    authorId: number;
    ownerId: number;
    content: string;
    parentId: number | null;
  }): Promise<DbUserPost> {
    const post = await prisma.userPost.create({
      data: {
        authorId: data.authorId,
        ownerId: data.ownerId,
        content: data.content,
        parentId: data.parentId,
      },
    });
    // No mapping to string—keep as Date!
    return post;
  }

  async getUserPostThread(
    postId: number,
  ): Promise<(DbUserPost & { children: DbUserPost[] }) | null> {
    const post = await prisma.userPost.findUnique({
      where: { id: postId },
      include: { children: true },
    });
    if (!post) return null;
    // children will be DbUserPost[], createdAt/updatedAt are Date
    return {
      ...post,
      children: post.children ?? [],
    };
  }

  async getUserActivity(userId: number): Promise<DbUserActivity[]> {
    const activity = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return activity;
  }

  async createUserActivity(data: {
    userId: number;
    type: string;
    details?: Prisma.InputJsonValue | null;
  }): Promise<DbUserActivity> {
    const activity = await prisma.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        details: data.details ?? undefined,
      },
    });
    return activity;
  }

  async getUserStats(userId: number): Promise<DbUserStats | null> {
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    return stats;
  }

  async updateUserStats(
    userId: number,
    data: Partial<Omit<DbUserStats, 'id' | 'userId'>>,
  ): Promise<void> {
    await prisma.userStats.update({ where: { userId }, data });
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
    authorName: post.author?.name || undefined,
  };
}
