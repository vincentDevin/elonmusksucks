// apps/server/src/repositories/UserRepository.ts

import { PrismaClient, Prisma } from '@prisma/client';
import type { IUserRepository } from './interfaces/IUserRepository';
import type {
  PrismaUser,
  PrismaUserBadge,
  PrismaBadge,
  DbUserStats,
  DetailedUserAchievement,
  DbUserFeedContent,
  PrismaContent,
} from '@ems/types';

export type { IUserRepository };

const prisma = new PrismaClient();

/**
 * User Repository Implementation
 * Handles user profiles, stats, follows, feed, and social features
 */
export class UserRepository implements IUserRepository {
  /**
   * Find user by ID
   */
  async findById(id: number): Promise<PrismaUser | null> {
    return prisma.user.findUnique({ where: { id } }) as Promise<PrismaUser | null>;
  }

  /**
   * Find basic user info by ID (id and name only)
   */
  async findUserBasicById(id: number): Promise<{ id: number; name: string } | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: number): Promise<DbUserStats | null> {
    return prisma.userStats.findUnique({ where: { userId } }) as Promise<DbUserStats | null>;
  }

  /**
   * Get count of user's followers
   */
  async getFollowersCount(userId: number): Promise<number> {
    return prisma.follow.count({ where: { followingId: userId } });
  }

  /**
   * Get count of users this user is following
   */
  async getFollowingCount(userId: number): Promise<number> {
    return prisma.follow.count({ where: { followerId: userId } });
  }

  /**
   * Find user's badges with badge details
   */
  async findUserBadges(userId: number): Promise<Array<PrismaUserBadge & { badge: PrismaBadge }>> {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    }) as Promise<Array<PrismaUserBadge & { badge: PrismaBadge }>>;
  }

  /**
   * Find user's completed achievements with percentage calculation
   */
  async findUserAchievements(userId: number): Promise<DetailedUserAchievement[]> {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId, completedAt: { not: null } },
      include: {
        achievement: true,
      },
      orderBy: [{ achievement: { category: 'asc' } }, { achievement: { sortOrder: 'asc' } }],
    });

    return achievements.map((ua) => ({
      ...ua,
      achievement: ua.achievement,
      percentComplete:
        ua.achievement.targetValue > 0
          ? Math.min(100, (ua.progress / ua.achievement.targetValue) * 100)
          : 0,
    })) as DetailedUserAchievement[];
  }

  /**
   * Check if follow relationship exists
   */
  async existsFollow(followerId: number, followingId: number): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return Boolean(follow);
  }

  /**
   * Create a follow relationship
   */
  async createFollow(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.create({ data: { followerId, followingId } });
  }

  /**
   * Delete a follow relationship
   */
  async deleteFollow(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(
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
  ): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data });
  }

  /**
   * Get user's feed content (posts using Content model)
   * @param userId - User ID
   * @param options - Optional filter for parentId
   */
  async getUserFeed(
    userId: number,
    options?: { parentId: number | null },
  ): Promise<DbUserFeedContent[]> {
    const where: Prisma.ContentWhereInput = {
      authorId: userId,
      type: 'POST',
      isDeleted: false,
    };

    if (options && 'parentId' in options) {
      where.parentId = options.parentId;
    }

    const posts = await prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            body: true,
            authorId: true,
          },
        },
      },
    });

    // Transform Content to DbUserFeedContent format
    return posts.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      type: post.type,
      body: post.body,
      parentId: post.parentId,
      threadDepth: post.threadDepth,
      reactionsCount: post.reactionsCount,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
      },
      parent: post.parent
        ? {
            id: post.parent.id,
            body: post.parent.body,
            authorId: post.parent.authorId,
          }
        : null,
    }));
  }

  /**
   * Create a new user post using Content model
   */
  async createUserPost(data: {
    authorId: number;
    content: string;
    parentId: number | null;
  }): Promise<DbUserFeedContent> {
    // Calculate thread depth if this is a reply
    let threadDepth = 0;
    if (data.parentId) {
      const parent = await prisma.content.findUnique({
        where: { id: data.parentId },
        select: { threadDepth: true },
      });
      threadDepth = parent ? parent.threadDepth + 1 : 0;
    }

    const post = await prisma.content.create({
      data: {
        authorId: data.authorId,
        type: 'POST',
        body: data.content,
        contentType: 'TEXT',
        visibility: 'PUBLIC',
        parentId: data.parentId,
        threadDepth,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: post.id,
      authorId: post.authorId,
      type: post.type,
      body: post.body,
      parentId: post.parentId,
      threadDepth: post.threadDepth,
      reactionsCount: post.reactionsCount,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt,
      author: post.author,
      parent: null,
    };
  }

  /**
   * Get user post thread with children using Content model
   */
  async getUserPostThread(postId: number): Promise<DbUserFeedContent | null> {
    const post = await prisma.content.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            body: true,
            authorId: true,
          },
        },
      },
    });

    if (!post) return null;

    return {
      id: post.id,
      authorId: post.authorId,
      type: post.type,
      body: post.body,
      parentId: post.parentId,
      threadDepth: post.threadDepth,
      reactionsCount: post.reactionsCount,
      repliesCount: post.repliesCount,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
      },
      parent: post.parent
        ? {
            id: post.parent.id,
            body: post.parent.body,
            authorId: post.parent.authorId,
          }
        : null,
    };
  }

  /**
   * Update user statistics
   */
  async updateUserStats(
    userId: number,
    data: Partial<Omit<DbUserStats, 'id' | 'userId'>>,
  ): Promise<void> {
    // Convert string BigInt fields back to BigInt for Prisma
    const prismaData: Prisma.UserStatsUpdateInput = { ...data };
    if (data.totalWagered && typeof data.totalWagered === 'string') {
      (prismaData as Record<string, unknown>).totalWagered = BigInt(data.totalWagered);
    }
    if (data.totalWon && typeof data.totalWon === 'string') {
      (prismaData as Record<string, unknown>).totalWon = BigInt(data.totalWon);
    }
    if (data.profit && typeof data.profit === 'string') {
      (prismaData as Record<string, unknown>).profit = BigInt(data.profit);
    }
    if (data.biggestWin && typeof data.biggestWin === 'string') {
      (prismaData as Record<string, unknown>).biggestWin = BigInt(data.biggestWin);
    }
    await prisma.userStats.update({ where: { userId }, data: prismaData });
  }

  /**
   * Atomically increment user stats fields
   */
  async incrementUserStats(userId: number, data: Prisma.UserStatsUpdateInput): Promise<void> {
    try {
      await prisma.userStats.update({ where: { userId }, data });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        const createData: Prisma.UserStatsUncheckedCreateInput = { userId };
        for (const [key, val] of Object.entries(data)) {
          if (
            val &&
            typeof val === 'object' &&
            'increment' in val &&
            typeof (val as Record<string, unknown>).increment === 'number'
          ) {
            (createData as Record<string, unknown>)[key] = (
              val as Record<string, unknown>
            ).increment;
          }
        }
        await prisma.userStats.create({ data: createData });
        return;
      }
      throw e;
    }
  }

  /**
   * Set user feed privacy setting
   */
  async setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { feedPrivate } });
  }

  /**
   * Get user's rank based on muskBucks
   */
  async getUserRank(userId: number): Promise<number | undefined> {
    const rawRank = (await prisma.$queryRawUnsafe(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY "muskBucks" DESC) AS rank
         FROM "User"
       ) u WHERE u.id = $1;`,
      userId,
    )) as { rank: bigint }[];
    return Array.isArray(rawRank) && rawRank.length > 0 ? Number(rawRank[0].rank) : undefined;
  }

  /**
   * Get user's active bets (pending status)
   */
  async getUserActiveBets(userId: number): Promise<
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
  > {
    const bets = await prisma.bet.findMany({
      where: { userId, status: 'PENDING' },
      include: {
        prediction: { select: { id: true, title: true, resolved: true } },
        optionOption: { select: { label: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return bets.map((bet) => ({
      id: bet.id,
      predictionId: bet.predictionId,
      predictionTitle: bet.prediction.title,
      amount: bet.amount.toString(),
      odds: bet.oddsAtPlacement || 1.0,
      optionLabel: bet.optionOption?.label,
      status: bet.status,
      createdAt: bet.createdAt.toISOString(),
    }));
  }

  /**
   * Get user's active parlays (pending status)
   */
  async getUserActiveParlays(userId: number): Promise<
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
  > {
    const parlays = await prisma.parlay.findMany({
      where: { userId, status: 'PENDING' },
      include: {
        legs: {
          include: {
            option: {
              include: {
                prediction: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return parlays.map((parlay) => ({
      id: parlay.id,
      amount: parlay.amount.toString(),
      combinedOdds: parlay.combinedOdds,
      potentialPayout: parlay.potentialPayout.toString(),
      legCount: parlay.legs.length,
      status: parlay.status,
      createdAt: parlay.createdAt.toISOString(),
      legs: parlay.legs.map((leg) => ({
        predictionTitle: leg.option.prediction.title,
        optionLabel: leg.option.label,
      })),
    }));
  }

  /**
   * Get user's created predictions with category name
   */
  async getUserPredictions(userId: number): Promise<
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
  > {
    const predictions = await prisma.prediction.findMany({
      where: { creatorId: userId },
      include: {
        _count: { select: { bets: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return predictions.map((prediction) => ({
      id: prediction.id,
      title: prediction.title,
      category: prediction.category?.name ?? 'Uncategorized',
      type: prediction.type,
      approved: prediction.approved,
      resolved: prediction.resolved,
      expiresAt: prediction.expiresAt.toISOString(),
      createdAt: prediction.createdAt.toISOString(),
      totalBets: prediction._count.bets,
    }));
  }

  /**
   * Get total count of user's bets
   */
  async getUserTotalBetsCount(userId: number): Promise<number> {
    return prisma.bet.count({ where: { userId } });
  }

  /**
   * Get count of user's wins in a specific category (using category relation)
   */
  async getUserCategoryWinsCount(userId: number, category: string): Promise<number> {
    return prisma.bet.count({
      where: {
        userId,
        status: 'WON',
        prediction: {
          category: {
            name: category,
          },
        },
      },
    });
  }

  /**
   * Get count of user's parlay wins
   */
  async getUserParlayWinsCount(userId: number): Promise<number> {
    return prisma.parlay.count({
      where: { userId, status: 'WON' },
    });
  }

  /**
   * Search users by name (for mentions)
   */
  async searchUsersByName(
    query: string,
  ): Promise<{ id: number; name: string; avatarUrl?: string }[]> {
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      take: 10, // Limit results for performance
      orderBy: {
        name: 'asc',
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl || undefined,
    }));
  }

  /**
   * Get user's followers with pagination
   */
  async getUserFollowers(
    userId: number,
    params: { limit: number; cursor?: string },
  ): Promise<{
    followers: Array<{ id: number; name: string; avatarUrl?: string; followedAt: string }>;
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> {
    const pageLimit = Math.min(params.limit || 20, 100);
    const where: Prisma.FollowWhereInput = { followingId: userId };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate };
      }
    }

    const follows = await prisma.follow.findMany({
      where,
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    const hasMore = follows.length > pageLimit;
    const items = follows.slice(0, pageLimit);

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    return {
      followers: items.map((follow) => ({
        id: follow.follower.id,
        name: follow.follower.name,
        avatarUrl: follow.follower.avatarUrl || undefined,
        followedAt: follow.createdAt.toISOString(),
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
  }

  /**
   * Get users this user is following with pagination
   */
  async getUserFollowing(
    userId: number,
    params: { limit: number; cursor?: string },
  ): Promise<{
    following: Array<{ id: number; name: string; avatarUrl?: string; followedAt: string }>;
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> {
    const pageLimit = Math.min(params.limit || 20, 100);
    const where: Prisma.FollowWhereInput = { followerId: userId };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate };
      }
    }

    const follows = await prisma.follow.findMany({
      where,
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    const hasMore = follows.length > pageLimit;
    const items = follows.slice(0, pageLimit);

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    return {
      following: items.map((follow) => ({
        id: follow.following.id,
        name: follow.following.name,
        avatarUrl: follow.following.avatarUrl || undefined,
        followedAt: follow.createdAt.toISOString(),
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
  }
}
