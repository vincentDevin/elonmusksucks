#!/usr/bin/env node
// scripts/load-tests/run-pong-tests.cjs
// Master test runner for all pong load tests

const axios = require('axios');
const { runLobbyStressTest } = require('./tests/pong-lobby-stress.cjs');
const { runMatchCreationLoadTest } = require('./tests/pong-match-creation.cjs');
const { runConcurrentGamesTest } = require('./tests/pong-concurrent-games.cjs');
const { runSpectatorLoadTest } = require('./tests/pong-spectator-load.cjs');
const { runConnectionChaosTest } = require('./tests/pong-connection-chaos.cjs');
const { runFullSystemLoadTest } = require('./tests/pong-full-system.cjs');
const { runRateLimitTest } = require('./tests/pong-rate-limit.cjs');
const { runPVPLoadTest } = require('./tests/pong-pvp-load.cjs');
const { runWagerNegotiationLoadTest } = require('./tests/pong-wager-negotiation-load.cjs');
const { runLobbyChatLoadTest } = require('./tests/pong-lobby-chat-load.cjs');
const { runNegotiationTimeoutTest } = require('./tests/pong-negotiation-timeout.cjs');
const { runWagerTransactionStressTest } = require('./tests/pong-wager-transaction-stress.cjs');
const { runConcurrentNegotiationsTest } = require('./tests/pong-concurrent-negotiations.cjs');
const { saveResults } = require('./helpers/results.cjs');

const PONG_SERVER_URL = process.env.PONG_SERVER_URL || 'http://localhost:5001';
const MAIN_SERVER_URL = process.env.API_BASE_URL || 'http://localhost:5000';

/**
 * Check if pong server is running and healthy
 */
async function checkPongServerHealth() {
  try {
    const response = await axios.get(`${PONG_SERVER_URL}/health`, { timeout: 5000 });
    return response.status === 200 && response.data.status === 'ok';
  } catch (error) {
    return false;
  }
}

/**
 * Check if main server is running
 */
