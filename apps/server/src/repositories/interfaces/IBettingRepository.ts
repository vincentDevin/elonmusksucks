// apps/server/src/repositories/IBettingRepository.ts
import type { PrismaBet, PrismaParlay, PrismaUser } from '@ems/types';

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
    PrismaUser,
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
    wasAllIn: boolean,
    idempotencyKey?: string,
  ): Promise<PrismaBet>;

  /**
   * Persist a parlay and all related updates in one transaction.
   */
  placeParlay(
    userId: number,
    legs: Array<{ predictionId: number; optionId: number; oddsAtPlacement: number }>,
    amount: number,
    potentialPayout: bigint,
    idempotencyKey?: string,
  ): Promise<PrismaParlay>;

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
      PrismaBet & {
        prediction: {
          id: number;
          title: string;
          category: string | null;
          resolved: boolean;
        };
        option: {
          id: number;
          label: string;
        } | null;
      }
    >
  >;
}
