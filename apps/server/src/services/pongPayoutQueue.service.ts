import { Queue } from 'bullmq';
import { PongPayoutData, QUEUE_NAMES } from '@ems/types';
import { createQueueOptions } from '../lib/bullmqConfig';

export class PongPayoutQueueService {
  private static instance: PongPayoutQueueService;
  private queue: Queue<PongPayoutData>;

  constructor() {
    this.queue = new Queue<PongPayoutData>(
      QUEUE_NAMES.PONG_PAYOUTS,
      createQueueOptions('PONG_PAYOUTS'),
    );
  }

  static getInstance(): PongPayoutQueueService {
    if (!PongPayoutQueueService.instance) {
      PongPayoutQueueService.instance = new PongPayoutQueueService();
    }
    return PongPayoutQueueService.instance;
  }

  /**
   * Enqueue a Pong payout job with idempotency
   */
  async enqueuePayout(data: PongPayoutData): Promise<void> {
    const jobId = `payout_v1:${data.matchId}`;

    await this.queue.add('pong-payout', data, {
      jobId, // Use matchId as job ID for idempotency
    });

    console.log(`[PongPayoutQueue] Enqueued payout job for match ${data.matchId}`);
  }

  /**
   * Check if a payout job is already queued or completed
   */
  async isPayoutQueued(matchId: string): Promise<boolean> {
    const jobId = `payout_v1:${matchId}`;
    const job = await this.queue.getJob(jobId);
    return job !== null;
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}

export const pongPayoutQueueService = PongPayoutQueueService.getInstance();
