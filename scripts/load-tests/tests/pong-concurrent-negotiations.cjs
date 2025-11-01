#!/usr/bin/env node
// scripts/load-tests/tests/pong-concurrent-negotiations.cjs
// Concurrent negotiations test - test many lobbies negotiating simultaneously

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  proposeWager,
  acceptWager,
  sendChatMessage,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

async function runConcurrentNegotiationsTest(options = {}) {
  const { numLobbies = 30 } = options;
  const totalPlayers = numLobbies * 2;

  console.log('\n🏗️  PONG CONCURRENT NEGOTIATIONS TEST');
  console.log('═'.repeat(80));
  console.log(`  Concurrent lobbies:  ${numLobbies}`);
  console.log(`  Total players:       ${totalPlayers}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];

  try {
    console.log(`📝 Creating ${totalPlayers} test users...`);
    const users = await createTestUsers(totalPlayers);
    const connections = await createMultipleConnections(users);
    const successfulConnections = connections.filter((c) => c.success);

    successfulConnections.forEach((conn) => {
      sockets.push(conn.socket);
      cleanupFunctions.push(trackSocketMetrics(conn.socket, metrics));
    });

    console.log(`✅ ${successfulConnections.length} users connected\n`);

    console.log(`🎮 Creating ${numLobbies} lobbies...\n`);

    const lobbies = [];
    for (let i = 0; i < numLobbies && i * 2 + 1 < successfulConnections.length; i++) {
      try {
        const player1 = successfulConnections[i * 2];
        const player2 = successfulConnections[i * 2 + 1];

        // Wait for lobby broadcast before joining
        let lobbyId = null;
        const lobbyPromise = new Promise((resolve) => {
          player2.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === player1.player.id);
            if (lobby) resolve(lobby.id);
            else resolve(null);
          });
        });

        const matchData = await createPVPMatch(player1.socket, 100);

        lobbyId = await Promise.race([
          lobbyPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (lobbyId) {
          await joinMatch(player2.socket, lobbyId);
        }

        lobbies.push({
          gameId: matchData.gameId,
          player1,
          player2,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        metrics.recordError(error);
      }
    }

    console.log(`✅ ${lobbies.length} lobbies created\n`);

    console.log(`💰 Starting concurrent negotiations with chat...\n`);

    // All lobbies negotiate + chat simultaneously
    const negotiationPromises = lobbies.map(async (lobby, index) => {
      try {
        // Send chat message
        await sendChatMessage(lobby.player1.socket, lobby.gameId, `Negotiating ${index}`);

        // Propose and accept
        await proposeWager(lobby.player2.socket, lobby.gameId, 150);
        await acceptWager(lobby.player1.socket, lobby.gameId);
        await acceptWager(lobby.player2.socket, lobby.gameId);

        return { success: true };
      } catch (error) {
        metrics.recordError(error);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(negotiationPromises);
    const successCount = results.filter((r) => r.success).length;

    console.log(`✅ ${successCount}/${lobbies.length} negotiations completed\n`);

    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    const report = metrics.getReport();
    const testResults = {
      testName: 'Pong Concurrent Negotiations Test',
      timestamp: new Date().toISOString(),
      config: { numLobbies },
      summary: {
        lobbiesCreated: lobbies.length,
        successfulNegotiations: successCount,
        testDuration: Date.now() - startTime,
      },
      metrics: report,
      success: successCount >= lobbies.length * 0.85,
    };

    saveResults(testResults, 'pong-concurrent-negotiations');

    console.log(testResults.success ? '✅ TEST PASSED\n' : '⚠️  TEST FAILED\n');
    return testResults;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);
    throw error;
  }
}

if (require.main === module) {
  runConcurrentNegotiationsTest()
    .then((results) => process.exit(results.success ? 0 : 1))
    .catch(() => process.exit(1));
}

module.exports = { runConcurrentNegotiationsTest };
