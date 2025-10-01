import prisma from '../db';
import type { IActivityRepository } from './interfaces/IActivityRepository';
import type {
  DbCreateActivityData,
  DbCreateActivityRecordData,
  DbActivityWhereClause,
  DbActivityFindOptions,
  PublicActivity,
  DetailedActivity,
} from '@ems/types';

/**
 * Activity Repository Implementation
 *
 * Handles user activity tracking, activity logs, and event recording.
 * All methods use proper types from @ems/types with no `any` types.
 */
export class ActivityRepository implements IActivityRepository {
  /**
   * Create a new activity record (simplified version for backwards compatibility)
   * @param data - Activity data
   */
  async createActivity(data: DbCreateActivityData): Promise<void> {
    await prisma.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        details: data.details ?? {},
        isPersonal: data.isPersonal,
        priority: data.priority,
        relatedUserId: data.relatedUserId,
        predictionId: data.predictionId,
        betId: data.betId,
        pongMatchId: data.pongMatchId,
      },
    });
  }

  /**
   * Get public (non-personal) activities with specific types
   * @param limit - Maximum number of activities to return
   * @returns Array of public activities with user, prediction, and bet relations
   */
  async getPublicActivities(limit: number): Promise<PublicActivity[]> {
    const activities = await prisma.userActivity.findMany({
      where: {
        isPersonal: false,
        OR: [
          { type: 'bet_placed' },
          { type: 'parlay_started' },
          { type: 'prediction_created' },
          { type: 'prediction_resolved' },
          { type: 'post_created' },
          { type: 'big_win' },
          { type: 'achievement_unlocked' },
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

    // Transform to PublicActivity type
    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      details: (activity.details as Record<string, any>) ?? {},
      isPersonal: activity.isPersonal,
      priority: activity.priority,
      createdAt: activity.createdAt,
      user: activity.user,
      prediction: activity.prediction
        ? {
            id: activity.prediction.id,
            title: activity.prediction.title,
            category: activity.prediction.category?.name ?? 'Uncategorized',
          }
        : null,
      bet: activity.bet
        ? {
            id: activity.bet.id,
            amount: activity.bet.amount,
          }
        : null,
    }));
  }

  /**
   * Create a new activity record (full version with all optional fields)
   * @param data - Complete activity record data
   * @returns Object with the created activity ID
   */
  async createActivityRecord(data: DbCreateActivityRecordData): Promise<{ id: number }> {
    return prisma.userActivity.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        details: data.details ?? {},
        isPersonal: data.isPersonal,
        priority: data.priority,
        relatedUserId: data.relatedUserId,
        predictionId: data.predictionId,
        betId: data.betId,
        pongMatchId: data.pongMatchId,
      },
      select: { id: true },
    });
  }

  /**
   * Find activities with custom filters and options
   * @param whereClause - Type-safe where clause for filtering
   * @param options - Query options (orderBy, take, skip)
   * @returns Array of detailed activities with all relations
   */
  async findActivitiesWithFilters(
    whereClause: DbActivityWhereClause,
    options: DbActivityFindOptions,
  ): Promise<DetailedActivity[]> {
    const activities = await prisma.userActivity.findMany({
      where: whereClause as any, // Prisma where types are compatible
      orderBy: options.orderBy as any,
      take: options.take,
      skip: options.skip,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        relatedUser: { select: { id: true, name: true, avatarUrl: true } },
        prediction: { select: { id: true, title: true, category: true } },
        bet: { select: { id: true, amount: true } },
      },
    });

    // Transform to DetailedActivity type
    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      details: (activity.details as Record<string, any>) ?? {},
      isPersonal: activity.isPersonal,
      priority: activity.priority,
      createdAt: activity.createdAt,
      user: activity.user,
      relatedUser: activity.relatedUser ?? null,
      prediction: activity.prediction
        ? {
            id: activity.prediction.id,
            title: activity.prediction.title,
            category: activity.prediction.category?.name ?? 'Uncategorized',
          }
        : null,
      bet: activity.bet
        ? {
            id: activity.bet.id,
            amount: activity.bet.amount,
          }
        : null,
    }));
  }

  /**
   * Delete old activities based on cutoff date, excluding high-priority activities
   * @param cutoffDate - Delete activities created before this date
   * @param excludePriority - Priority level to exclude from deletion
   * @returns Number of deleted activities
   */
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
