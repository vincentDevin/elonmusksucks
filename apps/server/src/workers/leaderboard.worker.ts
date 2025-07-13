// apps/server/src/workers/leaderboard.worker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import redisClient from '../lib/redis';
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';
import type { Job } from 'bullmq';

const repo = new LeaderboardRepository();

/**
 * Worker that refreshes leaderboard and publishes updated top entries
 */
const worker = new Worker(
  'leaderboard-refresh',
  async (_job: Job) => {
    console.log('[leaderboard] Refreshing materialized view');
    await repo.refreshMaterializedView();

    // After refresh, fetch new data
    const topAllTime = await repo.getTopAllTime(25);
    const topDaily = await repo.getTopDaily(25);

    // Publish to channels
    await redisClient.publish('leaderboard:allTime', JSON.stringify(topAllTime));
    await redisClient.publish('leaderboard:daily', JSON.stringify(topDaily));
    console.log('[leaderboard] Published updated leaderboards');
  },
  { connection: redisClient, concurrency: 1 },
);

worker.on('completed', () => console.log('[leaderboard] job completed'));
worker.on('failed', (_job, err) => console.error('[leaderboard] job failed:', err));

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
