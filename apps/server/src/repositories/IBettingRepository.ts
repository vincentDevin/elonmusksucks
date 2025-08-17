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
  placeBet(
    userId: number,
    predictionId: number,
    optionId: number,
    amount: number,
    oddsAtPlacement: number,
    potentialPayout: bigint,
  ): Promise<DbBet>;

  /**
   * Persist a parlay and all related updates in one transaction.
   */
  placeParlay(
    userId: number,
    legs: Array<{ predictionId: number; optionId: number; oddsAtPlacement: number }>,
    amount: number,
    potentialPayout: bigint,
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
}
