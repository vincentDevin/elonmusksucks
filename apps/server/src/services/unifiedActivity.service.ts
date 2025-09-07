// apps/server/src/services/unifiedActivity.service.ts
// Single source of truth for ALL activity events in the system
// Handles both database storage and Redis publishing for real-time updates

import redisClient from '../lib/redis';
import { randomUUID } from 'crypto';
import type { UnifiedActivityEvent, IEventBus } from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import type { IActivityRepository } from '../repositories/interfaces/IActivityRepository';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { EventBus } from '../lib/EventBus';

export class UnifiedActivityService {
  private repo: IActivityRepository;
  private redis = redisClient;
  private eventBus: IEventBus;
  // private io: any = null; // Removed - using Redis pub/sub only to avoid duplicates

  // Activity storage
  private readonly ACTIVITY_LIST = 'unified:activity:recent';
  private readonly ACTIVITY_MAX = 100;

  constructor(
    repo: IActivityRepository = new ActivityRepository(),
    eventBus: IEventBus = new EventBus(),
  ) {
    this.repo = repo;
    this.eventBus = eventBus;
  }

  /**
   * Set Socket.IO instance for immediate broadcasting
   * NOTE: Disabled to prevent duplicate events - Redis subscriber handles broadcasting
   */
  setSocketIO(_io: any) {
    // Disabled - the Redis subscriber in unifiedActivityHandlers.ts handles all broadcasting
    // Keeping method signature for compatibility but not using the io instance
  }

