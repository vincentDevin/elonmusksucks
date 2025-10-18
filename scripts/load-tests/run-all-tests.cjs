#!/usr/bin/env node
// scripts/load-tests/run-all-tests.js
// Master test runner - executes all load tests in sequence

const { quickHealthCheck } = require('./tests/health-monitor.cjs');
const { runBetPlacementLoadTest } = require('./tests/bet-placement.cjs');
const { runAchievementVerificationTest } = require('./tests/achievement-verification.cjs');
const { runConcurrentUsersTest } = require('./tests/concurrent-users.cjs');
const { saveResults } = require('./helpers/results.cjs');

async function runAllTests(options = {}) {
  const {
    skipHealthCheck = false,
    betPlacement = true,
    achievement = true,
    concurrent = true,
  } = options;

  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'ACHIEVEMENT SYSTEM LOAD TESTS' + ' '.repeat(29) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('');

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
    // Step 1: Health check
    if (!skipHealthCheck) {
      console.log('\n📋 Step 1: Checking server health...\n');
      const healthy = await quickHealthCheck();

      if (!healthy) {
        console.log('\n❌ Servers are not healthy. Please start both servers before running tests:\n');
        console.log('  Terminal 1: npm run dev (starts main server)');
        console.log('  Terminal 2: npm run achievement-server\n');
        process.exit(1);
      }

      console.log('Press Enter to continue with tests...');
      await new Promise((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Step 2: Bet Placement Load Test
    if (betPlacement) {
      console.log('\n📋 Step 2: Running Bet Placement Load Test...\n');

      try {
        const betResult = await runBetPlacementLoadTest({
          numBets: 50,
          concurrency: 5,
          userCount: 5,
        });

        results.tests.push({
          name: 'Bet Placement',
          status: 'passed',
          result: betResult,
        });
        results.summary.passed++;
      } catch (error) {
        console.error('❌ Bet Placement test failed:', error.message);
        results.tests.push({
          name: 'Bet Placement',
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

    // Step 3: Achievement Verification Test
    if (achievement) {
      console.log('\n📋 Step 3: Running Achievement Verification Test...\n');

      try {
        const achievementResult = await runAchievementVerificationTest({
          numBets: 10,
          waitTime: 5000,
        });

        results.tests.push({
          name: 'Achievement Verification',
          status: achievementResult.success ? 'passed' : 'failed',
          result: achievementResult,
        });

        if (achievementResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      } catch (error) {
        console.error('❌ Achievement Verification test failed:', error.message);
        results.tests.push({
          name: 'Achievement Verification',
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

    // Step 4: Concurrent Users Stress Test
    if (concurrent) {
      console.log('\n📋 Step 4: Running Concurrent Users Stress Test...\n');

      try {
        const concurrentResult = await runConcurrentUsersTest({
          numUsers: 10,
          betsPerUser: 5,
        });

        results.tests.push({
          name: 'Concurrent Users',
          status: 'passed',
          result: concurrentResult,
        });
        results.summary.passed++;
      } catch (error) {
        console.error('❌ Concurrent Users test failed:', error.message);
        results.tests.push({
          name: 'Concurrent Users',
          status: 'failed',
          error: error.message,
        });
        results.summary.failed++;
      }

      results.summary.total++;
    }

    // Final Summary
    results.duration = Date.now() - startTime;

    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(30) + 'TEST SUMMARY' + ' '.repeat(36) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('');
    console.log(`  Total Tests:     ${results.summary.total}`);
    console.log(`  Passed:          ${results.summary.passed} ✅`);
    console.log(`  Failed:          ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : ''}`);
    console.log(`  Duration:        ${(results.duration / 1000).toFixed(2)}s`);
    console.log('');

    // List test results
    results.tests.forEach((test) => {
      const status = test.status === 'passed' ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);

      if (test.status === 'passed' && test.result) {
        if (test.result.successfulRequests !== undefined) {
          const successRate =
            (test.result.successfulRequests / test.result.totalRequests) * 100;
          console.log(`     Success rate: ${successRate.toFixed(1)}%`);

          if (test.result.requestDurations && test.result.requestDurations.length > 0) {
            const avg =
              test.result.requestDurations.reduce((a, b) => a + b, 0) /
              test.result.requestDurations.length;
            console.log(`     Avg response: ${avg.toFixed(0)}ms`);
          }
        }

        if (test.result.newlyUnlocked !== undefined) {
          console.log(`     Achievements unlocked: ${test.result.newlyUnlocked}`);
        }
      }

      if (test.status === 'failed') {
        console.log(`     Error: ${test.error}`);
      }

      console.log('');
    });

    // Save comprehensive results
    const filepath = saveResults(results, 'all-tests-summary');

    console.log('╚' + '═'.repeat(78) + '╝');
    console.log('');

    const allPassed = results.summary.failed === 0;

    if (allPassed) {
      console.log('🎉 All tests passed! Achievement system migration is working correctly.\n');
    } else {
      console.log('⚠️  Some tests failed. Please review the results and fix issues.\n');
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
    betPlacement: !args.includes('--skip-bet-placement'),
    achievement: !args.includes('--skip-achievement'),
    concurrent: !args.includes('--skip-concurrent'),
  };

  runAllTests(options)
    .then((results) => {
      const exitCode = results.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('❌ Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
