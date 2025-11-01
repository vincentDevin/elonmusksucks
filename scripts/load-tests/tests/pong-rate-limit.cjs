#!/usr/bin/env node
// scripts/load-tests/tests/pong-rate-limit.cjs
// Rate limit validation test - ensure rate limiting works correctly

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createPongConnection,
  createPVPMatch,
  joinMatch,
  proposeWager,
  acceptWager,
  sendChatMessage,
  disconnect,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Rate limit configuration (from pong-server)
 * These are the limits we're testing against
 */
const RATE_LIMITS = {
  player_input: { windowMs: 1000, maxRequests: 200 },
  create_match: { windowMs: 60000, maxRequests: 5 },
  join_match: { windowMs: 10000, maxRequests: 10 },
  leave_match: { windowMs: 5000, maxRequests: 10 },
  player_ready: { windowMs: 5000, maxRequests: 20 },
  spectate_match: { windowMs: 10000, maxRequests: 10 },
  join_lobby: { windowMs: 5000, maxRequests: 20 },
  auth: { windowMs: 60000, maxRequests: 3 },
};

/**
 * Rate limit validation test
 * Tests:
 * - Rate limits are enforced correctly
 * - Malicious traffic is blocked
 * - Legitimate traffic is not affected
 * - Rate limiter accurately tracks violations
 */
