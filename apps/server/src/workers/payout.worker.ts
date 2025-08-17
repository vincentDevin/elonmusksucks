// apps/server/src/workers/payout.worker.ts
// -----------------------------------------------------------------------------
// BullMQ worker that processes `processPayout` jobs, resolves the prediction,
// and publishes a `prediction:resolve` event to Redis so all socket servers
// broadcast `predictionResolved`.
// -----------------------------------------------------------------------------

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import redisClient from '../lib/redis';
import { PayoutRepository } from '../repositories/PayoutRepository';
import type { PublicPrediction } from '@ems/types';
import { leaderboardService } from '../services/leaderboard.service';
import type { LeaderboardTrigger } from '../services/leaderboard.service';

const payoutRepo = new PayoutRepository();

const payoutWorker = new Worker<{ predictionId: number; winningOptionId: number }>(
  'payouts',
  async (job: Job<{ predictionId: number; winningOptionId: number }>) => {
    const { predictionId, winningOptionId } = job.data;
    console.log(`[worker] Processing payout for prediction ${predictionId}`);

    try {
      // 1. Run the full payout logic and get back the updated prediction
      const updated: PublicPrediction = await payoutRepo.resolvePrediction(
        predictionId,
        winningOptionId,
      );

      // 2. Publish present‑tense event so all socket gateways rebroadcast
      await redisClient.publish('prediction:resolve', JSON.stringify(updated));

      // 3. Trigger leaderboard update for the resolved prediction
      const trigger: LeaderboardTrigger = {
        event: 'prediction:completed',
        priority: 'immediate',
        affectedMetrics: ['profit', 'winRate', 'streak'],
        metadata: {
          predictionId,
          winningOptionId,
          category: updated.category,
        },
      };

      await leaderboardService.triggerUpdate(trigger);

      // 4. Publish payout completion event for additional processing
      const payoutData = {
        predictionId,
        winningOptionId,
        affectedUsers: [], // This would be populated by the payout logic
        timestamp: new Date().toISOString(),
      };

      await redisClient.publish('payout:completed', JSON.stringify(payoutData));

      console.log(
        `[worker] Prediction ${predictionId} resolved, events published, leaderboard triggered`,
      );
    } catch (error) {
      console.error(`[worker] Failed to process payout for prediction ${predictionId}:`, error);
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: redisClient,
    concurrency: 5,
  },
);

payoutWorker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

payoutWorker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed: ${err.message}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[worker] Shutting down payout worker...');
  await payoutWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
