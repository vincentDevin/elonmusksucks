// apps/server/src/repositories/IPayoutRepository.ts
import type { PublicPrediction } from '@ems/types'; // ← adjust path

export interface IPayoutRepository {
  /**
   * Atomically resolve a prediction, payout bets & parlays,
   * then return the fully resolved PublicPrediction.
   */
  resolvePrediction(predictionId: number, winningOptionId: number): Promise<PublicPrediction>;
}
