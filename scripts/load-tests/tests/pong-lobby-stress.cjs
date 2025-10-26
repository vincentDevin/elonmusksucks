#!/usr/bin/env node
// scripts/load-tests/tests/pong-lobby-stress.cjs
// Lobby stress test - simulate many concurrent users in lobby

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  joinLobby,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Lobby stress test - simulates many users browsing lobby simultaneously
 * Tests:
 * - Connection handling under load
 * - Lobby state broadcast performance
 * - Connection tracking (no stale socket IDs)
 * - Memory usage stability
 */
async function runLobbyStressTest(options = {}) {
  const { numUsers = 50, duration = 30000, refreshInterval = 5000 } = options;

  console.log('\n🏓 PONG LOBBY STRESS TEST');
  console.log('═'.repeat(80));
  console.log(`  Concurrent users:     ${numUsers}`);
  console.log(`  Test duration:        ${duration / 1000}s`);
  console.log(`  Lobby refresh:        every ${refreshInterval / 1000}s`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];

  try {
    // Step 1: Create test users
    console.log(`📝 Creating ${numUsers} test users...`);
    const users = await createTestUsers(numUsers);

    if (users.length < numUsers) {
      console.log(`⚠️  Warning: Only created ${users.length}/${numUsers} users`);
    }
    console.log(`✅ ${users.length} test users ready\n`);

    // Step 2: Connect all users to pong server
    console.log(`📡 Connecting ${users.length} users to pong server...`);
    const connectionStart = Date.now();
    const connections = await createMultipleConnections(users);

    // Track successful connections
    const successfulConnections = connections.filter((c) => c.success);
    successfulConnections.forEach((conn) => {
      sockets.push(conn.socket);
      // Track metrics for each socket
      const cleanup = trackSocketMetrics(conn.socket, metrics);
      cleanupFunctions.push(cleanup);
    });

    const connectionDuration = Date.now() - connectionStart;
    console.log(`✅ ${successfulConnections.length}/${users.length} users connected`);
    console.log(`   Connection time: ${connectionDuration}ms`);
    console.log('');

    if (successfulConnections.length === 0) {
      throw new Error('No users connected successfully');
    }

    // Step 3: All users join lobby
    console.log('🏓 All users joining lobby...');
    const lobbyJoinPromises = successfulConnections.map(async (conn) => {
      try {
        const lobbyState = await joinLobby(conn.socket);
        return { success: true, lobbies: lobbyState.lobbies.length };
      } catch (error) {
        metrics.recordError(error);
        return { success: false, error: error.message };
      }
    });

    const lobbyJoinResults = await Promise.all(lobbyJoinPromises);
    const successfulJoins = lobbyJoinResults.filter((r) => r.success).length;

    console.log(`✅ ${successfulJoins}/${successfulConnections.length} users in lobby\n`);

    // Step 4: Simulate users actively browsing lobby
    console.log(`🔄 Simulating active lobby browsing for ${duration / 1000}s...`);
    console.log('   Users will refresh lobby state periodically');
    console.log('   Monitoring connection stability and lobby updates\n');

    let lobbyRefreshCount = 0;
    let lobbyStateUpdateCount = 0;

    // Track lobby state updates
    successfulConnections.forEach((conn) => {
      conn.socket.on('lobby_state', () => {
        lobbyStateUpdateCount++;
      });
    });

    // Periodic lobby refresh
    const refreshIntervalId = setInterval(() => {
      // Random subset of users refresh (simulate realistic behavior)
      const refreshCount = Math.floor(successfulConnections.length * 0.3); // 30% refresh each cycle
      for (let i = 0; i < refreshCount; i++) {
        const randomIndex = Math.floor(Math.random() * successfulConnections.length);
        const conn = successfulConnections[randomIndex];
        joinLobby(conn.socket).catch((err) => metrics.recordError(err));
        lobbyRefreshCount++;
      }

      console.log(`  [${Math.floor((Date.now() - startTime) / 1000)}s] Lobby refreshes: ${lobbyRefreshCount}, Updates received: ${lobbyStateUpdateCount}`);
    }, refreshInterval);

    // Wait for test duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    clearInterval(refreshIntervalId);

    console.log('\n✅ Lobby stress test completed\n');
    console.log(`📊 Total lobby refreshes sent: ${lobbyRefreshCount}`);
    console.log(`📊 Total lobby state updates received: ${lobbyStateUpdateCount}`);
    console.log('');

    // Step 5: Cleanup - disconnect all users
    console.log('🔌 Disconnecting all users...');
    cleanupFunctions.forEach((cleanup) => cleanup());
    disconnectAll(sockets);

    // Wait for disconnections to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('✅ All users disconnected\n');

    // Generate metrics report
    const report = metrics.getReport();
    console.log(metrics.formatReport(report));

    // Calculate additional metrics
    const testDuration = Date.now() - startTime;
    const avgLobbyRefreshLatency =
      lobbyStateUpdateCount > 0 ? testDuration / lobbyStateUpdateCount : 0;

    // Save results
    const results = {
      testName: 'Pong Lobby Stress Test',
      timestamp: new Date().toISOString(),
      config: {
        numUsers,
        duration,
        refreshInterval,
      },
      summary: {
        usersCreated: users.length,
        usersConnected: successfulConnections.length,
        usersInLobby: successfulJoins,
        lobbyRefreshes: lobbyRefreshCount,
        lobbyUpdatesReceived: lobbyStateUpdateCount,
        testDuration,
      },
      metrics: report,
      success:
        successfulConnections.length >= numUsers * 0.95 &&
        report.connections.successRate >= 95 &&
        report.disconnections.unexpected === 0,
    };

    saveResults(results, 'pong-lobby-stress');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Lobby handled concurrent load successfully!');
      console.log(`     ${successfulConnections.length}/${numUsers} users connected (${report.connections.successRate.toFixed(1)}%)`);
      console.log(`     ${lobbyStateUpdateCount} lobby updates delivered`);
      console.log(`     ${report.disconnections.unexpected} unexpected disconnections`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (successfulConnections.length < numUsers * 0.95) {
        console.log(`     - Low connection rate: ${successfulConnections.length}/${numUsers}`);
      }
      if (report.connections.successRate < 95) {
        console.log(`     - Connection success rate below 95%: ${report.connections.successRate.toFixed(1)}%`);
      }
      if (report.disconnections.unexpected > 0) {
        console.log(`     - ${report.disconnections.unexpected} unexpected disconnections`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Lobby stress test failed:', error.message);
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
    if (key === '--users') options.numUsers = parseInt(value, 10);
    if (key === '--duration') options.duration = parseInt(value, 10) * 1000;
    if (key === '--refresh-interval') options.refreshInterval = parseInt(value, 10) * 1000;
  });

  runLobbyStressTest(options)
    .then((results) => {
      console.log('✅ Lobby stress test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Lobby stress test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runLobbyStressTest };
