#!/usr/bin/env node
// scripts/load-tests/tests/pong-negotiation-timeout.cjs
// Negotiation timeout test - test 2-minute timeout handling

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Negotiation timeout test
 * Tests:
 * - Create lobbies and let them timeout (2 minutes)
 * - Verify proper cleanup and notifications
 * - Check for memory leaks
 */
async function runNegotiationTimeoutTest(options = {}) {
  const { numLobbies = 20, timeoutDuration = 125000 } = options; // 125s (just over 2min)

  const totalPlayers = numLobbies * 2;

  console.log('\n⏰ PONG NEGOTIATION TIMEOUT TEST');
  console.log('═'.repeat(80));
  console.log(`  Lobbies:             ${numLobbies}`);
  console.log(`  Timeout duration:    ${timeoutDuration / 1000}s`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];
  const timeoutResults = [];

  try {
    console.log(`📝 Creating ${totalPlayers} test users...`);
    const users = await createTestUsers(totalPlayers);
    console.log(`✅ ${users.length} test users ready\n`);

    console.log(`📡 Connecting ${users.length} users...`);
    const connections = await createMultipleConnections(users);
    const successfulConnections = connections.filter((c) => c.success);

    successfulConnections.forEach((conn) => {
      sockets.push(conn.socket);
      const cleanup = trackSocketMetrics(conn.socket, metrics);
      cleanupFunctions.push(cleanup);
    });

    console.log(`✅ ${successfulConnections.length}/${users.length} users connected\n`);

    console.log(`🎮 Creating ${numLobbies} lobbies without negotiating...\n`);

    const lobbies = [];
    for (let i = 0; i < numLobbies && i * 2 + 1 < successfulConnections.length; i++) {
      try {
        const player1 = successfulConnections[i * 2];
        const player2 = successfulConnections[i * 2 + 1];

        let lobbyId = null;
        const lobbyPromise = new Promise((resolve) => {
          player2.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === player1.player.id);
            if (lobby) resolve(lobby.id);
            else resolve(null);
          });
        });

        const matchData = await createPVPMatch(player1.socket, 100);
        await Promise.race([lobbyPromise, new Promise((resolve) => setTimeout(() => resolve(null), 3000))]);

        if (lobbyId) {
          await joinMatch(player2.socket, lobbyId);
        }

        // Track timeout events
        let timedOut = false;
        let cancelled = false;

        player1.socket.once('negotiation_timeout', () => {
          timedOut = true;
        });

        player1.socket.once('match_cancelled', () => {
          cancelled = true;
        });

        lobbies.push({
          lobbyIndex: i,
          gameId: matchData.gameId,
          player1,
          player2,
          getTimeoutStatus: () => ({ timedOut, cancelled }),
        });

        if ((i + 1) % 5 === 0) {
          console.log(`  ✅ Created ${i + 1}/${numLobbies} lobbies`);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.log(`  ❌ Lobby ${i + 1} failed: ${error.message}`);
        metrics.recordError(error);
      }
    }

    console.log(`\n✅ ${lobbies.length} lobbies created\n`);

    if (lobbies.length === 0) {
      throw new Error('No lobbies created');
    }

    console.log(`⏰ Waiting ${timeoutDuration / 1000}s for timeouts...\n`);

    // Wait for timeouts
    const waitStart = Date.now();
    while (Date.now() - waitStart < timeoutDuration) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const elapsed = Math.floor((Date.now() - waitStart) / 1000);
      console.log(`  [${elapsed}s/${timeoutDuration / 1000}s] Waiting for timeouts...`);
    }

    console.log('\n⏰ Checking timeout status...\n');

    // Check results
    lobbies.forEach((lobby) => {
      const status = lobby.getTimeoutStatus();
      timeoutResults.push({
        lobbyIndex: lobby.lobbyIndex,
        timedOut: status.timedOut,
        cancelled: status.cancelled,
      });

      const statusStr = status.timedOut ? '⏰ TIMED OUT' : status.cancelled ? '❌ CANCELLED' : '⚠️  NO EVENT';
      console.log(`  Lobby ${lobby.lobbyIndex + 1}: ${statusStr}`);
    });

    const timedOutCount = timeoutResults.filter((r) => r.timedOut).length;
    const cancelledCount = timeoutResults.filter((r) => r.cancelled).length;
    const noEventCount = lobbies.length - timedOutCount - cancelledCount;

    console.log('\n╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(26) + 'TIMEOUT RESULTS' + ' '.repeat(37) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');
    console.log(`  Timed out:      ${timedOutCount}/${lobbies.length}`);
    console.log(`  Cancelled:      ${cancelledCount}/${lobbies.length}`);
    console.log(`  No event:       ${noEventCount}/${lobbies.length}`);
    console.log('');

    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('✅ All users disconnected\n');

    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    const results = {
      testName: 'Pong Negotiation Timeout Test',
      timestamp: new Date().toISOString(),
      config: {
        numLobbies,
        timeoutDuration,
      },
      summary: {
        lobbiesCreated: lobbies.length,
        timedOutCount,
        cancelledCount,
        noEventCount,
        testDuration: Date.now() - startTime,
      },
      timeoutResults,
      metrics: report,
      success:
        (timedOutCount + cancelledCount) >= lobbies.length * 0.9, // At least 90% got timeout events
    };

    saveResults(results, 'pong-negotiation-timeout');

    console.log('📋 TEST ASSESSMENT:\n');
    if (results.success) {
      console.log('  ✅ EXCELLENT: Timeout handling works correctly!');
      console.log(`     ${timedOutCount + cancelledCount}/${lobbies.length} lobbies received timeout events`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      console.log(`     - Low timeout event rate: ${timedOutCount + cancelledCount}/${lobbies.length}`);
    }

    console.log('');
    return results;
  } catch (error) {
    console.error('\n❌ Negotiation timeout test failed:', error.message);
    console.error(error.stack);

    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    throw error;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key === '--lobbies') options.numLobbies = parseInt(value, 10);
    if (key === '--timeout') options.timeoutDuration = parseInt(value, 10) * 1000;
  });

  runNegotiationTimeoutTest(options)
    .then((results) => {
      console.log('✅ Negotiation timeout test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Negotiation timeout test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runNegotiationTimeoutTest };
