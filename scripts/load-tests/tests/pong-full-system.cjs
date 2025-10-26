#!/usr/bin/env node
// scripts/load-tests/tests/pong-full-system.cjs
// Full system load test - combine all scenarios for comprehensive stress test

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  joinLobby,
  createAIMatch,
  createPVPMatch,
  setReady,
  spectateMatch,
  simulatePlayerInput,
  waitForGameEnd,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Full system load test - ultimate stress test combining all scenarios
 * Tests:
 * - 50 lobby users (browsing)
 * - 15 active games (with realistic input)
 * - 30 spectators (distributed across games)
 * - Sustained load for 5+ minutes
 * - Memory/CPU stability
 */
async function runFullSystemLoadTest(options = {}) {
  const {
    lobbyUsers = 50,
    activeGames = 15,
    totalSpectators = 30,
    duration = 300000, // 5 minutes
  } = options;

  const totalUsers = lobbyUsers + activeGames + totalSpectators;

  console.log('\n🚀 PONG FULL SYSTEM LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  Lobby users:        ${lobbyUsers}`);
  console.log(`  Active games:       ${activeGames}`);
  console.log(`  Spectators:         ${totalSpectators}`);
  console.log(`  Total users:        ${totalUsers}`);
  console.log(`  Test duration:      ${duration / 1000}s (${(duration / 60000).toFixed(1)} min)`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const allSockets = [];
  const cleanupFunctions = [];
  const inputStopFunctions = [];

  try {
    // Step 1: Create all test users
    console.log(`📝 Creating ${totalUsers} test users...`);
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

    if (successfulConnections.length < totalUsers * 0.8) {
      throw new Error('Too many connection failures, aborting test');
    }

    // Distribute connections
    const lobbyConnections = successfulConnections.slice(0, lobbyUsers);
    const gameConnections = successfulConnections.slice(lobbyUsers, lobbyUsers + activeGames);
    const spectatorConnections = successfulConnections.slice(lobbyUsers + activeGames);

    console.log('📋 User distribution:');
    console.log(`  Lobby users:    ${lobbyConnections.length}`);
    console.log(`  Game players:   ${gameConnections.length}`);
    console.log(`  Spectators:     ${spectatorConnections.length}\n`);

    // Step 3: Setup lobby users
    console.log('🏓 Lobby users joining...');
    await Promise.all(
      lobbyConnections.map((conn) =>
        joinLobby(conn.socket).catch((err) => metrics.recordError(err)),
      ),
    );
    console.log('✅ Lobby users ready\n');

    // Step 4: Create and start games
    console.log(`🎮 Creating ${gameConnections.length} games...`);
    const gamePromises = gameConnections.map(async (conn, index) => {
      try {
        const difficulty = ['EASY', 'MEDIUM', 'HARD'][index % 3];
        const matchData = await createAIMatch(conn.socket, 100, difficulty);

        // Wait a moment for server to finish processing game creation
        await new Promise((resolve) => setTimeout(resolve, 500));

        setReady(conn.socket, true);
        return { success: true, conn, matchData, gameId: matchData.gameId };
      } catch (error) {
        metrics.recordError(error);
        return { success: false, error: error.message };
      }
    });

    const gameResults = await Promise.all(gamePromises);
    const activeGamesData = gameResults.filter((r) => r.success);

    console.log(`✅ ${activeGamesData.length}/${gameConnections.length} games created\n`);

    // Wait for games to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 5: Add spectators
    console.log('👀 Adding spectators to games...');
    const spectatorPromises = spectatorConnections.map(async (conn, index) => {
      const gameIndex = index % activeGamesData.length;
      const game = activeGamesData[gameIndex];

      try {
        await spectateMatch(conn.socket, game.gameId);
        return { success: true };
      } catch (error) {
        metrics.recordError(error);
        return { success: false };
      }
    });

    await Promise.all(spectatorPromises);
    console.log('✅ Spectators added\n');

    // Step 6: Start player input simulation
    console.log('🕹️  Starting player input simulation...');
    activeGamesData.forEach((game) => {
      const stopInput = simulatePlayerInput(game.conn.socket, duration, 60);
      inputStopFunctions.push(stopInput);
    });
    console.log('✅ Player input simulation active\n');

    // Step 7: Monitor system for test duration
    console.log(`⏰ Running full system load for ${duration / 1000}s...\n`);

    let totalGameStates = 0;
    let lobbyRefreshCount = 0;

    // Monitor game states
    [...activeGamesData, ...spectatorConnections].forEach((item) => {
      const socket = item.conn ? item.conn.socket : item.socket;
      socket.on('game_state', () => totalGameStates++);
    });

    // Periodic lobby refresh (simulates real browsing)
    const refreshInterval = 10000; // Every 10 seconds
    const refreshIntervalId = setInterval(() => {
      // Random 20% of lobby users refresh
      const refreshCount = Math.floor(lobbyConnections.length * 0.2);
      for (let i = 0; i < refreshCount; i++) {
        const randomIndex = Math.floor(Math.random() * lobbyConnections.length);
        joinLobby(lobbyConnections[randomIndex].socket).catch((err) =>
          metrics.recordError(err),
        );
        lobbyRefreshCount++;
      }
    }, refreshInterval);

    // Monitor and report every 30 seconds
    const monitorInterval = 30000;
    const monitorStart = Date.now();

    while (Date.now() - monitorStart < duration) {
      await new Promise((resolve) => setTimeout(resolve, monitorInterval));

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const report = metrics.getReport();

      console.log(`  [${elapsed}s] Status:`);
      console.log(`    Active connections: ${successfulConnections.length}`);
      console.log(`    Game state updates: ${totalGameStates}`);
      console.log(`    Lobby refreshes: ${lobbyRefreshCount}`);
      console.log(`    Errors: ${report.errors.total}`);
      console.log('');
    }

    clearInterval(refreshIntervalId);

    console.log('✅ Full system load test complete\n');

    // Stop input simulations
    inputStopFunctions.forEach((stop) => stop());

    // Step 8: Cleanup
    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(allSockets);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('✅ All users disconnected\n');

    // Generate final report
    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    // Save results
    const testDuration = Date.now() - startTime;
    const results = {
      testName: 'Pong Full System Load Test',
      timestamp: new Date().toISOString(),
      config: {
        lobbyUsers,
        activeGames,
        totalSpectators,
        duration,
      },
      summary: {
        totalUsers: successfulConnections.length,
        gamesCreated: activeGamesData.length,
        totalGameStateUpdates: totalGameStates,
        lobbyRefreshes: lobbyRefreshCount,
        testDuration,
        avgGameStateFrequency:
          testDuration > 0 ? (totalGameStates / (testDuration / 1000)).toFixed(1) : 0,
      },
      metrics: report,
      success:
        report.connections.successRate >= 95 &&
        report.errors.total < totalUsers * 0.05 && // Less than 5% error rate
        report.disconnections.unexpected === 0,
    };

    saveResults(results, 'pong-full-system');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ OUTSTANDING: System handled full load successfully!');
      console.log(`     ${successfulConnections.length} total users`);
      console.log(`     ${activeGamesData.length} concurrent games`);
      console.log(`     ${totalGameStates} game state updates delivered`);
      console.log(`     ${report.errors.total} errors (${((report.errors.total / totalUsers) * 100).toFixed(1)}% rate)`);
      console.log(`     ${report.disconnections.unexpected} unexpected disconnections`);
    } else {
      console.log('  ⚠️  SYSTEM STRESS DETECTED:');
      if (report.connections.successRate < 95) {
        console.log(
          `     - Low connection success: ${report.connections.successRate.toFixed(1)}%`,
        );
      }
      if (report.errors.total >= totalUsers * 0.05) {
        console.log(`     - High error rate: ${report.errors.total} errors`);
      }
      if (report.disconnections.unexpected > 0) {
        console.log(`     - ${report.disconnections.unexpected} unexpected disconnections`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Full system load test failed:', error.message);
    console.error(error.stack);

    // Cleanup on error
    inputStopFunctions.forEach((stop) => stop());
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
    if (key === '--lobby-users') options.lobbyUsers = parseInt(value, 10);
    if (key === '--active-games') options.activeGames = parseInt(value, 10);
    if (key === '--spectators') options.totalSpectators = parseInt(value, 10);
    if (key === '--duration') options.duration = parseInt(value, 10) * 1000;
  });

  runFullSystemLoadTest(options)
    .then((results) => {
      console.log('✅ Full system load test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Full system load test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runFullSystemLoadTest };
