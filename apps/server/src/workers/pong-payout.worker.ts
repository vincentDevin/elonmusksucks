// apps/server/src/workers/pong-payout.worker.ts
// -----------------------------------------------------------------------------
// BullMQ worker that processes Pong match payouts with idempotency protection
// Handles both PVP (pot splitting) and PVE_AI (2x player stake) payout logic
// -----------------------------------------------------------------------------

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PongPayoutData, PongPayoutResult, QUEUE_NAMES } from '@ems/types';
import redisClient from '../lib/redis';
import { PrismaClient } from '@prisma/client';
import { serializeBigInt } from '../utils/bigintSerializer';

const prisma = new PrismaClient();

// Configurable concurrency
const PONG_PAYOUT_CONCURRENCY = parseInt(process.env.WORKER_PONG_PAYOUT_CONCURRENCY || '1');

const pongPayoutWorker = new Worker<PongPayoutData>(
  QUEUE_NAMES.PONG_PAYOUTS,
  async (job: Job<PongPayoutData>) => {
    const { matchId, winnerId, mode, stakeAmount } = job.data;
    const idempotencyKey = `payout_v1:${matchId}`;

    console.log(
      `[pong-payout-worker] Processing payout for match ${matchId}, winner ${winnerId}, mode ${mode}`,
    );

    try {
      // 1. Check for existing payout (idempotency protection)
      const existingPayout = await checkExistingPayout(idempotencyKey);
      if (existingPayout) {
        console.log(`[pong-payout-worker] Payout already processed for match ${matchId}`);
        return serializeBigInt(existingPayout);
      }

      // 2. Process payout based on mode
      let result: PongPayoutResult;
      const stakeAmountBigInt = BigInt(stakeAmount); // Convert number to bigint

      if (mode === 'PVP') {
        result = await processPVPPayout(winnerId, stakeAmountBigInt, idempotencyKey);
      } else if (mode === 'PVE_AI') {
        result = await processPVEPayout(winnerId, stakeAmountBigInt, idempotencyKey);
      } else {
        throw new Error(`Invalid match mode: ${mode}`);
      }

      // 3. Idempotency protection is handled by the transaction's idempotencyKey

      console.log(
        `[pong-payout-worker] Successfully processed payout for match ${matchId}: ${result.payoutAmount} to user ${winnerId}`,
      );

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

/**
 * Check if payout has already been processed
 */
async function checkExistingPayout(idempotencyKey: string): Promise<PongPayoutResult | null> {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    return {
      success: true,
      payoutAmount: existing.amount,
      transactionId: existing.id,
    };
  }

  return null;
}

/**
 * Process PVP payout (pot splitting - winner takes full pot)
 * Note: Winner already paid their stake, so they get back their stake + opponent's stake
 */
async function processPVPPayout(
  winnerId: number,
  stakeAmount: bigint,
  idempotencyKey: string,
): Promise<PongPayoutResult> {
  // Winner gets the full pot (2x stake amount total)
  // This includes their original stake back + opponent's stake as winnings
  const payoutAmount = stakeAmount * 2n;

  return await prisma.$transaction(async (tx) => {
    // Credit winner with full pot amount
    const updatedUser = await tx.user.update({
      where: { id: winnerId },
      data: { muskBucks: { increment: payoutAmount } },
      select: { muskBucks: true },
    });

    // Create transaction record with idempotency key
    const transaction = await tx.transaction.create({
      data: {
        userId: winnerId,
        type: 'CREDIT',
        subtype: 'PONG_PAYOUT',
        amount: payoutAmount,
        balanceAfter: updatedUser.muskBucks,
        description: 'Pong match payout (PVP victory)',
        metadata: {
          matchType: 'PVP',
          stakeAmount: Number(stakeAmount),
          payoutAmount: Number(payoutAmount),
        },
        idempotencyKey,
      },
    });

    return {
      success: true,
      payoutAmount,
      transactionId: transaction.id,
    };
  });
}

/**
 * Process PVE_AI payout (house pays 2x player stake)
 */
async function processPVEPayout(
  winnerId: number,
  stakeAmount: bigint,
  idempotencyKey: string,
): Promise<PongPayoutResult> {
  // Only human players get payouts (AI wins don't trigger payouts)
  if (winnerId < 0) {
    return {
      success: true,
      payoutAmount: 0n,
      error: 'AI wins do not trigger payouts',
    };
  }

  const payoutAmount = stakeAmount * 2n; // House pays 2x stake

  return await prisma.$transaction(async (tx) => {
    // Credit human winner
    const updatedUser = await tx.user.update({
      where: { id: winnerId },
      data: { muskBucks: { increment: payoutAmount } },
      select: { muskBucks: true },
    });

    // Create transaction record with idempotency key
    const transaction = await tx.transaction.create({
      data: {
        userId: winnerId,
        type: 'CREDIT',
        subtype: 'PONG_PAYOUT',
        amount: payoutAmount,
        balanceAfter: updatedUser.muskBucks,
        description: 'Pong match payout (PVE_AI victory)',
        metadata: {
          matchType: 'PVE_AI',
          stakeAmount: Number(stakeAmount),
          payoutAmount: Number(payoutAmount),
        },
        idempotencyKey,
      },
    });

    return {
      success: true,
      payoutAmount,
      transactionId: transaction.id,
    };
  });
}

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
