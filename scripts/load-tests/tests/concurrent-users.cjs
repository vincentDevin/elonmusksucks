#!/usr/bin/env node
// scripts/load-tests/tests/concurrent-users.js
// Stress test with many concurrent users placing bets simultaneously
//
// This test simulates real-world load with multiple users acting concurrently
// to verify the system can handle the load without achievement processing blocking

const { createTestUsers } = require('../helpers/auth.cjs');
const { getActivePredictions, placeRandomBet } = require('../helpers/testData.cjs');
const { formatResults, saveResults } = require('../helpers/results.cjs');

async function runConcurrentUsersTest(options = {}) {
  const {
    numUsers = 10, // Number of concurrent users
    betsPerUser = 5, // Bets each user places
  } = options;

  const totalBets = numUsers * betsPerUser;

  console.log('\n👥 CONCURRENT USERS STRESS TEST');
  console.log('═'.repeat(80));
  console.log(`  Concurrent users:   ${numUsers}`);
  console.log(`  Bets per user:      ${betsPerUser}`);
  console.log(`  Total bets:         ${totalBets}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const results = {
    testName: 'Concurrent Users Stress Test',
    totalRequests: totalBets,
    successfulRequests: 0,
    failedRequests: 0,
    requestDurations: [],
    errors: [],
    metadata: {
      numUsers,
      betsPerUser,
      totalBets,
    },
  };

  try {
    // Step 1: Create all test users concurrently
    console.log(`📝 Creating ${numUsers} test users concurrently...`);
    const users = await createTestUsers(numUsers);

    if (users.length < numUsers) {
      console.log(`⚠️  Warning: Only created ${users.length}/${numUsers} users`);
    }

    console.log('');

    // Step 2: Fetch predictions for all users concurrently
    console.log('📊 Fetching predictions for all users...');
    const userPredictions = await Promise.all(
      users.map((user) => getActivePredictions(user.accessToken, 20)),
    );

    const totalPredictions = userPredictions.reduce((sum, p) => sum + p.length, 0);
    console.log(`✅ Found ${totalPredictions} total predictions\n`);

    if (totalPredictions === 0) {
      throw new Error('No active predictions available! Please create some predictions first.');
    }

    // Step 3: All users place bets concurrently (simulates real traffic spike)
    console.log(`🚀 ${numUsers} users placing bets simultaneously...\n`);

    const allBetPromises = [];

    users.forEach((user, userIndex) => {
      const predictions = userPredictions[userIndex];

      if (predictions.length === 0) {
        console.log(`  ⚠️  User ${user.username} has no predictions`);
        return;
      }

      // Each user places multiple bets
      for (let i = 0; i < betsPerUser; i++) {
        const betPromise = placeRandomBet(user.accessToken, predictions)
          .then((result) => {
            if (result.success) {
              results.successfulRequests++;
              results.requestDurations.push(result.duration);

              // Warn about slow requests
              if (result.duration > 2000) {
                console.log(
                  `  ⚠️  SLOW: User ${user.username} bet took ${result.duration}ms`,
                );
              }
            } else {
              results.failedRequests++;
              results.errors.push({
                user: user.username,
                error: result.error,
                status: result.status,
              });
            }

            return result;
          })
          .catch((error) => {
            results.failedRequests++;
            results.errors.push({
              user: user.username,
              error: error.message,
            });
          });

        allBetPromises.push(betPromise);
      }
    });

    // Wait for ALL bets to complete
    console.log(`  Waiting for ${allBetPromises.length} concurrent bets to complete...`);
    await Promise.all(allBetPromises);

    console.log('\n✅ All bets completed\n');

    // Calculate results
    results.duration = Date.now() - startTime;

    // Display results
    console.log(formatResults(results));

    // Save results
    const filepath = saveResults(results, 'concurrent-users');

    // Stress test assessment
    const avgDuration =
      results.requestDurations.reduce((a, b) => a + b, 0) / results.requestDurations.length;
    const maxDuration = Math.max(...results.requestDurations);
    const successRate = (results.successfulRequests / results.totalRequests) * 100;

    console.log('\n📈 STRESS TEST ASSESSMENT:\n');

    if (successRate >= 95 && avgDuration < 1000 && maxDuration < 5000) {
      console.log('  ✅ EXCELLENT: System handles concurrent load well!');
      console.log(`     ${successRate.toFixed(1)}% success rate with ${numUsers} concurrent users`);
      console.log(`     Average response time: ${avgDuration.toFixed(0)}ms`);
      console.log('     No blocking from achievement processing detected');
    } else if (successRate >= 80 && avgDuration < 3000) {
      console.log('  ⚠️  MODERATE: System handles load but shows some strain');
      console.log(`     ${successRate.toFixed(1)}% success rate`);
      console.log(`     Average response time: ${avgDuration.toFixed(0)}ms`);
      console.log('     Consider monitoring achievement server under load');
    } else {
      console.log('  ❌ POOR: System struggles with concurrent load');
      console.log(`     ${successRate.toFixed(1)}% success rate (should be >95%)`);
      console.log(`     Average response time: ${avgDuration.toFixed(0)}ms (should be <1000ms)`);
      console.log('     Achievement processing may still be blocking requests');
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
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
    if (key === '--bets-per-user') options.betsPerUser = parseInt(value, 10);
  });

  runConcurrentUsersTest(options)
    .then(() => {
      console.log('✅ Stress test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Stress test failed:', error);
      process.exit(1);
    });
}

module.exports = { runConcurrentUsersTest };
