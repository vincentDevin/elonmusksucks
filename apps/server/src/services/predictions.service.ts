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
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { PredictionType } from '@prisma/client';
import redisClient from '../lib/redis';
import { UserService } from '../services/user.service';
import { unifiedActivityService } from './unifiedActivity.service';
import { EventBus } from '../lib/EventBus';

// Using the global ParlayLegWithUser type from @ems/types

export class PredictionService {
  private userService = new UserService();
  private eventBus = new EventBus();

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

    // Publish legacy format
    await redisClient.publish('prediction:create', JSON.stringify(dto));

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
  /** Fetch ONE prediction (public safe shape) */
  async getPrediction(id: number) {
    const pred = await this.repo.findPredictionById(id);
    return pred ? this.enrichAvatars(pred) : null;
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
