// apps/server/src/repositories/IPredictionRepository.ts
import type { DbPrediction, DbLeaderboardEntry } from '@ems/types';

/**
 * Defines the contract for prediction data operations.
 */
export interface IPredictionRepository {
  /**
   * List all predictions, including nested options and counts if desired.
   */
  listAllPredictions(): Promise<DbPrediction[]>;

  /**
   * Create a new prediction event.
   */
  createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }): Promise<DbPrediction>;

  /**
   * Find a prediction by its ID.
   */
  findPredictionById(id: number): Promise<DbPrediction | null>;

  /**
   * Retrieve the top users by MuskBucks balance (leaderboard).
   */
  getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]>;
}
