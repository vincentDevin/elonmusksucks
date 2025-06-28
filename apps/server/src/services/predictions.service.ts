// apps/server/src/services/prediction.service.ts
// Service layer for prediction-related operations, using a repository for data access

import type { IPredictionRepository } from '../repositories/IPredictionRepository';
import { PredictionRepository } from '../repositories/PredictionRepository';
import type { DbPrediction, DbBet, DbLeaderboardEntry, DbUser } from '@ems/types';

export class PredictionService {
  constructor(private repo: IPredictionRepository = new PredictionRepository()) {}

  /**
   * List all predictions with their bets and betting users
   */
  async listAllPredictions(): Promise<
    Array<DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> }>
  > {
    return this.repo.listAllPredictions();
  }

  /**
   * Create a new prediction event
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
   * Fetch a single prediction by ID
   */
  getPrediction(id: number): Promise<DbPrediction | null> {
    return this.repo.findPredictionById(id);
  }

  /**
   * Place a bet for a user on a given prediction
   */
  async placeBet(
    userId: number,
    predictionId: number,
    amount: number,
    optionId: number,
  ): Promise<DbBet> {
    const prediction = await this.repo.findPredictionById(predictionId);
    if (!prediction) throw new Error('PREDICTION_NOT_FOUND');
    if (prediction.expiresAt <= new Date()) throw new Error('PREDICTION_CLOSED');

    const user = await this.repo.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

    await this.repo.decrementUserMuskBucks(userId, amount);
    return this.repo.createBet(userId, predictionId, amount, optionId);
  }

  /**
   * Resolve a prediction and settle all bets
   */
  async resolvePrediction(predictionId: number, winningOptionId: number): Promise<DbPrediction> {
    const updatedPrediction = await this.repo.markPredictionResolved(predictionId, new Date());

    const bets = await this.repo.findBetsByPrediction(predictionId);
    for (const bet of bets) {
      const won = bet.optionId === winningOptionId;
      const payout = won ? bet.amount * 2 : 0;

      await this.repo.updateBet(bet.id, { won, payout });
      if (won) {
        await this.repo.incrementUserMuskBucks(bet.userId, payout);
      }
    }

    return updatedPrediction;
  }

  /**
   * Retrieve the top users by MuskBucks balance
   */
  getLeaderboard(limit = 10): Promise<DbLeaderboardEntry[]> {
    return this.repo.getLeaderboard(limit);
  }
}

// Singleton instance for use in controllers
export const predictionService = new PredictionService();
