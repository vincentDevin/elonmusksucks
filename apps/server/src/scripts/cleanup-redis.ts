#!/usr/bin/env tsx
// apps/server/src/scripts/cleanup-redis.ts
// -----------------------------------------------------------------------------
// One-time script to clean up stale BullMQ jobs and optimize Redis memory usage
// Run with: npx tsx src/scripts/cleanup-redis.ts
// -----------------------------------------------------------------------------

import 'dotenv/config';
import { cleanupAllQueues, cleanupStaleJobs } from '../lib/bullmqConfig';
import redisClient from '../lib/redis';

async function main() {
  console.log('🧹 Starting Redis cleanup...');

  try {
    // 1. Clean up stale BullMQ jobs
    console.log('\n📋 Cleaning up BullMQ jobs...');
    const jobsCleanedTotal = await cleanupAllQueues();
    console.log(`✅ Cleaned up ${jobsCleanedTotal} total jobs across all queues`);

    // 2. Check remaining job count
    console.log('\n📊 Checking remaining Redis keys...');
    const allKeys = await redisClient.keys('*');
    const bullmqKeys = allKeys.filter(
      (key) =>
        key.includes('bull:') ||
        key.startsWith('PAYOUTS:') ||
        key.startsWith('LEADERBOARD') ||
        key.startsWith('PONG_PAYOUTS:') ||
        key.startsWith('FEED:'),
    );

    console.log(`📈 Total Redis keys: ${allKeys.length}`);
    console.log(`📋 BullMQ job keys: ${bullmqKeys.length}`);

    // 3. Show key breakdown by pattern
    const keyPatterns: Record<string, number> = {};
    allKeys.forEach((key) => {
      const pattern = key.split(':')[0];
      keyPatterns[pattern] = (keyPatterns[pattern] || 0) + 1;
    });

    console.log('\n🔍 Key patterns breakdown:');
    Object.entries(keyPatterns)
      .sort(([, a], [, b]) => b - a)
      .forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count} keys`);
      });

    // 4. Memory usage after cleanup
    const info = await redisClient.info('memory');
    const memoryUsed = info.match(/used_memory_human:([^\r\n]+)/)?.[1];
    console.log(`\n💾 Redis memory usage after cleanup: ${memoryUsed}`);

    console.log('\n✅ Redis cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Redis cleanup failed:', error);
    process.exit(1);
  } finally {
    await redisClient.quit();
    process.exit(0);
  }
}

main().catch(console.error);
