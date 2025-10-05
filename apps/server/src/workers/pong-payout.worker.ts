// apps/server/src/workers/pong-payout.worker.ts
// -----------------------------------------------------------------------------
// BullMQ worker that processes Pong match payouts with idempotency protection
// Handles both PVP (pot splitting) and PVE_AI (difficulty-based multipliers) payout logic
// AI Payouts: EASY: 1.25x, MEDIUM: 1.5x, HARD: 2x, IMPOSSIBLE: 4x
// Uses PongRepository for all database operations
// -----------------------------------------------------------------------------

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PongPayoutJobData, PongPayoutResult, QUEUE_NAMES, REDIS_CHANNELS } from '@ems/types';
import redisClient from '../lib/redis';
import { PrismaClient } from '@prisma/client';
import { serializeBigInt, toBigInt } from '../utils/bigintSerializer';
import { PongRepository } from '../repositories/PongRepository';
import { eventBus } from '../lib/EventBus';

const prisma = new PrismaClient();
const pongRepo = new PongRepository();

// Configurable concurrency
const PONG_PAYOUT_CONCURRENCY = parseInt(process.env.WORKER_PONG_PAYOUT_CONCURRENCY || '1');

const pongPayoutWorker = new Worker<PongPayoutJobData>(
  QUEUE_NAMES.PONG_PAYOUTS,
  async (job: Job<PongPayoutJobData>) => {
    const { matchId, winnerId, loserId, payout, houseRake, vsAI } = job.data;
    const idempotencyKey = `payout_v1:${matchId}`;

    console.log(
      `[pong-payout-worker] Processing payout for match ${matchId}, winner ${winnerId}, vsAI ${vsAI}`,
    );

    try {
      // 1. Check for existing payout (idempotency protection)
      const existingPayout = await pongRepo.findExistingPayout(matchId, idempotencyKey);
      if (existingPayout) {
        console.log(`[pong-payout-worker] Payout already processed for match ${matchId}`);
        return serializeBigInt(existingPayout);
      }

      // 2. Process payout based on mode
      let result: PongPayoutResult;
      const payoutBigInt = toBigInt(payout);
      const houseRakeBigInt = toBigInt(houseRake);

      if (vsAI) {
        result = await pongRepo.processPVEPayout(
          matchId,
          winnerId,
          payoutBigInt,
          houseRakeBigInt,
          idempotencyKey,
        );
      } else {
        result = await pongRepo.processPVPPayout(
          matchId,
          winnerId,
          loserId,
          payoutBigInt,
          houseRakeBigInt,
          idempotencyKey,
        );
      }

      console.log(
        `[pong-payout-worker] Successfully processed payout for match ${matchId}: ${result.netPayout} to user ${winnerId}`,
      );

      // 3. Emit balance update events for affected users
      // Winner balance update
      if (winnerId > 0) {
        await eventBus.publish(REDIS_CHANNELS.BALANCE_UPDATE, {
          userId: winnerId,
          newBalance: Number(result.winnerNewBalance),
          previousBalance: Number(result.winnerPreviousBalance),
          change: Number(result.netPayout),
          reason: vsAI ? `Pong AI match payout (${matchId})` : `Pong PVP match payout (${matchId})`,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[pong-payout-worker] Emitted balance update for winner ${winnerId}: ${result.winnerPreviousBalance} -> ${result.winnerNewBalance}`,
        );
      }

      // Loser balance update (PVP only - balance already decreased during wager)
      if (!vsAI && loserId && result.loserPreviousBalance && result.loserNewBalance) {
        await eventBus.publish(REDIS_CHANNELS.BALANCE_UPDATE, {
          userId: loserId,
          newBalance: Number(result.loserNewBalance),
          previousBalance: Number(result.loserPreviousBalance),
          change: 0, // No change at payout time (wager already deducted)
          reason: `Pong PVP match loss confirmation (${matchId})`,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `[pong-payout-worker] Emitted balance update for loser ${loserId} (no change, already deducted)`,
        );
      }

      return serializeBigInt(result);
    } catch (error) {
      console.error(`[pong-payout-worker] Failed to process payout for match ${matchId}:`, error);
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: redisClient,
    concurrency: PONG_PAYOUT_CONCURRENCY,
  },
);

// Log configured concurrency on startup
console.log(`[pong-payout-worker] Configured concurrency: ${PONG_PAYOUT_CONCURRENCY}`);

pongPayoutWorker.on('completed', (job) => {
  console.log(`[pong-payout-worker] Job ${job.id} completed`);
});

pongPayoutWorker.on('failed', (job, err) => {
  console.error(`[pong-payout-worker] Job ${job?.id} failed: ${err.message}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[pong-payout-worker] Shutting down pong payout worker...');
  await pongPayoutWorker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
