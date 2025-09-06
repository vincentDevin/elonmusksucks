// apps/server/src/repositories/IBettingRepository.ts
import type { DbBet, DbParlay } from '@ems/types';

/**
 * Betting data access contract: service validates inputs,
 * repository methods perform raw DB writes inside transactions.
 */
export type OptionWithPrediction = {
  id: number;
  label: string;
  odds: number;
  predictionId: number;
  prediction: {
    id: number;
    title: string;
    category: string;
    resolved: boolean;
    expiresAt: Date;
  };
};

export interface IBettingRepository {
  findOptionWithPrediction(optionId: number): Promise<OptionWithPrediction | null>;
  findUserById(
    userId: number,
  ): Promise<Pick<
    import('@prisma/client').User,
    'id' | 'muskBucks' | 'name' | 'avatarUrl' | 'profilePictureKey'
  > | null>;

  /**
   * Persist a single bet and all related updates in one transaction.
   */
  // Rollback: Remove idempotencyKey parameter
  placeBet(
    userId: number,
    predictionId: number,
    optionId: number,
    amount: number,
    oddsAtPlacement: number,
    potentialPayout: bigint,
    idempotencyKey?: string,
  ): Promise<DbBet>;

  /**
   * Persist a parlay and all related updates in one transaction.
   */
  placeParlay(
    userId: number,
    legs: Array<{ predictionId: number; optionId: number; oddsAtPlacement: number }>,
    amount: number,
    potentialPayout: bigint,
    idempotencyKey?: string,
  ): Promise<DbParlay>;

  /**
   * Recalculate odds for a resolved prediction.
   */
  recalculateOdds(predictionId: number): Promise<void>;

  /**
   * Get current prediction options for odds comparison.
   */
  getPredictionOptions(
    predictionId: number,
  ): Promise<Array<{ id: number; label: string; odds: number }>>;

  /**
   * Get recent bets for streak calculation.
   */
  getRecentBetsForStreak(
    userId: number,
    limit: number,
  ): Promise<Array<{ status: string; createdAt: Date }>>;

  /**
   * Find user bets with flexible filtering options.
   */
  findUserBets(
    userId: number,
    options?: {
      limit?: number;
      createdAfter?: Date;
      createdBefore?: Date;
      status?: string;
      predictionId?: number;
    },
  ): Promise<
    Array<
      DbBet & {
        prediction: {
          id: number;
          title: string;
          category: string;
          resolved: boolean;
        };
        option: {
          id: number;
          label: string;
        };
      }
    >
  >;
}
