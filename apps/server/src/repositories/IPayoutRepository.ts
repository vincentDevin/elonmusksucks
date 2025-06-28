// apps/server/src/repositories/IPayoutRepository.ts

export interface IPayoutRepository {
  /**
   * Atomically mark a prediction resolved and settle all matching bets and parlays.
   * @param predictionId  the prediction to resolve
   * @param winningOptionId  the ID of the winning PredictionOption
   */
  resolvePrediction(predictionId: number, winningOptionId: number): Promise<void>;
}
export const IPayoutRepositoryToken = Symbol('IPayoutRepository');
