// apps/server/src/repositories/UserRepository.ts

import { PrismaClient, Prisma } from '@prisma/client';
import type { IUserRepository } from './IUserRepository';

export type { IUserRepository };
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

  async findUserBasicById(id: number): Promise<{ id: number; name: string } | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }

  async getUserStats(userId: number): Promise<DbUserStats | null> {
    return prisma.userStats.findUnique({ where: { userId } }) as Promise<DbUserStats | null>;
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
        | 'profilePictureKey'
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
    const payload: Prisma.UserActivityUncheckedCreateInput = {
      userId: data.userId,
      type: data.type,
      ...(data.details === null
        ? { details: Prisma.JsonNull }
        : data.details !== undefined
          ? { details: data.details }
          : {}),
    };

    const activity = await prisma.userActivity.create({ data: payload });
    return activity as DbUserActivity;
  }

  async updateUserStats(
    userId: number,
    data: Partial<Omit<DbUserStats, 'id' | 'userId'>>,
  ): Promise<void> {
    // Convert string BigInt fields back to BigInt for Prisma
    const prismaData: any = { ...data };
    if (data.totalWagered && typeof data.totalWagered === 'string') {
      prismaData.totalWagered = BigInt(data.totalWagered);
    }
    if (data.totalWon && typeof data.totalWon === 'string') {
      prismaData.totalWon = BigInt(data.totalWon);
    }
    if (data.profit && typeof data.profit === 'string') {
      prismaData.profit = BigInt(data.profit);
    }
    if (data.biggestWin && typeof data.biggestWin === 'string') {
      prismaData.biggestWin = BigInt(data.biggestWin);
    }
    await prisma.userStats.update({ where: { userId }, data: prismaData });
  }

  async incrementUserStats(userId: number, data: Prisma.UserStatsUpdateInput): Promise<void> {
    try {
      await prisma.userStats.update({ where: { userId }, data });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        const createData: Prisma.UserStatsUncheckedCreateInput = { userId };
        for (const [key, val] of Object.entries(data)) {
          if (
            val &&
            typeof val === 'object' &&
            'increment' in val &&
            typeof (val as any).increment === 'number'
          ) {
            // @ts-ignore
            createData[key] = (val as any).increment;
          }
        }
        await prisma.userStats.create({ data: createData as Prisma.UserStatsUncheckedCreateInput });
        return;
      }
      throw e;
    }
  }

  async setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { feedPrivate } });
  }

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
      legs: parlay.legs.map((leg: any) => ({
        predictionTitle: leg.option.prediction.title,
        optionLabel: leg.option.label,
      })),
    }));
  }

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
      include: { _count: { select: { bets: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return predictions.map((prediction) => ({
      id: prediction.id,
      title: prediction.title,
      category: prediction.category,
      type: prediction.type,
      approved: prediction.approved,
      resolved: prediction.resolved,
      expiresAt: prediction.expiresAt.toISOString(),
      createdAt: prediction.createdAt.toISOString(),
      totalBets: prediction._count.bets,
    }));
  }

  // Achievement-related methods
  async getUserTotalBetsCount(userId: number): Promise<number> {
    return prisma.bet.count({ where: { userId } });
  }

  async getUserCategoryWinsCount(userId: number, category: string): Promise<number> {
    return prisma.bet.count({
      where: {
        userId,
        status: 'WON',
        prediction: { category },
      },
    });
  }

  async getUserParlayWinsCount(userId: number): Promise<number> {
    return prisma.parlay.count({
      where: { userId, status: 'WON' },
    });
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
