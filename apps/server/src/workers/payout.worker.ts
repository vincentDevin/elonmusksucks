// apps/server/src/workers/payout.worker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import redisClient from '../lib/redis';
import { PayoutRepository } from '../repositories/PayoutRepository';
import type { Job } from 'bullmq';
import type { PublicPrediction } from '@ems/types';

const payoutRepo = new PayoutRepository();

const payoutWorker = new Worker(
  'payouts',
  async (job: Job<{ predictionId: number; winningOptionId: number }>) => {
    const { predictionId, winningOptionId } = job.data;
    console.log(`[worker] Starting payout for prediction ${predictionId}`);

    // run the full payout & get back the updated prediction
    const updated: PublicPrediction = await payoutRepo.resolvePrediction(
      predictionId,
      winningOptionId,
    );

    console.log(`[worker] Resolved prediction ${predictionId}, publishing event`);

    // publish to the channel your socket.ts is subscribed to
    await redisClient.publish('prediction:resolved', JSON.stringify(updated));
  },
  { connection: redisClient, concurrency: 5 },
);

payoutWorker.on('completed', (job) => console.log(`[worker] Job ${job.id} completed`));
payoutWorker.on('failed', (job, err) =>
  console.error(`[worker] Job ${job?.id} failed: ${err.message}`),
);

const shutdown = async () => {
  console.log('[worker] Shutting down payout worker...');
  await payoutWorker.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
