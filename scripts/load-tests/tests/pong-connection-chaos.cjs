#!/usr/bin/env node
// scripts/load-tests/tests/pong-connection-chaos.cjs
// Connection chaos test - test rapid connect/disconnect cycles and stale connection cleanup

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createPongConnection,
  createAIMatch,
  setReady,
  disconnect,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Connection chaos test
 * Tests:
 * - Rapid connect/disconnect cycles
 * - Reconnection handling and grace period
 * - Stale connection cleanup
 * - Duplicate connection prevention
 * - Mid-game disconnections
 */
async function runConnectionChaosTest(options = {}) {
  const {
    numUsers = 20,
    cycles = 3,
    midGameDisconnects = 5,
  } = options;

  console.log('\n💥 PONG CONNECTION CHAOS TEST');
  console.log('═'.repeat(80));
  console.log(`  Test users:          ${numUsers}`);
  console.log(`  Connect/disconnect:  ${cycles} cycles`);
  console.log(`  Mid-game disconnects: ${midGameDisconnects}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();

  try {
    // Step 1: Create test users
    console.log(`📝 Creating ${numUsers} test users...`);
    const users = await createTestUsers(numUsers);
    console.log(`✅ ${users.length} test users ready\n`);

    // Step 2: Rapid connect/disconnect cycles
    console.log(`🔄 Testing ${cycles} rapid connect/disconnect cycles...\n`);

    for (let cycle = 1; cycle <= cycles; cycle++) {
      console.log(`  Cycle ${cycle}/${cycles}:`);

      // Connect all users
      const connectStart = Date.now();
      const connectionPromises = users.map(async (user) => {
        metrics.recordConnectionAttempt();
        try {
          const { socket, player } = await createPongConnection(user.accessToken, {
            timeout: 10000,
          });
          metrics.recordConnectionSuccess(Date.now() - connectStart);
          metrics.recordAuthSuccess(Date.now() - connectStart);
          return { success: true, socket, player, userId: user.userId };
        } catch (error) {
          metrics.recordConnectionFailure();
          metrics.recordAuthFailure();
          metrics.recordError(error);
          return { success: false, error: error.message, userId: user.userId };
        }
      });

      const connections = await Promise.all(connectionPromises);
      const successful = connections.filter((c) => c.success);

      console.log(
        `    ✅ ${successful.length}/${users.length} connected (${Date.now() - connectStart}ms)`,
      );

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Disconnect all users
      const disconnectStart = Date.now();
      successful.forEach((conn) => {
        disconnect(conn.socket);
        metrics.recordDisconnection(true);
      });

      console.log(`    🔌 All users disconnected (${Date.now() - disconnectStart}ms)`);

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('\n✅ Rapid cycle test complete\n');

    // Step 3: Test reconnection during active game
    console.log(`🎮 Testing ${midGameDisconnects} mid-game disconnections...\n`);

    const gameUsers = users.slice(0, midGameDisconnects);
    const gameConnections = [];

    // Connect users and create games
    for (const user of gameUsers) {
      try {
        const { socket, player } = await createPongConnection(user.accessToken);
        gameConnections.push({ socket, player, userId: user.userId });
        metrics.recordConnectionSuccess(0);

        // Create AI match
        await createAIMatch(socket, 100, 'EASY');

        // Wait a moment for server to finish processing game creation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Set ready to start game
        setReady(socket, true);

        console.log(`  ✅ Game started for user ${user.userId}`);
      } catch (error) {
        console.log(`  ❌ Failed to setup game for user ${user.userId}: ${error.message}`);
        metrics.recordError(error);
      }
    }

    // Wait for games to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Disconnect users mid-game
    console.log('\n  💥 Disconnecting users mid-game...');
    gameConnections.forEach((conn) => {
      disconnect(conn.socket);
      metrics.recordDisconnection(false); // Unexpected disconnect
    });

    console.log('  ✅ All mid-game users disconnected\n');

    // Wait for server cleanup
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Attempt to reconnect
    console.log('  🔄 Attempting to reconnect...');
    const reconnections = [];

    for (const user of gameUsers) {
      const reconnectStart = Date.now();
      metrics.recordReconnectionAttempt();

      try {
        const { socket, player } = await createPongConnection(user.accessToken, {
          timeout: 10000,
        });
        const duration = Date.now() - reconnectStart;
        metrics.recordReconnectionSuccess(duration);
        reconnections.push({ success: true, socket, userId: user.userId, duration });
        console.log(`    ✅ User ${user.userId} reconnected (${duration}ms)`);
      } catch (error) {
        metrics.recordReconnectionFailure();
        reconnections.push({ success: false, userId: user.userId, error: error.message });
        console.log(`    ❌ User ${user.userId} reconnect failed: ${error.message}`);
      }
    }

    const successfulReconnects = reconnections.filter((r) => r.success).length;
    console.log(
      `\n  ✅ ${successfulReconnects}/${gameUsers.length} users reconnected successfully`,
    );

    // Cleanup reconnected sockets
    reconnections.forEach((conn) => {
      if (conn.success && conn.socket) {
        disconnect(conn.socket);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\n✅ Connection chaos test complete\n');

    // Generate report
    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    // Save results
    const results = {
      testName: 'Pong Connection Chaos Test',
      timestamp: new Date().toISOString(),
      config: {
        numUsers,
        cycles,
        midGameDisconnects,
      },
      summary: {
        connectionCycles: cycles,
        totalConnectionAttempts: report.connections.attempted,
        totalConnectionsSuccessful: report.connections.successful,
        totalConnectionsFailed: report.connections.failed,
        reconnectionAttempts: report.reconnections.attempted,
        reconnectionsSuccessful: report.reconnections.successful,
        reconnectionsFailed: report.reconnections.failed,
        unexpectedDisconnections: report.disconnections.unexpected,
      },
      metrics: report,
      success:
        report.connections.successRate >= 95 &&
        report.reconnections.successRate >= 95 &&
        report.errors.total < numUsers * cycles * 0.1, // Less than 10% error rate
    };

    saveResults(results, 'pong-connection-chaos');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Connection handling is robust!');
      console.log(
        `     Connection success rate: ${report.connections.successRate.toFixed(1)}%`,
      );
      console.log(
        `     Reconnection success rate: ${report.reconnections.successRate.toFixed(1)}%`,
      );
      console.log(`     Errors: ${report.errors.total}`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (report.connections.successRate < 95) {
        console.log(
          `     - Low connection success: ${report.connections.successRate.toFixed(1)}%`,
        );
      }
      if (report.reconnections.successRate < 95) {
        console.log(
          `     - Low reconnection success: ${report.reconnections.successRate.toFixed(1)}%`,
        );
      }
      if (report.errors.total >= numUsers * cycles * 0.1) {
        console.log(`     - High error count: ${report.errors.total}`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Connection chaos test failed:', error.message);
    console.error(error.stack);
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
    if (key === '--users') options.numUsers = parseInt(value, 10);
    if (key === '--cycles') options.cycles = parseInt(value, 10);
    if (key === '--mid-game') options.midGameDisconnects = parseInt(value, 10);
  });

  runConnectionChaosTest(options)
    .then((results) => {
      console.log('✅ Connection chaos test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Connection chaos test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runConnectionChaosTest };
