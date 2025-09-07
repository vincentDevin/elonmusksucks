import prisma from '../db';
import type { IActivityRepository } from './interfaces/IActivityRepository';

export class ActivityRepository implements IActivityRepository {
  async createActivity(data: {
    userId: number;
    type: string;
    title: string;
    description: string;
    details: any;
    isPersonal: boolean;
    priority: string;
    predictionId?: number;
  }): Promise<void> {
    await prisma.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        details: data.details,
        isPersonal: data.isPersonal,
        priority: data.priority,
        relatedUserId: undefined,
        predictionId: data.predictionId,
        betId: undefined,
      },
    });
  }

  async getPublicActivities(limit: number): Promise<
    Array<{
      id: number;
      type: string;
      title: string | null;
      description: string | null;
      details: any;
      isPersonal: boolean;
      priority: string;
      createdAt: Date;
      user: { id: number; name: string; avatarUrl: string | null };
      prediction: { id: number; title: string; category: string } | null;
      bet: { id: number; amount: bigint } | null;
    }>
  > {
    return prisma.userActivity.findMany({
      where: {
        isPersonal: false,
        OR: [
          { type: 'bet_placed' },
          { type: 'parlay_started' },
          { type: 'prediction_created' },
          { type: 'prediction_resolved' },
          { type: 'post_created' },
          { type: 'comment_created' },
          { type: 'big_win' },
          { type: 'achievement_unlocked' },
          { type: 'user_followed' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        prediction: { select: { id: true, title: true, category: true } },
        bet: { select: { id: true, amount: true } },
      },
    });
  }

  async createActivityRecord(data: {
    userId: number;
    type: string;
    title: string;
    description?: string;
    details?: any;
    isPersonal: boolean;
    priority: string;
    relatedUserId?: number;
    predictionId?: number;
    betId?: number;
  }): Promise<{ id: number }> {
    return prisma.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        details: data.details,
        isPersonal: data.isPersonal,
        priority: data.priority,
        relatedUserId: data.relatedUserId,
        predictionId: data.predictionId,
        betId: data.betId,
      },
      select: { id: true },
    });
  }

  async findActivitiesWithFilters(
    whereClause: any,
    options: { orderBy: any; take: number; skip?: number },
  ) {
    return prisma.userActivity.findMany({
      where: whereClause,
      orderBy: options.orderBy,
      take: options.take,
      skip: options.skip,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        relatedUser: { select: { id: true, name: true, avatarUrl: true } },
        prediction: { select: { id: true, title: true, category: true } },
        bet: { select: { id: true, amount: true } },
      },
    });
  }

  async deleteOldActivities(cutoffDate: Date, excludePriority: string): Promise<number> {
    const result = await prisma.userActivity.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        priority: { not: excludePriority },
      },
    });
    return result.count;
  }
}
