// apps/server/src/services/prediction.service.ts
import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  DbUser,
  DbLeaderboardEntry,
} from '@ems/types';
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';

// Shape for a parlay leg, including the timestamp it was created
export type ParlayLegWithUser = {
  parlayId: number;
  user: Pick<DbUser, 'id' | 'name'>;
  stake: number;
  optionId: number;
  createdAt: Date; // keep as Date
};

export class PredictionService {
  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  /**
   * List all predictions, each with:
   *  - options[]
   *  - bets[] (single bets with user info)
   *  - parlayLegs[] (flattened from each option’s embedded parlayLegs)
   */
  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
        parlayLegs: ParlayLegWithUser[];
      }
    >
  > {
    const preds = await this.repo.listAllPredictions();
    return preds.map((pred) => {
      const bets = pred.bets;
      const parlayLegs: ParlayLegWithUser[] = [];

      // flatten all the parlayLegs attached to each option
      for (const opt of pred.options as any) {
        if (Array.isArray(opt.parlayLegs)) {
          for (const leg of opt.parlayLegs) {
            parlayLegs.push({
              parlayId: leg.parlay.id,
              user: leg.parlay.user,
              stake: leg.parlay.amount,
              optionId: opt.id,
              createdAt: leg.createdAt,
            });
          }
        }
      }

      return { ...pred, bets, parlayLegs };
    });
  }

  /**
   * Create a new prediction with a dynamic set of options.
   */
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      parlayLegs: ParlayLegWithUser[];
    }
  > {
    const pred = await this.repo.createPrediction(data);
    return { ...pred, bets: [], parlayLegs: [] };
  }

  /**
   * Fetch a single prediction by ID, including options, bets, and parlayLegs.
   */
  async getPrediction(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
        parlayLegs: ParlayLegWithUser[];
      })
    | null
  > {
    const pred = await this.repo.findPredictionById(id);
    if (!pred) return null;

    const parlayLegs: ParlayLegWithUser[] = [];
    for (const opt of pred.options as any) {
      if (Array.isArray(opt.parlayLegs)) {
        for (const leg of opt.parlayLegs) {
          parlayLegs.push({
            parlayId: leg.parlay.id,
            user: leg.parlay.user,
            stake: leg.parlay.amount,
            optionId: opt.id,
            createdAt: leg.createdAt,
          });
        }
      }
    }

    return { ...pred, bets: pred.bets, parlayLegs };
  }

  /**
   * Retrieve the top users by MuskBucks balance.
   */
  async getLeaderboard(limit = 10): Promise<DbLeaderboardEntry[]> {
    return this.repo.getLeaderboard(limit);
  }
}

export const predictionService = new PredictionService();
