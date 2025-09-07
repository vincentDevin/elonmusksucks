// apps/server/src/services/predictions.service.ts
// -----------------------------------------------------------------------------
// • Publishes present-tense Redis channels (prediction:create / …:resolve)
// • Sanitises DB records and injects signed avatar URLs for bets & parlay legs
// -----------------------------------------------------------------------------

// TEMP: Re-export shared prediction payload types for backwards compatibility during migration
export type { CreatePredictionPayload, ResolvePredictionPayload } from '@ems/types';

import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  PublicPrediction,
  ParlayLegWithUser,
} from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { PredictionType } from '@prisma/client';
import { UserService } from '../services/user.service';
import { unifiedActivityService } from './unifiedActivity.service';
import { eventBus } from './eventBus.service';

// Using the global ParlayLegWithUser type from @ems/types

export class PredictionService {
  private userService = new UserService();

  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  async findPredictionBasicById(id: number) {
    return (this.repo as any).findPredictionBasicById(id);
  }

  async findExistingSourceLink(predictionId: number, articleId?: number, tweetId?: string) {
    return (this.repo as any).findExistingSourceLink(predictionId, articleId, tweetId);
  }

  async createSourceLink(
    predictionId: number,
    articleId: number | null,
    tweetId: string | null,
    url: string,
    title: string | null,
    publisher: string | null,
  ) {
    return (this.repo as any).createSourceLink(
      predictionId,
      articleId,
      tweetId,
      url,
      title,
      publisher,
    );
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Fetch **ALL** predictions (public safe shape) */
  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: { id: number; name: string; avatarUrl: string | null } }>;
        parlayLegs: ParlayLegWithUser[];
        sourceLinks: Array<{
          id: number;
          predictionId: number;
          articleId: number | null;
          tweetId: string | null;
          url: string;
          title: string | null;
          publisher: string | null;
          capturedAt: string;
        }>;
      }
    >
  > {
    const raw = await this.repo.listAllPredictions();
    return Promise.all(raw.map((p) => this.enrichAvatars(p)));
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Create prediction then broadcast */
  async createPrediction(params: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<
    PublicPrediction & {
      options: DbPredictionOption[];
      bets: DbBet[];
      parlayLegs: ParlayLegWithUser[];
    }
  > {
    const pred = await this.repo.createPrediction(params);

    const dto: PublicPrediction & {
      options: DbPredictionOption[];
      bets: DbBet[];
      parlayLegs: ParlayLegWithUser[];
    } = {
      id: pred.id,
      title: pred.title,
      description: pred.description,
      category: pred.category,
      expiresAt: pred.expiresAt,
      type: pred.type,
      threshold: pred.threshold ?? null,
      resolved: pred.resolved,
      approved: pred.approved,
      resolvedAt: pred.resolvedAt,
      winningOptionId: pred.winningOptionId,
      creatorId: pred.creatorId,
      options: pred.options || [],
      bets: [],
      parlayLegs: [],
      createdAt: pred.createdAt,
    };

    // Publish via eventBus
    await eventBus.publish(REDIS_CHANNELS.PREDICTION_CREATE, dto);

    // Publish to unified activity system
    const creator = await this.userService.getPublicSocketUser(params.creatorId);
    if (creator) {
      await unifiedActivityService.createPredictionActivity(
        {
          id: creator.id,
          name: creator.name,
          avatarUrl: creator.avatarUrl,
        },
        {
          id: pred.id,
          title: pred.title,
          category: pred.category,
        },
      );

      // Activity already published by unifiedActivityService above
      // No need for duplicate ActivityRecorder call

      // Publish JSON rule achievement event for prediction creation
      try {
        await this.eventBus.publish('prediction:created', {
          key: 'prediction:created',
          userId: params.creatorId,
          occurredAt: pred.createdAt.toISOString(),
          idempotencyKey: `prediction:${pred.id}:created`,
          payload: {
            predictionId: pred.id,
            title: pred.title,
            category: pred.category,
            description: pred.description,
            type: pred.type,
            threshold: pred.threshold,
            expiresAt: pred.expiresAt.toISOString(),
            optionCount: pred.options?.length || 0,
          },
        });
      } catch (achievementError) {
        console.error('[prediction] Error publishing achievement event:', achievementError);
        // Don't fail the prediction creation if achievement event fails
      }
    }

    return dto;
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Fetch ONE prediction (public safe shape) with view tracking */
  async getPrediction(id: number, userId?: number) {
    const pred = await this.repo.findPredictionById(id);
    if (!pred) return null;

    // Track prediction view in background (don't block response)
    if (userId) {
      setImmediate(async () => {
        try {
          await this.trackPredictionView(id, userId);
        } catch (viewError) {
          console.error(
            `[prediction] Error tracking view for prediction ${id} by user ${userId}:`,
            viewError,
          );
        }
      });
    }

    return this.enrichAvatars(pred);
  }

  /**
   * Track prediction view and publish events for achievements
   */
  async trackPredictionView(predictionId: number, userId: number): Promise<void> {
    try {
      // Increment view count in database using repository method if available
      try {
        if (typeof (this.repo as any).incrementViewCount === 'function') {
          await (this.repo as any).incrementViewCount(predictionId);
        }
      } catch (repoError) {
        console.warn(
          `[prediction] Could not increment view count for prediction ${predictionId}:`,
          repoError,
        );
      }

      // Get prediction details for event payload
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) return;

      // Check if user has bets on this prediction
      const userHasBet = prediction.bets?.some((bet) => bet.user.id === userId) || false;

      // Publish prediction view event
      await eventBus.publish('prediction:viewed', {
        key: 'prediction:viewed',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `prediction:view:${predictionId}:${userId}:${Date.now()}`,
        payload: {
          predictionId,
          title: prediction.title,
          category: prediction.category,
          isResolved: prediction.resolved,
          userHasBet,
          viewedAt: new Date().toISOString(),
        },
      });

      // Add activity log for time-based tracking
      await eventBus.publish('user:activity:log', {
        userId,
        activityType: 'prediction_viewed',
        metadata: {
          predictionId,
          title: prediction.title?.substring(0, 100),
          category: prediction.category,
          isResolved: prediction.resolved,
          userHasBet,
          timestamp: new Date().toISOString(),
        },
        occurredAt: new Date().toISOString(),
        dateKey: new Date().toISOString().split('T')[0],
        idempotencyKey: `activity:prediction:view:${predictionId}:${userId}:${Date.now()}`,
      });

      console.log(`[prediction] User ${userId} viewed prediction ${predictionId}`);
    } catch (error) {
      console.error(`[prediction] Error tracking prediction view:`, error);
      throw error;
    }
  }

  /**
   * Track first correct bet achievement when user makes their first winning bet
   * This will be called from betting service when a bet is resolved as winning
   */
  async trackFirstCorrectBet(userId: number, predictionId: number, betId: number): Promise<void> {
    try {
      // Get prediction details
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) return;

      // Update the prediction record with first correct bet user if available
      try {
        if (typeof (this.repo as any).updateFirstCorrectBetUser === 'function') {
          await (this.repo as any).updateFirstCorrectBetUser(predictionId, userId);
        }
      } catch (repoError) {
        console.warn(
          `[prediction] Could not update first correct bet user for prediction ${predictionId}:`,
          repoError,
        );
      }

      // Publish first correct bet event (achievement engine will determine if it's truly the first)
      await eventBus.publish('prediction:first:correct:bet', {
        key: 'prediction:first:correct:bet',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `prediction:first:correct:${userId}:${betId}`,
        payload: {
          predictionId,
          betId,
          title: prediction.title,
          category: prediction.category,
          achievedAt: new Date().toISOString(),
        },
      });

      console.log(`[prediction] User ${userId} recorded correct bet on prediction ${predictionId}`);
    } catch (error) {
      console.error(`[prediction] Error tracking first correct bet:`, error);
      // Don't throw - this shouldn't break bet processing
    }
  }

  /**
   * Track fast resolution achievements when predictions are resolved quickly
   * This should be called from the payout service when resolving predictions
   */
  async trackFastResolution(
    predictionId: number,
    resolvedWithinHour: boolean = false,
  ): Promise<void> {
    try {
      if (resolvedWithinHour) {
        // Update database flag if available
        try {
          if (typeof (this.repo as any).markResolvedWithinHour === 'function') {
            await (this.repo as any).markResolvedWithinHour(predictionId);
          }
        } catch (repoError) {
          console.warn(
            `[prediction] Could not mark resolved within hour for prediction ${predictionId}:`,
            repoError,
          );
        }

        // Get prediction details
        const prediction = await this.repo.findPredictionById(predictionId);
        if (!prediction) return;

        // Calculate time difference if createdAt is available
        let timeDifference = 'unknown';
        if (prediction.createdAt) {
          const diffMs = Date.now() - new Date(prediction.createdAt).getTime();
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          timeDifference = diffMinutes.toString();
        }

        // Publish fast resolution event
        await eventBus.publish('prediction:resolved:fast', {
          key: 'prediction:resolved:fast',
          userId: prediction.creatorId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `prediction:fast:resolution:${predictionId}`,
          payload: {
            predictionId,
            title: prediction.title,
            category: prediction.category,
            createdAt: prediction.createdAt?.toISOString(),
            resolvedAt: new Date().toISOString(),
            timeDifferenceMinutes: timeDifference,
          },
        });

        console.log(
          `[prediction] Prediction ${predictionId} resolved within an hour (${timeDifference} minutes)`,
        );
      }
    } catch (error) {
      console.error(`[prediction] Error tracking fast resolution:`, error);
    }
  }

  /**
   * Track viral predictions based on view counts and engagement
   * This can be called periodically or when significant view/bet thresholds are reached
   */
  async trackViralPrediction(predictionId: number): Promise<void> {
    try {
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) return;

      // Define viral threshold (could be made configurable)
      const VIRAL_VIEW_THRESHOLD = 1000;
      const VIRAL_BET_THRESHOLD = 100;

      // Check if prediction has view count data (from updated schema)
      const viewCount = (prediction as any).viewCount || 0;
      const betCount = prediction.bets?.length || 0;

      if (viewCount >= VIRAL_VIEW_THRESHOLD && betCount >= VIRAL_BET_THRESHOLD) {
        // Publish viral prediction event
        await eventBus.publish('prediction:viral', {
          key: 'prediction:viral',
          userId: prediction.creatorId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `prediction:viral:${predictionId}`,
          payload: {
            predictionId,
            title: prediction.title,
            category: prediction.category,
            viewCount,
            betCount,
            viralMetrics: {
              views: viewCount,
              bets: betCount,
              ratio: betCount / Math.max(viewCount, 1),
            },
          },
        });

        console.log(
          `[prediction] Prediction ${predictionId} went viral: ${viewCount} views, ${betCount} bets`,
        );
      }
    } catch (error) {
      console.error(`[prediction] Error tracking viral prediction:`, error);
    }
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Helper: convert & add avatar URLs */
  private async enrichAvatars(
    pred: DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<
        DbBet & {
          user: {
            id: number;
            name: string;
            avatarUrl?: string | null;
            profilePictureKey?: string | null;
          };
        }
      >;
      parlayLegs: ParlayLegWithUser[];
      sourceLinks?: Array<{
        id: number;
        predictionId: number;
        articleId: number | null;
        tweetId: string | null;
        url: string;
        title: string | null;
        publisher: string | null;
        capturedAt: Date;
      }>;
    },
  ) {
    // --- quick helper to resolve a final URL --------------------------------
    const avatarFor = async (u: {
      id: number;
      avatarUrl?: string | null;
      profilePictureKey?: string | null;
    }): Promise<string | null> =>
      u.profilePictureKey
        ? this.userService.getCachedProfileImageUrl(u.id, u.profilePictureKey, 3600)
        : (u.avatarUrl ?? null);

    // --- bets (user avatar enrichment) --------------------------------------
    const bets = await Promise.all(
      pred.bets.map(async (b) => ({
        ...b,
        user: {
          id: b.user.id,
          name: b.user.name,
          avatarUrl: await avatarFor(b.user),
        },
      })),
    );

    // --- parlay legs (user avatar enrichment) -------------------------------
    const parlayLegs: ParlayLegWithUser[] = await Promise.all(
      pred.parlayLegs.map(async (leg) => ({
        parlayId: leg.parlayId,
        stake: leg.stake,
        optionId: leg.optionId,
        createdAt: leg.createdAt,
        user: {
          id: leg.user.id,
          name: leg.user.name,
          avatarUrl: await avatarFor(leg.user),
        },
      })),
    );

    // --- options (strip prisma internals) -----------------------------------
    const options = pred.options.map(({ id, label, odds, predictionId, createdAt }) => ({
      id,
      label,
      odds,
      predictionId,
      createdAt,
    }));

    // --- sourceLinks (convert Date to string) -------------------------------
    const sourceLinks = (pred.sourceLinks || []).map((link) => ({
      ...link,
      capturedAt: link.capturedAt.toISOString(),
    }));

    return { ...pred, options, bets, parlayLegs, sourceLinks };
  }

  async getSourceLinks(predictionId: number): Promise<
    Array<{
      id: number;
      predictionId: number;
      url: string;
      title: string | null;
      publisher: string | null;
      capturedAt: string;
      type: 'article' | 'tweet';
      source: {
        id: number | string;
        title?: string;
        text?: string;
        url?: string;
        leadImageUrl?: string | null;
        permalink?: string;
        authorHandle?: string;
        feed?: {
          name: string;
          siteUrl: string | null;
        };
      } | null;
    }>
  > {
    const sourceLinks = await this.repo.getSourceLinks(predictionId);

    return sourceLinks.map((link) => ({
      id: link.id,
      predictionId: link.predictionId,
      url: link.url,
      title: link.title,
      publisher: link.publisher,
      capturedAt: link.capturedAt.toISOString(),
      type: link.articleId ? 'article' : 'tweet',
      source: link.article || link.tweet || null,
    }));
  }
}

export const predictionService = new PredictionService();
