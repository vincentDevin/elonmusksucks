#!/usr/bin/env node
// scripts/load-tests/tests/pong-concurrent-games.cjs
// Concurrent games test - run multiple games simultaneously with realistic player input

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createAIMatch,
  setReady,
  simulatePlayerInput,
  waitForGameEnd,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Concurrent games test
 * Tests:
 * - Multiple games running simultaneously
 * - Game state broadcast frequency (120Hz target)
 * - Player input handling under load
 * - Game completion and payout processing
 * - Server stability with multiple game loops
 */
async function runConcurrentGamesTest(options = {}) {
  const { numGames = 10, inputRate = 60, maxGameDuration = 120000 } = options;

  console.log('\n🎮 PONG CONCURRENT GAMES TEST');
  console.log('═'.repeat(80));
  console.log(`  Concurrent games:    ${numGames}`);
  console.log(`  Input rate:          ${inputRate} Hz`);
  console.log(`  Max game duration:   ${maxGameDuration / 1000}s`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];
  const gameResults = [];
  const inputStopFunctions = [];

  try {
    // Step 1: Create test users (one per game)
    console.log(`📝 Creating ${numGames} test users...`);
    const users = await createTestUsers(numGames);
    console.log(`✅ ${users.length} test users ready\n`);

    // Step 2: Connect all users
    console.log(`📡 Connecting ${users.length} users to pong server...`);
    const connections = await createMultipleConnections(users);

    const successfulConnections = connections.filter((c) => c.success);
    const disconnections = [];

    successfulConnections.forEach((conn) => {
      sockets.push(conn.socket);
      const cleanup = trackSocketMetrics(conn.socket, metrics);
      cleanupFunctions.push(cleanup);

      // Track unexpected disconnections
      conn.socket.on('disconnect', (reason) => {
        const disconnectInfo = {
          userId: conn.userId,
          username: conn.username,
          reason,
          timestamp: Date.now(),
        };
        disconnections.push(disconnectInfo);
        console.log(`  ⚠️  Socket disconnected: ${conn.username} (${reason})`);
      });
    });

    console.log(`✅ ${successfulConnections.length}/${users.length} users connected\n`);

    if (successfulConnections.length === 0) {
      throw new Error('No users connected successfully');
    }

    // Step 3: Create all games concurrently (AI games for simplicity)
    console.log(`🤖 Creating ${successfulConnections.length} AI matches...`);
    const matchCreationPromises = successfulConnections.map(async (conn, index) => {
      try {
        const difficulty = ['EASY', 'MEDIUM', 'HARD'][index % 3];
        const matchData = await createAIMatch(conn.socket, 100, difficulty);
        console.log(`  ✅ Game ${index + 1} created (${difficulty})`);
        return { success: true, conn, matchData, index };
      } catch (error) {
        console.log(`  ❌ Game ${index + 1} failed: ${error.message}`);
        metrics.recordError(error);
        return { success: false, conn, error: error.message, index };
      }
    });

    const matchResults = await Promise.all(matchCreationPromises);
    const activeMatches = matchResults.filter((r) => r.success);

    console.log(`\n✅ ${activeMatches.length}/${successfulConnections.length} games created\n`);

    if (activeMatches.length === 0) {
      throw new Error('No games created successfully');
    }

    // Wait a moment for server to finish processing game creation
    console.log('⏳ Waiting for server to finalize game setup...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: All players set ready simultaneously
    console.log('⏳ All players setting ready...');

    // Track countdown events
    let countdownsReceived = 0;
    activeMatches.forEach((match) => {
      match.conn.socket.once('countdown', (data) => {
        countdownsReceived++;
        console.log(`  📢 Countdown received for game ${match.index + 1}: ${data.count}`);
      });
      setReady(match.conn.socket, true);
    });

    // Check socket connection status after setting ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const connectedAfterReady = sockets.filter((s) => s.connected).length;
    console.log(`   Socket status: ${connectedAfterReady}/${sockets.length} still connected`);
    console.log(`   Countdowns received: ${countdownsReceived}/${activeMatches.length}`);

    // Wait for countdowns
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('✅ All games started\n');

    // Step 5: Simulate realistic player input for all games
    console.log(`🎮 Simulating player input (${inputRate} Hz) for all games...`);
    console.log('   Games will run until completion or timeout\n');

    activeMatches.forEach((match, index) => {
      // Start input simulation
      const stopInput = simulatePlayerInput(match.conn.socket, maxGameDuration, inputRate);
      inputStopFunctions.push(stopInput);

      // Track game completion
      waitForGameEnd(match.conn.socket, maxGameDuration)
        .then((result) => {
          const gameDuration = Date.now() - startTime;
          console.log(
            `  ✅ Game ${index + 1} completed: ${result.winner !== undefined ? `Winner slot ${result.winner}` : 'Draw'} (${(gameDuration / 1000).toFixed(1)}s)`,
          );
          gameResults.push({
            index,
            success: true,
            result,
            duration: gameDuration,
          });

          // Stop input simulation for this game
          stopInput();
        })
        .catch((error) => {
          console.log(`  ⚠️  Game ${index + 1} timeout/error: ${error.message}`);
          gameResults.push({
            index,
            success: false,
            error: error.message,
          });

          // Stop input simulation
          stopInput();
        });
    });

    // Monitor game state updates during gameplay
    let totalGameStates = 0;
    const gameStateIntervals = [];
    let lastGameStateTime = Date.now();

    activeMatches.forEach((match) => {
      match.conn.socket.on('game_state', () => {
        totalGameStates++;
        const now = Date.now();
        gameStateIntervals.push(now - lastGameStateTime);
        lastGameStateTime = now;
      });
    });

    // Periodically check socket connection status
    const connectionCheckInterval = setInterval(() => {
      const connectedCount = sockets.filter((s) => s.connected).length;
      const disconnectedCount = sockets.length - connectedCount;
      if (disconnectedCount > 0) {
        console.log(
          `  ⚠️  Connection status: ${connectedCount}/${sockets.length} connected, ${disconnectedCount} disconnected`,
        );
      }
    }, 5000);

    // Wait for all games to complete or timeout
    const maxWaitTime = maxGameDuration + 5000; // Extra buffer
    const endTime = Date.now() + maxWaitTime;

    console.log(`⏰ Waiting for games to complete (max ${maxWaitTime / 1000}s)...\n`);

    // Poll every 10 seconds
    while (Date.now() < endTime && gameResults.length < activeMatches.length) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const completed = gameResults.length;
      const remaining = activeMatches.length - completed;

      console.log(
        `  [${elapsed}s] Games completed: ${completed}/${activeMatches.length}, Remaining: ${remaining}`,
      );
      console.log(`        Game state updates received: ${totalGameStates}`);
    }

    // Stop any remaining input simulations
    inputStopFunctions.forEach((stop) => stop());

    // Stop connection check interval
    clearInterval(connectionCheckInterval);

    console.log(`\n✅ Test completed after ${Math.floor((Date.now() - startTime) / 1000)}s\n`);

    // Step 6: Analyze results
    const completedGames = gameResults.filter((r) => r.success).length;
    const failedGames = gameResults.filter((r) => !r.success).length;

    console.log('📊 GAME RESULTS:');
    console.log(`  Completed:    ${completedGames}/${activeMatches.length}`);
    console.log(`  Failed/Timeout: ${failedGames}`);
    console.log(`  Total game state updates: ${totalGameStates}`);
    console.log('');

    // Report disconnections
    if (disconnections.length > 0) {
      console.log('⚠️  SOCKET DISCONNECTIONS DETECTED:');
      console.log(`  Total disconnections: ${disconnections.length}`);
      disconnections.forEach((disc, idx) => {
        const elapsed = Math.floor((disc.timestamp - startTime) / 1000);
        console.log(`  ${idx + 1}. ${disc.username} - ${disc.reason} (at ${elapsed}s)`);
      });
      console.log('');
    } else {
      console.log('✅ NO UNEXPECTED DISCONNECTIONS\n');
    }

    // Calculate game state update frequency
    if (gameStateIntervals.length > 0) {
      const avgInterval =
        gameStateIntervals.reduce((a, b) => a + b, 0) / gameStateIntervals.length;
      const avgFrequency = 1000 / avgInterval; // Convert to Hz

      console.log('📡 GAME STATE BROADCAST:');
      console.log(`  Average frequency: ${avgFrequency.toFixed(1)} Hz`);
      console.log(`  Target: 120 Hz (active), 60 Hz (waiting)`);
      console.log(`  Status: ${avgFrequency >= 50 ? '✅ Good' : '⚠️ Below target'}`);
      console.log('');
    }

    // Step 7: Cleanup
    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('✅ All users disconnected\n');

    // Generate report
    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    // Save results
    const avgGameStateInterval =
      gameStateIntervals.length > 0
        ? gameStateIntervals.reduce((a, b) => a + b, 0) / gameStateIntervals.length
        : 0;

    const results = {
      testName: 'Pong Concurrent Games Test',
      timestamp: new Date().toISOString(),
      config: {
        numGames,
        inputRate,
        maxGameDuration,
      },
      summary: {
        gamesCreated: activeMatches.length,
        gamesCompleted: completedGames,
        gamesFailed: failedGames,
        totalGameStateUpdates: totalGameStates,
        avgGameStateFrequency: avgGameStateInterval > 0 ? 1000 / avgGameStateInterval : 0,
        testDuration: Date.now() - startTime,
      },
      metrics: report,
      success:
        completedGames >= activeMatches.length * 0.8 && // At least 80% completion
        (avgGameStateInterval > 0 ? 1000 / avgGameStateInterval >= 50 : true), // At least 50Hz
    };

    saveResults(results, 'pong-concurrent-games');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Server handled concurrent games successfully!');
      console.log(`     ${completedGames}/${activeMatches.length} games completed`);
      console.log(`     Game state frequency: ${results.summary.avgGameStateFrequency.toFixed(1)} Hz`);
      console.log(`     ${totalGameStates} total updates delivered`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (completedGames < activeMatches.length * 0.8) {
        console.log(`     - Low completion rate: ${completedGames}/${activeMatches.length}`);
      }
      if (results.summary.avgGameStateFrequency < 50) {
        console.log(
          `     - Low update frequency: ${results.summary.avgGameStateFrequency.toFixed(1)} Hz (target 50+ Hz)`,
        );
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Concurrent games test failed:', error.message);
    console.error(error.stack);

    // Cleanup on error
    inputStopFunctions.forEach((stop) => stop());
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
    if (key === '--games') options.numGames = parseInt(value, 10);
    if (key === '--input-rate') options.inputRate = parseInt(value, 10);
    if (key === '--max-duration') options.maxGameDuration = parseInt(value, 10) * 1000;
  });

  runConcurrentGamesTest(options)
    .then((results) => {
      console.log('✅ Concurrent games test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Concurrent games test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runConcurrentGamesTest };
