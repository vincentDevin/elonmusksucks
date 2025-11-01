#!/usr/bin/env node
// scripts/load-tests/tests/pong-lobby-chat-load.cjs
// Lobby chat load test - test chat system under load

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  spectateMatch,
  sendChatMessage,
  monitorChatMessages,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Lobby chat load test
 * Tests:
 * - Multiple active lobbies with concurrent chat
 * - Many messages per lobby
 * - Mix of player and spectator messages
 * - Chat rate limiting (3 messages/5s)
 * - Chat history delivery
 * - Message broadcast latency
 */
async function runLobbyChatLoadTest(options = {}) {
  const { numLobbies = 10, messagesPerLobby = 50 } = options;

  const totalPlayers = numLobbies * 2; // 2 players per lobby
  const totalSpectators = numLobbies * 1; // 1 spectator per lobby
  const totalUsers = totalPlayers + totalSpectators;

  console.log('\n💬 PONG LOBBY CHAT LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  Lobbies:             ${numLobbies}`);
  console.log(`  Players:             ${totalPlayers}`);
  console.log(`  Spectators:          ${totalSpectators}`);
  console.log(`  Messages per lobby:  ${messagesPerLobby}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];
  const chatResults = [];

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

    if (successfulConnections.length < totalUsers * 0.9) {
      throw new Error('Too many connection failures, aborting test');
    }

    // Step 3: Create lobbies with players and spectators
    console.log(`🎮 Creating ${numLobbies} lobbies with players and spectators...\n`);

    const lobbies = [];

    for (let i = 0; i < numLobbies; i++) {
      const player1Index = i * 2;
      const player2Index = i * 2 + 1;
      const spectatorIndex = totalPlayers + i;

      if (
        player1Index >= successfulConnections.length ||
        player2Index >= successfulConnections.length ||
        spectatorIndex >= successfulConnections.length
      ) {
        console.log(`  ⚠️  Not enough users for lobby ${i + 1}, skipping`);
        break;
      }

      try {
        const player1 = successfulConnections[player1Index];
        const player2 = successfulConnections[player2Index];
        const spectator = successfulConnections[spectatorIndex];

        // Create lobby
        let lobbyId = null;
        const lobbyPromise = new Promise((resolve) => {
          player2.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === player1.player.id);
            if (lobby) {
              lobbyId = lobby.id;
              resolve(lobby.id);
            } else {
              resolve(null);
            }
          });
        });

        const matchData = await createPVPMatch(player1.socket, 100);

        await Promise.race([
          lobbyPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (!lobbyId) {
          throw new Error('Failed to get lobbyId');
        }

        // Player 2 joins
        await joinMatch(player2.socket, lobbyId);

        // Spectator joins
        await spectateMatch(spectator.socket, matchData.gameId);

        lobbies.push({
          lobbyIndex: i,
          gameId: matchData.gameId,
          player1,
          player2,
          spectator,
        });

        if ((i + 1) % 3 === 0) {
          console.log(`  ✅ Created ${i + 1}/${numLobbies} lobbies`);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`  ❌ Lobby ${i + 1} creation failed: ${error.message}`);
        metrics.recordError(error);
      }
    }

    console.log(`\n✅ ${lobbies.length}/${numLobbies} lobbies created with players and spectators\n`);

    if (lobbies.length === 0) {
      throw new Error('No lobbies created successfully');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Chat load test
    console.log(`💬 Starting chat load test (${messagesPerLobby} messages per lobby)...\n`);

    for (const lobby of lobbies) {
      const chatStart = Date.now();
      const messageLatencies = [];
      let sentCount = 0;
      let receivedCount = 0;
      let rateLimitErrors = 0;

      try {
        console.log(`  💬 Lobby ${lobby.lobbyIndex + 1}: Sending ${messagesPerLobby} messages...`);

        // Track messages received
        const cleanupChat1 = monitorChatMessages(lobby.player1.socket, () => {
          receivedCount++;
        });
        const cleanupChat2 = monitorChatMessages(lobby.player2.socket, () => {
          receivedCount++;
        });
        const cleanupChatSpectator = monitorChatMessages(lobby.spectator.socket, () => {
          receivedCount++;
        });

        // Track rate limit errors
        const errorHandler = (error) => {
          if (error.code === 'RATE_LIMIT') {
            rateLimitErrors++;
          }
        };

        lobby.player1.socket.on('error', errorHandler);
        lobby.player2.socket.on('error', errorHandler);
        lobby.spectator.socket.on('error', errorHandler);

        // Send messages (alternating between player1, player2, spectator)
        for (let i = 0; i < messagesPerLobby; i++) {
          const sender = i % 3 === 0 ? lobby.player1 : i % 3 === 1 ? lobby.player2 : lobby.spectator;
          const senderName = i % 3 === 0 ? 'P1' : i % 3 === 1 ? 'P2' : 'SP';

          const messageStart = Date.now();

          try {
            await sendChatMessage(sender.socket, lobby.gameId, `${senderName} message ${i}`);
            sentCount++;
            const latency = Date.now() - messageStart;
            messageLatencies.push(latency);
          } catch (error) {
            // Ignore send errors, we're tracking via error event
          }

          // Respect rate limit: wait at least 1.7s for every 3 messages
          if ((i + 1) % 3 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1700));
          } else {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // Wait for final messages
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const chatDuration = Date.now() - chatStart;
        const avgLatency =
          messageLatencies.length > 0
            ? messageLatencies.reduce((a, b) => a + b, 0) / messageLatencies.length
            : 0;

        chatResults.push({
          lobbyIndex: lobby.lobbyIndex,
          success: true,
          sentCount,
          receivedCount,
          rateLimitErrors,
          avgLatency,
          chatDuration,
        });

        console.log(
          `     Sent: ${sentCount}, Received: ${receivedCount}, Rate limits: ${rateLimitErrors}, Avg latency: ${avgLatency.toFixed(0)}ms`,
        );
        console.log(`  ✅ Lobby ${lobby.lobbyIndex + 1}: Chat test complete (${chatDuration}ms)\n`);

        // Cleanup
        cleanupChat1();
        cleanupChat2();
        cleanupChatSpectator();
        lobby.player1.socket.off('error', errorHandler);
        lobby.player2.socket.off('error', errorHandler);
        lobby.spectator.socket.off('error', errorHandler);
      } catch (error) {
        console.log(`  ❌ Lobby ${lobby.lobbyIndex + 1} chat test failed: ${error.message}\n`);
        metrics.recordError(error);
        chatResults.push({
          lobbyIndex: lobby.lobbyIndex,
          success: false,
          error: error.message,
        });
      }
    }

    // Step 5: Analyze results
    const successfulChats = chatResults.filter((r) => r.success);
    const failedChats = chatResults.filter((r) => !r.success);

    const totalSent = successfulChats.reduce((sum, r) => sum + r.sentCount, 0);
    const totalReceived = successfulChats.reduce((sum, r) => sum + r.receivedCount, 0);
    const totalRateLimits = successfulChats.reduce((sum, r) => sum + r.rateLimitErrors, 0);

    const allLatencies = successfulChats.flatMap((r) => r.avgLatency);
    const avgOverallLatency =
      allLatencies.length > 0 ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length : 0;

    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(28) + 'CHAT RESULTS' + ' '.repeat(38) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');
    console.log(`  Successful lobbies:    ${successfulChats.length}/${lobbies.length}`);
    console.log(`  Failed lobbies:        ${failedChats.length}`);
    console.log(`  Total messages sent:   ${totalSent}`);
    console.log(`  Total messages received: ${totalReceived}`);
    console.log(`  Rate limit hits:       ${totalRateLimits}`);
    console.log(`  Avg message latency:   ${avgOverallLatency.toFixed(0)}ms`);
    console.log('');

    // Step 6: Cleanup
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
      testName: 'Pong Lobby Chat Load Test',
      timestamp: new Date().toISOString(),
      config: {
        numLobbies,
        messagesPerLobby,
        totalUsers,
      },
      summary: {
        lobbiesCreated: lobbies.length,
        successfulChats: successfulChats.length,
        failedChats: failedChats.length,
        totalSent,
        totalReceived,
        totalRateLimits,
        avgOverallLatency: avgOverallLatency.toFixed(0),
        testDuration: Date.now() - startTime,
      },
      chatResults,
      metrics: report,
      success:
        successfulChats.length >= lobbies.length * 0.9 && // At least 90% success
        avgOverallLatency < 150 && // Avg latency < 150ms
        totalRateLimits > 0, // Rate limiting is working
    };

    saveResults(results, 'pong-lobby-chat-load');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Lobby chat system handled load successfully!');
      console.log(`     ${successfulChats.length}/${lobbies.length} lobbies completed`);
      console.log(`     ${totalSent} messages sent, ${totalReceived} received`);
      console.log(`     Avg message latency: ${avgOverallLatency.toFixed(0)}ms`);
      console.log(`     Rate limiting active (${totalRateLimits} blocks)`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (successfulChats.length < lobbies.length * 0.9) {
        console.log(`     - Low success rate: ${successfulChats.length}/${lobbies.length}`);
      }
      if (avgOverallLatency >= 150) {
        console.log(`     - High message latency: ${avgOverallLatency.toFixed(0)}ms`);
      }
      if (totalRateLimits === 0) {
        console.log('     - Rate limiting not working');
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Lobby chat load test failed:', error.message);
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
    if (key === '--lobbies') options.numLobbies = parseInt(value, 10);
    if (key === '--messages') options.messagesPerLobby = parseInt(value, 10);
  });

  runLobbyChatLoadTest(options)
    .then((results) => {
      console.log('✅ Lobby chat load test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Lobby chat load test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runLobbyChatLoadTest };
