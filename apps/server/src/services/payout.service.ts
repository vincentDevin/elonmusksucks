// apps/server/src/services/payout.service.ts
import type { IPayoutRepository } from '../repositories/IPayoutRepository';
import type { PublicPrediction } from '@ems/types';
import { PayoutRepository } from '../repositories/PayoutRepository';
import { Queue } from 'bullmq';
import redis from '../lib/redis';

export class PayoutService {
  private payoutQueue = new Queue('payouts', { connection: redis });

  constructor(private repo: IPayoutRepository = new PayoutRepository()) {}

  /**
   * If the repository implements `markResolving`, enqueue a background job;
   * otherwise (e.g. in tests) run `resolvePrediction` immediately and return its result.
   */
  async resolvePrediction(
    predictionId: number,
    winningOptionId: number,
  ): Promise<PublicPrediction | void> {
    // No markResolving? We're in test/dev mode—just run and return.
    if (typeof this.repo.markResolving !== 'function') {
      return this.repo.resolvePrediction(predictionId, winningOptionId);
    }

    // 1) quick flip in DB
    await this.repo.markResolving(predictionId, winningOptionId);

    // 2) enqueue the heavy work for the worker
    await this.payoutQueue.add('processPayout', {
      predictionId,
      winningOptionId,
    });
  }
}

// singleton for controllers
export const payoutService = new PayoutService();
