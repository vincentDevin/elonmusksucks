// apps/server/src/repositories/IBettingRepository.ts
import type { DbBet, DbParlay } from '@ems/types';

/**
 * Betting data access contract: service validates inputs,
 * repository methods perform raw DB writes inside transactions.
 */
export interface IBettingRepository {
  findOptionWithPrediction(optionId: number): Promise<
    | (ReturnType<() => import('@prisma/client').PredictionOption> & {
        prediction: { id: number; resolved: boolean; expiresAt: Date };
      })
    | null
  >;
  findUserById(
    userId: number,
  ): Promise<Pick<import('@prisma/client').User, 'id' | 'muskBucks' | 'name' | 'avatarUrl'> | null>;

  /**
   * Persist a single bet and all related updates in one transaction.
   */
  placeBet(
    userId: number,
    predictionId: number,
    optionId: number,
    amount: number,
    oddsAtPlacement: number,
    potentialPayout: number,
  ): Promise<DbBet>;

  /**
   * Persist a parlay and all related updates in one transaction.
   */
  placeParlay(
    userId: number,
    legs: Array<{ predictionId: number; optionId: number; oddsAtPlacement: number }>,
    amount: number,
    potentialPayout: number,
  ): Promise<DbParlay>;

  /**
   * Recalculate odds for a resolved prediction.
   */
  recalculateOdds(predictionId: number): Promise<void>;
}
