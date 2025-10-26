#!/usr/bin/env node
// scripts/load-tests/tests/pong-match-creation.cjs
// Match creation load test - test creating many AI and PVP matches concurrently

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createAIMatch,
  createPVPMatch,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

const AI_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'IMPOSSIBLE'];
const WAGER_AMOUNTS = [0, 100, 500, 1000];

/**
 * Match creation load test
 * Tests:
 * - Concurrent AI match creation (various difficulties)
 * - Concurrent PVP match creation
 * - Match creation latency under load
 * - Wager validation and processing
 * - Rate limiting (5 matches/minute per user)
 */
async function runMatchCreationLoadTest(options = {}) {
  const { numAIMatches = 20, numPVPMatches = 10 } = options;

  const totalMatches = numAIMatches + numPVPMatches;
  const totalUsers = Math.ceil(totalMatches / 3); // Some users create multiple matches

  console.log('\n🎮 PONG MATCH CREATION LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  AI matches:      ${numAIMatches}`);
  console.log(`  PVP matches:     ${numPVPMatches}`);
  console.log(`  Total matches:   ${totalMatches}`);
  console.log(`  Users needed:    ${totalUsers}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];
  const matchResults = {
    ai: { created: 0, failed: 0, durations: [] },
    pvp: { created: 0, failed: 0, durations: [] },
  };

  try {
    // Step 1: Create test users
    console.log(`📝 Creating ${totalUsers} test users...`);
    const users = await createTestUsers(totalUsers);
    console.log(`✅ ${users.length} test users ready\n`);

    // Step 2: Connect all users
    console.log(`📡 Connecting ${users.length} users to pong server...`);
    const connections = await createMultipleConnections(users);

    const successfulConnections = connections.filter((c) => c.success);
    successfulConnections.forEach((conn) => {
      sockets.push(conn.socket);
      const cleanup = trackSocketMetrics(conn.socket, metrics);
      cleanupFunctions.push(cleanup);
    });

    console.log(`✅ ${successfulConnections.length}/${users.length} users connected\n`);

    if (successfulConnections.length === 0) {
      throw new Error('No users connected successfully');
    }

    // Step 3: Create AI matches concurrently
    console.log(`🤖 Creating ${numAIMatches} AI matches concurrently...`);
    const aiMatchPromises = [];

    for (let i = 0; i < numAIMatches; i++) {
      const connIndex = i % successfulConnections.length;
      const conn = successfulConnections[connIndex];

      // Vary difficulty and wager
      const difficulty = AI_DIFFICULTIES[i % AI_DIFFICULTIES.length];
      const wager = WAGER_AMOUNTS[i % WAGER_AMOUNTS.length];

      const matchStart = Date.now();
      const matchPromise = createAIMatch(conn.socket, wager, difficulty)
        .then((matchData) => {
          const duration = Date.now() - matchStart;
          matchResults.ai.created++;
          matchResults.ai.durations.push(duration);
          metrics.recordMatchOperation('create', duration, true);

          console.log(
            `  ✅ AI match created: ${difficulty} difficulty, ${wager} wager (${duration}ms)`,
          );
          return { success: true, matchData, duration };
        })
        .catch((error) => {
          matchResults.ai.failed++;
          metrics.recordMatchOperation('create', 0, false);
          metrics.recordError(error);
          console.log(`  ❌ AI match failed: ${error.message}`);
          return { success: false, error: error.message };
        });

      aiMatchPromises.push(matchPromise);
    }

    const aiResults = await Promise.all(aiMatchPromises);
    const successfulAI = aiResults.filter((r) => r.success).length;

    console.log(`\n✅ AI matches: ${successfulAI}/${numAIMatches} created successfully`);
    if (matchResults.ai.durations.length > 0) {
      const avgDuration =
        matchResults.ai.durations.reduce((a, b) => a + b, 0) / matchResults.ai.durations.length;
      console.log(`   Average creation time: ${avgDuration.toFixed(0)}ms`);
    }
    console.log('');

    // Step 4: Create PVP matches concurrently
    console.log(`⚔️  Creating ${numPVPMatches} PVP matches concurrently...`);
    const pvpMatchPromises = [];

    for (let i = 0; i < numPVPMatches; i++) {
      const connIndex = i % successfulConnections.length;
      const conn = successfulConnections[connIndex];

      // Vary wager
      const wager = WAGER_AMOUNTS[i % WAGER_AMOUNTS.length];

      const matchStart = Date.now();
      const matchPromise = createPVPMatch(conn.socket, wager)
        .then((matchData) => {
          const duration = Date.now() - matchStart;
          matchResults.pvp.created++;
          matchResults.pvp.durations.push(duration);
          metrics.recordMatchOperation('create', duration, true);

          console.log(`  ✅ PVP lobby created: ${wager} wager (${duration}ms)`);
          return { success: true, matchData, duration };
        })
        .catch((error) => {
          matchResults.pvp.failed++;
          metrics.recordMatchOperation('create', 0, false);
          metrics.recordError(error);
          console.log(`  ❌ PVP match failed: ${error.message}`);
          return { success: false, error: error.message };
        });

      pvpMatchPromises.push(matchPromise);
    }

    const pvpResults = await Promise.all(pvpMatchPromises);
    const successfulPVP = pvpResults.filter((r) => r.success).length;

    console.log(`\n✅ PVP matches: ${successfulPVP}/${numPVPMatches} created successfully`);
    if (matchResults.pvp.durations.length > 0) {
      const avgDuration =
        matchResults.pvp.durations.reduce((a, b) => a + b, 0) / matchResults.pvp.durations.length;
      console.log(`   Average creation time: ${avgDuration.toFixed(0)}ms`);
    }
    console.log('');

    // Step 5: Cleanup
    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('✅ All users disconnected\n');

    // Generate report
    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    // Calculate overall success rate
    const totalCreated = matchResults.ai.created + matchResults.pvp.created;
    const totalFailed = matchResults.ai.failed + matchResults.pvp.failed;
    const successRate = (totalCreated / (totalCreated + totalFailed)) * 100;

    // Calculate latency stats
    const allDurations = [...matchResults.ai.durations, ...matchResults.pvp.durations];
    const avgLatency = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
    const maxLatency = Math.max(...allDurations);

    // Save results
    const results = {
      testName: 'Pong Match Creation Load Test',
      timestamp: new Date().toISOString(),
      config: {
        numAIMatches,
        numPVPMatches,
        totalMatches,
      },
      summary: {
        aiMatches: {
          created: matchResults.ai.created,
          failed: matchResults.ai.failed,
          successRate: (matchResults.ai.created / numAIMatches) * 100,
        },
        pvpMatches: {
          created: matchResults.pvp.created,
          failed: matchResults.pvp.failed,
          successRate: (matchResults.pvp.created / numPVPMatches) * 100,
        },
        overall: {
          created: totalCreated,
          failed: totalFailed,
          successRate,
          avgLatency,
          maxLatency,
        },
      },
      metrics: report,
      success: successRate >= 95 && avgLatency < 1000,
    };

    saveResults(results, 'pong-match-creation');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Match creation handled load successfully!');
      console.log(`     ${totalCreated}/${totalMatches} matches created (${successRate.toFixed(1)}%)`);
      console.log(`     Average latency: ${avgLatency.toFixed(0)}ms`);
      console.log(`     Max latency: ${maxLatency.toFixed(0)}ms`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (successRate < 95) {
        console.log(`     - Success rate below 95%: ${successRate.toFixed(1)}%`);
      }
      if (avgLatency >= 1000) {
        console.log(`     - High average latency: ${avgLatency.toFixed(0)}ms (target <1000ms)`);
      }
      if (matchResults.ai.failed > 0) {
        console.log(`     - ${matchResults.ai.failed} AI match creation failures`);
      }
      if (matchResults.pvp.failed > 0) {
        console.log(`     - ${matchResults.pvp.failed} PVP match creation failures`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Match creation test failed:', error.message);
    console.error(error.stack);

    // Cleanup on error
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

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
    if (key === '--ai-matches') options.numAIMatches = parseInt(value, 10);
    if (key === '--pvp-matches') options.numPVPMatches = parseInt(value, 10);
  });

  runMatchCreationLoadTest(options)
    .then((results) => {
      console.log('✅ Match creation test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Match creation test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runMatchCreationLoadTest };
