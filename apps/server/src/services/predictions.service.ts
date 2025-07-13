// apps/server/src/services/predictions.service.ts
import type { DbPrediction, DbPredictionOption, DbBet, PublicPrediction } from '@ems/types';
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { PredictionType } from '@prisma/client';
import redisClient from '../lib/redis';

/** Matches what the client expects for a parlay leg’s user info */
export type ParlayLegWithUser = {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: Date;
};

export class PredictionService {
  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  /**
   * List all predictions, sanitized.
   */
  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: { id: number; name: string } }>;
        parlayLegs: ParlayLegWithUser[];
      }
    >
  > {
    const raw = await this.repo.listAllPredictions();
    return raw.map((pred) => this.sanitize(pred));
  }

  /**
   * Create a new prediction, then publish real‐time event.
   */
  async createPrediction(params: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<PublicPrediction & { bets: DbBet[]; parlayLegs: ParlayLegWithUser[] }> {
    const pred = await this.repo.createPrediction(params);

    const publicPred: PublicPrediction & {
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

      // **test expectations**
      bets: [],
      parlayLegs: [],
    };

    await redisClient.publish('prediction:created', JSON.stringify(publicPred));

    return publicPred;
  }

  /**
   * Fetch one prediction, sanitized.
   */
  async getPrediction(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: { id: number; name: string } }>;
        parlayLegs: ParlayLegWithUser[];
      })
    | null
  > {
    const pred = await this.repo.findPredictionById(id);
    if (!pred) return null;
    return this.sanitize(pred);
  }

  /** Utility to sanitize DB return into public shape */
  private sanitize(
    pred: DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: { id: number; name: string } }>;
      parlayLegs: ParlayLegWithUser[];
    },
  ) {
    return {
      ...pred,
      options: pred.options.map(({ id, label, odds, predictionId, createdAt }) => ({
        id,
        label,
        odds,
        predictionId,
        createdAt,
      })),
      bets: pred.bets.map((b) => ({
        ...b,
        user: { id: b.user.id, name: b.user.name },
      })),
      parlayLegs: pred.parlayLegs.map((leg) => ({
        parlayId: leg.parlayId,
        user: { id: leg.user.id, name: leg.user.name },
        stake: leg.stake,
        optionId: leg.optionId,
        createdAt: leg.createdAt,
      })),
    };
  }
}

export const predictionService = new PredictionService();
