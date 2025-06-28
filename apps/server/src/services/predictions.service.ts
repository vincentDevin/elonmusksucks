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

export class PredictionService {
  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  /**
   * List all predictions, each with its dynamic options and bets (with user info).
   */
  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      }
    >
  > {
    return this.repo.listAllPredictions();
  }

  /**
   * Create a new prediction with an arbitrary set of options.
   */
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    options: Array<{ label: string }>;
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
    }
  > {
    // repo.createPrediction knows how to create both the prediction and its options
    return this.repo.createPrediction(data);
  }

  /**
   * Fetch one prediction by ID, including its options and bets (with user info).
   */
  async getPrediction(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      })
    | null
  > {
    return this.repo.findPredictionById(id);
  }

  /**
   * Retrieve the top users by MuskBucks balance.
   */
  async getLeaderboard(limit = 10): Promise<DbLeaderboardEntry[]> {
    return this.repo.getLeaderboard(limit);
  }
}

export const predictionService = new PredictionService();
