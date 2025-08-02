// apps/server/src/services/predictions.service.ts
// -----------------------------------------------------------------------------
// • Publishes present-tense Redis channels (prediction:create / …:resolve)
// • Sanitises DB records and injects signed avatar URLs for bets & parlay legs
// -----------------------------------------------------------------------------

import type { DbPrediction, DbPredictionOption, DbBet, PublicPrediction } from '@ems/types';
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { PredictionType } from '@prisma/client';
import redisClient from '../lib/redis';
import { UserService } from '../services/user.service';
import { normalizedActivityService } from './normalizedActivity.service';

/** Final shape the **client** expects for each parlay leg */
export type ParlayLegWithUser = {
  parlayId: number;
  stake: number;
  optionId: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
};

export class PredictionService {
  private userService = new UserService();

  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  /* ────────────────────────────────────────────────────────────────────────── */
  /** Fetch **ALL** predictions (public safe shape) */
  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: { id: number; name: string; avatarUrl: string | null } }>;
        parlayLegs: ParlayLegWithUser[];
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

    // Publish normalized activity event
    const creator = await this.userService.getPublicSocketUser(params.creatorId);
    if (creator) {
      await normalizedActivityService.createPredictionCreatedEvent(
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
      parlayLegs: Array<{
        parlayId: number;
        stake: number;
        optionId: number;
        createdAt: Date;
        user: {
          id: number;
          name: string;
          avatarUrl?: string | null;
          profilePictureKey?: string | null;
        };
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

    return { ...pred, options, bets, parlayLegs };
  }
}

export const predictionService = new PredictionService();
