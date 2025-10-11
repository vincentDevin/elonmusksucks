// apps/server/src/services/predictions.service.ts
// -----------------------------------------------------------------------------
// • Publishes present-tense Redis channels (prediction:create / …:resolve)
// • Sanitises DB records and injects signed avatar URLs for bets & parlay legs
// -----------------------------------------------------------------------------

// TEMP: Re-export shared prediction payload types for backwards compatibility during migration
export type {
  CreatePredictionRequest as CreatePredictionPayload,
  ResolvePredictionRequest as ResolvePredictionPayload,
} from '@ems/types';

import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  PublicPrediction,
  ParlayLegWithUser,
} from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import type { IPredictionRepository } from '../repositories/interfaces/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { PredictionType } from '@prisma/client';
import { UserService } from '../services/user.service';
import { unifiedActivityService } from './unifiedActivity.service';
import { eventBus } from '../lib/EventBus';
import { serializeBigInt } from '../utils/bigintSerializer';
import { ContentRepository } from '../repositories/ContentRepository';
import type { IContentRepository } from '../repositories/interfaces/IContentRepository';

// Using the global ParlayLegWithUser type from @ems/types

export class PredictionService {
  private userService = new UserService();
  private contentRepository: IContentRepository;

  constructor(private repo: IPredictionRepository = new PredictionRepository()) {
    this.contentRepository = new ContentRepository();
  }

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
        creator?: {
          id: number;
          name: string;
          avatarUrl: string | null;
        };
      }
    >
  > {
    const raw = await this.repo.listAllPredictions();
    return Promise.all(raw.map((p) => this.enrichAvatars(p)));
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Fetch filtered and paginated predictions with metadata */
  async listPredictions(filters: {
    status?: 'open' | 'pending' | 'expired' | 'resolved' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<{
    predictions: Array<
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
        creator?: {
          id: number;
          name: string;
          avatarUrl: string | null;
        };
      }
    >;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const { status = 'all', limit = 50, offset = 0 } = filters;

    // Validate limit and offset
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Between 1 and 100
    const validatedOffset = Math.max(0, offset); // Non-negative

    const { predictions: raw, total } = await this.repo.listFilteredPredictions({
      status,
      limit: validatedLimit,
      offset: validatedOffset,
    });

    const predictions = await Promise.all(raw.map((p) => this.enrichAvatars(p)));

    return {
      predictions,
      pagination: {
        total,
        limit: validatedLimit,
        offset: validatedOffset,
        hasMore: validatedOffset + validatedLimit < total,
      },
    };
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Create prediction then broadcast */
  async createPrediction(params: {
    title: string;
    description: string;
    categoryId: number; // Changed from category string to categoryId number
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
      categoryId: pred.categoryId,
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

    // Calculate initial activity metrics for new prediction
    const activityMetrics = await this.getActivityMetrics(pred.id);
    const difficulty = await this.calculateDifficulty(pred.id);
    const viewStats = await this.getPredictionViewStats(pred.id);

    // Enhanced payload with activity metrics
    const enhancedDto = {
      ...dto,
      activityMetrics,
      difficulty,
      viewStats,
    };

    // Publish via eventBus
    await eventBus.publish(REDIS_CHANNELS.PREDICTION_CREATE, enhancedDto);

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
          category: pred.category?.name || 'Uncategorized',
        },
      );

      // Activity already published by unifiedActivityService above
      // No need for duplicate ActivityRecorder call

      // Publish JSON rule achievement event for prediction creation
      try {
        await eventBus.publish(REDIS_CHANNELS.PREDICTION_CREATED, {
          key: 'prediction:created',
          userId: params.creatorId,
          occurredAt: pred.createdAt.toISOString(),
          idempotencyKey: `prediction:${pred.id}:created`,
          payload: {
            predictionId: pred.id,
            title: pred.title,
            category: pred.category?.name || null,
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
      // Check if user has already viewed this prediction to avoid duplicate counting
      const hasViewed = await this.repo.hasUserViewedPrediction(predictionId, userId);

      if (hasViewed) {
        // User has already viewed this prediction, don't increment count or log again
        console.log(
          `[prediction] User ${userId} already viewed prediction ${predictionId}, skipping`,
        );
        return;
      }

      // Increment view count in database
      try {
        await this.repo.incrementViewCount(predictionId);
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
          category: prediction.category?.name || null,
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
          category: prediction.category?.name || null,
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
          category: prediction.category?.name || null,
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
            category: prediction.category?.name || null,
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
            category: prediction.category?.name || null,
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
      creator?: {
        id: number;
        name: string;
        avatarUrl?: string | null;
        profilePictureKey?: string | null;
      };
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
    // --- Collect all unique users from bets, parlay legs, and creator ------
    const allUsers = new Map<
      number,
      { id: number; avatarUrl?: string | null; profilePictureKey: string | null }
    >();

    // Add creator if exists
    if (pred.creator) {
      allUsers.set(pred.creator.id, {
        id: pred.creator.id,
        avatarUrl: pred.creator.avatarUrl,
        profilePictureKey: pred.creator.profilePictureKey ?? null,
      });
    }

    for (const b of pred.bets) {
      allUsers.set(b.user.id, {
        id: b.user.id,
        avatarUrl: b.user.avatarUrl,
        profilePictureKey: b.user.profilePictureKey ?? null,
      });
    }

    for (const leg of pred.parlayLegs) {
      allUsers.set(leg.user.id, {
        id: leg.user.id,
        avatarUrl: leg.user.avatarUrl,
        profilePictureKey: leg.user.profilePictureKey ?? null,
      });
    }

    // --- Batch fetch all avatar URLs in one call ----------------------------
    const avatarUrlMap = await this.userService.getBatchedAvatarUrls(Array.from(allUsers.values()));

    // --- bets (user avatar enrichment) --------------------------------------
    const bets = pred.bets.map((b) => ({
      ...b,
      user: {
        id: b.user.id,
        name: b.user.name,
        avatarUrl: avatarUrlMap.get(b.user.id) ?? null,
      },
    }));

    // --- parlay legs (user avatar enrichment) -------------------------------
    const parlayLegs: ParlayLegWithUser[] = pred.parlayLegs.map((leg) => ({
      parlayId: leg.parlayId,
      stake: leg.stake,
      optionId: leg.optionId,
      createdAt: leg.createdAt,
      user: {
        id: leg.user.id,
        name: leg.user.name,
        avatarUrl: avatarUrlMap.get(leg.user.id) ?? null,
      },
    }));

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

    // --- creator (enrich avatar) --------------------------------------------
    const creator = pred.creator
      ? {
          id: pred.creator.id,
          name: pred.creator.name,
          avatarUrl: avatarUrlMap.get(pred.creator.id) ?? null,
        }
      : undefined;

    return { ...pred, options, bets, parlayLegs, sourceLinks, creator };
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
      type: link.articleId ? ('article' as const) : ('tweet' as const),
      source: link.article
        ? {
            id: link.article.id,
            title: link.article.title,
            url: link.article.url,
            leadImageUrl: link.article.leadImageUrl,
            feed: link.article.feed
              ? {
                  name: link.article.feed.name,
                  siteUrl: link.article.feed.siteUrl,
                }
              : undefined,
          }
        : link.tweetId
          ? {
              id: link.tweetId,
              text: link.title || undefined,
              url: link.url,
              permalink: link.url,
            }
          : null,
    }));
  }

  /**
   * Calculate activity level for a prediction based on betting and engagement metrics
   * Returns: 'high' | 'medium' | 'low'
   */
  async calculateActivityLevel(predictionId: number): Promise<'high' | 'medium' | 'low'> {
    try {
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) return 'low';

      const betCount = prediction.bets?.length || 0;
      const parlayCount = prediction.parlayLegs?.length || 0;
      const totalActivity = betCount + parlayCount;

      // Thresholds based on frontend expectations (lines 304-314 in usePredictionDiscovery.ts)
      if (totalActivity >= 15) {
        return 'high';
      } else if (totalActivity >= 5) {
        return 'medium';
      } else {
        return 'low';
      }
    } catch (error) {
      console.error(`[prediction] Error calculating activity level for ${predictionId}:`, error);
      return 'low';
    }
  }

  /**
   * Calculate activity levels for multiple predictions efficiently
   * Returns a map of predictionId -> activity level
   */
  async calculateBulkActivityLevels(
    predictionIds: number[],
  ): Promise<Record<number, 'high' | 'medium' | 'low'>> {
    try {
      const predictions = await this.repo.findPredictionsByIds(predictionIds);
      const activityLevels: Record<number, 'high' | 'medium' | 'low'> = {};

      for (const prediction of predictions) {
        const betCount = prediction.bets?.length || 0;
        const parlayCount = prediction.parlayLegs?.length || 0;
        const totalActivity = betCount + parlayCount;

        if (totalActivity >= 15) {
          activityLevels[prediction.id] = 'high';
        } else if (totalActivity >= 5) {
          activityLevels[prediction.id] = 'medium';
        } else {
          activityLevels[prediction.id] = 'low';
        }
      }

      return activityLevels;
    } catch (error) {
      console.error('[prediction] Error calculating bulk activity levels:', error);
      return {};
    }
  }

  /**
   * Get activity metrics for a prediction including velocity and engagement
   */
  async getActivityMetrics(predictionId: number): Promise<{
    activityLevel: 'high' | 'medium' | 'low';
    totalBets: number;
    totalParlayLegs: number;
    bettingVelocity: number;
    lastActivityAt: Date | null;
    popularityScore: number;
  }> {
    try {
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) {
        return {
          activityLevel: 'low',
          totalBets: 0,
          totalParlayLegs: 0,
          bettingVelocity: 0,
          lastActivityAt: null,
          popularityScore: 0,
        };
      }

      const betCount = prediction.bets?.length || 0;
      const parlayCount = prediction.parlayLegs?.length || 0;
      const totalActivity = betCount + parlayCount;

      // Calculate activity level
      let activityLevel: 'high' | 'medium' | 'low' = 'low';
      if (totalActivity >= 15) {
        activityLevel = 'high';
      } else if (totalActivity >= 5) {
        activityLevel = 'medium';
      }

      // Calculate betting velocity (bets per hour since creation)
      const now = new Date();
      const createdAt = new Date(prediction.createdAt);
      const hoursElapsed = Math.max(1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      const bettingVelocity = totalActivity / hoursElapsed;

      // Find last activity time
      let lastActivityAt: Date | null = null;
      const allActivities = [
        ...(prediction.bets || []).map((bet) => new Date(bet.createdAt)),
        ...(prediction.parlayLegs || []).map((leg) => new Date(leg.createdAt)),
      ];
      if (allActivities.length > 0) {
        lastActivityAt = new Date(Math.max(...allActivities.map((date) => date.getTime())));
      }

      // Calculate popularity score (0-100)
      let popularityScore = 0;
      if (totalActivity > 20) {
        popularityScore = 90;
      } else if (totalActivity > 10) {
        popularityScore = 70;
      } else if (totalActivity > 5) {
        popularityScore = 50;
      } else {
        popularityScore = 20;
      }

      return {
        activityLevel,
        totalBets: betCount,
        totalParlayLegs: parlayCount,
        bettingVelocity: Math.round(bettingVelocity * 100) / 100,
        lastActivityAt,
        popularityScore,
      };
    } catch (error) {
      console.error(`[prediction] Error getting activity metrics for ${predictionId}:`, error);
      return {
        activityLevel: 'low',
        totalBets: 0,
        totalParlayLegs: 0,
        bettingVelocity: 0,
        lastActivityAt: null,
        popularityScore: 0,
      };
    }
  }

  async calculateDifficulty(predictionId: number): Promise<'easy' | 'medium' | 'hard' | 'expert'> {
    try {
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction || !prediction.options || prediction.options.length === 0) {
        return 'medium';
      }

      return this.getDifficultyFromOptions(prediction.options);
    } catch (error) {
      console.error(`[prediction] Error calculating difficulty for ${predictionId}:`, error);
      return 'medium';
    }
  }

  async calculateBulkDifficulties(
    predictionIds: number[],
  ): Promise<Record<number, 'easy' | 'medium' | 'hard' | 'expert'>> {
    try {
      const predictions = await this.repo.findPredictionsByIds(predictionIds);
      const difficulties: Record<number, 'easy' | 'medium' | 'hard' | 'expert'> = {};

      for (const prediction of predictions) {
        if (prediction.options && prediction.options.length > 0) {
          difficulties[prediction.id] = this.getDifficultyFromOptions(prediction.options);
        } else {
          difficulties[prediction.id] = 'medium';
        }
      }

      return difficulties;
    } catch (error) {
      console.error('[prediction] Error calculating bulk difficulties:', error);
      return {};
    }
  }

  private getDifficultyFromOptions(
    options: Array<{ odds: number }>,
  ): 'easy' | 'medium' | 'hard' | 'expert' {
    if (options.length === 0) return 'medium';

    // Find the most favorable odds (lowest value, highest probability)
    const bestOdds = Math.min(...options.map((opt) => opt.odds));

    // Apply the same thresholds as the frontend
    if (bestOdds >= 1.2 && bestOdds < 2.0) return 'easy';
    if (bestOdds >= 2.0 && bestOdds < 4.0) return 'medium';
    if (bestOdds >= 4.0 && bestOdds < 8.0) return 'hard';
    if (bestOdds >= 8.0 && bestOdds <= 100.0) return 'expert';

    return 'medium';
  }

  async getFilteredPredictions(filters: {
    categories?: string[];
    difficulties?: ('easy' | 'medium' | 'hard' | 'expert')[];
    timeRemaining?: 'all' | '1h' | '1d' | '1w';
    activity?: 'all' | 'high' | 'medium' | 'low';
    status?: 'all' | 'open' | 'pending' | 'expired' | 'resolved';
    search?: string;
    sortBy?: 'relevance' | 'newest' | 'oldest' | 'odds' | 'volume' | 'activity';
    limit?: number;
    offset?: number;
  }) {
    try {
      // Get all predictions first
      const allPredictions = await this.repo.listAllPredictions();

      // Apply filters
      let filteredPredictions = allPredictions;

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        filteredPredictions = filteredPredictions.filter((pred) => {
          const categoryName = pred.category?.name;
          return categoryName ? filters.categories!.includes(categoryName) : false;
        });
      }

      // Status filter
      if (filters.status && filters.status !== 'all') {
        const now = new Date();
        filteredPredictions = filteredPredictions.filter((pred) => {
          switch (filters.status) {
            case 'open':
              return !pred.resolved && pred.expiresAt > now;
            case 'pending':
              return !pred.resolved && pred.expiresAt <= now;
            case 'expired':
              return !pred.resolved && pred.expiresAt <= now;
            case 'resolved':
              return pred.resolved;
            default:
              return true;
          }
        });
      }

      // Time remaining filter
      if (filters.timeRemaining && filters.timeRemaining !== 'all') {
        const now = new Date();
        const cutoffTime = new Date();

        switch (filters.timeRemaining) {
          case '1h':
            cutoffTime.setHours(now.getHours() + 1);
            break;
          case '1d':
            cutoffTime.setDate(now.getDate() + 1);
            break;
          case '1w':
            cutoffTime.setDate(now.getDate() + 7);
            break;
        }

        filteredPredictions = filteredPredictions.filter(
          (pred) => pred.expiresAt <= cutoffTime && pred.expiresAt > now,
        );
      }

      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        filteredPredictions = filteredPredictions.filter(
          (pred) =>
            pred.title.toLowerCase().includes(searchTerm) ||
            (pred.description && pred.description.toLowerCase().includes(searchTerm)) ||
            (pred.category?.name && pred.category.name.toLowerCase().includes(searchTerm)),
        );
      }

      // Apply difficulty and activity filters (need to calculate these)
      const predictionsWithMetrics = filteredPredictions.map((pred) => {
        const difficulty = this.getDifficultyFromOptions(pred.options);
        const activityLevel = this.getActivityLevelFromCounts(
          pred.bets?.length || 0,
          pred.parlayLegs?.length || 0,
        );

        // Convert bigint amounts to numbers for volume calculation
        const serializedBets = serializeBigInt(pred.bets || []);
        const volume = serializedBets.reduce(
          (sum: number, bet: any) => sum + Number(bet.amount),
          0,
        );

        return {
          ...pred,
          difficulty,
          activityLevel,
          totalActivity: (pred.bets?.length || 0) + (pred.parlayLegs?.length || 0),
          volume,
        };
      });

      // Difficulty filter
      let enhancedPredictions = predictionsWithMetrics;
      if (filters.difficulties && filters.difficulties.length > 0) {
        enhancedPredictions = enhancedPredictions.filter((pred) =>
          filters.difficulties!.includes(pred.difficulty),
        );
      }

      // Activity filter
      if (filters.activity && filters.activity !== 'all') {
        enhancedPredictions = enhancedPredictions.filter(
          (pred) => pred.activityLevel === filters.activity,
        );
      }

      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'newest':
            enhancedPredictions.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            break;
          case 'oldest':
            enhancedPredictions.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
            break;
          case 'odds':
            enhancedPredictions.sort((a, b) => {
              const aMinOdds = Math.min(...a.options.map((opt) => opt.odds));
              const bMinOdds = Math.min(...b.options.map((opt) => opt.odds));
              return aMinOdds - bMinOdds;
            });
            break;
          case 'volume':
            enhancedPredictions.sort((a, b) => b.volume - a.volume);
            break;
          case 'activity':
            enhancedPredictions.sort((a, b) => b.totalActivity - a.totalActivity);
            break;
          case 'relevance':
          default:
            // Keep current order for relevance (could be enhanced with user preferences)
            break;
        }
      }

      // Pagination
      const total = enhancedPredictions.length;
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedPredictions = enhancedPredictions.slice(offset, offset + limit);

      return {
        predictions: paginatedPredictions,
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error('[prediction] Error filtering predictions:', error);
      throw error;
    }
  }

  private getActivityLevelFromCounts(
    betCount: number,
    parlayCount: number,
  ): 'high' | 'medium' | 'low' {
    const totalActivity = betCount + parlayCount;
    if (totalActivity >= 15) return 'high';
    if (totalActivity >= 5) return 'medium';
    return 'low';
  }

  async getPredictionViewStats(predictionId: number): Promise<{
    totalViews: number;
    uniqueUserViews: number;
    viewToEngagementRatio: number;
  }> {
    try {
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) {
        throw new Error(`Prediction ${predictionId} not found`);
      }

      const totalViews = prediction.viewCount || 0;
      const uniqueUserViews = await this.repo.getUserViewCount(predictionId);
      const totalEngagement = (prediction.bets?.length || 0) + (prediction.parlayLegs?.length || 0);
      const viewToEngagementRatio = totalViews > 0 ? totalEngagement / totalViews : 0;

      return {
        totalViews,
        uniqueUserViews,
        viewToEngagementRatio: Math.round(viewToEngagementRatio * 10000) / 10000, // Round to 4 decimal places
      };
    } catch (error) {
      console.error(`[prediction] Error getting view stats for ${predictionId}:`, error);
      throw error;
    }
  }

  async getBulkViewStats(predictionIds: number[]): Promise<
    Record<
      number,
      {
        totalViews: number;
        uniqueUserViews: number;
        viewToEngagementRatio: number;
      }
    >
  > {
    try {
      const predictions = await this.repo.findPredictionsByIds(predictionIds);
      const stats: Record<number, any> = {};

      for (const prediction of predictions) {
        const totalViews = prediction.viewCount || 0;
        const uniqueUserViews = await this.repo.getUserViewCount(prediction.id);
        const totalEngagement =
          (prediction.bets?.length || 0) + (prediction.parlayLegs?.length || 0);
        const viewToEngagementRatio = totalViews > 0 ? totalEngagement / totalViews : 0;

        stats[prediction.id] = {
          totalViews,
          uniqueUserViews,
          viewToEngagementRatio: Math.round(viewToEngagementRatio * 10000) / 10000,
        };
      }

      return stats;
    } catch (error) {
      console.error('[prediction] Error getting bulk view stats:', error);
      throw error;
    }
  }

  async hasUserViewedPrediction(predictionId: number, userId: number): Promise<boolean> {
    return this.repo.hasUserViewedPrediction(predictionId, userId);
  }

  async getPredictionAnalytics(): Promise<{
    totalPending: number;
    totalApproved: number;
    totalResolved: number;
    totalRejected: number;
    avgResolutionTime: number;
  }> {
    try {
      const allPredictions = await this.repo.listAllPredictions();

      const totalPending = allPredictions.filter((p) => !p.approved && !p.resolved).length;
      const totalApproved = allPredictions.filter((p) => p.approved && !p.resolved).length;
      const totalResolved = allPredictions.filter((p) => p.resolved).length;
      const totalRejected = allPredictions.filter((p) => !p.approved && p.resolved).length;

      // Calculate average resolution time for resolved predictions
      const resolvedPredictions = allPredictions.filter((p) => p.resolved && p.resolvedAt);
      let avgResolutionTime = 0;

      if (resolvedPredictions.length > 0) {
        const totalResolutionTime = resolvedPredictions.reduce((sum, pred) => {
          if (pred.resolvedAt) {
            return sum + (pred.resolvedAt.getTime() - pred.createdAt.getTime());
          }
          return sum;
        }, 0);
        avgResolutionTime = totalResolutionTime / resolvedPredictions.length;
        // Convert from milliseconds to hours
        avgResolutionTime = Math.round(avgResolutionTime / (1000 * 60 * 60));
      }

      return {
        totalPending,
        totalApproved,
        totalResolved,
        totalRejected,
        avgResolutionTime,
      };
    } catch (error) {
      console.error('[prediction] Error getting prediction analytics:', error);
      throw error;
    }
  }

  async getDetailedPredictionAnalytics(predictionId: number): Promise<{
    totalBets: number;
    totalVolume: number;
    uniqueBettors: number;
    controversyScore: number;
    popularityScore: number;
    viewStats: {
      totalViews: number;
      uniqueUserViews: number;
      viewToEngagementRatio: number;
    };
    difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert';
    activityLevel: 'high' | 'medium' | 'low';
  }> {
    try {
      const prediction = await this.repo.findPredictionById(predictionId);
      if (!prediction) {
        throw new Error(`Prediction ${predictionId} not found`);
      }

      const totalBets = prediction.bets?.length || 0;
      const totalParlayLegs = prediction.parlayLegs?.length || 0;
      const uniqueBettors = new Set([
        ...(prediction.bets?.map((bet) => bet.user.id) || []),
        ...(prediction.parlayLegs?.map((leg) => leg.user.id) || []),
      ]).size;

      // Calculate total volume using serializeBigInt for bigint amounts
      const serializedBets = serializeBigInt(prediction.bets || []);
      const totalVolume = serializedBets.reduce(
        (sum: number, bet: any) => sum + Number(bet.amount),
        0,
      );

      // Calculate controversy score based on option distribution
      let controversyScore = 0;
      if (prediction.options && prediction.options.length > 1) {
        const optionBetCounts = prediction.options.map(
          (option) =>
            (prediction.bets?.filter((bet) => bet.optionId === option.id).length || 0) +
            (prediction.parlayLegs?.filter((leg) => leg.optionId === option.id).length || 0),
        );

        if (optionBetCounts.some((count) => count > 0)) {
          const total = optionBetCounts.reduce((sum, count) => sum + count, 0);
          const distribution = optionBetCounts.map((count) => count / total);

          // Higher controversy when bets are more evenly distributed
          // Using standard deviation - closer to 0.5 (even split) = higher controversy
          const mean = 1 / prediction.options.length;
          const variance =
            distribution.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / distribution.length;
          controversyScore = Math.max(0, 100 - Math.sqrt(variance) * 1000);
        }
      }

      // Calculate popularity score based on engagement and views
      const totalEngagement = totalBets + totalParlayLegs;
      const viewCount = prediction.viewCount || 0;
      let popularityScore = 0;

      if (viewCount > 0) {
        popularityScore = Math.min(
          100,
          (totalEngagement / viewCount) * 100 + Math.log10(viewCount + 1) * 10,
        );
      } else if (totalEngagement > 0) {
        popularityScore = Math.min(100, totalEngagement * 10);
      }

      // Get view stats
      const viewStats = await this.getPredictionViewStats(predictionId);

      // Get difficulty and activity levels
      const difficultyLevel = this.getDifficultyFromOptions(prediction.options);
      const activityLevel = this.getActivityLevelFromCounts(totalBets, totalParlayLegs);

      return {
        totalBets,
        totalVolume,
        uniqueBettors,
        controversyScore: Math.round(controversyScore),
        popularityScore: Math.round(popularityScore),
        viewStats,
        difficultyLevel,
        activityLevel,
      };
    } catch (error) {
      console.error(`[prediction] Error getting detailed analytics for ${predictionId}:`, error);
      throw error;
    }
  }

  async getCategoryAnalytics(): Promise<
    Array<{
      category: string;
      totalPredictions: number;
      activePredictions: number;
      totalVolume: number;
      avgEngagement: number;
      popularityScore: number;
    }>
  > {
    try {
      const allPredictions = await this.repo.listAllPredictions();
      const categoryMap = new Map<string | null, any>();

      for (const prediction of allPredictions) {
        const categoryKey = prediction.category?.name || null;
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            category: categoryKey,
            totalPredictions: 0,
            activePredictions: 0,
            totalVolume: 0,
            totalEngagement: 0,
            totalViews: 0,
          });
        }

        const stats = categoryMap.get(categoryKey);
        stats.totalPredictions++;

        if (!prediction.resolved) {
          stats.activePredictions++;
        }

        const betCount = prediction.bets?.length || 0;
        const parlayCount = prediction.parlayLegs?.length || 0;
        stats.totalEngagement += betCount + parlayCount;
        stats.totalViews += prediction.viewCount || 0;

        // Calculate volume
        const serializedBets = serializeBigInt(prediction.bets || []);
        const volume = serializedBets.reduce(
          (sum: number, bet: any) => sum + Number(bet.amount),
          0,
        );
        stats.totalVolume += volume;
      }

      return Array.from(categoryMap.values())
        .map((stats) => ({
          category: stats.category,
          totalPredictions: stats.totalPredictions,
          activePredictions: stats.activePredictions,
          totalVolume: stats.totalVolume,
          avgEngagement:
            stats.totalPredictions > 0
              ? Math.round((stats.totalEngagement / stats.totalPredictions) * 100) / 100
              : 0,
          popularityScore:
            stats.totalViews > 0
              ? Math.round((stats.totalEngagement / stats.totalViews) * 100)
              : Math.min(100, stats.totalEngagement * 10),
        }))
        .sort((a, b) => b.totalPredictions - a.totalPredictions);
    } catch (error) {
      console.error('[prediction] Error getting category analytics:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<{
    difficultyDistribution: Record<'easy' | 'medium' | 'hard' | 'expert', number>;
    activityDistribution: Record<'high' | 'medium' | 'low', number>;
    engagementTrends: Array<{
      date: string;
      totalBets: number;
      totalViews: number;
      engagementRate: number;
    }>;
    topPerformingPredictions: Array<{
      id: number;
      title: string;
      category: string | null;
      engagementScore: number;
      viewCount: number;
      betCount: number;
    }>;
  }> {
    try {
      const allPredictions = await this.repo.listAllPredictions();

      // Calculate difficulty distribution
      const difficultyDistribution = {
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0,
      };

      // Calculate activity distribution
      const activityDistribution = {
        high: 0,
        medium: 0,
        low: 0,
      };

      // Calculate top performing predictions
      const performanceScores = allPredictions.map((prediction) => {
        const betCount = prediction.bets?.length || 0;
        const parlayCount = prediction.parlayLegs?.length || 0;
        const totalEngagement = betCount + parlayCount;
        const viewCount = prediction.viewCount || 0;

        const difficulty = this.getDifficultyFromOptions(prediction.options);
        const activityLevel = this.getActivityLevelFromCounts(betCount, parlayCount);

        difficultyDistribution[difficulty]++;
        activityDistribution[activityLevel]++;

        const engagementScore =
          viewCount > 0
            ? (totalEngagement / viewCount) * 100 + Math.log10(viewCount + 1) * 10
            : totalEngagement * 10;

        return {
          id: prediction.id,
          title: prediction.title,
          category: prediction.category?.name || null,
          engagementScore: Math.round(engagementScore),
          viewCount,
          betCount: totalEngagement,
        };
      });

      // Get top 10 performing predictions
      const topPerformingPredictions = performanceScores
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 10);

      // Calculate engagement trends (last 7 days)
      const engagementTrends: Array<{
        date: string;
        totalBets: number;
        totalViews: number;
        engagementRate: number;
      }> = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const dayPredictions = allPredictions.filter(
          (p) => p.createdAt.toISOString().split('T')[0] === dateString,
        );

        const totalBets = dayPredictions.reduce(
          (sum, p) => sum + (p.bets?.length || 0) + (p.parlayLegs?.length || 0),
          0,
        );
        const totalViews = dayPredictions.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        const engagementRate = totalViews > 0 ? (totalBets / totalViews) * 100 : 0;

        engagementTrends.push({
          date: dateString,
          totalBets,
          totalViews,
          engagementRate: Math.round(engagementRate * 100) / 100,
        });
      }

      return {
        difficultyDistribution,
        activityDistribution,
        engagementTrends,
        topPerformingPredictions,
      };
    } catch (error) {
      console.error('[prediction] Error getting performance metrics:', error);
      throw error;
    }
  }

  async detectHotMarkets(): Promise<
    Array<{
      id: number;
      title: string;
      category: string;
      hotScore: number;
      indicators: string[];
      metrics: {
        recentActivity: number;
        velocityScore: number;
        viewMomentum: number;
        controversyLevel: number;
        freshness: number;
      };
      timeWindow: '1h' | '6h' | '24h';
    }>
  > {
    try {
      const allPredictions = await this.repo.listAllPredictions();
      const now = new Date();
      const hotMarkets: any[] = [];

      // Define time windows for analysis
      const timeWindows = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
      };

      for (const prediction of allPredictions) {
        // Skip resolved predictions
        if (prediction.resolved) continue;

        // Skip predictions that expire very soon (less than 1 hour)
        if (prediction.expiresAt <= new Date(now.getTime() + timeWindows['1h'])) continue;

        // Calculate metrics for each time window
        for (const [windowKey, windowMs] of Object.entries(timeWindows)) {
          const windowStart = new Date(now.getTime() - windowMs);

          // Recent activity (bets + parlays in time window)
          const recentBets = (prediction.bets || []).filter((bet) => bet.createdAt >= windowStart);
          const recentParlayLegs = (prediction.parlayLegs || []).filter(
            (leg) => leg.createdAt >= windowStart,
          );
          const recentActivity = recentBets.length + recentParlayLegs.length;

          // Calculate velocity score (activity per hour)
          const hoursInWindow = windowMs / (60 * 60 * 1000);
          const velocityScore = recentActivity / hoursInWindow;

          // View momentum (estimate recent views based on total views and recency)
          const viewCount = prediction.viewCount || 0;
          const daysSinceCreated = Math.max(
            1,
            (now.getTime() - prediction.createdAt.getTime()) / (24 * 60 * 60 * 1000),
          );
          const viewMomentum = windowKey === '24h' ? viewCount / daysSinceCreated : viewCount * 0.5;

          // Controversy level (option distribution)
          let controversyLevel = 0;
          if (prediction.options && prediction.options.length > 1) {
            const optionBetCounts = prediction.options.map(
              (option) =>
                (prediction.bets?.filter((bet) => bet.optionId === option.id).length || 0) +
                (prediction.parlayLegs?.filter((leg) => leg.optionId === option.id).length || 0),
            );

            if (optionBetCounts.some((count) => count > 0)) {
              const total = optionBetCounts.reduce((sum, count) => sum + count, 0);
              const distribution = optionBetCounts.map((count) => count / total);
              const mean = 1 / prediction.options.length;
              const variance =
                distribution.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
                distribution.length;
              controversyLevel = Math.max(0, 100 - Math.sqrt(variance) * 1000);
            }
          }

          // Freshness factor (newer predictions get boost)
          const freshness = Math.max(0, 100 - daysSinceCreated * 10);

          // Calculate hot score based on weighted factors
          const weights = {
            velocity: 0.4,
            views: 0.2,
            controversy: 0.15,
            freshness: 0.15,
            activity: 0.1,
          };

          const hotScore = Math.round(
            velocityScore * weights.velocity * 10 +
              viewMomentum * weights.views +
              controversyLevel * weights.controversy +
              freshness * weights.freshness +
              recentActivity * weights.activity * 5,
          );

          // Only include if hot score is above threshold
          const minHotScore = windowKey === '1h' ? 15 : windowKey === '6h' ? 25 : 35;
          if (hotScore >= minHotScore) {
            // Determine indicators
            const indicators: string[] = [];
            if (velocityScore >= 2) indicators.push('High velocity');
            if (recentActivity >= 5) indicators.push('Surging activity');
            if (viewMomentum >= 10) indicators.push('Trending views');
            if (controversyLevel >= 60) indicators.push('Controversial');
            if (freshness >= 80) indicators.push('Fresh');
            if (velocityScore >= 5) indicators.push('Viral potential');

            hotMarkets.push({
              id: prediction.id,
              title: prediction.title,
              category: prediction.category?.name || null,
              hotScore,
              indicators,
              metrics: {
                recentActivity,
                velocityScore: Math.round(velocityScore * 100) / 100,
                viewMomentum: Math.round(viewMomentum),
                controversyLevel: Math.round(controversyLevel),
                freshness: Math.round(freshness),
              },
              timeWindow: windowKey as '1h' | '6h' | '24h',
            });
          }
        }
      }

      // Remove duplicates (same prediction in multiple windows) and keep highest score
      const uniqueMarkets = new Map<number, any>();
      for (const market of hotMarkets) {
        const existing = uniqueMarkets.get(market.id);
        if (!existing || market.hotScore > existing.hotScore) {
          uniqueMarkets.set(market.id, market);
        }
      }

      // Sort by hot score and return top results
      return Array.from(uniqueMarkets.values())
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 20); // Return top 20 hot markets
    } catch (error) {
      console.error('[prediction] Error detecting hot markets:', error);
      throw error;
    }
  }

  async getMarketTrends(): Promise<{
    trending: Array<{
      id: number;
      title: string;
      category: string;
      trendScore: number;
      change24h: {
        bets: number;
        views: number;
        volume: number;
      };
    }>;
    emerging: Array<{
      id: number;
      title: string;
      category: string;
      emergingScore: number;
      potentialIndicators: string[];
    }>;
    cooling: Array<{
      id: number;
      title: string;
      category: string;
      coolingScore: number;
      reasonsForCooling: string[];
    }>;
  }> {
    try {
      const allPredictions = await this.repo.listAllPredictions();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const trending: any[] = [];
      const emerging: any[] = [];
      const cooling: any[] = [];

      for (const prediction of allPredictions) {
        if (prediction.resolved) continue;

        // Get activity for different time periods
        const recentBets = (prediction.bets || []).filter((bet) => bet.createdAt >= yesterday);
        const previousBets = (prediction.bets || []).filter(
          (bet) => bet.createdAt >= twoDaysAgo && bet.createdAt < yesterday,
        );

        const recentVolume = serializeBigInt(recentBets).reduce(
          (sum: number, bet: any) => sum + Number(bet.amount),
          0,
        );
        const previousVolume = serializeBigInt(previousBets).reduce(
          (sum: number, bet: any) => sum + Number(bet.amount),
          0,
        );

        const betChange = recentBets.length - previousBets.length;
        const volumeChange = recentVolume - previousVolume;

        // Estimate view change (simplified)
        const totalViews = prediction.viewCount || 0;
        const estimatedRecentViews = Math.max(0, totalViews * 0.3); // Assume 30% of views are recent
        const viewChange = estimatedRecentViews;

        // Trending: high recent activity with positive growth
        if (recentBets.length >= 3 && betChange > 0) {
          const trendScore = Math.round(betChange * 10 + volumeChange / 1000 + viewChange * 0.5);

          if (trendScore >= 15) {
            trending.push({
              id: prediction.id,
              title: prediction.title,
              category: prediction.category?.name || null,
              trendScore,
              change24h: {
                bets: betChange,
                views: Math.round(viewChange),
                volume: Math.round(volumeChange),
              },
            });
          }
        }

        // Emerging: new predictions with early signs of interest
        const daysSinceCreated =
          (now.getTime() - prediction.createdAt.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceCreated <= 3 && recentBets.length >= 1) {
          const potentialIndicators: string[] = [];
          let emergingScore = 0;

          if (recentBets.length >= 2) {
            potentialIndicators.push('Early betting interest');
            emergingScore += 20;
          }
          if (totalViews >= 10) {
            potentialIndicators.push('Gaining visibility');
            emergingScore += 15;
          }
          if (
            (prediction.category?.name || null) === 'Technology' ||
            (prediction.category?.name || null) === 'Politics'
          ) {
            potentialIndicators.push('Hot category');
            emergingScore += 10;
          }
          if (daysSinceCreated <= 1) {
            potentialIndicators.push('Brand new');
            emergingScore += 15;
          }

          if (emergingScore >= 25) {
            emerging.push({
              id: prediction.id,
              title: prediction.title,
              category: prediction.category?.name || null,
              emergingScore,
              potentialIndicators,
            });
          }
        }

        // Cooling: predictions with declining activity
        if (daysSinceCreated >= 2 && previousBets.length > recentBets.length) {
          const reasonsForCooling: string[] = [];
          let coolingScore = 0;

          if (betChange < -2) {
            reasonsForCooling.push('Declining betting activity');
            coolingScore += 30;
          }
          if (volumeChange < -1000) {
            reasonsForCooling.push('Reduced betting volume');
            coolingScore += 20;
          }
          if (daysSinceCreated >= 7) {
            reasonsForCooling.push('Getting stale');
            coolingScore += 15;
          }

          const daysUntilExpiry =
            (prediction.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
          if (daysUntilExpiry <= 2) {
            reasonsForCooling.push('Approaching expiry');
            coolingScore += 25;
          }

          if (coolingScore >= 30) {
            cooling.push({
              id: prediction.id,
              title: prediction.title,
              category: prediction.category?.name || null,
              coolingScore,
              reasonsForCooling,
            });
          }
        }
      }

      return {
        trending: trending.sort((a, b) => b.trendScore - a.trendScore).slice(0, 10),
        emerging: emerging.sort((a, b) => b.emergingScore - a.emergingScore).slice(0, 10),
        cooling: cooling.sort((a, b) => b.coolingScore - a.coolingScore).slice(0, 10),
      };
    } catch (error) {
      console.error('[prediction] Error getting market trends:', error);
      throw error;
    }
  }

  async getPersonalizedRecommendations(
    userId: number,
    options: {
      limit?: number;
      excludeViewed?: boolean;
      excludeBetOn?: boolean;
      categories?: string[];
      difficultyPreference?: 'easy' | 'medium' | 'hard' | 'expert' | 'adaptive';
    } = {},
  ): Promise<
    Array<{
      id: number;
      title: string;
      category: string | null;
      difficulty: 'easy' | 'medium' | 'hard' | 'expert';
      recommendationScore: number;
      reasons: string[];
      confidence: number;
      predictedEngagement: number;
      timeUntilExpiry: number;
    }>
  > {
    try {
      const { limit = 10, excludeViewed = true, excludeBetOn = true } = options;

      // Get user's activity history
      const userActivityLog = await this.repo.getUserActivityLog(
        userId,
        ['prediction_viewed', 'bet_placed', 'prediction_created'],
        100,
      );

      // Get all active predictions
      const allPredictions = await this.repo.listAllPredictions();
      const activePredictions = allPredictions.filter(
        (p) => !p.resolved && p.expiresAt > new Date(),
      );

      // Extract user preferences from activity history
      const userProfile = this.buildUserProfile(userActivityLog);

      // Get user's viewed predictions if excluding viewed
      const viewedPredictionIds = excludeViewed
        ? new Set(
            userActivityLog
              .filter((log) => log.activityType === 'prediction_viewed')
              .map((log) => log.metadata?.predictionId)
              .filter((id) => typeof id === 'number'),
          )
        : new Set();

      // Get user's bet predictions if excluding bet on
      const betPredictionIds = excludeBetOn
        ? new Set(
            activePredictions
              .filter(
                (p) =>
                  p.bets?.some((bet) => bet.user.id === userId) ||
                  p.parlayLegs?.some((leg) => leg.user.id === userId),
              )
              .map((p) => p.id),
          )
        : new Set();

      // Filter predictions based on exclusions
      let candidatePredictions = activePredictions.filter((prediction) => {
        if (excludeViewed && viewedPredictionIds.has(prediction.id)) return false;
        if (excludeBetOn && betPredictionIds.has(prediction.id)) return false;
        if (options.categories) {
          const categoryName = prediction.category?.name;
          if (!categoryName || !options.categories.includes(categoryName)) return false;
        }
        return true;
      });

      // Calculate recommendation scores
      const recommendations = candidatePredictions.map((prediction) => {
        const difficulty = this.getDifficultyFromOptions(prediction.options);
        const score = this.calculateRecommendationScore(
          prediction,
          userProfile,
          options.difficultyPreference,
        );

        return {
          id: prediction.id,
          title: prediction.title,
          category: prediction.category?.name || null,
          difficulty,
          ...score,
        };
      });

      // Sort by score and return top results
      return recommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
    } catch (error) {
      console.error(
        `[prediction] Error getting personalized recommendations for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private buildUserProfile(
    activityLog: Array<{
      activityType: string;
      metadata: any;
      occurredAt: Date;
    }>,
  ) {
    const profile = {
      categoryPreferences: new Map<string, number>(),
      difficultyPreferences: new Map<string, number>(),
      activityPattern: {
        totalViews: 0,
        totalBets: 0,
        avgTimeToView: 0,
        avgTimeToBet: 0,
        recentActivityScore: 0,
      },
      temporalPreferences: {
        hourlyActivity: new Array(24).fill(0),
        weeklyActivity: new Array(7).fill(0),
      },
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const activity of activityLog) {
      const category = activity.metadata?.category;
      const activityAge = (now.getTime() - activity.occurredAt.getTime()) / (24 * 60 * 60 * 1000);
      const recencyWeight = Math.max(0.1, 1 - activityAge / 30); // Decay over 30 days

      if (category) {
        const currentScore = profile.categoryPreferences.get(category) || 0;
        const scoreIncrease =
          activity.activityType === 'bet_placed'
            ? 3
            : activity.activityType === 'prediction_viewed'
              ? 1
              : activity.activityType === 'prediction_created'
                ? 2
                : 0;
        profile.categoryPreferences.set(category, currentScore + scoreIncrease * recencyWeight);
      }

      // Track activity patterns
      if (activity.activityType === 'prediction_viewed') {
        profile.activityPattern.totalViews++;
      } else if (activity.activityType === 'bet_placed') {
        profile.activityPattern.totalBets++;
      }

      // Recent activity boost
      if (activity.occurredAt >= weekAgo) {
        profile.activityPattern.recentActivityScore += 1;
      }

      // Temporal patterns
      const hour = activity.occurredAt.getHours();
      const dayOfWeek = activity.occurredAt.getDay();
      profile.temporalPreferences.hourlyActivity[hour]++;
      profile.temporalPreferences.weeklyActivity[dayOfWeek]++;
    }

    return profile;
  }

  private calculateRecommendationScore(
    prediction: any,
    userProfile: any,
    difficultyPreference?: string,
  ) {
    let score = 0;
    const reasons: string[] = [];
    let confidence = 0;

    // Category preference scoring (0-40 points)
    const categoryScore =
      userProfile.categoryPreferences.get(prediction.category?.name || null) || 0;
    if (categoryScore > 0) {
      score += Math.min(40, categoryScore * 10);
      confidence += 20;
      if (categoryScore >= 3) {
        reasons.push(`You often engage with ${prediction.category?.name || null} predictions`);
      } else {
        reasons.push(`You've shown interest in ${prediction.category?.name || null}`);
      }
    }

    // Difficulty preference scoring (0-20 points)
    const difficulty = this.getDifficultyFromOptions(prediction.options);
    if (difficultyPreference && difficultyPreference !== 'adaptive') {
      if (difficulty === difficultyPreference) {
        score += 20;
        confidence += 15;
        reasons.push(`Matches your ${difficultyPreference} difficulty preference`);
      }
    } else {
      // Adaptive difficulty - recommend slightly higher difficulty to encourage growth
      const difficultyScores = { easy: 5, medium: 15, hard: 20, expert: 10 };
      score += difficultyScores[difficulty] || 10;
    }

    // Activity level scoring (0-25 points)
    const betCount = (prediction.bets?.length || 0) + (prediction.parlayLegs?.length || 0);
    const viewCount = prediction.viewCount || 0;

    if (betCount >= 10) {
      score += 25;
      reasons.push('Popular prediction with high betting activity');
      confidence += 15;
    } else if (betCount >= 5) {
      score += 15;
      reasons.push('Active prediction with moderate betting');
      confidence += 10;
    } else if (betCount >= 1) {
      score += 5;
      reasons.push('Emerging prediction with early interest');
      confidence += 5;
    }

    // View momentum scoring (0-15 points)
    if (viewCount >= 50) {
      score += 15;
      reasons.push('High visibility prediction');
      confidence += 10;
    } else if (viewCount >= 20) {
      score += 10;
      confidence += 5;
    }

    // Freshness factor (0-15 points)
    const daysSinceCreated = (Date.now() - prediction.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceCreated <= 1) {
      score += 15;
      reasons.push('Brand new prediction');
      confidence += 10;
    } else if (daysSinceCreated <= 3) {
      score += 10;
      reasons.push('Recent prediction');
      confidence += 5;
    } else if (daysSinceCreated <= 7) {
      score += 5;
    }

    // Time until expiry factor (0-10 points)
    const daysUntilExpiry = (prediction.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysUntilExpiry >= 7) {
      score += 10; // Plenty of time to research and bet
    } else if (daysUntilExpiry >= 3) {
      score += 7;
    } else if (daysUntilExpiry >= 1) {
      score += 3;
      reasons.push('Ending soon');
    }

    // Controversy bonus (0-10 points)
    const controversyLevel = this.calculateControvesyScore(prediction);
    if (controversyLevel >= 60) {
      score += 10;
      reasons.push('Controversial topic with split opinions');
      confidence += 5;
    } else if (controversyLevel >= 40) {
      score += 5;
    }

    // Calculate predicted engagement
    const baseEngagement = Math.min(100, (betCount + viewCount) / 10);
    const profileBoost = Math.min(20, userProfile.activityPattern.recentActivityScore);
    const predictedEngagement = Math.round(baseEngagement + profileBoost);

    // Ensure minimum reasons
    if (reasons.length === 0) {
      reasons.push('Matches your general interests');
    }

    return {
      recommendationScore: Math.round(score),
      reasons: reasons.slice(0, 3), // Top 3 reasons
      confidence: Math.min(100, confidence),
      predictedEngagement,
      timeUntilExpiry: Math.round(daysUntilExpiry * 24), // Hours until expiry
    };
  }

  private calculateControvesyScore(prediction: any): number {
    if (!prediction.options || prediction.options.length <= 1) return 0;

    const optionBetCounts = prediction.options.map(
      (option: any) =>
        (prediction.bets?.filter((bet: any) => bet.optionId === option.id).length || 0) +
        (prediction.parlayLegs?.filter((leg: any) => leg.optionId === option.id).length || 0),
    );

    if (optionBetCounts.every((count: number) => count === 0)) return 0;

    const total = optionBetCounts.reduce((sum: number, count: number) => sum + count, 0);
    const distribution = optionBetCounts.map((count: number) => count / total);
    const mean = 1 / prediction.options.length;
    const variance =
      distribution.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) /
      distribution.length;

    return Math.max(0, 100 - Math.sqrt(variance) * 1000);
  }

  async getSimilarPredictions(
    predictionId: number,
    limit: number = 5,
  ): Promise<
    Array<{
      id: number;
      title: string;
      category: string | null;
      similarityScore: number;
      similarityReasons: string[];
    }>
  > {
    try {
      const targetPrediction = await this.repo.findPredictionById(predictionId);
      if (!targetPrediction) {
        throw new Error(`Prediction ${predictionId} not found`);
      }

      const allPredictions = await this.repo.listAllPredictions();
      const similarPredictions = allPredictions
        .filter((p) => p.id !== predictionId && !p.resolved)
        .map((prediction) => {
          const similarity = this.calculateSimilarity(targetPrediction, prediction);
          return {
            id: prediction.id,
            title: prediction.title,
            category: prediction.category?.name || null,
            ...similarity,
          };
        })
        .filter((p) => p.similarityScore >= 20) // Minimum similarity threshold
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      return similarPredictions;
    } catch (error) {
      console.error(`[prediction] Error getting similar predictions for ${predictionId}:`, error);
      throw error;
    }
  }

  private calculateSimilarity(target: any, candidate: any) {
    let score = 0;
    const reasons: string[] = [];

    // Category match (high weight)
    if ((target.category?.name || null) === (candidate.category?.name || null)) {
      score += 40;
      reasons.push(`Same category: ${target.category?.name || null}`);
    }

    // Difficulty similarity
    const targetDifficulty = this.getDifficultyFromOptions(target.options);
    const candidateDifficulty = this.getDifficultyFromOptions(candidate.options);
    if (targetDifficulty === candidateDifficulty) {
      score += 20;
      reasons.push(`Similar difficulty: ${targetDifficulty}`);
    }

    // Activity level similarity
    const targetActivity = this.getActivityLevelFromCounts(
      target.bets?.length || 0,
      target.parlayLegs?.length || 0,
    );
    const candidateActivity = this.getActivityLevelFromCounts(
      candidate.bets?.length || 0,
      candidate.parlayLegs?.length || 0,
    );
    if (targetActivity === candidateActivity) {
      score += 15;
      reasons.push(`Similar activity level: ${targetActivity}`);
    }

    // Title/description similarity (basic keyword matching)
    const targetKeywords = this.extractKeywords(target.title + ' ' + (target.description || ''));
    const candidateKeywords = this.extractKeywords(
      candidate.title + ' ' + (candidate.description || ''),
    );
    const keywordOverlap = targetKeywords.filter((kw) => candidateKeywords.includes(kw)).length;

    if (keywordOverlap >= 2) {
      score += Math.min(25, keywordOverlap * 5);
      reasons.push('Similar topic keywords');
    }

    return {
      similarityScore: Math.round(score),
      similarityReasons: reasons.slice(0, 3),
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and get unique terms
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'will',
      'be',
      'is',
      'are',
      'was',
      'were',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'can',
      'could',
      'should',
      'would',
      'may',
      'might',
      'must',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !commonWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  // ===============================================
  // Prediction Comment Methods (using Content model)
  // ===============================================

  /**
   * Create a comment on a prediction
   */
  async createPredictionComment(predictionId: number, userId: number, content: string) {
    // Validate content
    if (!content.trim()) {
      throw new Error('Comment content cannot be empty');
    }
    if (content.length > 2000) {
      throw new Error('Comment content cannot exceed 2000 characters');
    }

    // Create comment using Content model with predictionId
    const comment = await this.contentRepository.createContent({
      authorId: userId,
      type: 'COMMENT',
      body: content,
      predictionId,
    });

    // Serialize BigInt fields and dates before returning
    const serializedComment = serializeBigInt(comment);

    // Fetch and enrich user data
    const user = await this.userService.getPublicSocketUser(userId);
    if (user) {
      return {
        ...serializedComment,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        user,
      };
    }

    return {
      ...serializedComment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  /**
   * Get comments for a prediction with pagination
   */
  async getPredictionComments(predictionId: number, limit: number, cursor?: string) {
    // Get comments for prediction using Content repository
    const result = await this.contentRepository.getPredictionComments(predictionId, {
      limit,
      cursor: cursor ? parseInt(cursor) : undefined,
    });

    // Serialize and enrich user data with signed avatar URLs
    const enrichedComments = await Promise.all(
      result.comments.map(async (comment: any) => {
        const serializedComment = serializeBigInt(comment);
        if (comment.author) {
          const enrichedUser = await this.userService.enrichUserWithAvatar(comment.author);
          return {
            ...serializedComment,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
            user: enrichedUser,
          };
        }
        return {
          ...serializedComment,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
        };
      }),
    );

    return {
      comments: enrichedComments,
      nextCursor: result.nextCursor?.toString(),
    };
  }

  /**
   * Update a comment (ownership validated)
   */
  async updatePredictionComment(commentId: number, userId: number, content: string) {
    // Validate content
    if (!content.trim()) {
      throw new Error('Comment content cannot be empty');
    }
    if (content.length > 2000) {
      throw new Error('Comment content cannot exceed 2000 characters');
    }

    // Update via ContentRepository (it handles ownership validation)
    const updatedComment = await this.contentRepository.updateContent(commentId, userId, content);

    return updatedComment;
  }

  /**
   * Delete a comment (soft delete, ownership validated)
   */
  async deletePredictionComment(commentId: number, userId: number) {
    // Delete via ContentRepository (it handles ownership validation and soft delete)
    await this.contentRepository.deleteContent(commentId, userId);
  }

  /**
   * Get comment count for a prediction
   */
  async getPredictionCommentCount(predictionId: number): Promise<number> {
    return this.contentRepository.getPredictionCommentCount(predictionId);
  }
}

export const predictionService = new PredictionService();
