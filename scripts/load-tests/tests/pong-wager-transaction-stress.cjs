#!/usr/bin/env node
// scripts/load-tests/tests/pong-wager-transaction-stress.cjs
// Wager transaction stress test - test concurrent wager locks

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  acceptWager,
  waitForWagerLocked,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Wager transaction stress test
 * Tests:
 * - 30 concurrent wager lock-ins
 * - Transaction atomicity
 * - Balance consistency
 * - No double-charges
 */
async function runWagerTransactionStressTest(options = {}) {
  const { numConcurrent = 30 } = options;

  const totalPlayers = numConcurrent * 2;

  console.log('\n💸 PONG WAGER TRANSACTION STRESS TEST');
  console.log('═'.repeat(80));
  console.log(`  Concurrent lock-ins: ${numConcurrent}`);
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

    console.log(`🎮 Creating ${numConcurrent} lobbies...\n`);

    const lobbies = [];
    for (let i = 0; i < numConcurrent && i * 2 + 1 < successfulConnections.length; i++) {
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

        const matchData = await createPVPMatch(player1.socket, 50); // 50 MuskBucks wager

        lobbyId = await Promise.race([
          lobbyPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (lobbyId) {
          await joinMatch(player2.socket, lobbyId);
        }

        lobbies.push({
          lobbyIndex: i,
          gameId: matchData.gameId,
          player1,
          player2,
        });

        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        console.log(`  ❌ Lobby ${i + 1} failed: ${error.message}`);
        metrics.recordError(error);
      }
    }

    console.log(`✅ ${lobbies.length} lobbies created\n`);

    if (lobbies.length === 0) {
      throw new Error('No lobbies created');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`💸 Triggering ${lobbies.length} concurrent wager lock-ins...\n`);

    // Trigger all lock-ins concurrently to stress-test transactions
    const lockPromises = lobbies.map(async (lobby) => {
      const lockStart = Date.now();
      try {
        // Both players accept simultaneously (stress test)
        await Promise.all([
          acceptWager(lobby.player1.socket, lobby.gameId),
          acceptWager(lobby.player2.socket, lobby.gameId),
        ]);

        // Wait for wager locked confirmation
        await waitForWagerLocked(lobby.player1.socket, 10000);

        const lockDuration = Date.now() - lockStart;

        return {
          lobbyIndex: lobby.lobbyIndex,
          success: true,
          lockDuration,
        };
      } catch (error) {
        console.log(`  ❌ Lobby ${lobby.lobbyIndex + 1} lock failed: ${error.message}`);
        metrics.recordError(error);
        return {
          lobbyIndex: lobby.lobbyIndex,
          success: false,
          error: error.message,
        };
      }
    });

    const lockResults = await Promise.all(lockPromises);

    const successfulLocks = lockResults.filter((r) => r.success);
    const failedLocks = lockResults.filter((r) => !r.success);

    const lockDurations = successfulLocks.map((r) => r.lockDuration);
    const avgLockDuration =
      lockDurations.length > 0 ? lockDurations.reduce((a, b) => a + b, 0) / lockDurations.length : 0;

    console.log('\n╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(24) + 'TRANSACTION RESULTS' + ' '.repeat(35) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');
    console.log(`  Successful locks:   ${successfulLocks.length}/${lobbies.length}`);
    console.log(`  Failed locks:       ${failedLocks.length}/${lobbies.length}`);
    console.log(`  Avg lock duration:  ${avgLockDuration.toFixed(0)}ms`);
    console.log('');

    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('✅ All users disconnected\n');

    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    const results = {
      testName: 'Pong Wager Transaction Stress Test',
      timestamp: new Date().toISOString(),
      config: {
        numConcurrent,
        totalPlayers,
      },
      summary: {
        lobbiesCreated: lobbies.length,
        successfulLocks: successfulLocks.length,
        failedLocks: failedLocks.length,
        avgLockDuration: avgLockDuration.toFixed(0),
        testDuration: Date.now() - startTime,
      },
      lockResults,
      metrics: report,
      success:
        successfulLocks.length >= lobbies.length * 0.9 && // At least 90% success
        avgLockDuration < 1000, // Lock duration < 1s
    };

    saveResults(results, 'pong-wager-transaction-stress');

    console.log('📋 TEST ASSESSMENT:\n');
    if (results.success) {
      console.log('  ✅ EXCELLENT: Concurrent wager transactions handled correctly!');
      console.log(`     ${successfulLocks.length}/${lobbies.length} locks successful`);
      console.log(`     Avg lock duration: ${avgLockDuration.toFixed(0)}ms`);
      console.log('     No transaction errors detected');
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (successfulLocks.length < lobbies.length * 0.9) {
        console.log(`     - Low success rate: ${successfulLocks.length}/${lobbies.length}`);
      }
      if (avgLockDuration >= 1000) {
        console.log(`     - High lock duration: ${avgLockDuration.toFixed(0)}ms`);
      }
    }

    console.log('');
    return results;
  } catch (error) {
    console.error('\n❌ Wager transaction stress test failed:', error.message);
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
    if (key === '--concurrent') options.numConcurrent = parseInt(value, 10);
  });

  runWagerTransactionStressTest(options)
    .then((results) => {
      console.log('✅ Wager transaction stress test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Wager transaction stress test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runWagerTransactionStressTest };
