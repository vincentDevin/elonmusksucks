// apps/server/src/workers/leaderboard-snapshot.worker.ts
import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';
import { eventBus } from '../lib/EventBus';
import redisClient from '../lib/redis';
import type { Job } from 'bullmq';

const prisma = new PrismaClient();
const leaderboardRepo = new LeaderboardRepository();

interface SnapshotJobData {
  date: string; // YYYY-MM-DD format
  leaderboardType: 'daily' | 'weekly' | 'monthly' | 'allTime';
}

/**
 * Daily Snapshot Worker for Leaderboard History
 *
 * Captures daily snapshots of leaderboard positions to enable achievements like:
 * - "On the Board" - Reach top 100 leaderboard
 * - "Podium Finisher" - Reach top 3 any leaderboard
 * - "Monthly Champion" - #1 on monthly leaderboard
 * - "Comeback Kid" - Rise 50+ spots in a week
 */
const snapshotWorker = new Worker(
  'leaderboard-snapshot',
  async (job: Job<SnapshotJobData>) => {
    const { date, leaderboardType } = job.data;
    console.log(`[leaderboard-snapshot] Capturing ${leaderboardType} snapshot for ${date}`);

    const startTime = Date.now();

    try {
      // Get current leaderboard data based on type
      let leaderboardData;
      switch (leaderboardType) {
        case 'daily':
          leaderboardData = await leaderboardRepo.getTopDaily(1000); // Capture top 1000
          break;
        case 'allTime':
          leaderboardData = await leaderboardRepo.getTopAllTime(1000);
          break;
        default:
          throw new Error(`Unsupported leaderboard type: ${leaderboardType}`);
      }

      const snapshotDate = new Date(date);
      const snapshots = [];

      // Process each user in the leaderboard
      for (let position = 0; position < leaderboardData.length; position++) {
        const entry = leaderboardData[position];

        snapshots.push({
          userId: entry.userId,
          leaderboardType,
          position: position + 1, // 1-indexed position
          score: BigInt(entry.profitAll || entry.profitPeriod || 0),
          snapshotDate,
          metadata: {
            winRate: entry.winRate,
            totalBets: entry.totalBets,
            balance: entry.balance?.toString(),
            roi: entry.roi,
            currentStreak: entry.currentStreak,
            longestStreak: entry.longestStreak,
            category: leaderboardType,
          },
        });
      }

      // Batch insert snapshots (use createMany for efficiency)
      if (snapshots.length > 0) {
        await prisma.leaderboardHistory.createMany({
          data: snapshots,
          skipDuplicates: true, // Avoid errors on re-runs
        });

        console.log(
          `[leaderboard-snapshot] Saved ${snapshots.length} ${leaderboardType} snapshots for ${date}`,
        );
      }

      // After capturing snapshots, check for achievements
      await checkAchievements(snapshots, leaderboardType, snapshotDate);

      const duration = Date.now() - startTime;
      console.log(`[leaderboard-snapshot] ${leaderboardType} snapshot completed in ${duration}ms`);
    } catch (error) {
      console.error(`[leaderboard-snapshot] Failed to capture ${leaderboardType} snapshot:`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 2, // Allow parallel processing of different leaderboard types
  },
);

/**
 * Check and trigger leaderboard-related achievements
 */
async function checkAchievements(snapshots: any[], leaderboardType: string, snapshotDate: Date) {
  console.log(`[leaderboard-snapshot] Checking achievements for ${snapshots.length} users`);

  for (const snapshot of snapshots) {
    const { userId, position } = snapshot;

    // Publish achievement events based on position
    try {
      // Top 100 achievement
      if (position <= 100) {
        await eventBus.publish('leaderboard:position:reached', {
          key: 'leaderboard:position:reached',
          userId,
          occurredAt: snapshotDate.toISOString(),
          idempotencyKey: `leaderboard:top100:${userId}:${leaderboardType}:${snapshotDate.toISOString().split('T')[0]}`,
          payload: {
            position,
            leaderboardType,
            milestone: 'top_100',
            snapshotDate: snapshotDate.toISOString(),
          },
        });
      }

      // Top 10 achievement
      if (position <= 10) {
        await eventBus.publish('leaderboard:position:reached', {
          key: 'leaderboard:position:reached',
          userId,
          occurredAt: snapshotDate.toISOString(),
          idempotencyKey: `leaderboard:top10:${userId}:${leaderboardType}:${snapshotDate.toISOString().split('T')[0]}`,
          payload: {
            position,
            leaderboardType,
            milestone: 'top_10',
            snapshotDate: snapshotDate.toISOString(),
          },
        });
      }

      // Podium (top 3) achievement
      if (position <= 3) {
        await eventBus.publish('leaderboard:position:reached', {
          key: 'leaderboard:position:reached',
          userId,
          occurredAt: snapshotDate.toISOString(),
          idempotencyKey: `leaderboard:podium:${userId}:${leaderboardType}:${snapshotDate.toISOString().split('T')[0]}`,
          payload: {
            position,
            leaderboardType,
            milestone: 'podium',
            snapshotDate: snapshotDate.toISOString(),
          },
        });
      }

      // Champion (#1) achievement
      if (position === 1) {
        await eventBus.publish('leaderboard:position:reached', {
          key: 'leaderboard:position:reached',
          userId,
          occurredAt: snapshotDate.toISOString(),
          idempotencyKey: `leaderboard:champion:${userId}:${leaderboardType}:${snapshotDate.toISOString().split('T')[0]}`,
          payload: {
            position,
            leaderboardType,
            milestone: 'champion',
            snapshotDate: snapshotDate.toISOString(),
          },
        });
      }

      // Check for comeback achievements (position improvements)
      if (leaderboardType === 'allTime') {
        await checkComebackAchievements(userId, position, snapshotDate);
      }
    } catch (achievementError) {
      console.error(
        `[leaderboard-snapshot] Error publishing achievement for user ${userId}:`,
        achievementError,
      );
      // Continue processing other users even if one fails
    }
  }
}

/**
 * Check for comeback achievements (rank improvements)
 */
async function checkComebackAchievements(
  userId: number,
  currentPosition: number,
  snapshotDate: Date,
) {
  try {
    // Get user's position from 7 days ago
    const weekAgo = new Date(snapshotDate);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const previousSnapshot = await prisma.leaderboardHistory.findFirst({
      where: {
        userId,
        leaderboardType: 'allTime',
        snapshotDate: {
          gte: weekAgo,
          lt: snapshotDate,
        },
      },
      orderBy: {
        snapshotDate: 'desc',
      },
    });

    if (previousSnapshot) {
      const positionChange = previousSnapshot.position - currentPosition; // Positive = improvement

      // Major comeback: 50+ position improvement
      if (positionChange >= 50) {
        await eventBus.publish('leaderboard:comeback:major', {
          key: 'leaderboard:comeback:major',
          userId,
          occurredAt: snapshotDate.toISOString(),
          idempotencyKey: `comeback:major:${userId}:${snapshotDate.toISOString().split('T')[0]}`,
          payload: {
            currentPosition,
            previousPosition: previousSnapshot.position,
            positionImprovement: positionChange,
            daysElapsed: Math.ceil(
              (snapshotDate.getTime() - previousSnapshot.snapshotDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            leaderboardType: 'allTime',
          },
        });
      }

      // Moderate comeback: 20+ position improvement
      else if (positionChange >= 20) {
        await eventBus.publish('leaderboard:comeback:moderate', {
          key: 'leaderboard:comeback:moderate',
          userId,
          occurredAt: snapshotDate.toISOString(),
          idempotencyKey: `comeback:moderate:${userId}:${snapshotDate.toISOString().split('T')[0]}`,
          payload: {
            currentPosition,
            previousPosition: previousSnapshot.position,
            positionImprovement: positionChange,
            daysElapsed: Math.ceil(
              (snapshotDate.getTime() - previousSnapshot.snapshotDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            leaderboardType: 'allTime',
          },
        });
      }
    }
  } catch (error) {
    console.error(`[leaderboard-snapshot] Error checking comeback for user ${userId}:`, error);
  }
}

// Create queue for scheduling snapshot jobs
export const snapshotQueue = new Queue('leaderboard-snapshot', { connection: redisClient });

/**
 * Schedule daily snapshots
 */
export async function scheduleDailySnapshots() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Schedule daily and all-time snapshots
    await Promise.all([
      snapshotQueue.add(
        'daily-snapshot',
        { date: today, leaderboardType: 'daily' as const },
        {
          jobId: `daily-${today}`, // Prevent duplicates
          delay: 1000 * 60 * 5, // 5 minute delay to ensure data is settled
        },
      ),
      snapshotQueue.add(
        'alltime-snapshot',
        { date: today, leaderboardType: 'allTime' as const },
        {
          jobId: `alltime-${today}`, // Prevent duplicates
          delay: 1000 * 60 * 10, // 10 minute delay
        },
      ),
    ]);

    console.log(`[leaderboard-snapshot] Scheduled snapshots for ${today}`);
  } catch (error) {
    console.error('[leaderboard-snapshot] Error scheduling daily snapshots:', error);
  }
}

// Event handlers
snapshotWorker.on('completed', (job) => {
  console.log(`[leaderboard-snapshot] Job ${job.id} (${job.data.leaderboardType}) completed`);
});

snapshotWorker.on('failed', (job, err) => {
  console.error(`[leaderboard-snapshot] Job ${job?.id} failed:`, err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[leaderboard-snapshot] Shutting down snapshot worker...');
  await snapshotWorker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Auto-schedule daily snapshots on startup (for development)
if (process.env.NODE_ENV !== 'test') {
  scheduleDailySnapshots();
}

export { snapshotWorker };
