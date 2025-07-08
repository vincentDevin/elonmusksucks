// apps/server/src/services/payout.service.ts
import type { IPayoutRepository } from '../repositories/IPayoutRepository';
import type { PublicPrediction } from '@ems/types';
import { PayoutRepository } from '../repositories/PayoutRepository';

export class PayoutService {
  constructor(private repo: IPayoutRepository = new PayoutRepository()) {}

  /**
   * Delegates to repository to atomically resolve
   * and payout all bets & parlays, then returns
   * the updated PublicPrediction.
   */
  async resolvePrediction(
    predictionId: number,
    winningOptionId: number,
  ): Promise<PublicPrediction> {
    return this.repo.resolvePrediction(predictionId, winningOptionId);
  }
}

// singleton for controllers
export const payoutService = new PayoutService();
