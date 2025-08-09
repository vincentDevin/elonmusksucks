#!/usr/bin/env node
/**
 * Socket.IO client test to verify events are being received properly
 * Run with: node test-socket-client.js
 */

const io = require('socket.io-client');

// Connect to the Socket.IO server
// Note: May need valid JWT token for authenticated endpoints
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  // Remove auth for now - will test public events
});

console.log('🔌 Connecting to Socket.IO server...\n');

// Track received events
const receivedEvents = [];

// Listen for all the events we expect to receive
const EXPECTED_EVENTS = [
  'predictionCreated',
  'predictionResolved',
  'betPlaced',
  'parlayPlaced',
  'stats:update',
  'stats:refresh',
  'ranking:change',
  'achievement:unlocked',
  'user:stats_update',
  'bet:status_change',
  'parlay:status_change',
  'admin:metrics:update',
  'leaderboardAllTime',
  'leaderboardDaily',
  'unified:activity:update',
  'moderationUserBan',
  'userActivity',
];

// Set up listeners for all expected events
EXPECTED_EVENTS.forEach((event) => {
  socket.on(event, (data) => {
    console.log(`✅ Received event: ${event}`);
    console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
    receivedEvents.push(event);
  });
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log('   Socket ID:', socket.id);
  console.log('\n📡 Listening for events...\n');

  // After connecting, wait a bit then trigger test events
  setTimeout(async () => {
    console.log('\n🚀 Triggering test events via Redis...\n');

    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    // Publish a few test events
    await redis.publish(
      'prediction:create',
      JSON.stringify({
        id: 999,
        title: 'Socket Test Prediction',
        category: 'test',
      }),
    );

    await redis.publish(
      'bet:place',
      JSON.stringify({
        userId: 1,
        betId: 999,
        amount: 100,
      }),
    );

    await redis.publish(
      'unified:activity:global',
      JSON.stringify({
        id: 'test-999',
        type: 'bet_placed',
        userId: 1,
        userName: 'Test User',
        title: 'Test Activity from Socket Client',
        description: 'Testing socket event reception',
      }),
    );

    // Wait for events to be processed
    setTimeout(() => {
      console.log('\n📊 Test Results:');
      console.log('================');
      console.log(`Total events received: ${receivedEvents.length}`);
      console.log(`Events: ${receivedEvents.join(', ')}`);

      const missing = EXPECTED_EVENTS.filter((e) => !receivedEvents.includes(e));
      if (missing.length > 0) {
        console.log(`\n⚠️  Missing events: ${missing.join(', ')}`);
        console.log(
          'Note: Some events may require specific conditions (e.g., admin room for admin events)',
        );
      }

      console.log('\n✨ Test complete!');
      redis.disconnect();
      socket.disconnect();
      process.exit(0);
    }, 2000);
  }, 1000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('\nMake sure the server is running on port 5000');
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('\n👋 Disconnected from Socket.IO server');
});

// Handle any errors
socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});
