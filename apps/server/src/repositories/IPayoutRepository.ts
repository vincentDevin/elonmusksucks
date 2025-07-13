import type { PublicPrediction } from '@ems/types';

export interface IPayoutRepository {
  /**
   * If present, flips the “resolving” flag quickly.
   * When omitted (e.g. in tests), service will fall back to
   * calling resolvePrediction() directly.
   */
  markResolving?(predictionId: number, winningOptionId: number): Promise<void>;

  /**
   * Fully resolves the prediction in the DB and returns the updated entity.
   */
  resolvePrediction(predictionId: number, winningOptionId: number): Promise<PublicPrediction>;
}
