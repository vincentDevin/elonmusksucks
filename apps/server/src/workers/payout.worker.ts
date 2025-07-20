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

const payoutRepo = new PayoutRepository();

const payoutWorker = new Worker<{ predictionId: number; winningOptionId: number }>(
  'payouts',
  async (job: Job<{ predictionId: number; winningOptionId: number }>) => {
    const { predictionId, winningOptionId } = job.data;
    console.log(`[worker] Processing payout for prediction ${predictionId}`);

    // 1. Run the full payout logic and get back the updated prediction
    const updated: PublicPrediction = await payoutRepo.resolvePrediction(
      predictionId,
      winningOptionId,
    );

    // 2. Publish present‑tense event so all socket gateways rebroadcast
    await redisClient.publish('prediction:resolve', JSON.stringify(updated));

    console.log(`[worker] Prediction ${predictionId} resolved and event published`);
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
