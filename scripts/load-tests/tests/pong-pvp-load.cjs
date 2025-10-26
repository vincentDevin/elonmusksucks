#!/usr/bin/env node
// scripts/load-tests/tests/pong-pvp-load.cjs
// PVP load test - test player vs player matches under load

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  setReady,
  simulatePlayerInput,
  waitForGameEnd,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * PVP load test
 * Tests:
 * - Multiple concurrent PVP matches
 * - Match creation and joining
 * - Both players readying up
 * - Realistic player input from both sides
 * - Game completion and payout processing
 * - PVP-specific connection handling
 */
async function runPVPLoadTest(options = {}) {
  const { numMatches = 10, inputRate = 60, maxGameDuration = 120000 } = options;

  const totalPlayers = numMatches * 2; // 2 players per match

  console.log('\n⚔️  PONG PVP LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  PVP matches:         ${numMatches}`);
  console.log(`  Total players:       ${totalPlayers}`);
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
    // Step 1: Create test users (2 per match)
    console.log(`📝 Creating ${totalPlayers} test users (${numMatches} matches × 2 players)...`);
    const users = await createTestUsers(totalPlayers);
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

    if (successfulConnections.length < totalPlayers * 0.9) {
      throw new Error('Too many connection failures, aborting test');
    }

    // Step 3: Create PVP matches (first player creates, second joins)
    console.log(`⚔️  Creating ${numMatches} PVP matches...\n`);

    const matchPairs = [];
    for (let i = 0; i < numMatches; i++) {
      const player1Index = i * 2;
      const player2Index = i * 2 + 1;

      if (player1Index >= successfulConnections.length || player2Index >= successfulConnections.length) {
        console.log(`  ⚠️  Not enough players for match ${i + 1}, skipping`);
        break;
      }

      matchPairs.push({
        player1: successfulConnections[player1Index],
        player2: successfulConnections[player2Index],
        matchIndex: i,
      });
    }

    console.log(`📋 Creating ${matchPairs.length} match pairs...\n`);

    const matchCreationResults = [];

    // Create matches sequentially to avoid race conditions
    for (const pair of matchPairs) {
      try {
        console.log(
          `  🎮 Match ${pair.matchIndex + 1}: ${pair.player1.username} creating lobby...`,
        );

        // Listen for lobby_state BEFORE creating to catch the broadcast
        let lobbyId = null;
        const lobbyPromise = new Promise((resolve) => {
          pair.player2.socket.once('lobby_state', (data) => {
            // Find the lobby created by player1
            const lobby = data.lobbies.find((l) => l.creatorId === pair.player1.player.id);
            if (lobby) {
              lobbyId = lobby.id;
              resolve(lobby.id);
            } else {
              resolve(null);
            }
          });
        });

        // Player 1 creates the match (this triggers lobby_state broadcast)
        const matchData = await createPVPMatch(pair.player1.socket, 100);
        console.log(
          `     ✅ Match created: ${matchData.gameId} (wager: ${matchData.wager})`,
        );

        // Wait for lobby broadcast to get lobbyId
        await Promise.race([
          lobbyPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (!lobbyId) {
          throw new Error('Failed to get lobbyId from lobby broadcast');
        }

        console.log(`     📋 Found lobby: ${lobbyId}`);

        // Player 2 joins the match using lobbyId
        console.log(`     👥 ${pair.player2.username} joining lobby ${lobbyId}...`);
        const joinData = await joinMatch(pair.player2.socket, lobbyId);
        console.log(
          `     ✅ ${pair.player2.username} joined (pot: ${joinData.pot})`,
        );

        matchCreationResults.push({
          success: true,
          matchIndex: pair.matchIndex,
          gameId: matchData.gameId,
          player1: pair.player1,
          player2: pair.player2,
          wager: matchData.wager,
          pot: joinData.pot,
        });

        console.log(`  ✅ Match ${pair.matchIndex + 1} ready: ${pair.player1.username} vs ${pair.player2.username}\n`);

        // Add delay between matches to prevent race conditions with lobby broadcasts
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log(
          `  ❌ Match ${pair.matchIndex + 1} failed: ${error.message}\n`,
        );
        metrics.recordError(error);
        matchCreationResults.push({
          success: false,
          matchIndex: pair.matchIndex,
          error: error.message,
        });

        // Also delay on error to keep timing consistent
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const successfulMatches = matchCreationResults.filter((r) => r.success);
    console.log(
      `\n✅ ${successfulMatches.length}/${matchPairs.length} PVP matches created\n`,
    );

    if (successfulMatches.length === 0) {
      throw new Error('No PVP matches created successfully');
    }

    // Wait for server to finish processing all joins
    console.log('⏳ Waiting for server to finalize all matches...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Both players set ready for each match
    console.log('⏳ Both players setting ready for all matches...\n');

    // Track countdown events
    let countdownsReceived = 0;
    successfulMatches.forEach((match) => {
      match.player1.socket.once('countdown', (data) => {
        countdownsReceived++;
        console.log(
          `  📢 Match ${match.matchIndex + 1}: Countdown ${data.count || 'started'}`,
        );
      });

      // Wait a moment between each match readying up to avoid server overload
      setTimeout(() => {
        setReady(match.player1.socket, true);
        setTimeout(() => {
          setReady(match.player2.socket, true);
        }, 100);
      }, match.matchIndex * 200);
    });

    // Wait for all countdowns
    await new Promise((resolve) => setTimeout(resolve, successfulMatches.length * 200 + 4000));
    console.log(`\n✅ ${countdownsReceived} games started\n`);

    // Step 5: Simulate realistic player input for both players
    console.log(`🎮 Simulating player input (${inputRate} Hz) for both players...\n`);

    successfulMatches.forEach((match) => {
      // Player 1 input
      const stopInput1 = simulatePlayerInput(match.player1.socket, maxGameDuration, inputRate);
      inputStopFunctions.push(stopInput1);

      // Player 2 input
      const stopInput2 = simulatePlayerInput(match.player2.socket, maxGameDuration, inputRate);
      inputStopFunctions.push(stopInput2);

      // Track game completion
      const gameEndPromises = [
        waitForGameEnd(match.player1.socket, maxGameDuration)
          .then((result) => {
            const gameDuration = Date.now() - startTime;
            console.log(
              `  ✅ Match ${match.matchIndex + 1} completed: ${result.winner !== undefined ? `Winner slot ${result.winner}` : 'Draw'} (${(gameDuration / 1000).toFixed(1)}s)`,
            );
            console.log(
              `     ${match.player1.username}: ${result.scores[0]} | ${match.player2.username}: ${result.scores[1]}`,
            );
            gameResults.push({
              matchIndex: match.matchIndex,
              success: true,
              result,
              duration: gameDuration,
              player1: match.player1.username,
              player2: match.player2.username,
            });

            // Stop input for both players
            stopInput1();
            stopInput2();
          })
          .catch((error) => {
            console.log(`  ⚠️  Match ${match.matchIndex + 1} timeout/error: ${error.message}`);
            gameResults.push({
              matchIndex: match.matchIndex,
              success: false,
              error: error.message,
            });

            // Stop input
            stopInput1();
            stopInput2();
          }),
      ];

      Promise.all(gameEndPromises);
    });

    // Monitor game state updates
    let totalGameStates = 0;
    successfulMatches.forEach((match) => {
      match.player1.socket.on('game_state', () => {
        totalGameStates++;
      });
    });

    // Wait for all games to complete or timeout
    const maxWaitTime = maxGameDuration + 10000;
    const endTime = Date.now() + maxWaitTime;

    console.log(`⏰ Waiting for games to complete (max ${maxWaitTime / 1000}s)...\n`);

    while (Date.now() < endTime && gameResults.length < successfulMatches.length) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const completed = gameResults.length;
      const remaining = successfulMatches.length - completed;

      console.log(
        `  [${elapsed}s] Games completed: ${completed}/${successfulMatches.length}, Remaining: ${remaining}`,
      );
      console.log(`        Game state updates received: ${totalGameStates}`);
    }

    // Stop any remaining input simulations
    inputStopFunctions.forEach((stop) => stop());

    console.log(`\n✅ Test completed after ${Math.floor((Date.now() - startTime) / 1000)}s\n`);

    // Step 6: Analyze results
    const completedGames = gameResults.filter((r) => r.success).length;
    const failedGames = gameResults.filter((r) => !r.success).length;

    console.log('📊 GAME RESULTS:');
    console.log(`  Completed:      ${completedGames}/${successfulMatches.length}`);
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
    const results = {
      testName: 'Pong PVP Load Test',
      timestamp: new Date().toISOString(),
      config: {
        numMatches,
        totalPlayers,
        inputRate,
        maxGameDuration,
      },
      summary: {
        matchesCreated: successfulMatches.length,
        matchesCompleted: completedGames,
        matchesFailed: failedGames,
        totalGameStateUpdates: totalGameStates,
        disconnections: disconnections.length,
        testDuration: Date.now() - startTime,
      },
      gameResults,
      metrics: report,
      success:
        completedGames >= successfulMatches.length * 0.8 && // At least 80% completion
        disconnections.length === 0, // No unexpected disconnects
    };

    saveResults(results, 'pong-pvp-load');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: PVP matches handled successfully!');
      console.log(`     ${completedGames}/${successfulMatches.length} matches completed`);
      console.log(`     No unexpected disconnections`);
      console.log(`     ${totalGameStates} total game state updates delivered`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (completedGames < successfulMatches.length * 0.8) {
        console.log(`     - Low completion rate: ${completedGames}/${successfulMatches.length}`);
      }
      if (disconnections.length > 0) {
        console.log(`     - Unexpected disconnections: ${disconnections.length}`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ PVP load test failed:', error.message);
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
    if (key === '--matches') options.numMatches = parseInt(value, 10);
    if (key === '--input-rate') options.inputRate = parseInt(value, 10);
    if (key === '--max-duration') options.maxGameDuration = parseInt(value, 10) * 1000;
  });

  runPVPLoadTest(options)
    .then((results) => {
      console.log('✅ PVP load test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ PVP load test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runPVPLoadTest };
