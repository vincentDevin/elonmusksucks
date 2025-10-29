#!/usr/bin/env node
// scripts/load-tests/tests/pong-spectator-load.cjs
// Spectator load test - test many spectators watching active games

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createAIMatch,
  setReady,
  spectateMatch,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Spectator load test
 * Tests:
 * - Multiple spectators joining active games
 * - Spectator-specific game state broadcasts
 * - Spectator room management
 * - Spectator join/leave latency
 */
async function runSpectatorLoadTest(options = {}) {
  const { numGames = 5, spectatorsPerGame = 5, duration = 30000 } = options;

  const totalSpectators = numGames * spectatorsPerGame;
  const totalUsers = numGames + totalSpectators; // Players + spectators

  console.log('\n👀 PONG SPECTATOR LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  Active games:        ${numGames}`);
  console.log(`  Spectators per game: ${spectatorsPerGame}`);
  console.log(`  Total spectators:    ${totalSpectators}`);
  console.log(`  Test duration:       ${duration / 1000}s`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const allSockets = [];
  const cleanupFunctions = [];
  const gameData = [];

  try {
    // Step 1: Create test users
    console.log(`📝 Creating ${totalUsers} test users (${numGames} players + ${totalSpectators} spectators)...`);
    const users = await createTestUsers(totalUsers);
    console.log(`✅ ${users.length} test users ready\n`);

    // Step 2: Connect all users
    console.log(`📡 Connecting ${users.length} users to pong server...`);
    const connections = await createMultipleConnections(users);

    const successfulConnections = connections.filter((c) => c.success);
    successfulConnections.forEach((conn) => {
      allSockets.push(conn.socket);
      const cleanup = trackSocketMetrics(conn.socket, metrics);
      cleanupFunctions.push(cleanup);
    });

    console.log(`✅ ${successfulConnections.length}/${users.length} users connected\n`);

    // Step 3: Create games
    console.log(`🎮 Creating ${numGames} AI games...`);
    const playerConnections = successfulConnections.slice(0, numGames);
    const spectatorConnections = successfulConnections.slice(numGames);

    const gameCreationPromises = playerConnections.map(async (conn, index) => {
      try {
        const matchData = await createAIMatch(conn.socket, 100, 'MEDIUM');
        console.log(`  ✅ Game ${index + 1} created: ${matchData.gameId}`);
        return { success: true, conn, matchData, gameId: matchData.gameId };
      } catch (error) {
        console.log(`  ❌ Game ${index + 1} failed: ${error.message}`);
        metrics.recordError(error);
        return { success: false, error: error.message };
      }
    });

    const matchResults = await Promise.all(gameCreationPromises);
    const activeGames = matchResults.filter((r) => r.success);

    console.log(`\n✅ ${activeGames.length}/${numGames} games created\n`);

    if (activeGames.length === 0) {
      throw new Error('No games created successfully');
    }

    // Step 4: Start all games
    console.log('⏳ Starting all games...');

    // Wait a moment for server to finish processing game creation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    activeGames.forEach((game) => {
      setReady(game.conn.socket, true);
    });

    await new Promise((resolve) => setTimeout(resolve, 4000)); // Wait for countdowns
    console.log('✅ All games active\n');

    // Step 5: Add spectators to games
    console.log(`👀 Adding ${spectatorConnections.length} spectators to games...`);

    const spectatePromises = [];
    spectatorConnections.forEach((spectatorConn, index) => {
      // Distribute spectators across games
      const gameIndex = index % activeGames.length;
      const game = activeGames[gameIndex];

      const spectateStart = Date.now();
      const spectatePromise = spectateMatch(spectatorConn.socket, game.gameId)
        .then(() => {
          const duration = Date.now() - spectateStart;
          console.log(
            `  ✅ Spectator ${index + 1} joined game ${gameIndex + 1} (${duration}ms)`,
          );
          return { success: true, gameIndex, duration };
        })
        .catch((error) => {
          console.log(
            `  ❌ Spectator ${index + 1} failed to join game ${gameIndex + 1}: ${error.message}`,
          );
          metrics.recordError(error);
          return { success: false, gameIndex, error: error.message };
        });

      spectatePromises.push(spectatePromise);
    });

    const spectateResults = await Promise.all(spectatePromises);
    const successfulSpectators = spectateResults.filter((r) => r.success).length;

    console.log(`\n✅ ${successfulSpectators}/${spectatorConnections.length} spectators connected\n`);

    // Step 6: Monitor spectator game state updates
    console.log(`📊 Monitoring spectator game state updates for ${duration / 1000}s...\n`);

    let spectatorGameStates = 0;
    spectatorConnections.forEach((conn) => {
      conn.socket.on('game_state', () => {
        spectatorGameStates++;
      });
    });

    // Wait for test duration
    const monitorStart = Date.now();
    while (Date.now() - monitorStart < duration) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const elapsed = Math.floor((Date.now() - monitorStart) / 1000);
      const avgUpdatesPerSpectator =
        successfulSpectators > 0 ? spectatorGameStates / successfulSpectators : 0;

      console.log(
        `  [${elapsed}s] Spectator game states: ${spectatorGameStates} total (${avgUpdatesPerSpectator.toFixed(0)} per spectator)`,
      );
    }

    console.log(`\n✅ Monitoring complete\n`);
    console.log(`📊 Total spectator game state updates: ${spectatorGameStates}`);
    console.log(
      `📊 Average per spectator: ${(spectatorGameStates / successfulSpectators).toFixed(0)}`,
    );
    console.log('');

    // Step 7: Cleanup
    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(allSockets);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('✅ All users disconnected\n');

    // Generate report
    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    // Calculate metrics
    const spectateLatencies = spectateResults.filter((r) => r.success).map((r) => r.duration);
    const avgSpectateLatency =
      spectateLatencies.length > 0
        ? spectateLatencies.reduce((a, b) => a + b, 0) / spectateLatencies.length
        : 0;

    const avgUpdatesPerSpectator =
      successfulSpectators > 0 ? spectatorGameStates / successfulSpectators : 0;
    const expectedUpdates = (duration / 1000) * 120; // 120Hz target
    const updateDeliveryRate = (avgUpdatesPerSpectator / expectedUpdates) * 100;

    // Save results
    const results = {
      testName: 'Pong Spectator Load Test',
      timestamp: new Date().toISOString(),
      config: {
        numGames,
        spectatorsPerGame,
        totalSpectators,
        duration,
      },
      summary: {
        gamesCreated: activeGames.length,
        spectatorsConnected: successfulSpectators,
        spectatorsFailed: totalSpectators - successfulSpectators,
        avgSpectateLatency,
        totalGameStateUpdates: spectatorGameStates,
        avgUpdatesPerSpectator,
        expectedUpdates,
        updateDeliveryRate,
      },
      metrics: report,
      success:
        successfulSpectators >= totalSpectators * 0.95 && // At least 95% connected
        avgSpectateLatency < 500 && // Join latency < 500ms
        updateDeliveryRate >= 80, // At least 80% of expected updates delivered
    };

    saveResults(results, 'pong-spectator-load');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Spectator system handled load successfully!');
      console.log(`     ${successfulSpectators}/${totalSpectators} spectators connected`);
      console.log(`     Average join latency: ${avgSpectateLatency.toFixed(0)}ms`);
      console.log(`     Update delivery rate: ${updateDeliveryRate.toFixed(1)}%`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (successfulSpectators < totalSpectators * 0.95) {
        console.log(
          `     - Low connection rate: ${successfulSpectators}/${totalSpectators}`,
        );
      }
      if (avgSpectateLatency >= 500) {
        console.log(`     - High join latency: ${avgSpectateLatency.toFixed(0)}ms`);
      }
      if (updateDeliveryRate < 80) {
        console.log(`     - Low update delivery: ${updateDeliveryRate.toFixed(1)}%`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Spectator load test failed:', error.message);
    console.error(error.stack);

    // Cleanup on error
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(allSockets);

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
    if (key === '--games') options.numGames = parseInt(value, 10);
    if (key === '--spectators-per-game') options.spectatorsPerGame = parseInt(value, 10);
    if (key === '--duration') options.duration = parseInt(value, 10) * 1000;
  });

  runSpectatorLoadTest(options)
    .then((results) => {
      console.log('✅ Spectator load test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Spectator load test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runSpectatorLoadTest };
