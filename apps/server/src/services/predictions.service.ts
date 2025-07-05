// apps/server/src/services/predictions.service.ts
import type { DbPrediction, DbPredictionOption, DbBet, DbLeaderboardEntry } from '@ems/types';
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import { PredictionType } from '@prisma/client';

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
   * List all predictions, but sanitize:
   *  - options only include id,label,odds,predictionId,createdAt
   *  - bets only include their user’s id/name
   *  - parlayLegs only include their user’s id/name
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
    return raw.map((pred) => ({
      // copy all the base prediction fields
      ...pred,
      // sanitize options: strip any nested parlayLegs
      options: pred.options.map(({ id, label, odds, predictionId, createdAt }) => ({
        id,
        label,
        odds,
        predictionId,
        createdAt,
      })),
      // sanitize bets’ user
      bets: pred.bets.map((b) => ({
        ...b,
        user: { id: b.user.id, name: b.user.name },
      })),
      // sanitize parlayLegs’ user
      parlayLegs: pred.parlayLegs.map((leg) => ({
        parlayId: leg.parlayId,
        user: { id: leg.user.id, name: leg.user.name },
        stake: leg.stake,
        optionId: leg.optionId,
        createdAt: leg.createdAt,
      })),
    }));
  }

  /**
   * Create a new prediction (unchanged).
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
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: { id: number; name: string } }>;
      parlayLegs: ParlayLegWithUser[];
    }
  > {
    const pred = await this.repo.createPrediction(params);
    return { ...pred, bets: [], parlayLegs: [] };
  }

  /**
   * Fetch one prediction, sanitized just like listAllPredictions.
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

  /**
   * Leaderboard unchanged.
   */
  async getLeaderboard(limit = 10): Promise<DbLeaderboardEntry[]> {
    return this.repo.getLeaderboard(limit);
  }
}

export const predictionService = new PredictionService();
