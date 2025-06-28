// apps/server/src/repositories/IPredictionRepository.ts
// Interface for prediction-related data access operations

import type { DbPrediction, DbBet, DbUser, DbLeaderboardEntry } from '@ems/types';

/**
 * Defines the contract for prediction and bet data operations.
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
   * @param data - Basic prediction data
   */
  createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }): Promise<DbPrediction>;

  /**
   * Find a prediction by its ID.
   * @param id - Prediction ID
   */
  findPredictionById(id: number): Promise<DbPrediction | null>;

  /**
   * Find a user by their ID.
   * @param id - User ID
   */
  findUserById(id: number): Promise<Pick<DbUser, 'id' | 'name' | 'muskBucks'> | null>;

  /**
   * Decrement a user's muskBucks balance (used when placing a bet).
   */
  decrementUserMuskBucks(userId: number, amount: number): Promise<void>;

  /**
   * Create a bet for a prediction.
   */
  createBet(userId: number, predictionId: number, amount: number, optionId: number): Promise<DbBet>;

  /**
   * Find all bets associated with a prediction.
   */
  findBetsByPrediction(predictionId: number): Promise<DbBet[]>;

  /**
   * Update a bet (e.g., when resolving outcome).
   */
  updateBet(betId: number, data: Partial<Pick<DbBet, 'won' | 'payout'>>): Promise<void>;

  /**
   * Increment a user's muskBucks balance (used when a bet wins).
   */
  incrementUserMuskBucks(userId: number, amount: number): Promise<void>;

  /**
   * Mark a prediction as resolved at a specific time.
   */
  markPredictionResolved(predictionId: number, resolvedAt: Date): Promise<DbPrediction>;

  /**
   * Retrieve the leaderboard of top users by muskBucks.
   */
  getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]>;
}
