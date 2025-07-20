// apps/server/src/services/payout.service.ts
// -----------------------------------------------------------------------------
// Resolves predictions and ensures a `prediction:resolve` Redis event is
// published when the resolution happens synchronously (tests / dev mode).
// -----------------------------------------------------------------------------

import type { IPayoutRepository } from '../repositories/IPayoutRepository';
import type { PublicPrediction } from '@ems/types';
import { PayoutRepository } from '../repositories/PayoutRepository';
import { Queue } from 'bullmq';
import redis from '../lib/redis';

export class PayoutService {
  private payoutQueue = new Queue('payouts', { connection: redis });

  constructor(private repo: IPayoutRepository = new PayoutRepository()) {}

  /**
   * Trigger prediction resolution. If `markResolving` exists we off‑load heavy
   * work to a worker; otherwise we resolve immediately (used in tests / local).
   * In the immediate path we also publish a `prediction:resolve` event so
   * connected clients update right away.
   */
  async resolvePrediction(
    predictionId: number,
    winningOptionId: number,
  ): Promise<PublicPrediction | void> {
    // ── TEST / SYNC PATH ────────────────────────────────────────────────────
    if (typeof this.repo.markResolving !== 'function') {
      const resolved = await this.repo.resolvePrediction(predictionId, winningOptionId);

      // Publish real‑time update so front‑end sees result instantly
      await redis.publish('prediction:resolve', JSON.stringify(resolved));

      return resolved;
    }

    // ── ASYNC PATH ──────────────────────────────────────────────────────────
    // 1) flip DB flag so UI can show "resolving" state
    await this.repo.markResolving(predictionId, winningOptionId);

    // 2) enqueue heavy payout calc for background worker
    await this.payoutQueue.add('processPayout', {
      predictionId,
      winningOptionId,
    });
  }
}

export const payoutService = new PayoutService();
