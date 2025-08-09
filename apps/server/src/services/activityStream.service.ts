import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';

export interface ActivityEventData {
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  isPersonal?: boolean;
  priority?: 'low' | 'medium' | 'high';
  relatedUserId?: number;
  predictionId?: number;
  betId?: number;
}

export interface ActivityStreamQuery {
  userId?: number;
  includePersonal?: boolean;
  includePublic?: boolean;
  limit?: number;
  offset?: number;
  types?: string[];
  priority?: 'low' | 'medium' | 'high';
  since?: Date;
}

export interface ActivityStreamEntry {
  id: number;
  type: string;
  title: string;
  description?: string;
  details?: any;
  isPersonal: boolean;
  priority: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
  relatedUser?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
  prediction?: {
    id: number;
    title: string;
    category: string;
  };
  bet?: {
    id: number;
    amount: number;
  };
}

export class ActivityStreamService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Record a new activity event
   */
  async recordActivity(userId: number, eventData: ActivityEventData): Promise<void> {
    try {
      const activity = await this.prisma.userActivity.create({
        data: {
          userId,
          type: eventData.type,
          title: eventData.title,
          description: eventData.description,
          details: eventData.metadata,
          isPersonal: eventData.isPersonal ?? true,
          priority: eventData.priority ?? 'medium',
          relatedUserId: eventData.relatedUserId,
          predictionId: eventData.predictionId,
          betId: eventData.betId,
        },
      });

      // Emit real-time activity update via Redis
      await this.emitActivityUpdate(activity.id, userId);

      console.log(`[activity-stream] Recorded activity ${eventData.type} for user ${userId}`);
    } catch (error) {
      console.error('[activity-stream] Error recording activity:', error);
      throw error;
    }
  }

  /**
   * Get activity stream for a user or global feed
   */
  async getActivityStream(query: ActivityStreamQuery): Promise<ActivityStreamEntry[]> {
    const {
      userId,
      includePersonal = true,
      includePublic = true,
      limit = 20,
      offset = 0,
      types,
      priority,
      since,
    } = query;

    const whereClause: any = {};

    // Filter by user if specified
    if (userId) {
      whereClause.OR = [];
      if (includePersonal) {
        whereClause.OR.push({ userId, isPersonal: true });
      }
      if (includePublic) {
        whereClause.OR.push({ userId, isPersonal: false });
      }
    } else {
      // Global feed - only public activities
      whereClause.isPersonal = false;
    }

    // Filter by activity types
    if (types && types.length > 0) {
      whereClause.type = { in: types };
    }

    // Filter by priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Filter by date
    if (since) {
      whereClause.createdAt = { gte: since };
    }

    const activities = await this.prisma.userActivity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        relatedUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        prediction: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
        bet: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title || '',
      description: activity.description || undefined,
      details: activity.details,
      isPersonal: activity.isPersonal,
      priority: activity.priority,
      createdAt: activity.createdAt.toISOString(),
      user: activity.user,
      relatedUser: activity.relatedUser || undefined,
      prediction: activity.prediction || undefined,
      bet: activity.bet || undefined,
    }));
  }

  /**
   * Get recent activity for a specific user (for dashboard)
   */
  async getRecentActivity(
    userId: number,
    options: { limit?: number } = {},
  ): Promise<ActivityStreamEntry[]> {
    return this.getActivityStream({
      userId,
      includePersonal: true,
      includePublic: true,
      limit: options.limit || 20,
    });
  }

  /**
   * Get platform-wide activity feed
   */
  async getPublicActivityFeed(
    options: { limit?: number; types?: string[] } = {},
  ): Promise<ActivityStreamEntry[]> {
    return this.getActivityStream({
      includePersonal: false,
      includePublic: true,
      limit: options.limit || 50,
      types: options.types,
    });
  }

  /**
   * Get filtered activity feed for unified activity stream
   */
  async getFilteredActivityFeed(options: {
    userId: number;
    limit?: number;
    includePersonal?: boolean;
    includeSocial?: boolean;
    includePlatform?: boolean;
    timeframe?: '1h' | '6h' | '24h' | '7d' | 'all';
  }): Promise<ActivityStreamEntry[]> {
    const {
      userId,
      limit = 50,
      includePersonal = true,
      includeSocial = true,
      includePlatform = true,
      timeframe = '24h',
    } = options;

    // Calculate time filter
    let since: Date | undefined;
    if (timeframe !== 'all') {
      const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
      const hours = hoursMap[timeframe];
      since = new Date(Date.now() - hours * 60 * 60 * 1000);
    }

    const whereClause: any = {
      OR: [],
    };

    // Add time filter
    if (since) {
      whereClause.createdAt = { gte: since };
    }

    // Personal activities (user's own actions)
    if (includePersonal) {
      whereClause.OR.push({
        userId,
        isPersonal: true,
      });
    }

    // Social activities (other users' public actions)
    if (includeSocial) {
      whereClause.OR.push({
        userId: { not: userId },
        isPersonal: false,
        type: {
          in: ['bet_placed', 'prediction_created', 'achievement_unlocked', 'parlay_started'],
        },
      });
    }

    // Platform activities (system/platform events)
    if (includePlatform) {
      whereClause.OR.push({
        type: {
          in: ['prediction_resolved', 'big_bet_alert', 'trending_prediction', 'leaderboard_update'],
        },
        isPersonal: false,
      });
    }

    // If no filters selected, return empty array
    if (whereClause.OR.length === 0) {
      return [];
    }

    const activities = await this.prisma.userActivity.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        relatedUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        prediction: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
        bet: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title || '',
      description: activity.description || undefined,
      details: activity.details,
      isPersonal: activity.isPersonal,
      priority: activity.priority,
      createdAt: activity.createdAt.toISOString(),
      user: activity.user,
      relatedUser: activity.relatedUser || undefined,
      prediction: activity.prediction || undefined,
      bet: activity.bet || undefined,
    }));
  }

  /**
   * Emit real-time activity update
   */
  private async emitActivityUpdate(activityId: number, userId: number): Promise<void> {
    try {
      const activity = await this.prisma.userActivity.findUnique({
        where: { id: activityId },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          relatedUser: { select: { id: true, name: true, avatarUrl: true } },
          prediction: { select: { id: true, title: true, category: true } },
          bet: { select: { id: true, amount: true } },
        },
      });

      if (!activity) return;

      const activityData = {
        id: activity.id,
        type: activity.type,
        title: activity.title || '',
        description: activity.description || undefined,
        details: activity.details,
        isPersonal: activity.isPersonal,
        priority: activity.priority,
        createdAt: activity.createdAt.toISOString(),
        user: activity.user,
        relatedUser: activity.relatedUser || undefined,
        prediction: activity.prediction || undefined,
        bet: activity.bet || undefined,
      };

      // Emit to personal activity stream
      if (activity.isPersonal) {
        await redisClient.publish(
          'activity:personal',
          JSON.stringify({
            userId,
            activity: activityData,
          }),
        );
      } else {
        // Emit to global activity stream
        await redisClient.publish(
          'activity:global',
          JSON.stringify({
            activity: activityData,
          }),
        );
      }
    } catch (error) {
      console.error('[activity-stream] Error emitting activity update:', error);
    }
  }

  /**
   * Cleanup old activities (called by scheduled job)
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.userActivity.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        // Keep high priority activities longer
        priority: {
          not: 'high',
        },
      },
    });

    console.log(`[activity-stream] Cleaned up ${result.count} old activities`);
    return result.count;
  }
}

/**
 * Utility functions for common activity types
 */
