#!/usr/bin/env node
/**
 * Test script to verify all Redis events are properly subscribed and handled
 * Run with: node test-redis-events.js
 */

const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const TEST_EVENTS = [
  // Core events
  { channel: 'prediction:create', payload: { id: 1, title: 'Test Prediction', category: 'test' } },
  { channel: 'prediction:resolve', payload: { id: 1, winningOptionId: 1 } },
  { channel: 'bet:place', payload: { userId: 1, betId: 1, amount: 100 } },
  { channel: 'parlay:place', payload: { userId: 1, parlayId: 1, amount: 200 } },

  // Stats and ranking events
  {
    channel: 'stats:update',
    payload: {
      userId: 1,
      changes: { betsWon: 1, totalWagered: 100 },
      timestamp: new Date().toISOString(),
    },
  },
  { channel: 'stats:refresh', payload: { userId: 1 } },
  {
    channel: 'ranking:change',
    payload: {
      userId: 1,
      oldRank: 10,
      newRank: 5,
      change: -5,
      category: 'allTime',
      percentile: 95,
    },
  },
  {
    channel: 'achievement:unlocked',
    payload: {
      userId: 1,
      achievement: {
        id: 'first-bet',
        title: 'First Bet',
        description: 'Place your first bet',
        category: 'betting',
      },
      progress: { previous: 0, current: 1, target: 1 },
      timestamp: new Date().toISOString(),
    },
  },
  {
    channel: 'user:stats_update',
    payload: {
      userId: 1,
      reason: 'test',
      timestamp: new Date().toISOString(),
    },
  },

  // Bet and parlay status events
  { channel: 'bet:status_change', payload: { userId: 1, betId: 1, status: 'WON' } },
  { channel: 'parlay:status_change', payload: { userId: 1, parlayId: 1, status: 'LOST' } },

  // Admin events
  { channel: 'admin:metrics:update', payload: { metrics: { activeUsers: 100 }, type: 'test' } },

  // Leaderboard events
  { channel: 'leaderboard:allTime', payload: { users: [] } },
  { channel: 'leaderboard:daily', payload: { users: [] } },

  // Unified activity
  {
    channel: 'unified:activity:global',
    payload: {
      id: 'test-1',
      type: 'bet_placed',
      userId: 1,
      userName: 'Test User',
      title: 'Test Activity',
      description: 'Test Description',
    },
  },

  // Moderation events
  { channel: 'moderation:userBan', payload: { userId: 1, reason: 'test' } },
  { channel: 'user:activity', payload: { userId: 1, type: 'test' } },
];

async function testEvents() {
  console.log('🚀 Redis Event Testing Script');
  console.log('==============================\n');

  console.log('📡 Publishing test events to Redis...\n');

  for (const event of TEST_EVENTS) {
    try {
      await redis.publish(event.channel, JSON.stringify(event.payload));
      console.log(`✅ Published to: ${event.channel}`);
    } catch (error) {
      console.error(`❌ Failed to publish to ${event.channel}:`, error.message);
    }

    // Small delay between events
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('\n==============================');
  console.log('✨ Test events published!');
  console.log('\nTo verify they are being handled:');
  console.log('1. Make sure the server is running');
  console.log('2. Check server logs for handler outputs');
  console.log('3. Connect a client and check for Socket.IO events');

  // Test subscription
  console.log('\n📊 Testing subscription to all channels...\n');

  const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const channels = TEST_EVENTS.map((e) => e.channel);

  await subscriber.subscribe(...channels);
  console.log(`✅ Successfully subscribed to ${channels.length} channels`);

  subscriber.on('message', (channel, message) => {
    console.log(`📨 Received on ${channel}:`, message.substring(0, 50) + '...');
  });

  // Keep alive for a few seconds to receive any echoed messages
  setTimeout(() => {
    subscriber.disconnect();
    redis.disconnect();
    console.log('\n👋 Test complete! Disconnecting...');
    process.exit(0);
  }, 3000);
}

testEvents().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
