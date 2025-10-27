#!/usr/bin/env node
// scripts/load-tests/tests/pong-room-cleanup-test.cjs
// Test for room cleanup bug: AI game → PVP match score contamination

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  joinLobby,
  createAIMatch,
  createPVPMatch,
  joinMatch,
  setReady,
  simulatePlayerInput,
  waitForGameEnd,
  spectateMatch,
  disconnectAll,
} = require('../helpers/pong.cjs');
const { saveResults } = require('../helpers/results.cjs');

/**
 * Room cleanup test - verifies fix for AI→PVP score contamination bug
 *
 * Bug scenario:
 * 1. Player1 plays AI game to completion (5-0)
 * 2. Player2 spectates AI game or waits in lobby
 * 3. AI game ends
 * 4. Player2 creates new PVP match
 * 5. Player1 joins PVP match
 * 6. BUG: Player2 sees score [0, 5] instead of [0, 0]
 * 7. BUG: Game ends when Player1 scores 1 point (because server thinks 6-0)
 *
 * Expected fix:
 * - Socket.IO room cleanup when games end
 * - gameId validation on client
 * - Players start fresh [0, 0] in new game
 */
async function runRoomCleanupTest(options = {}) {
  const { numIterations = 3, aiGameTimeout = 120000 } = options;

  console.log('\n🧹 PONG ROOM CLEANUP TEST (AI→PVP Bug Verification)');
  console.log('═'.repeat(80));
  console.log('  Test iterations:     ', numIterations);
  console.log('  AI game timeout:     ', aiGameTimeout / 1000, 's');
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const testResults = [];
  let bugDetected = false;

  // Create 2 test users and keep connections open for all iterations
  let player1Connection = null;
  let player2Connection = null;

  try {
    // Create 2 test users
    console.log('📝 Creating 2 test users...');
    const users = await createTestUsers(2);
    console.log(`✅ Users created: ${users[0].username}, ${users[1].username}\n`);

    // Connect both players (persist connection across iterations)
    console.log('📡 Connecting both players...');
    const connections = await createMultipleConnections(users);

    player1Connection = connections.find((c) => c.userId === users[0].userId);
    player2Connection = connections.find((c) => c.userId === users[1].userId);

    if (!player1Connection?.success || !player2Connection?.success) {
      throw new Error('Failed to connect players');
    }

    console.log(
      `✅ Connected: ${player1Connection.username} & ${player2Connection.username}\n`,
    );

    for (let iteration = 0; iteration < numIterations; iteration++) {
      console.log(`\n${'═'.repeat(80)}`);
      console.log(`ITERATION ${iteration + 1}/${numIterations}`);
      console.log(`${'═'.repeat(80)}\n`);

      let inputStopFunctions = [];

      try {
        // Step 1: Player1 creates AI game (Player2 just waits in lobby)
        console.log(
          `🤖 ${player1Connection.username} creating AI game (EASY difficulty for quick win)...`,
        );
        console.log(
          `   ${player2Connection.username} waiting in lobby (not spectating)\n`,
        );

        const aiMatchData = await createAIMatch(player1Connection.socket, 100, 'EASY');
        console.log(`✅ AI game created: ${aiMatchData.gameId}\n`);

        // Track ALL game_state events for Player2 to detect contamination
        let player2GameStates = [];

        const gameStateHandler = (data) => {
          player2GameStates.push({
            gameId: data.gameId,
            scores: data.scores,
            timestamp: Date.now(),
          });
        };

        player2Connection.socket.on('game_state', gameStateHandler);

        // Step 2: Player1 plays AI game to completion
        console.log(`🎮 ${player1Connection.username} setting ready...`);

        // Wait for server to finalize game creation
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Listen for countdown event
        let countdownReceived = false;
        player1Connection.socket.once('countdown', (data) => {
          countdownReceived = true;
          console.log(`  📢 Countdown started: ${data.count || 'started'}`);
        });

        setReady(player1Connection.socket, true);

        // Wait for countdown
        console.log('⏳ Waiting for countdown (4s)...');
        await new Promise((resolve) => setTimeout(resolve, 4000));

        if (!countdownReceived) {
          console.log('  ⚠️  Warning: No countdown event received');
        }

        // Simulate player input for Player1 (AI games require player to control their paddle!)
        console.log(`🎮 ${player1Connection.username} playing against AI...\n`);
        const stopInput = simulatePlayerInput(player1Connection.socket, aiGameTimeout, 60);
        inputStopFunctions.push(stopInput);

        // Wait for AI game to end
        console.log(`⏳ Waiting for AI game to complete (max ${aiGameTimeout / 1000}s)...`);
        const aiGameResult = await waitForGameEnd(player1Connection.socket, aiGameTimeout);

        stopInput(); // Stop input
        inputStopFunctions = [];

        console.log(`\n✅ AI game completed!`);
        console.log(`   Winner: ${aiGameResult.winner === 0 ? player1Connection.username : 'AI'}`);
        console.log(`   Final scores: [${aiGameResult.scores}]`);
        console.log(
          `   ${player1Connection.username}: ${aiGameResult.scores[0]} | AI: ${aiGameResult.scores[1]}\n`,
        );

        // Wait for server cleanup to complete
        console.log('⏳ Waiting 3s for server cleanup and room leaving...');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Clear game_state tracking before PVP match
        player2GameStates = [];

        // Step 3: Player2 creates NEW PVP match (after AI game ended)
        console.log(`⚔️  ${player2Connection.username} creating NEW PVP match...\n`);

        // Player1 joins lobby first to receive broadcasts
        console.log(`   ${player1Connection.username} joining lobby...`);
        await joinLobby(player1Connection.socket);

        // Wait for server to process lobby join
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Listen for lobby broadcast
        let lobbyId = null;
        const lobbyPromise = new Promise((resolve) => {
          player1Connection.socket.once('lobby_state', (data) => {
            const lobby = data.lobbies.find((l) => l.creatorId === player2Connection.player.id);
            if (lobby) {
              lobbyId = lobby.id;
              resolve(lobby.id);
            } else {
              resolve(null);
            }
          });
        });

        const pvpMatchData = await createPVPMatch(player2Connection.socket, 100);
        console.log(`✅ PVP match created: ${pvpMatchData.gameId}`);

        // Wait for lobby broadcast
        await Promise.race([
          lobbyPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (!lobbyId) {
          throw new Error('Failed to get lobbyId from lobby broadcast');
        }

        console.log(`   Lobby ID: ${lobbyId}\n`);

        // Step 4: Player1 joins the PVP match
        console.log(`👥 ${player1Connection.username} joining PVP match...`);
        const joinData = await joinMatch(player1Connection.socket, lobbyId);
        console.log(`✅ ${player1Connection.username} joined (pot: ${joinData.pot})\n`);

        // Wait for server to process join
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 5: Both players ready up
        console.log('⏳ Both players setting ready...\n');

        // Track countdown for PVP match
        let pvpCountdownReceived = false;
        player1Connection.socket.once('countdown', (data) => {
          pvpCountdownReceived = true;
          console.log(`  📢 PVP Countdown started: ${data.count || 'started'}`);
        });

        // Track initial game state for BOTH players
        let player1InitialState = null;
        let player2InitialState = null;

        const p1Handler = (data) => {
          if (data.gameId === pvpMatchData.gameId && !player1InitialState) {
            player1InitialState = {
              gameId: data.gameId,
              scores: data.scores,
              timestamp: Date.now(),
            };
            console.log(
              `  📊 Player1 initial game_state: gameId=${data.gameId}, scores=[${data.scores}]`,
            );
          }
        };

        const p2Handler = (data) => {
          if (data.gameId === pvpMatchData.gameId && !player2InitialState) {
            player2InitialState = {
              gameId: data.gameId,
              scores: data.scores,
              timestamp: Date.now(),
            };
            console.log(
              `  📊 Player2 initial game_state: gameId=${data.gameId}, scores=[${data.scores}]`,
            );
          }
        };

        player1Connection.socket.on('game_state', p1Handler);
        player2Connection.socket.on('game_state', p2Handler);

        setReady(player1Connection.socket, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        setReady(player2Connection.socket, true);

        // Wait for countdown and first game_state
        console.log('⏳ Waiting for countdown (4s) and initial game state...');
        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (!pvpCountdownReceived) {
          console.log('  ⚠️  Warning: No PVP countdown event received');
        }

        // Step 6: VERIFY - Check if scores are [0, 0] or contaminated
        console.log('\n🔍 VERIFICATION - Checking initial PVP game scores...\n');

        // Remove handlers after getting initial state
        player1Connection.socket.off('game_state', p1Handler);
        player2Connection.socket.off('game_state', p2Handler);
        player2Connection.socket.off('game_state', gameStateHandler);

        let testPassed = true;
        let failureReason = null;

        // Check Player1's initial state
        if (!player1InitialState) {
          console.log('  ⚠️  Player1 did not receive initial game_state');
          testPassed = false;
          failureReason = 'Player1 missing initial game_state';
        } else if (
          player1InitialState.scores[0] !== 0 ||
          player1InitialState.scores[1] !== 0
        ) {
          console.log(
            `  ❌ BUG DETECTED! Player1 sees contaminated scores: [${player1InitialState.scores}] (expected [0, 0])`,
          );
          testPassed = false;
          failureReason = `Player1 score contamination: [${player1InitialState.scores}]`;
          bugDetected = true;
        } else {
          console.log(`  ✅ Player1 sees correct initial scores: [${player1InitialState.scores}]`);
        }

        // Check Player2's initial state
        if (!player2InitialState) {
          console.log('  ⚠️  Player2 did not receive initial game_state');
          testPassed = false;
          failureReason = failureReason || 'Player2 missing initial game_state';
        } else if (
          player2InitialState.scores[0] !== 0 ||
          player2InitialState.scores[1] !== 0
        ) {
          console.log(
            `  ❌ BUG DETECTED! Player2 sees contaminated scores: [${player2InitialState.scores}] (expected [0, 0])`,
          );
          testPassed = false;
          failureReason = failureReason || `Player2 score contamination: [${player2InitialState.scores}]`;
          bugDetected = true;
        } else {
          console.log(`  ✅ Player2 sees correct initial scores: [${player2InitialState.scores}]`);
        }

        // Record result
        testResults.push({
          iteration: iteration + 1,
          success: testPassed,
          failureReason,
          aiGameResult: {
            winner: aiGameResult.winner,
            scores: aiGameResult.scores,
          },
          pvpGameResult: {
            player1InitialState,
            player2InitialState,
          },
        });

        if (testPassed) {
          console.log(`\n✅ ITERATION ${iteration + 1}: PASSED - No score contamination detected\n`);
        } else {
          console.log(
            `\n❌ ITERATION ${iteration + 1}: FAILED - ${failureReason}\n`,
          );
        }

        // Leave match for next iteration
        console.log('🚪 Both players leaving match...');
        player1Connection.socket.emit('leave_match');
        player2Connection.socket.emit('leave_match');

        // Wait before next iteration
        if (iteration < numIterations - 1) {
          console.log('⏳ Waiting 2s before next iteration...\n');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`\n❌ ITERATION ${iteration + 1} ERROR: ${error.message}\n`);

        // Stop any running inputs
        inputStopFunctions.forEach((stop) => stop());

        testResults.push({
          iteration: iteration + 1,
          success: false,
          failureReason: error.message,
          error: error.stack,
        });

        // Try to leave match
        try {
          player1Connection.socket.emit('leave_match');
          player2Connection.socket.emit('leave_match');
        } catch (e) {
          // Ignore cleanup errors
        }

        // Wait before next iteration
        if (iteration < numIterations - 1) {
          console.log('⏳ Waiting 2s before next iteration...\n');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // Final cleanup - disconnect sockets
    console.log('\n🔌 Disconnecting all players...');
    disconnectAll([player1Connection.socket, player2Connection.socket]);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Final summary
    const passedIterations = testResults.filter((r) => r.success).length;
    const failedIterations = testResults.filter((r) => !r.success).length;

    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 FINAL TEST RESULTS');
    console.log('═'.repeat(80));
    console.log(`  Total iterations:    ${numIterations}`);
    console.log(`  Passed:              ${passedIterations} ✅`);
    console.log(`  Failed:              ${failedIterations} ❌`);
    console.log(`  Bug detected:        ${bugDetected ? 'YES ❌' : 'NO ✅'}`);
    console.log('═'.repeat(80));
    console.log('');

    // Detailed failure breakdown
    if (failedIterations > 0) {
      console.log('❌ FAILURES:');
      testResults
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - Iteration ${r.iteration}: ${r.failureReason}`);
        });
      console.log('');
    }

    // Save results
    const results = {
      testName: 'Pong Room Cleanup Test (AI→PVP Bug)',
      timestamp: new Date().toISOString(),
      config: {
        numIterations,
        aiGameTimeout,
      },
      summary: {
        totalIterations: numIterations,
        passed: passedIterations,
        failed: failedIterations,
        bugDetected,
        testDuration: Date.now() - startTime,
      },
      iterations: testResults,
      success: !bugDetected && passedIterations === numIterations,
    };

    saveResults(results, 'pong-room-cleanup-test');

    // Assessment
    console.log('📋 TEST ASSESSMENT:\n');

    if (results.success) {
      console.log('  ✅ EXCELLENT: Room cleanup fix is working!');
      console.log(`     All ${numIterations} iterations passed`);
      console.log('     No score contamination detected');
      console.log('     No premature game endings');
    } else {
      console.log('  ❌ ROOM CLEANUP BUG STILL PRESENT:');
      if (bugDetected) {
        console.log('     - Score contamination from old games detected');
        console.log('     - Room cleanup not working properly');
      }
      console.log(`     - ${failedIterations}/${numIterations} iterations failed`);
    }

    console.log('');

    return results;
  } catch (error) {
    console.error('\n❌ Room cleanup test crashed:', error.message);
    console.error(error.stack);

    // Final cleanup on error
    if (player1Connection?.socket || player2Connection?.socket) {
      try {
        disconnectAll([player1Connection.socket, player2Connection.socket].filter(Boolean));
      } catch (e) {
        // Ignore cleanup errors
      }
    }

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
    if (key === '--iterations') options.numIterations = parseInt(value, 10);
    if (key === '--ai-timeout') options.aiGameTimeout = parseInt(value, 10) * 1000;
  });

  runRoomCleanupTest(options)
    .then((results) => {
      console.log(
        results.success
          ? '✅ Room cleanup test PASSED - Bug is FIXED!'
          : '❌ Room cleanup test FAILED - Bug still present',
      );
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Room cleanup test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runRoomCleanupTest };
