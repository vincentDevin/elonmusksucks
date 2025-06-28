// apps/server/src/services/prediction.service.ts
import type {
  IPredictionRepository,
} from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import type {
  DbPrediction,
  DbBet,
  DbUser,
  DbLeaderboardEntry,
} from '@ems/types';

export class PredictionService {
  constructor(
    private repo: IPredictionRepository = new PredictionRepository(),
  ) {}

  /**
   * List all predictions (including nested bets with their users).
   */
  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      }
    >
  > {
    return this.repo.listAllPredictions();
  }

  /**
   * Create a new prediction event.
   */
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }): Promise<DbPrediction> {
    return this.repo.createPrediction(data);
  }

  /**
   * Fetch a single prediction by ID (with its bets).
   */
  async getPrediction(
    id: number,
  ): Promise<
    | (DbPrediction & {
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