  /**
   * Publish a unified activity event
   * This is the ONLY method that should be used to create activities
   */
  async publishActivity(
    event: Omit<UnifiedActivityEvent, 'id' | 'timestamp'>,
  ): Promise<UnifiedActivityEvent> {
    const activity: UnifiedActivityEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Store in database for persistence
      await this.storeActivityInDB(activity);

      // Publish to Redis for cross-server real-time updates
      await this.publishToRedis(activity);

      // Don't broadcast here - the Redis subscriber in unifiedActivityHandlers.ts will handle it
      // This was causing duplicate events

      console.log(
        `[unified-activity] Published & broadcast: ${activity.type} by ${activity.userName}`,
      );
      return activity;
    } catch (error) {
      console.error('[unified-activity] Error publishing activity:', error);
      throw error;
    }
  }

  /**
   * Store activity in database
   */
  private async storeActivityInDB(activity: UnifiedActivityEvent): Promise<void> {
    await this.repo.createActivity({
      userId: activity.userId,
      type: activity.type as string,
      title: activity.title,
      description: activity.description,
      details: {
        icon: activity.icon,
        color: activity.color,
        amount: activity.amount,
        odds: activity.odds,
        predictionTitle: activity.predictionTitle,
        category: activity.category,
        optionLabel: activity.optionLabel,
        isHighValue: activity.isHighValue,
        isWin: activity.isWin,
        streak: activity.streak,
        ...activity.meta,
      },
      isPersonal: activity.isPersonal,
      priority: activity.priority,
      predictionId: activity.predictionId,
    });
  }

  /**
   * Publish activity to Redis channels (Global Broadcast Model)
   */
  private async publishToRedis(activity: UnifiedActivityEvent): Promise<void> {
    const json = JSON.stringify(activity);

    // ALL activities publish to global channel (no user filtering)
    // Using eventBus instead of direct Redis publishing for consistency
    await this.eventBus.publish(REDIS_CHANNELS.UNIFIED_ACTIVITY_GLOBAL, activity);

    // Store in recent activities list for new connections
    await Promise.all([
      this.redis.lpush(this.ACTIVITY_LIST, json),
      this.redis.ltrim(this.ACTIVITY_LIST, 0, this.ACTIVITY_MAX - 1),
    ]);
  }

  /**
   * Get recent activities for bootstrapping new connections
   */
  async getRecentActivities(limit = 50): Promise<UnifiedActivityEvent[]> {
    const items = await this.redis.lrange(this.ACTIVITY_LIST, 0, limit - 1);
    return items.map((item) => JSON.parse(item) as UnifiedActivityEvent);
  }

  /**
   * Get public activities from database (for compatibility)
   * Returns data in unified Redis format for consistency
   */
  async getPublicActivities(limit = 50): Promise<UnifiedActivityEvent[]> {
    const activities = await this.repo.getPublicActivities(limit);

    // Transform to unified Redis format for consistency
    return activities.map((activity) => {
      const details = (activity.details as any) || {};
      return {
        id: activity.id.toString(),
        type: activity.type as any,
        timestamp: activity.createdAt.toISOString(),
        priority: activity.priority as 'high' | 'medium' | 'low',
        userId: activity.user.id,
        userName: activity.user.name,
        userAvatar: activity.user.avatarUrl || undefined,
        title: activity.title || details.title || '',
        description: activity.description || details.description || '',
        icon: details.icon || '•',
        color: details.color,
        amount: details.amount,
        odds: details.odds,
        predictionId: activity.prediction?.id || details.predictionId,
        predictionTitle: activity.prediction?.title || details.predictionTitle,
        category: activity.prediction?.category || details.category,
        optionLabel: details.optionLabel,
        isPersonal: activity.isPersonal,
        isHighValue: details.isHighValue || (details.amount && details.amount >= 1000),
        isWin: details.isWin,
        streak: details.streak,
        meta: details,
      } as UnifiedActivityEvent;
    });
  }

  // ===== Activity Creation Helpers =====

  /**
   * Create a post/comment activity
   */
  async createPostActivity(
    user: { id: number; name: string; avatarUrl?: string | null },
    post: { id: number; content: string; isComment: boolean },
  ): Promise<UnifiedActivityEvent> {
    const preview = post.content.length > 50 ? post.content.substring(0, 47) + '...' : post.content;

    return this.publishActivity({
      type: post.isComment ? 'comment_created' : 'post_created',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl || undefined,
      title: `${user.name} ${post.isComment ? 'commented' : 'posted'}`,
      description: preview,
      icon: post.isComment ? '💬' : '📝',
      isPersonal: false,
      isHighValue: false,
      priority: 'low',
    });
  }

  /**
   * Create a bet placed activity
   */
  async createBetActivity(
    user: { id: number; name: string; avatarUrl?: string | null },
    bet: {
      id: number;
      amount: number;
      odds: number;
      predictionId: number;
      predictionTitle: string;
      optionLabel: string;
      category?: string;
    },
  ): Promise<UnifiedActivityEvent> {
    const isHighValue = bet.amount >= 1000;
    const priority = isHighValue ? 'high' : bet.amount >= 500 ? 'medium' : 'low';

    return this.publishActivity({
      type: 'bet_placed',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl || undefined,
      title: `${user.name} placed a bet`,
      description: `${bet.amount}🪙 on "${bet.optionLabel}" @${bet.odds}x`,
      icon: '💰',
      amount: bet.amount,
      odds: bet.odds,
      predictionId: bet.predictionId,
      predictionTitle: bet.predictionTitle,
      category: bet.category,
      optionLabel: bet.optionLabel,
      isPersonal: false,
      isHighValue,
      priority,
    });
  }

  /**
   * Create a parlay started activity
   */
  async createParlayActivity(
    user: { id: number; name: string; avatarUrl?: string | null },
    parlay: {
      id: number;
      amount: number;
      legCount: number;
      combinedOdds: number;
    },
  ): Promise<UnifiedActivityEvent> {
    const isHighValue = parlay.amount >= 500;
    const priority = parlay.legCount >= 4 ? 'high' : 'medium';

    return this.publishActivity({
      type: 'parlay_started',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl || undefined,
      title: `${user.name} started a ${parlay.legCount}-leg parlay`,
      description: `${parlay.amount}🪙 @${parlay.combinedOdds.toFixed(2)}x combined odds`,
      icon: '🎯',
      amount: parlay.amount,
      odds: parlay.combinedOdds,
      isPersonal: false,
      isHighValue,
      priority,
    });
  }

  /**
   * Create a prediction created activity
   */
  async createPredictionActivity(
    user: { id: number; name: string; avatarUrl?: string | null },
    prediction: {
      id: number;
      title: string;
      category: string;
    },
  ): Promise<UnifiedActivityEvent> {
    return this.publishActivity({
      type: 'prediction_created',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl || undefined,
      title: `${user.name} created a prediction`,
      description: `"${prediction.title}" in ${prediction.category}`,
      icon: '🔮',
      predictionId: prediction.id,
      predictionTitle: prediction.title,
      category: prediction.category,
      isPersonal: false,
      isHighValue: false,
      priority: 'medium',
    });
  }

  /**
   * Create a prediction resolved activity
   */
  async createPredictionResolvedActivity(
    prediction: {
      id: number;
      title: string;
      category: string;
      winningOption: string;
    },
    resolver: { id: number; name: string; avatarUrl?: string | null },
  ): Promise<UnifiedActivityEvent> {
    return this.publishActivity({
      type: 'prediction_resolved',
      userId: resolver.id,
      userName: resolver.name,
      userAvatar: resolver.avatarUrl || undefined,
      title: 'Prediction resolved',
      description: `"${prediction.title}" → ${prediction.winningOption}`,
      icon: '✅',
      predictionId: prediction.id,
      predictionTitle: prediction.title,
      category: prediction.category,
      optionLabel: prediction.winningOption,
      isPersonal: false,
      isHighValue: false,
      priority: 'high',
    });
  }

  /**
   * Create a big win activity
   */
  async createBigWinActivity(
    user: { id: number; name: string; avatarUrl?: string | null },
    win: {
      amount: number;
      predictionId: number;
      predictionTitle: string;
      streak?: number;
    },
  ): Promise<UnifiedActivityEvent> {
    const streakText = win.streak && win.streak > 1 ? ` (${win.streak} streak!)` : '';

    return this.publishActivity({
      type: 'big_win',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl || undefined,
      title: `${user.name} hit a big win!`,
      description: `Won ${win.amount}🪙${streakText} on "${win.predictionTitle}"`,
      icon: '🏆',
      amount: win.amount,
      predictionId: win.predictionId,
      predictionTitle: win.predictionTitle,
      isPersonal: false,
      isHighValue: true,
      isWin: true,
      streak: win.streak,
      priority: 'high',
    });
  }

  /**
   * Create an achievement unlocked activity
   */
  async createAchievementActivity(
    user: { id: number; name: string; avatarUrl?: string | null },
    achievement: {
      id: number;
      name: string;
      description?: string;
    },
  ): Promise<UnifiedActivityEvent> {
    return this.publishActivity({
      type: 'achievement_unlocked',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl || undefined,
      title: `${user.name} unlocked an achievement`,
      description: achievement.name,
      icon: '🏅',
      isPersonal: false,
      isHighValue: true,
      priority: 'medium',
    });
  }

  /**
   * Create a user followed activity
   */
  async createFollowActivity(
    follower: { id: number; name: string; avatarUrl?: string | null },
    followed: { id: number; name: string },
  ): Promise<UnifiedActivityEvent> {
    return this.publishActivity({
      type: 'user_followed',
      userId: follower.id,
      userName: follower.name,
      userAvatar: follower.avatarUrl || undefined,
      title: `${follower.name} followed ${followed.name}`,
      description: 'New connection in the prediction community',
      icon: '👥',
      isPersonal: false,
      isHighValue: false,
      priority: 'low',
    });
  }
}

// Export singleton instance
export const unifiedActivityService = new UnifiedActivityService();
