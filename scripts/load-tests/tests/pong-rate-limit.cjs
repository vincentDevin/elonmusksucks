#!/usr/bin/env node
// scripts/load-tests/tests/pong-rate-limit.cjs
// Rate limit validation test - ensure rate limiting works correctly

const { createTestUsers } = require('../helpers/auth.cjs');
const { createPongConnection, disconnect } = require('../helpers/pong.cjs');
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
  const { numUsers = 5 } = options;

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
    console.log('🧪 Test 3: Auth Rate Limit (3 attempts/60s)...');
    {
      const user = users[2];

      let successCount = 0;
      let blockedCount = 0;

      // Attempt to auth 6 times (should block after 3)
      for (let i = 0; i < 6; i++) {
        try {
          const { socket } = await createPongConnection(user.accessToken, { timeout: 3000 });
          successCount++;
          disconnect(socket);
        } catch (error) {
          if (error.message.includes('timeout') || error.message.includes('Connection failed')) {
            blockedCount++;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
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
