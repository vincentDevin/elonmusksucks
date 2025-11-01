#!/usr/bin/env node
// scripts/load-tests/tests/pong-spectator-load.cjs
// Spectator load test - test many spectators watching active games

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createAIMatch,
  createPVPMatch,
  joinMatch,
  setReady,
  spectateMatch,
  monitorChatMessages,
  sendChatMessage,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Spectator load test
 * Tests:
 * - Multiple spectators joining active games
 * - Spectators joining lobbies in negotiation phase
 * - Spectator chat participation in lobbies
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

    // Step 4.5: Test lobby phase spectators (PVP lobbies in negotiation)
    console.log('👀 Testing lobby phase spectators...\n');

    // Create 2 PVP lobbies for negotiation phase testing
    const lobbyTestUsers = await createTestUsers(6); // 2 lobbies × (2 players + 1 spectator)
    const lobbyConnections = await createMultipleConnections(lobbyTestUsers);
    const successfulLobbyConnections = lobbyConnections.filter((c) => c.success);

    successfulLobbyConnections.forEach((conn) => {
      allSockets.push(conn.socket);
      const cleanup = trackSocketMetrics(conn.socket, metrics);
      cleanupFunctions.push(cleanup);
    });

    if (successfulLobbyConnections.length >= 6) {
      // Create 2 PVP lobbies
      const lobby1Player1 = successfulLobbyConnections[0];
      const lobby1Player2 = successfulLobbyConnections[1];
      const lobby1Spectator = successfulLobbyConnections[2];
      const lobby2Player1 = successfulLobbyConnections[3];
      const lobby2Player2 = successfulLobbyConnections[4];
      const lobby2Spectator = successfulLobbyConnections[5];

      try {
        // Lobby 1
        console.log('  🎮 Creating lobby 1...');
        const match1 = await createPVPMatch(lobby1Player1.socket, 50);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Find lobby ID
        let lobbyId1 = null;
        const lobbyPromise1 = new Promise((resolve) => {
          lobby1Player2.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === lobby1Player1.player.id);
            if (lobby) {
              lobbyId1 = lobby.id;
              resolve(lobby.id);
            }
          });
          lobby1Player2.socket.emit('join_lobby');
        });

        await Promise.race([lobbyPromise1, new Promise((resolve) => setTimeout(resolve, 2000))]);

        if (lobbyId1) {
          await joinMatch(lobby1Player2.socket, lobbyId1);
          console.log(`  ✅ Lobby 1 created: ${match1.gameId}`);

          // Spectator joins lobby in negotiation phase
          console.log('  👀 Spectator joining lobby 1 during negotiation...');
          const spectateStart = Date.now();
          await spectateMatch(lobby1Spectator.socket, match1.gameId);
          const spectateDuration = Date.now() - spectateStart;
          console.log(`  ✅ Spectator joined lobby 1 (${spectateDuration}ms)`);

          // Test spectator chat in lobby
          let chatMessagesReceived = 0;
          const chatCleanup = monitorChatMessages(lobby1Spectator.socket, () => {
            chatMessagesReceived++;
          });

          console.log('  💬 Spectator sending chat message...');
          await sendChatMessage(lobby1Spectator.socket, match1.gameId, 'Test spectator message')
            .catch((err) =>
              console.log(`  ⚠️  Spectator chat failed: ${err.message}`),
            );

          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log(`  💬 Spectator received ${chatMessagesReceived} chat messages\n`);
          chatCleanup();
        }

        // Lobby 2 (simplified)
        console.log('  🎮 Creating lobby 2...');
        const match2 = await createPVPMatch(lobby2Player1.socket, 75);
        await new Promise((resolve) => setTimeout(resolve, 500));

        let lobbyId2 = null;
        const lobbyPromise2 = new Promise((resolve) => {
          lobby2Player2.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === lobby2Player1.player.id);
            if (lobby) {
              lobbyId2 = lobby.id;
              resolve(lobby.id);
            }
          });
          lobby2Player2.socket.emit('join_lobby');
        });

        await Promise.race([lobbyPromise2, new Promise((resolve) => setTimeout(resolve, 2000))]);

        if (lobbyId2) {
          await joinMatch(lobby2Player2.socket, lobbyId2);
          console.log(`  ✅ Lobby 2 created: ${match2.gameId}`);

          await spectateMatch(lobby2Spectator.socket, match2.gameId);
          console.log(`  ✅ Spectator joined lobby 2\n`);
        }

        console.log('✅ Lobby phase spectator test complete\n');
      } catch (error) {
        console.log(`⚠️  Lobby spectator test error: ${error.message}\n`);
        metrics.recordError(error);
      }
    } else {
      console.log('⚠️  Not enough users for lobby spectator test, skipping\n');
    }

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
