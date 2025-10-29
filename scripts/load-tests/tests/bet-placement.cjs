#!/usr/bin/env node
// scripts/load-tests/tests/bet-placement.js
// Load test for bet placement - the critical path that triggers achievements
//
// This test measures the performance impact of achievement processing
// BEFORE: Bet placement blocks on achievement evaluation (12-20s)
// AFTER: Bet placement returns immediately, achievements process async (<500ms)

const { getOrCreateTestUser } = require('../helpers/auth.cjs');
const { getActivePredictions, placeRandomBet } = require('../helpers/testData.cjs');
const { formatResults, saveResults } = require('../helpers/results.cjs');

async function runBetPlacementLoadTest(options = {}) {
  const {
    numBets = 50, // Number of bets to place
    concurrency = 5, // Number of concurrent bets
    userCount = 5, // Number of different users
  } = options;

  console.log('\n🎯 BET PLACEMENT LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  Bets to place:      ${numBets}`);
  console.log(`  Concurrency:        ${concurrency}`);
  console.log(`  Users:              ${userCount}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const results = {
    testName: 'Bet Placement Load Test',
    totalRequests: numBets,
    successfulRequests: 0,
    failedRequests: 0,
    requestDurations: [],
    errors: [],
    metadata: {
      numBets,
      concurrency,
      userCount,
    },
  };

  try {
    // Step 1: Create test users
    console.log('📝 Creating test users...');
    const users = [];
    for (let i = 0; i < userCount; i++) {
      const username = `bettest_${Date.now()}_${i}`;
      const auth = await getOrCreateTestUser(username);
      users.push(auth);
    }
    console.log(`✅ Created ${users.length} test users\n`);

    // Step 2: Get active predictions for each user
    console.log('📊 Fetching active predictions...');
    const userPredictions = await Promise.all(
      users.map((user) => getActivePredictions(user.accessToken, 20)),
    );

    const totalAvailablePredictions = userPredictions.reduce((sum, p) => sum + p.length, 0);
    console.log(`✅ Found ${totalAvailablePredictions} predictions across all users\n`);

    if (totalAvailablePredictions === 0) {
      throw new Error('No active predictions available! Please create some predictions first.');
    }

    // Step 3: Place bets with concurrency control
    console.log('🚀 Starting bet placement...\n');

    let completed = 0;
    const queue = [];

    for (let i = 0; i < numBets; i++) {
      const userIndex = i % users.length;
      const user = users[userIndex];
      const predictions = userPredictions[userIndex];

      if (predictions.length === 0) {
        console.log(`  ⚠️  User ${user.username} has no predictions available`);
        results.failedRequests++;
        continue;
      }

      const betPromise = placeRandomBet(user.accessToken, predictions)
        .then((result) => {
          completed++;
          process.stdout.write(`\r  Progress: ${completed}/${numBets} bets placed`);

          if (result.success) {
            results.successfulRequests++;
            results.requestDurations.push(result.duration);

            // Show slow requests in real-time
            if (result.duration > 1000) {
              console.log(`\n  ⚠️  Slow request: ${result.duration}ms`);
            }
          } else {
            results.failedRequests++;
            results.errors.push({
              error: result.error,
              status: result.status,
            });
          }

          return result;
        })
        .catch((error) => {
          completed++;
          results.failedRequests++;
          results.errors.push({ error: error.message });
          process.stdout.write(`\r  Progress: ${completed}/${numBets} bets placed`);
        });

      queue.push(betPromise);

      // Enforce concurrency limit
      if (queue.length >= concurrency) {
        await Promise.race(queue);
        queue.splice(
          queue.findIndex((p) => p === queue[0]),
          1,
        );
      }
    }

    // Wait for all remaining bets to complete
    await Promise.all(queue);
    console.log('\n');

    // Calculate final results
    results.duration = Date.now() - startTime;

    // Display results
    console.log(formatResults(results));

    // Save results
    const filepath = saveResults(results, 'bet-placement');

    // Performance assessment
    const avgDuration = results.requestDurations.reduce((a, b) => a + b, 0) / results.requestDurations.length;

    console.log('\n📈 PERFORMANCE ASSESSMENT:\n');

    if (avgDuration < 500) {
      console.log('  ✅ EXCELLENT: Average response time < 500ms');
      console.log('     Achievement processing is fully asynchronous!');
    } else if (avgDuration < 2000) {
      console.log('  ⚠️  MODERATE: Average response time < 2s');
      console.log('     Some improvement, but achievement processing may still be blocking');
    } else {
      console.log('  ❌ POOR: Average response time > 2s');
      console.log('     Achievement processing is likely still synchronous and blocking');
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
    if (key === '--bets') options.numBets = parseInt(value, 10);
    if (key === '--concurrency') options.concurrency = parseInt(value, 10);
    if (key === '--users') options.userCount = parseInt(value, 10);
  });

  runBetPlacementLoadTest(options)
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runBetPlacementLoadTest };
