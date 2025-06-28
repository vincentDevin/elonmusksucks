// apps/server/src/repositories/IPredictionRepository.ts
import type { DbPrediction, DbBet, DbUser, DbLeaderboardEntry  } from '@ems/types';

/**
 * Defines the contract for prediction data operations.
 */
export interface IPredictionRepository {
  /**
   * List all predictions, including their bets and betting users.
   */
  listAllPredictions(): Promise<
    Array<DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> }>
  >;
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
   * Find a single prediction by ID, including its bets and users.
   */
  findPredictionById(id: number): Promise<
    (DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> })
    | null
  >;
  /**
   * Retrieve the top users by MuskBucks balance (leaderboard).
   */
  getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]>;
}