export class ActivityRecorder {
  private static activityService = new ActivityStreamService();

  static async recordBetPlaced(
    userId: number,
    betId: number,
    predictionId: number,
    amount: number,
    predictionTitle: string,
  ): Promise<void> {
    await this.activityService.recordActivity(userId, {
      type: 'bet_placed',
      title: 'Bet placed',
      description: `${amount}🪙 on "${predictionTitle}"`,
      metadata: { betId, predictionId, amount },
      isPersonal: true,
      priority: amount > 500 ? 'high' : 'medium',
      predictionId,
      betId,
    });
  }

  static async recordPredictionCreated(
    userId: number,
    predictionId: number,
    title: string,
    category: string,
  ): Promise<void> {
    await this.activityService.recordActivity(userId, {
      type: 'prediction_created',
      title: 'Prediction created',
      description: `"${title}" in ${category}`,
      metadata: { predictionId, category },
      isPersonal: false, // Public activity
      priority: 'medium',
      predictionId,
    });
  }

  static async recordBetWon(
    userId: number,
    betId: number,
    predictionId: number,
    payout: number,
    predictionTitle: string,
  ): Promise<void> {
    await this.activityService.recordActivity(userId, {
      type: 'bet_won',
      title: 'Bet won',
      description: `Won ${payout}🪙 on "${predictionTitle}"`,
      metadata: { betId, predictionId, payout },
      isPersonal: true,
      priority: payout > 1000 ? 'high' : 'medium',
      predictionId,
      betId,
    });
  }

  static async recordAchievementUnlocked(
    userId: number,
    achievementId: string,
    achievementTitle: string,
  ): Promise<void> {
    await this.activityService.recordActivity(userId, {
      type: 'achievement_unlocked',
      title: 'Achievement unlocked',
      description: `"${achievementTitle}"`,
      metadata: { achievementId },
      isPersonal: false, // Public activity for social proof
      priority: 'high',
    });
  }

  static async recordParlayStarted(
    userId: number,
    parlayId: number,
    amount: number,
    legCount: number,
    predictionTitles: string,
  ): Promise<void> {
    await this.activityService.recordActivity(userId, {
      type: 'parlay_started',
      title: 'Parlay started',
      description: `${amount}🪙 parlay with ${legCount} legs: ${predictionTitles}`,
      metadata: { parlayId, amount, legCount },
      isPersonal: false, // Public activity for social proof
      priority: amount > 500 ? 'high' : 'medium',
    });
  }

  static async recordFollowUser(
    userId: number,
    followedUserId: number,
    followedUserName: string,
  ): Promise<void> {
    await this.activityService.recordActivity(userId, {
      type: 'user_followed',
      title: 'Following user',
      description: `Now following ${followedUserName}`,
      metadata: { followedUserId },
      isPersonal: true,
      priority: 'low',
      relatedUserId: followedUserId,
    });
  }
}

export const activityStreamService = new ActivityStreamService();
