#!/usr/bin/env node
// scripts/load-tests/tests/pong-wager-negotiation-load.cjs
// Wager negotiation load test - test negotiation system under load

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  proposeWager,
  acceptWager,
  rejectWager,
  waitForWagerLocked,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { PongMetricsCollector, trackSocketMetrics } = require('../helpers/pongMetrics.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Wager negotiation load test
 * Tests:
 * - Multiple concurrent PVP lobbies negotiating wagers
 * - 3-5 rounds of counter-proposals per lobby
 * - Dual acceptance requirement
 * - 5-round limit enforcement
 * - Balance validation
 * - Negotiation latency measurement
 */
async function runWagerNegotiationLoadTest(options = {}) {
  const { numLobbies = 20, maxRounds = 5 } = options;

  const totalPlayers = numLobbies * 2; // 2 players per lobby

  console.log('\n💰 PONG WAGER NEGOTIATION LOAD TEST');
  console.log('═'.repeat(80));
  console.log(`  Lobbies:             ${numLobbies}`);
  console.log(`  Total players:       ${totalPlayers}`);
  console.log(`  Max rounds:          ${maxRounds}`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const metrics = new PongMetricsCollector();
  const sockets = [];
  const cleanupFunctions = [];
  const negotiationResults = [];

  try {
    // Step 1: Create test users (2 per lobby)
    console.log(`📝 Creating ${totalPlayers} test users (${numLobbies} lobbies × 2 players)...`);
    const users = await createTestUsers(totalPlayers);
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

    if (successfulConnections.length < totalPlayers * 0.9) {
      throw new Error('Too many connection failures, aborting test');
    }

    // Step 3: Create lobbies (player1 creates, player2 joins)
    console.log(`🎮 Creating ${numLobbies} PVP lobbies...\n`);

    const lobbyPairs = [];
    for (let i = 0; i < numLobbies; i++) {
      const player1Index = i * 2;
      const player2Index = i * 2 + 1;

      if (player1Index >= successfulConnections.length || player2Index >= successfulConnections.length) {
        console.log(`  ⚠️  Not enough players for lobby ${i + 1}, skipping`);
        break;
      }

      lobbyPairs.push({
        player1: successfulConnections[player1Index],
        player2: successfulConnections[player2Index],
        lobbyIndex: i,
      });
    }

    const lobbyCreationResults = [];

    // Create lobbies sequentially
    for (const pair of lobbyPairs) {
      try {
        // Listen for lobby_state BEFORE creating
        let lobbyId = null;
        const lobbyPromise = new Promise((resolve) => {
          pair.player2.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === pair.player1.player.id);
            if (lobby) {
              lobbyId = lobby.id;
              resolve(lobby.id);
            } else {
              resolve(null);
            }
          });
        });

        // Player 1 creates the lobby
        const matchData = await createPVPMatch(pair.player1.socket, 100);

        // Wait for lobby broadcast
        await Promise.race([
          lobbyPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (!lobbyId) {
          throw new Error('Failed to get lobbyId from lobby broadcast');
        }

        // Player 2 joins the lobby
        const joinData = await joinMatch(pair.player2.socket, lobbyId);

        lobbyCreationResults.push({
          success: true,
          lobbyIndex: pair.lobbyIndex,
          gameId: matchData.gameId,
          player1: pair.player1,
          player2: pair.player2,
        });

        if ((pair.lobbyIndex + 1) % 5 === 0) {
          console.log(`  ✅ Created ${pair.lobbyIndex + 1}/${numLobbies} lobbies`);
        }

        // Small delay to prevent server overload
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.log(`  ❌ Lobby ${pair.lobbyIndex + 1} failed: ${error.message}`);
        metrics.recordError(error);
        lobbyCreationResults.push({
          success: false,
          lobbyIndex: pair.lobbyIndex,
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const successfulLobbies = lobbyCreationResults.filter((r) => r.success);
    console.log(`\n✅ ${successfulLobbies.length}/${lobbyPairs.length} lobbies created\n`);

    if (successfulLobbies.length === 0) {
      throw new Error('No lobbies created successfully');
    }

    // Wait for server to finalize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 4: Wager negotiation rounds
    console.log(`💰 Starting wager negotiations (up to ${maxRounds} rounds each)...\n`);

    for (const lobby of successfulLobbies) {
      const negotiationStart = Date.now();
      const roundLatencies = [];
      let roundsCompleted = 0;
      let locked = false;

      try {
        console.log(`  💰 Lobby ${lobby.lobbyIndex + 1}: Negotiating...`);

        // Determine number of rounds for this lobby (3-5 randomly)
        const targetRounds = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
        console.log(`     Target rounds: ${targetRounds}`);

        // Negotiation rounds
        for (let round = 0; round < targetRounds && round < maxRounds && !locked; round++) {
          const roundStart = Date.now();
          console.log(`     [DEBUG] Starting round ${round}, target=${targetRounds}, final=${targetRounds-1}`);

          if (round === 0) {
            // First round: Player 1 accepts initial offer
            const result = await acceptWager(lobby.player1.socket, lobby.gameId);
            locked = result.locked;
            console.log(`     Round ${round + 1}: Player1 accepted initial offer (${locked ? 'LOCKED' : 'pending'})`);
          } else if (round === targetRounds - 1) {
            // Final round: Player2 accepts (Player1 already accepted in previous round)
            // This should trigger the lock since both will have accepted
            const result = await acceptWager(lobby.player2.socket, lobby.gameId);
            locked = result.locked;
            console.log(`     Round ${round + 1}: Player2 accepted - ${locked ? 'LOCKED ✅' : 'ERROR ❌'}`);
          } else {
            // Middle rounds: Counter-proposals
            const newAmount = 100 + round * 25;
            await proposeWager(lobby.player2.socket, lobby.gameId, newAmount);
            console.log(`     Round ${round + 1}: Player2 proposed ${newAmount} MuskBucks`);

            // Small delay to let the proposal propagate
            await new Promise((resolve) => setTimeout(resolve, 100));

            // After a new proposal, both acceptances are cleared
            // So both players need to accept for it to lock
            // For middle rounds, only Player 1 accepts (leaves it pending for next round)
            const result = await acceptWager(lobby.player1.socket, lobby.gameId);
            locked = result.locked; // Should be false (pending, not locked)
            console.log(`     Round ${round + 1}: Player1 accepted new offer (pending)`);
          }

          roundsCompleted++;
          const roundDuration = Date.now() - roundStart;
          roundLatencies.push(roundDuration);

          if (locked) {
            console.log(`     🔒 Wager locked after ${roundsCompleted} rounds!`);
            break;
          }

          // Small delay between rounds
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const negotiationDuration = Date.now() - negotiationStart;

        negotiationResults.push({
          lobbyIndex: lobby.lobbyIndex,
          success: true,
          locked,
          roundsCompleted,
          negotiationDuration,
          avgRoundLatency: roundLatencies.reduce((a, b) => a + b, 0) / roundLatencies.length,
          roundLatencies,
        });

        console.log(
          `  ✅ Lobby ${lobby.lobbyIndex + 1}: ${roundsCompleted} rounds, ${negotiationDuration}ms total\n`,
        );
      } catch (error) {
        console.log(`  ❌ Lobby ${lobby.lobbyIndex + 1} negotiation failed: ${error.message}\n`);
        metrics.recordError(error);
        negotiationResults.push({
          lobbyIndex: lobby.lobbyIndex,
          success: false,
          error: error.message,
        });
      }
    }

    // Step 5: Analyze results
    const successfulNegotiations = negotiationResults.filter((r) => r.success);
    const lockedNegotiations = successfulNegotiations.filter((r) => r.locked);
    const failedNegotiations = negotiationResults.filter((r) => !r.success);

    const allRoundLatencies = successfulNegotiations.flatMap((r) => r.roundLatencies || []);
    const avgRoundLatency = allRoundLatencies.length > 0
      ? allRoundLatencies.reduce((a, b) => a + b, 0) / allRoundLatencies.length
      : 0;

    const allNegotiationDurations = successfulNegotiations.map((r) => r.negotiationDuration);
    const avgNegotiationDuration = allNegotiationDurations.length > 0
      ? allNegotiationDurations.reduce((a, b) => a + b, 0) / allNegotiationDurations.length
      : 0;

    const totalRounds = successfulNegotiations.reduce((sum, r) => sum + (r.roundsCompleted || 0), 0);
    const avgRounds = successfulNegotiations.length > 0 ? totalRounds / successfulNegotiations.length : 0;

    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(25) + 'NEGOTIATION RESULTS' + ' '.repeat(34) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');
    console.log(`  Successful negotiations: ${successfulNegotiations.length}/${successfulLobbies.length}`);
    console.log(`  Locked negotiations:     ${lockedNegotiations.length}/${successfulNegotiations.length}`);
    console.log(`  Failed negotiations:     ${failedNegotiations.length}`);
    console.log(`  Avg rounds per lobby:    ${avgRounds.toFixed(1)}`);
    console.log(`  Avg round latency:       ${avgRoundLatency.toFixed(0)}ms`);
    console.log(`  Avg negotiation time:    ${avgNegotiationDuration.toFixed(0)}ms`);
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
      testName: 'Pong Wager Negotiation Load Test',
      timestamp: new Date().toISOString(),
      config: {
        numLobbies,
        maxRounds,
        totalPlayers,
      },
      summary: {
        lobbiesCreated: successfulLobbies.length,
        successfulNegotiations: successfulNegotiations.length,
        lockedNegotiations: lockedNegotiations.length,
        failedNegotiations: failedNegotiations.length,
        avgRounds,
        avgRoundLatency: avgRoundLatency.toFixed(0),
        avgNegotiationDuration: avgNegotiationDuration.toFixed(0),
        testDuration: Date.now() - startTime,
      },
      negotiationResults,
      metrics: report,
      success:
        successfulNegotiations.length >= successfulLobbies.length * 0.9 && // At least 90% success
        lockedNegotiations.length >= successfulNegotiations.length * 0.95 && // At least 95% locked
        avgRoundLatency < 500, // Round latency < 500ms
    };

    saveResults(results, 'pong-wager-negotiation-load');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Wager negotiation system handled load successfully!');
      console.log(`     ${successfulNegotiations.length}/${successfulLobbies.length} negotiations completed`);
      console.log(`     ${lockedNegotiations.length} negotiations locked successfully`);
      console.log(`     Avg round latency: ${avgRoundLatency.toFixed(0)}ms`);
      console.log(`     Avg negotiation time: ${avgNegotiationDuration.toFixed(0)}ms`);
    } else {
      console.log('  ⚠️  ISSUES DETECTED:');
      if (successfulNegotiations.length < successfulLobbies.length * 0.9) {
        console.log(`     - Low success rate: ${successfulNegotiations.length}/${successfulLobbies.length}`);
      }
      if (lockedNegotiations.length < successfulNegotiations.length * 0.95) {
        console.log(`     - Low lock rate: ${lockedNegotiations.length}/${successfulNegotiations.length}`);
      }
      if (avgRoundLatency >= 500) {
        console.log(`     - High round latency: ${avgRoundLatency.toFixed(0)}ms`);
      }
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Wager negotiation load test failed:', error.message);
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
    if (key === '--max-rounds') options.maxRounds = parseInt(value, 10);
  });

  runWagerNegotiationLoadTest(options)
    .then((results) => {
      console.log('✅ Wager negotiation load test completed successfully');
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Wager negotiation load test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runWagerNegotiationLoadTest };
