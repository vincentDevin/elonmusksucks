// apps/server/src/repositories/IBettingRepository.ts
// Interface for betting-related data access operations

import type {
  DbPredictionOption,
  DbPrediction,
  DbUser,
  DbBet,
  DbTransaction,
  DbParlay,
  TransactionType,
} from '@ems/types';

/**
 * Defines the contract for betting and parlay operations.
 */
export interface IBettingRepository {
  /**
   * Fetch a prediction option along with its parent prediction.
   */
  findOptionWithPrediction(optionId: number): Promise<
    | (DbPredictionOption & {
        prediction: Pick<DbPrediction, 'id' | 'resolved' | 'expiresAt'>;
      })
    | null
  >;

  /**
   * Fetch minimal user info for betting (id and current balance).
   */
  findUserById(userId: number): Promise<Pick<DbUser, 'id' | 'muskBucks'> | null>;

  /**
   * Update a user's MuskBucks balance.
   * @param userId - The user to update
   * @param muskBucks - New balance amount
   */
  updateUserMuskBucks(userId: number, muskBucks: number): Promise<void>;

  /**
   * Record a transaction for a user.
   */
  createTransaction(data: {
    userId: number;
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    relatedBetId?: number | null;
    relatedParlayId?: number | null;
  }): Promise<DbTransaction>;

  /**
   * Create a single bet record.
   */
  createBet(data: {
    userId: number;
    predictionId: number;
    optionId: number;
    amount: number;
  }): Promise<DbBet>;

  /**
   * Group bets by option for a given prediction and sum amounts.
   */
  groupBetsByPrediction(
    predictionId: number,
  ): Promise<Array<{ optionId: number; totalAmount: number }>>;

  /**
   * Update odds on a prediction option.
   */
  updatePredictionOptionOdds(optionId: number, odds: number): Promise<void>;

  /**
   * Create a parlay bet with nested legs.
   */
  createParlay(data: {
    userId: number;
    amount: number;
    combinedOdds: number;
    potentialPayout: number;
    legs: Array<{ optionId: number; oddsAtPlacement: number }>;
  }): Promise<DbParlay>;
}
