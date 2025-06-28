// apps/server/src/services/prediction.service.ts
import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import type { DbPrediction, DbLeaderboardEntry } from '@ems/types';

export class PredictionService {
  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  /**
   * List all predictions (including nested bets if your repo returns them).
   */
  async listAllPredictions(): Promise<Array<DbPrediction & { betsCount?: number; bets?: any[] }>> {
    return this.repo.listAllPredictions();
  }

  /**
   * Create a new prediction event.
   */
  createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }): Promise<DbPrediction> {
    return this.repo.createPrediction(data);
  }

  /**
   * Fetch a single prediction by ID.
   */
  getPrediction(id: number): Promise<DbPrediction | null> {
    return this.repo.findPredictionById(id);
  }

  /**
   * Retrieve the top users by MuskBucks balance.
   */
  getLeaderboard(limit = 10): Promise<DbLeaderboardEntry[]> {
    return this.repo.getLeaderboard(limit);
  }
}

export const predictionService = new PredictionService();