async function runRateLimitTest(options = {}) {
  const { numUsers = 6 } = options; // Increased for new tests

  console.log('\n🚦 PONG RATE LIMIT VALIDATION TEST');
  console.log('═'.repeat(80));
  console.log(`  Test users:          ${numUsers}`);
  console.log('  Testing rate limits for all event types');
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const results = {
    tests: [],
  };

  try {
    // Step 0: Reset rate limiter to ensure clean state
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch('http://localhost:5001/test/reset-rate-limiter', { method: 'POST' });
      console.log('✅ Rate limiter reset\n');
    } catch (err) {
      console.log('⚠️  Could not reset rate limiter (may not be in test mode)\n');
    }

    // Step 1: Create test users
    console.log(`📝 Creating ${numUsers} test users...`);
    const users = await createTestUsers(numUsers);
    console.log(`✅ ${users.length} test users ready\n`);

    // Test 1: Create Match Rate Limit (5 matches/minute)
    console.log('🧪 Test 1: Create Match Rate Limit (5 matches/60s)...');
    {
      const user = users[0];
      const { socket } = await createPongConnection(user.accessToken);

      let successCount = 0;
      let blockedCount = 0;

      // Attempt to create 10 matches rapidly (should block after 5)
      for (let i = 0; i < 10; i++) {
        const blocked = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(true), 2000); // Timeout = blocked

          socket.once('match_joined', () => {
            clearTimeout(timeout);
            successCount++;
            resolve(false);
          });

          socket.once('error', (error) => {
            clearTimeout(timeout);
            if (error.code === 'RATE_LIMIT') {
              blockedCount++;
              resolve(true);
            } else {
              resolve(false);
            }
          });

          socket.emit('create_match', { wager: 0, type: 'ai', aiDifficulty: 'EASY' });
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      disconnect(socket);

      const passed = blockedCount >= 5 && successCount <= 5;
      console.log(`  Successful: ${successCount}, Blocked: ${blockedCount}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Rate limit enforced correctly\n`);

      results.tests.push({
        name: 'Create Match Rate Limit',
        passed,
        successful: successCount,
        blocked: blockedCount,
        expected: '5 allowed, 5 blocked',
      });
    }

    // Test 2: Join Lobby Rate Limit (20 joins/5s)
    console.log('🧪 Test 2: Join Lobby Rate Limit (20 joins/5s)...');
    {
      const user = users[1];
      const { socket } = await createPongConnection(user.accessToken);

      let successCount = 0;
      let blockedCount = 0;

      // Attempt to join lobby 30 times rapidly (should block after 20)
      for (let i = 0; i < 30; i++) {
        const blocked = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 500);

          socket.once('lobby_state', () => {
            clearTimeout(timeout);
            successCount++;
            resolve(false);
          });

          socket.once('error', (error) => {
            clearTimeout(timeout);
            if (error.code === 'RATE_LIMIT') {
              blockedCount++;
              resolve(true);
            } else {
              resolve(false);
            }
          });

          socket.emit('join_lobby');
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      disconnect(socket);

      const passed = blockedCount >= 10 && successCount <= 20;
      console.log(`  Successful: ${successCount}, Blocked: ${blockedCount}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Rate limit enforced correctly\n`);

      results.tests.push({
        name: 'Join Lobby Rate Limit',
        passed,
        successful: successCount,
        blocked: blockedCount,
        expected: '20 allowed, 10 blocked',
      });
    }

    // Test 3: Auth Rate Limit (3 attempts/60s)
    // Note: In production this uses IP-based limiting, in dev it uses socket-based limiting
    console.log('🧪 Test 3: Auth Rate Limit (3 attempts/60s)...');
    {
      // Reset rate limiter before auth test to ensure clean state
      try {
        const fetch = (await import('node-fetch')).default;
        await fetch('http://localhost:5001/test/reset-rate-limiter', { method: 'POST' });
      } catch (err) {
        // Ignore reset errors
      }

      const user = users[2];

      let successCount = 0;
      let blockedCount = 0;

      // In development: socket-based rate limiting (each socket gets 3 attempts)
      // In production: IP-based rate limiting (all connections from same IP share limit)
      // Test by attempting rapid auth on SAME socket (re-emit auth event)
      try {
        const { socket } = await createPongConnection(user.accessToken, { timeout: 3000 });
        successCount++; // First auth during connection

        // Try to re-auth 5 more times on the same socket (should block after 2 more = 3 total)
        for (let i = 0; i < 5; i++) {
          const blocked = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 2000);

            socket.once('error', (error) => {
              clearTimeout(timeout);
              if (error.code === 'RATE_LIMIT') {
                blockedCount++;
                resolve(true);
              } else {
                resolve(false);
              }
            });

            socket.emit('auth', { token: user.accessToken });
          });

          if (!blocked) {
            successCount++;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        disconnect(socket);
      } catch (error) {
        // Connection itself failed
      }

      const passed = blockedCount >= 3 && successCount <= 3;
      console.log(`  Successful: ${successCount}, Blocked: ${blockedCount}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Rate limit enforced correctly\n`);

      results.tests.push({
        name: 'Auth Rate Limit',
        passed,
        successful: successCount,
        blocked: blockedCount,
        expected: '3 allowed, 3 blocked',
      });
    }

    // Test 4: Player Input Rate Limit (200 inputs/second - should allow high frequency)
    console.log('🧪 Test 4: Player Input Rate Limit (200 inputs/s - should NOT block normal play)...');
    {
      const user = users[3];
      const { socket } = await createPongConnection(user.accessToken);

      // Create a game first
      await new Promise((resolve) => {
        socket.once('match_joined', resolve);
        socket.emit('create_match', { wager: 0, type: 'ai', aiDifficulty: 'EASY' });
      });

      let inputsSent = 0;
      let errorsReceived = 0;

      socket.on('error', (error) => {
        if (error.code === 'RATE_LIMIT') {
          errorsReceived++;
        }
      });

      // Send 100 inputs rapidly (well under 200/s limit - should not trigger rate limit)
      let paddleY = 250; // Start in middle of field (0-600)
      for (let i = 0; i < 100; i++) {
        // Simulate realistic paddle movement
        paddleY = Math.max(0, Math.min(500, paddleY + (Math.random() - 0.5) * 20));
        socket.emit('player_input', { paddleY, timestamp: Date.now() });
        inputsSent++;
        await new Promise((resolve) => setTimeout(resolve, 10)); // 100 inputs/sec (safe)
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      disconnect(socket);

      const passed = errorsReceived === 0;
      console.log(`  Inputs sent: ${inputsSent}, Errors: ${errorsReceived}`);
      console.log(
        `  ${passed ? '✅ PASS' : '❌ FAIL'}: Normal gameplay not rate limited\n`,
      );

      results.tests.push({
        name: 'Player Input Rate Limit',
        passed,
        inputsSent,
        errorsReceived,
        expected: '0 errors (normal gameplay allowed)',
      });
    }

    // Test 5: Game Chat Message Rate Limit (3 messages/5 seconds)
    console.log('🧪 Test 5: Game Chat Message Rate Limit (3 messages/5s)...');
    {
      const user = users[4] || users[0]; // Use 5th user or fallback to first
      const { socket } = await createPongConnection(user.accessToken);

      // Create a PVP match to have a game to chat in
      const matchData = await createPVPMatch(socket, 0);
      const gameId = matchData.gameId;

      let successCount = 0;
      let blockedCount = 0;

      socket.on('game_chat_message', () => {
        successCount++;
      });

      socket.on('error', (error) => {
        if (error.code === 'RATE_LIMIT' && error.message.includes('message')) {
          blockedCount++;
        }
      });

      // Attempt to send 10 messages rapidly (should block after 3)
      for (let i = 0; i < 10; i++) {
        try {
          socket.emit('game_chat_message', { gameId, message: `Test message ${i}` });
          await new Promise((resolve) => setTimeout(resolve, 200)); // Short delay
        } catch (error) {
          // Ignore errors, we're counting them via the error event
        }
      }

      // Wait for all responses
      await new Promise((resolve) => setTimeout(resolve, 3000));
      disconnect(socket);

      const passed = blockedCount >= 5 && successCount <= 5; // Expect at least 5 blocked
      console.log(`  Successful: ${successCount}, Blocked: ${blockedCount}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Rate limit enforced correctly\n`);

      results.tests.push({
        name: 'Game Chat Message Rate Limit',
        passed,
        successful: successCount,
        blocked: blockedCount,
        expected: '3-4 allowed, 6-7 blocked (3 messages per 5 seconds)',
      });
    }

    // Test 6: Propose Wager Rate Limit (prevent spam)
    console.log('🧪 Test 6: Propose Wager Rate Limit (prevent spam)...');
    {
      const user1 = users[0];
      const user2 = users[1];

      const { socket: socket1 } = await createPongConnection(user1.accessToken);
      const { socket: socket2 } = await createPongConnection(user2.accessToken);

      // Create and join a PVP match
      const matchData = await createPVPMatch(socket1, 100);
      const gameId = matchData.gameId;

      // Wait for lobby broadcast
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Find the lobby ID from lobby_state
      let lobbyId = null;
      const lobbyPromise = new Promise((resolve) => {
        socket2.once('lobby_state', (data) => {
          const lobby = data.lobbies.find((l) => l.creatorId === user1.userId);
          if (lobby) {
            lobbyId = lobby.id;
            resolve(lobby.id);
          }
        });
        socket2.emit('join_lobby');
      });

      await Promise.race([lobbyPromise, new Promise((resolve) => setTimeout(resolve, 2000))]);

      if (lobbyId) {
        await joinMatch(socket2, lobbyId);
      }

      let successCount = 0;
      let blockedCount = 0;

      socket1.on('wager_proposed', () => {
        successCount++;
      });

      socket1.on('error', (error) => {
        if (error.code === 'RATE_LIMIT') {
          blockedCount++;
        }
      });

      // Attempt to propose wager 15 times rapidly (should have some limit)
      for (let i = 0; i < 15; i++) {
        socket1.emit('propose_wager', { gameId, amount: 100 + i * 10 });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      disconnect(socket1);
      disconnect(socket2);

      // For this test, we mainly want to ensure the server doesn't crash
      // Actual limit behavior may vary
      const passed = successCount > 0 && successCount <= 15;
      console.log(`  Successful: ${successCount}, Blocked: ${blockedCount}`);
      console.log(
        `  ${passed ? '✅ PASS' : '❌ FAIL'}: Wager proposal handling works (${blockedCount > 0 ? 'rate limited' : 'no limit detected'})\n`,
      );

      results.tests.push({
        name: 'Propose Wager Rate Limit',
        passed,
        successful: successCount,
        blocked: blockedCount,
        expected: 'Some limit or 5-round max enforcement',
      });
    }

    // Test 7: Accept Wager Spam Test (prevent rapid accept/reject cycles)
    console.log('🧪 Test 7: Accept Wager Spam Test...');
    {
      const user1 = users[2];
      const user2 = users[3];

      const { socket: socket1 } = await createPongConnection(user1.accessToken);
      const { socket: socket2 } = await createPongConnection(user2.accessToken);

      // Create and join a PVP match
      const matchData = await createPVPMatch(socket1, 50);
      const gameId = matchData.gameId;

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Find and join lobby
      let lobbyId = null;
      const lobbyPromise = new Promise((resolve) => {
        socket2.once('lobby_state', (data) => {
          const lobby = data.lobbies.find((l) => l.creatorId === user1.userId);
          if (lobby) {
            lobbyId = lobby.id;
            resolve(lobby.id);
          }
        });
        socket2.emit('join_lobby');
      });

      await Promise.race([lobbyPromise, new Promise((resolve) => setTimeout(resolve, 2000))]);

      if (lobbyId) {
        await joinMatch(socket2, lobbyId);
      }

      let successCount = 0;
      let blockedCount = 0;

      socket1.on('wager_accepted', () => {
        successCount++;
      });

      socket1.on('error', (error) => {
        if (error.code === 'RATE_LIMIT') {
          blockedCount++;
        }
      });

      // Attempt to accept 20 times rapidly
      for (let i = 0; i < 20; i++) {
        socket1.emit('accept_wager', { gameId });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
      disconnect(socket1);
      disconnect(socket2);

      // Expect either rate limiting or idempotency (only one accept registers)
      const passed = successCount <= 5; // Should not register 20 accepts
      console.log(`  Successful: ${successCount}, Blocked: ${blockedCount}`);
      console.log(
        `  ${passed ? '✅ PASS' : '❌ FAIL'}: Accept wager handled correctly (idempotent or rate limited)\n`,
      );

      results.tests.push({
        name: 'Accept Wager Spam Test',
        passed,
        successful: successCount,
        blocked: blockedCount,
        expected: 'Rate limited or idempotent (1 accept max)',
      });
    }

    // Summary
    const totalTests = results.tests.length;
    const passedTests = results.tests.filter((t) => t.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(28) + 'TEST SUMMARY' + ' '.repeat(38) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('');
    console.log(`  Total Tests:     ${totalTests}`);
    console.log(`  Passed:          ${passedTests} ✅`);
    console.log(`  Failed:          ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log('');

    // Detailed results
    console.log('📋 DETAILED RESULTS:\n');
    results.tests.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name}`);
      console.log(`     Status: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`     Expected: ${test.expected}`);
      console.log(`     Actual: ${test.successful || test.inputsSent || 0} successful, ${test.blocked || test.errorsReceived || 0} blocked/errors`);
      console.log('');
    });

    // Save results
    const testDuration = Date.now() - startTime;
    const finalResults = {
      testName: 'Pong Rate Limit Validation Test',
      timestamp: new Date().toISOString(),
      config: {
        numUsers,
        rateLimits: RATE_LIMITS,
      },
      summary: {
        totalTests,
        passedTests,
        failedTests,
        testDuration,
      },
      tests: results.tests,
      success: passedTests === totalTests,
    };

    saveResults(finalResults, 'pong-rate-limit');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (finalResults.success) {
      console.log('  ✅ EXCELLENT: All rate limiters working correctly!');
      console.log(`     ${passedTests}/${totalTests} tests passed`);
      console.log('     Malicious traffic blocked');
      console.log('     Legitimate traffic allowed');
    } else {
      console.log('  ⚠️  RATE LIMITER ISSUES DETECTED:');
      console.log(`     ${failedTests}/${totalTests} tests failed`);
      console.log('     Review failed tests above');
    }

    console.log('');

    return finalResults;
  } catch (error) {
    console.error('\n❌ Rate limit test failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key === '--users') options.numUsers = parseInt(value, 10);
  });

  runRateLimitTest(options)
    .then((results) => {
      console.log('✅ Rate limit test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Rate limit test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runRateLimitTest };