async function checkMainServerHealth() {
  try {
    const response = await axios.get(`${MAIN_SERVER_URL}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Run all pong load tests in sequence
 */
async function runAllPongTests(options = {}) {
  const {
    skipHealthCheck = false,
    quick = false, // Quick mode with reduced scale
    tests = {
      lobby: true,
      matchCreation: true,
      concurrentGames: true,
      spectators: true,
      connectionChaos: true,
      rateLimit: true,
      pvpLoad: true,
      wagerNegotiation: true,
      lobbyChat: true,
      negotiationTimeout: true,
      wagerTransactionStress: true,
      concurrentNegotiations: true,
      fullSystem: true,
    },
  } = options;

  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(22) + 'PONG LOAD TESTS SUITE' + ' '.repeat(35) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');

  if (quick) {
    console.log('  🚀 QUICK MODE: Running with reduced scale for faster results\n');
  }

  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
  };

  try {
    // Health check
    if (!skipHealthCheck) {
      console.log('📋 Step 0: Checking server health...\n');

      const mainHealthy = await checkMainServerHealth();
      const pongHealthy = await checkPongServerHealth();

      console.log(`  Main Server (${MAIN_SERVER_URL}): ${mainHealthy ? '✅ Healthy' : '❌ Down'}`);
      console.log(`  Pong Server (${PONG_SERVER_URL}): ${pongHealthy ? '✅ Healthy' : '❌ Down'}\n');

      if (!mainHealthy || !pongHealthy) {
        console.log('❌ Servers are not healthy. Please start both servers before running tests:\n');
        console.log('  Terminal 1: npm run dev (starts main server + workers)');
        console.log('  Terminal 2: npm -w apps/pong-server run dev (starts pong server)\n');
        process.exit(1);
      }

      console.log('Press Enter to continue with tests...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Test 1: Lobby Stress Test
    if (tests.lobby) {
      console.log('\n📋 Step 1: Running Lobby Stress Test...\n');

      try {
        const lobbyResult = await runLobbyStressTest(
          quick
            ? { numUsers: 20, duration: 15000 }
            : { numUsers: 50, duration: 30000 },
        );

        results.tests.push({
          name: 'Lobby Stress Test',
          status: lobbyResult.success ? 'passed' : 'failed',
          result: lobbyResult,
        });

        if (lobbyResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Lobby stress test failed:', error.message);
        results.tests.push({
          name: 'Lobby Stress Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;

      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Test 2: Match Creation Load Test
    if (tests.matchCreation) {
      console.log('\n📋 Step 2: Running Match Creation Load Test...\n');

      try {
        const matchResult = await runMatchCreationLoadTest(
          quick ? { numAIMatches: 10, numPVPMatches: 5 } : { numAIMatches: 20, numPVPMatches: 10 },
        );

        results.tests.push({
          name: 'Match Creation Load Test',
          status: matchResult.success ? 'passed' : 'failed',
          result: matchResult,
        });

        if (matchResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Match creation test failed:', error.message);
        results.tests.push({
          name: 'Match Creation Load Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;

      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Test 3: Concurrent Games Test
    if (tests.concurrentGames) {
      console.log('\n📋 Step 3: Running Concurrent Games Test...\n');

      try {
        const gamesResult = await runConcurrentGamesTest(
          quick
            ? { numGames: 5, maxGameDuration: 60000 }
            : { numGames: 10, maxGameDuration: 120000 },
        );

        results.tests.push({
          name: 'Concurrent Games Test',
          status: gamesResult.success ? 'passed' : 'failed',
          result: gamesResult,
        });

        if (gamesResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Concurrent games test failed:', error.message);
        results.tests.push({
          name: 'Concurrent Games Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;

      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Test 4: Spectator Load Test
    if (tests.spectators) {
      console.log('\n📋 Step 4: Running Spectator Load Test...\n');

      try {
        const spectatorResult = await runSpectatorLoadTest(
          quick
            ? { numGames: 3, spectatorsPerGame: 3, duration: 15000 }
            : { numGames: 5, spectatorsPerGame: 5, duration: 30000 },
        );

        results.tests.push({
          name: 'Spectator Load Test',
          status: spectatorResult.success ? 'passed' : 'failed',
          result: spectatorResult,
        });

        if (spectatorResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Spectator load test failed:', error.message);
        results.tests.push({
          name: 'Spectator Load Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;

      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Test 5: Connection Chaos Test
    if (tests.connectionChaos) {
      console.log('\n📋 Step 5: Running Connection Chaos Test...\n');

      try {
        const chaosResult = await runConnectionChaosTest(
          quick
            ? { numUsers: 10, cycles: 2, midGameDisconnects: 3 }
            : { numUsers: 20, cycles: 3, midGameDisconnects: 5 },
        );

        results.tests.push({
          name: 'Connection Chaos Test',
          status: chaosResult.success ? 'passed' : 'failed',
          result: chaosResult,
        });

        if (chaosResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Connection chaos test failed:', error.message);
        results.tests.push({
          name: 'Connection Chaos Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;

      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Test 6: Rate Limit Validation Test
    if (tests.rateLimit) {
      console.log('\n📋 Step 6: Running Rate Limit Validation Test...\n');

      try {
        const rateLimitResult = await runRateLimitTest({ numUsers: 5 });

        results.tests.push({
          name: 'Rate Limit Validation Test',
          status: rateLimitResult.success ? 'passed' : 'failed',
          result: rateLimitResult,
        });

        if (rateLimitResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Rate limit test failed:', error.message);
        results.tests.push({
          name: 'Rate Limit Validation Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;

      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // NEW TESTS FOR WAGER NEGOTIATION & LOBBY CHAT

    // Test 7: PVP Load Test (with wager negotiation)
    if (tests.pvpLoad) {
      console.log('\n📋 Step 7: Running PVP Load Test (with wager negotiation)...\n');

      try {
        const pvpResult = await runPVPLoadTest(quick ? { numMatches: 5 } : { numMatches: 10 });

        results.tests.push({
          name: 'PVP Load Test',
          status: pvpResult.success ? 'passed' : 'failed',
          result: pvpResult,
        });

        results.summary[pvpResult.success ? 'passed' : 'failed']++;
      } catch (error) {
        console.error('❌ PVP load test failed:', error.message);
        results.tests.push({ name: 'PVP Load Test', status: 'failed', error: error.message });
        results.summary.failed++;
      }

      results.summary.total++;
      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => { process.stdin.once('data', () => resolve()); });
    }

    // Test 8: Wager Negotiation Load Test
    if (tests.wagerNegotiation) {
      console.log('\n📋 Step 8: Running Wager Negotiation Load Test...\n');

      try {
        const wagerResult = await runWagerNegotiationLoadTest(quick ? { numLobbies: 10 } : { numLobbies: 20 });

        results.tests.push({
          name: 'Wager Negotiation Load Test',
          status: wagerResult.success ? 'passed' : 'failed',
          result: wagerResult,
        });

        results.summary[wagerResult.success ? 'passed' : 'failed']++;
      } catch (error) {
        console.error('❌ Wager negotiation test failed:', error.message);
        results.tests.push({ name: 'Wager Negotiation Load Test', status: 'failed', error: error.message });
        results.summary.failed++;
      }

      results.summary.total++;
      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => { process.stdin.once('data', () => resolve()); });
    }

    // Test 9: Lobby Chat Load Test
    if (tests.lobbyChat) {
      console.log('\n📋 Step 9: Running Lobby Chat Load Test...\n');

      try {
        const chatResult = await runLobbyChatLoadTest(quick ? { numLobbies: 5, messagesPerLobby: 20 } : { numLobbies: 10, messagesPerLobby: 50 });

        results.tests.push({
          name: 'Lobby Chat Load Test',
          status: chatResult.success ? 'passed' : 'failed',
          result: chatResult,
        });

        results.summary[chatResult.success ? 'passed' : 'failed']++;
      } catch (error) {
        console.error('❌ Lobby chat test failed:', error.message);
        results.tests.push({ name: 'Lobby Chat Load Test', status: 'failed', error: error.message });
        results.summary.failed++;
      }

      results.summary.total++;
      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => { process.stdin.once('data', () => resolve()); });
    }

    // Test 10: Negotiation Timeout Test
    if (tests.negotiationTimeout) {
      console.log('\n📋 Step 10: Running Negotiation Timeout Test...\n');
      console.log('⚠️  This test takes 2+ minutes to complete...\n');

      try {
        const timeoutResult = await runNegotiationTimeoutTest(quick ? { numLobbies: 10, timeoutDuration: 65000 } : { numLobbies: 20, timeoutDuration: 125000 });

        results.tests.push({
          name: 'Negotiation Timeout Test',
          status: timeoutResult.success ? 'passed' : 'failed',
          result: timeoutResult,
        });

        results.summary[timeoutResult.success ? 'passed' : 'failed']++;
      } catch (error) {
        console.error('❌ Negotiation timeout test failed:', error.message);
        results.tests.push({ name: 'Negotiation Timeout Test', status: 'failed', error: error.message });
        results.summary.failed++;
      }

      results.summary.total++;
      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => { process.stdin.once('data', () => resolve()); });
    }

    // Test 11: Wager Transaction Stress Test
    if (tests.wagerTransactionStress) {
      console.log('\n📋 Step 11: Running Wager Transaction Stress Test...\n');

      try {
        const transactionResult = await runWagerTransactionStressTest(quick ? { numConcurrent: 15 } : { numConcurrent: 30 });

        results.tests.push({
          name: 'Wager Transaction Stress Test',
          status: transactionResult.success ? 'passed' : 'failed',
          result: transactionResult,
        });

        results.summary[transactionResult.success ? 'passed' : 'failed']++;
      } catch (error) {
        console.error('❌ Wager transaction stress test failed:', error.message);
        results.tests.push({ name: 'Wager Transaction Stress Test', status: 'failed', error: error.message });
        results.summary.failed++;
      }

      results.summary.total++;
      console.log('\nPress Enter to continue...');
      await new Promise((resolve) => { process.stdin.once('data', () => resolve()); });
    }

    // Test 12: Concurrent Negotiations Test
    if (tests.concurrentNegotiations) {
      console.log('\n📋 Step 12: Running Concurrent Negotiations Test...\n');

      try {
        const concurrentResult = await runConcurrentNegotiationsTest(quick ? { numLobbies: 15 } : { numLobbies: 30 });

        results.tests.push({
          name: 'Concurrent Negotiations Test',
          status: concurrentResult.success ? 'passed' : 'failed',
          result: concurrentResult,
        });

        results.summary[concurrentResult.success ? 'passed' : 'failed']++;
      } catch (error) {
        console.error('❌ Concurrent negotiations test failed:', error.message);
        results.tests.push({ name: 'Concurrent Negotiations Test', status: 'failed', error: error.message });
        results.summary.failed++;
      }

      results.summary.total++;

      if (tests.fullSystem) {
        console.log('\nPress Enter to continue to final test (Full System)...');
        await new Promise((resolve) => {
          process.stdin.once('data', () => resolve());
        });
      }
    }

    // Test 13: Full System Load Test (most intensive - run last)
    if (tests.fullSystem) {
      console.log('\n📋 Step 7: Running Full System Load Test (FINAL)...\n');
      console.log('⚠️  This is the most intensive test - it will run for several minutes\n');

      try {
        const fullSystemResult = await runFullSystemLoadTest(
          quick
            ? { lobbyUsers: 20, activeGames: 5, totalSpectators: 10, duration: 60000 }
            : { lobbyUsers: 50, activeGames: 15, totalSpectators: 30, duration: 300000 },
        );

        results.tests.push({
          name: 'Full System Load Test',
          status: fullSystemResult.success ? 'passed' : 'failed',
          result: fullSystemResult,
        });

        if (fullSystemResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Full system load test failed:', error.message);
        results.tests.push({
          name: 'Full System Load Test',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;
    }

    // Final summary
    results.duration = Date.now() - startTime;

    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(30) + 'TEST SUMMARY' + ' '.repeat(36) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('');
    console.log(`  Total Tests:     ${results.summary.total}`);
    console.log(`  Passed:          ${results.summary.passed} ✅`);
    console.log(
      `  Failed:          ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : ''}`,
    );
    console.log(`  Duration:        ${(results.duration / 1000).toFixed(2)}s`);
    console.log('');

    // List test results
    results.tests.forEach((test) => {
      const status = test.status === 'passed' ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
    });

    console.log('');

    // Save comprehensive results
    const filepath = saveResults(results, 'pong-all-tests-summary');

    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('');

    const allPassed = results.summary.failed === 0;

    if (allPassed) {
      console.log('🎉 All pong load tests passed! System is performing excellently.\n');
    } else {
      console.log('⚠️  Some tests failed. Please review the results and address issues.\n');
    }

    return results;
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipHealthCheck: args.includes('--skip-health-check'),
    quick: args.includes('--quick'),
    tests: {
      lobby: !args.includes('--skip-lobby'),
      matchCreation: !args.includes('--skip-match-creation'),
      concurrentGames: !args.includes('--skip-concurrent-games'),
      spectators: !args.includes('--skip-spectators'),
      connectionChaos: !args.includes('--skip-connection-chaos'),
      rateLimit: !args.includes('--skip-rate-limit'),
      pvpLoad: !args.includes('--skip-pvp-load'),
      wagerNegotiation: !args.includes('--skip-wager-negotiation'),
      lobbyChat: !args.includes('--skip-lobby-chat'),
      negotiationTimeout: !args.includes('--skip-negotiation-timeout'),
      wagerTransactionStress: !args.includes('--skip-wager-transaction-stress'),
      concurrentNegotiations: !args.includes('--skip-concurrent-negotiations'),
      fullSystem: !args.includes('--skip-full-system'),
    },
  };

  runAllPongTests(options)
    .then((results) => {
      const exitCode = results.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('❌ Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllPongTests };
