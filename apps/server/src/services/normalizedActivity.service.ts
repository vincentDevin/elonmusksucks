// apps/server/src/services/normalizedActivity.service.ts
// -----------------------------------------------------------------------------
// Normalized Activity Event Service
// Handles creation, publishing, and storage of rich activity events
// -----------------------------------------------------------------------------

import { randomUUID } from 'crypto';
import redisClient from '../lib/redis';
import type {
  NormalizedActivityEvent,
  CreateActivityEvent,
  ActivityEventType,
} from '@ems/types';

export class NormalizedActivityService {
  private readonly TICKER_LIST = 'activity:ticker:normalized';
  private readonly TICKER_CHANNEL = 'activity:newsflash:normalized';
  private readonly TICKER_MAX = 100; // keep the 100 most-recent items

  constructor(private redis = redisClient) {}

  /**
   * Create and publish a normalized activity event
   */
  async createEvent(event: CreateActivityEvent): Promise<NormalizedActivityEvent> {
    const normalizedEvent: NormalizedActivityEvent = {
      id: event.id || randomUUID(),
      timestamp: event.timestamp || new Date().toISOString(),
      ...event,
    };

    // Validate required fields
    if (!normalizedEvent.user.id || !normalizedEvent.user.name) {
      throw new Error('Activity event must include valid user info');
    }

    // Store in Redis list for bootstrap data
    const json = JSON.stringify(normalizedEvent);
    await Promise.all([
      // Real-time broadcast
      this.redis.publish(this.TICKER_CHANNEL, json),
      // Bootstrap list for new connections
      this.redis.lpush(this.TICKER_LIST, json),
      this.redis.ltrim(this.TICKER_LIST, 0, this.TICKER_MAX - 1),
    ]);

    return normalizedEvent;
  }

  /**
   * Get recent activity events for ticker bootstrap
   */
  async getRecentEvents(limit = 20): Promise<NormalizedActivityEvent[]> {
    const items = await this.redis.lrange(this.TICKER_LIST, 0, limit - 1);
    return items.map((i) => JSON.parse(i) as NormalizedActivityEvent);
  }

  /**
   * Helper: Create bet placed event
   */
  async createBetPlacedEvent(
    user: { id: number; name: string; avatarUrl?: string | null },
    bet: {
      amount: number;
      predictionId: number;
      predictionTitle: string;
      optionLabel: string;
      category?: string;
      odds?: number;
    }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: 'bet_placed' as ActivityEventType,
      user,
      meta: {
        title: bet.predictionTitle,
        amount: bet.amount,
        option: bet.optionLabel,
        category: bet.category,
        odds: bet.odds,
        predictionId: bet.predictionId,
        isHighValue: bet.amount >= 500, // highlight big bets
      },
      priority: bet.amount >= 1000 ? 'high' : 'medium',
    });
  }

  /**
   * Helper: Create parlay started event
   */
  async createParlayStartedEvent(
    user: { id: number; name: string; avatarUrl?: string | null },
    parlay: {
      amount: number;
      parlayId: number;
      legCount: number;
      combinedOdds: number;
    }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: 'parlay_started' as ActivityEventType,
      user,
      meta: {
        title: `${parlay.legCount}-leg parlay`,
        amount: parlay.amount,
        odds: parlay.combinedOdds,
        parlayId: parlay.parlayId,
        isHighValue: parlay.amount >= 300,
      },
      priority: parlay.legCount >= 4 ? 'high' : 'medium',
    });
  }

  /**
   * Helper: Create prediction created event
   */
  async createPredictionCreatedEvent(
    user: { id: number; name: string; avatarUrl?: string | null },
    prediction: {
      id: number;
      title: string;
      category: string;
    }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: 'prediction_created' as ActivityEventType,
      user,
      meta: {
        title: prediction.title,
        category: prediction.category,
        predictionId: prediction.id,
      },
      priority: 'medium',
    });
  }

  /**
   * Helper: Create prediction resolved event
   */
  async createPredictionResolvedEvent(
    prediction: {
      id: number;
      title: string;
      category: string;
      winningOption: string;
    },
    resolver: { id: number; name: string; avatarUrl?: string | null }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: 'prediction_resolved' as ActivityEventType,
      user: resolver,
      meta: {
        title: prediction.title,
        option: prediction.winningOption,
        category: prediction.category,
        predictionId: prediction.id,
      },
      priority: 'high',
    });
  }

  /**
   * Helper: Create big win event
   */
  async createBigWinEvent(
    user: { id: number; name: string; avatarUrl?: string | null },
    win: {
      amount: number;
      predictionTitle: string;
      predictionId: number;
      streak?: number;
    }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: 'big_win' as ActivityEventType,
      user,
      meta: {
        title: win.predictionTitle,
        amount: win.amount,
        predictionId: win.predictionId,
        streak: win.streak,
        isWin: true,
        isHighValue: true,
      },
      priority: 'high',
    });
  }

  /**
   * Helper: Create post/comment event  
   */
  async createPostEvent(
    user: { id: number; name: string; avatarUrl?: string | null },
    post: {
      id: number;
      content: string;
      isComment: boolean;
    }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: post.isComment ? 'comment_created' : 'post_created',
      user,
      meta: {
        title: post.content.length > 50 
          ? post.content.substring(0, 47) + '...' 
          : post.content,
        postId: post.id,
      },
      priority: 'low',
    });
  }

  /**
   * Helper: Create badge earned event
   */
  async createBadgeEarnedEvent(
    user: { id: number; name: string; avatarUrl?: string | null },
    badge: {
      id: number;
      name: string;
      description?: string;
    }
  ): Promise<NormalizedActivityEvent> {
    return this.createEvent({
      type: 'badge_earned' as ActivityEventType,
      user,
      meta: {
        title: badge.name,
        badgeId: badge.id,
      },
      priority: 'medium',
    });
  }
}

export const normalizedActivityService = new NormalizedActivityService();