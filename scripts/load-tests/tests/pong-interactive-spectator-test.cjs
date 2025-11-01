#!/usr/bin/env node
// scripts/load-tests/tests/pong-interactive-spectator-test.cjs
// Interactive test - allows real user to spectate and chat during long negotiation

const { createTestUsers } = require('../helpers/auth.cjs');
const {
  createMultipleConnections,
  createPVPMatch,
  joinMatch,
  proposeWager,
  acceptWager,
  sendChatMessage,
  setReady,
  sendInput,
  disconnectAll,
} = require('../helpers/pong.cjs');

/**
 * Interactive spectator test
 * - Creates 1 PVP match with 2 bot players
 * - Negotiates wager for ~90 seconds with chat messages
 * - Allows real user to join as spectator during negotiation
 * - Locks wager and plays full game
 * - All 3 participants (2 bots + spectator) can chat
 */
async function runInteractiveSpectatorTest() {
  console.log('\n🎮 INTERACTIVE PONG SPECTATOR TEST');
  console.log('═'.repeat(80));
  console.log('  This test creates a single PVP match for you to spectate');
  console.log('  Duration: ~2 minutes negotiation + full game');
  console.log('  You can join as spectator and participate in chat!');
  console.log('═'.repeat(80));
  console.log('');

  const sockets = [];
  let gameId = null;

  try {
    // Step 1: Create 2 test users
    console.log('📝 Creating 2 test users...');
    const users = await createTestUsers(2);
    console.log(`✅ Created: ${users[0].username} and ${users[1].username}\n`);

    // Step 2: Connect both users
    console.log('📡 Connecting to pong server...');
    const connections = await createMultipleConnections(users);

    if (connections.filter(c => c.success).length < 2) {
      throw new Error('Failed to connect both users');
    }

    const player1 = connections[0];
    const player2 = connections[1];
    sockets.push(player1.socket, player2.socket);

    console.log(`✅ Both players connected\n`);

    // Step 3: Create lobby
    console.log('🎮 Player 1 creating PVP lobby (100 MuskBucks)...');

    // Listen for lobby_state BEFORE creating
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

    // Player 1 creates the lobby
    const matchData = await createPVPMatch(player1.socket, 100);
    gameId = matchData.gameId;

    // Wait for lobby broadcast
    await Promise.race([
      lobbyPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (!lobbyId) {
      throw new Error('Failed to get lobbyId from lobby broadcast');
    }

    console.log(`✅ Lobby created: ${lobbyId}`);
    console.log(`✅ Game ID: ${gameId}\n`);

    // Step 4: Player 2 joins the lobby
    console.log('👥 Player 2 joining lobby...');
    await joinMatch(player2.socket, lobbyId);
    console.log(`✅ Player 2 joined - negotiation started!\n`);

    // Step 5: Long negotiation with chat (90 seconds)
    console.log('💰 Starting negotiation phase (~90 seconds)...');
    console.log('═'.repeat(80));
    console.log('🎯 YOU CAN NOW JOIN AS SPECTATOR!');
    console.log('   1. Go to Pong page in your browser');
    console.log('   2. Click "👁️ Watch" on the active game');
    console.log('   3. Participate in the chat!');
    console.log('═'.repeat(80));
    console.log('');

    const negotiationStart = Date.now();
    const negotiationDuration = 90000; // 90 seconds
    let currentOffer = 100;
    let roundNum = 0;

    // Negotiation loop with chat
    while (Date.now() - negotiationStart < negotiationDuration) {
      const elapsed = Math.floor((Date.now() - negotiationStart) / 1000);
      const remaining = Math.floor((negotiationDuration - (Date.now() - negotiationStart)) / 1000);

      roundNum++;

      // Alternate between players proposing
      const proposer = roundNum % 2 === 0 ? player1 : player2;
      const proposerName = roundNum % 2 === 0 ? users[0].username : users[1].username;

      // Send chat message
      if (roundNum % 3 === 0) {
        const chatMessages = [
          "How about this wager?",
          "I think we can find a good deal",
          "This is getting interesting!",
          "What do you think about this offer?",
          "Let's make this exciting!",
          "Almost there...",
          "Getting close to an agreement",
          "This wager looks fair",
        ];
        const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        await sendChatMessage(proposer.socket, gameId, msg);
        console.log(`  💬 ${proposerName}: "${msg}"`);
      }

      // Propose new wager every few rounds
      if (roundNum % 4 === 0) {
        currentOffer += 25;
        if (currentOffer > 200) currentOffer = 100; // Reset if too high

        await proposeWager(proposer.socket, gameId, currentOffer);
        console.log(`  💰 ${proposerName} proposed ${currentOffer} MuskBucks`);
      }

      // Accept wager (but don't lock - only one player accepts each time)
      const accepter = roundNum % 2 === 0 ? player2 : player1;
      const accepterName = roundNum % 2 === 0 ? users[1].username : users[0].username;

      try {
        await acceptWager(accepter.socket, gameId);
        console.log(`  ✅ ${accepterName} accepted (${remaining}s remaining)`);
      } catch (err) {
        // Ignore errors - might already be accepted
      }

      // Wait between rounds
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds between rounds
    }

    console.log('');
    console.log('⏰ Negotiation time complete - locking wager!\n');

    // Step 6: Lock wager (both players accept)
    console.log('🔒 Both players accepting final wager...');
    await acceptWager(player1.socket, gameId);
    await acceptWager(player2.socket, gameId);

    // Wait for wager lock
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Wager locked!\n');

    // Send final chat messages
    await sendChatMessage(player1.socket, gameId, "Let's do this! 🏓");
    await sendChatMessage(player2.socket, gameId, "Game on! 💪");

    // Step 7: Set ready and start game
    console.log('🏁 Players setting ready...');
    await setReady(player1.socket);
    await setReady(player2.socket);

    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for countdown
    console.log('✅ Game started!\n');

    // Step 8: Play game (simulate input for ~60 seconds or until winner)
    console.log('🎮 Game in progress - simulating player input...');
    console.log('   (Spectators can still watch and chat!)\n');

    const gameStart = Date.now();
    const maxGameDuration = 60000; // 60 seconds max
    let gameActive = true;

    // Listen for game end
    player1.socket.on('game_ended', () => {
      gameActive = false;
    });

    // Simulate input
    const inputInterval = setInterval(() => {
      if (!gameActive || Date.now() - gameStart > maxGameDuration) {
        clearInterval(inputInterval);
        return;
      }

      // Random paddle movement
      const p1Dir = Math.random() > 0.5 ? 'up' : 'down';
      const p2Dir = Math.random() > 0.5 ? 'up' : 'down';

      sendInput(player1.socket, p1Dir);
      sendInput(player2.socket, p2Dir);
    }, 16); // ~60Hz

    // Wait for game to end or timeout
    while (gameActive && Date.now() - gameStart < maxGameDuration) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if ((Date.now() - gameStart) % 15000 < 1000) {
        // Send chat every 15 seconds
        const messages = [
          "Nice shot!",
          "Great rally!",
          "This is intense!",
          "So close!",
          "Good game!"
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        const sender = Math.random() > 0.5 ? player1 : player2;
        try {
          await sendChatMessage(sender.socket, gameId, msg);
        } catch (err) {
          // Ignore chat errors during game
        }
      }
    }

    clearInterval(inputInterval);

    console.log('\n✅ Game completed!\n');

    // Step 9: Wait a bit before cleanup
    console.log('⏳ Keeping connection alive for 10 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('\n🔌 Disconnecting test users...');
    disconnectAll(sockets);
    console.log('✅ Test complete\n');
  }
}

if (require.main === module) {
  runInteractiveSpectatorTest()
    .then(() => {
      console.log('✅ Interactive spectator test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { runInteractiveSpectatorTest };
