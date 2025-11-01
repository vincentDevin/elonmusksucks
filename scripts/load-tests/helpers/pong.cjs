#!/usr/bin/env node
// scripts/load-tests/helpers/pong.cjs
// Pong load testing utilities - Socket.IO client connections and game operations

const { io } = require('socket.io-client');

const PONG_SERVER_URL = process.env.PONG_SERVER_URL || 'http://localhost:5001';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Create authenticated socket connection to pong server
 * @param {string} accessToken - JWT access token
 * @param {Object} options - Socket.IO options
 * @returns {Promise<{socket, player}>} Connected socket and player info
 */
async function createPongConnection(accessToken, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = io(PONG_SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      autoConnect: true,
      forceNew: true,
      ...options,
    });

    const timeoutId = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, options.timeout || DEFAULT_TIMEOUT);

    let authenticated = false;

    socket.on('connect', () => {
      // Send authentication immediately
      socket.emit('auth', { token: accessToken });
    });

    socket.on('auth_result', (data) => {
      if (data.success && data.player) {
        authenticated = true;
        clearTimeout(timeoutId);
        resolve({ socket, player: data.player });
      } else {
        clearTimeout(timeoutId);
        socket.disconnect();
        reject(new Error(data.error || 'Authentication failed'));
      }
    });

    socket.on('connect_error', (error) => {
      if (!authenticated) {
        clearTimeout(timeoutId);
        reject(new Error(`Connection failed: ${error.message}`));
      }
    });

    socket.on('error', (error) => {
      if (!authenticated) {
        clearTimeout(timeoutId);
        socket.disconnect();
        reject(new Error(`Socket error: ${error.message || JSON.stringify(error)}`));
      }
    });
  });
}

/**
 * Create multiple authenticated connections concurrently
 * @param {Array<{accessToken, userId, username}>} users - Array of user auth data
 * @returns {Promise<Array<{socket, player, userId, username}>>} Array of connections
 */
async function createMultipleConnections(users) {
  const connectionPromises = users.map(async (user) => {
    try {
      const { socket, player } = await createPongConnection(user.accessToken);
      return {
        socket,
        player,
        userId: user.userId,
        username: user.username,
        success: true,
      };
    } catch (error) {
      console.error(`Failed to connect user ${user.username}:`, error.message);
      return {
        socket: null,
        player: null,
        userId: user.userId,
        username: user.username,
        success: false,
        error: error.message,
      };
    }
  });

  return await Promise.all(connectionPromises);
}

/**
 * Join lobby and wait for lobby state
 * @param {Socket} socket - Connected socket
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{lobbies}>} Lobby state
 */
async function joinLobby(socket, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('lobby_state');
      reject(new Error('Join lobby timeout'));
    }, timeout);

    socket.once('lobby_state', (data) => {
      clearTimeout(timeoutId);
      resolve(data);
    });

    socket.emit('join_lobby');
  });
}

/**
 * Create AI match
 * @param {Socket} socket - Connected socket
 * @param {number} wager - Wager amount
 * @param {string} aiDifficulty - AI difficulty (EASY, MEDIUM, HARD, IMPOSSIBLE)
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{gameId, playerSlot, opponent, wager, pot}>} Match info
 */
async function createAIMatch(socket, wager, aiDifficulty = 'MEDIUM', timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('match_joined');
      socket.off('error');
      reject(new Error('Create AI match timeout'));
    }, timeout);

    socket.once('match_joined', (data) => {
      clearTimeout(timeoutId);
      socket.off('error');
      resolve(data);
    });

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('match_joined');
      reject(new Error(error.message || 'Match creation failed'));
    });

    socket.emit('create_match', {
      wager,
      type: 'ai',
      aiDifficulty,
    });
  });
}

/**
 * Create PVP match (lobby)
 * @param {Socket} socket - Connected socket
 * @param {number} wager - Wager amount
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{gameId, playerSlot, wager}>} Match info
 */
async function createPVPMatch(socket, wager, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('match_joined');
      socket.off('error');
      reject(new Error('Create PVP match timeout'));
    }, timeout);

    socket.once('match_joined', (data) => {
      clearTimeout(timeoutId);
      socket.off('error');
      resolve(data);
    });

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('match_joined');
      reject(new Error(error.message || 'Match creation failed'));
    });

    socket.emit('create_match', {
      wager,
      type: 'pvp',
    });
  });
}

/**
 * Join existing match
 * @param {Socket} socket - Connected socket
 * @param {string} matchId - Match ID to join
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{gameId, playerSlot, opponent, wager, pot}>} Match info
 */
async function joinMatch(socket, matchId, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('match_joined');
      socket.off('error');
      reject(new Error('Join match timeout'));
    }, timeout);

    socket.once('match_joined', (data) => {
      clearTimeout(timeoutId);
      socket.off('error');
      resolve(data);
    });

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('match_joined');
      reject(new Error(error.message || 'Join match failed'));
    });

    socket.emit('join_match', { matchId });
  });
}

/**
 * Set player ready state
 * @param {Socket} socket - Connected socket
 * @param {boolean} ready - Ready state
 */
function setReady(socket, ready = true) {
  socket.emit('player_ready', { ready });
}

/**
 * Send player input (paddle movement)
 * @param {Socket} socket - Connected socket
 * @param {number} paddleY - Paddle Y position (0-600)
 */
function sendInput(socket, paddleY) {
  socket.emit('player_input', {
    paddleY: paddleY,
    timestamp: Date.now(),
  });
}

/**
 * Leave current match
 * @param {Socket} socket - Connected socket
 */
function leaveMatch(socket) {
  socket.emit('leave_match');
}

/**
 * Spectate a match
 * @param {Socket} socket - Connected socket
 * @param {string} gameId - Game ID to spectate
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{gameId, spectatorCount}>} Resolves when spectating starts
 */
async function spectateMatch(socket, gameId, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('spectator_joined');
      socket.off('error');
      reject(new Error('Spectate timeout'));
    }, timeout);

    socket.once('spectator_joined', (data) => {
      clearTimeout(timeoutId);
      socket.off('error');
      resolve(data);
    });

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('spectator_joined');
      reject(new Error(error.message || 'Spectate failed'));
    });

    socket.emit('spectate_match', { gameId });
  });
}

/**
 * Monitor game state updates
 * @param {Socket} socket - Connected socket
 * @param {Function} callback - Called with each game state update
 * @returns {Function} Cleanup function
 */
function monitorGameState(socket, callback) {
  socket.on('game_state', callback);
  return () => socket.off('game_state', callback);
}

/**
 * Wait for game to end
 * @param {Socket} socket - Connected socket
 * @param {number} timeout - Timeout in ms (default 2 minutes)
 * @returns {Promise<{winner, scores, payout}>} Game result
 */
async function waitForGameEnd(socket, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('match_end');
      reject(new Error('Game end timeout'));
    }, timeout);

    socket.once('match_end', (data) => {
      clearTimeout(timeoutId);
      resolve(data);
    });
  });
}

/**
 * Measure ping to pong server
 * @param {Socket} socket - Connected socket
 * @returns {Promise<number>} Ping in milliseconds
 */
async function measurePing(socket) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      socket.off('pong');
      reject(new Error('Ping timeout'));
    }, 5000);

    socket.once('pong', () => {
      clearTimeout(timeoutId);
      resolve(Date.now() - startTime);
    });

    socket.emit('ping_request', { timestamp: startTime });
  });
}

/**
 * Disconnect socket cleanly
 * @param {Socket} socket - Socket to disconnect
 */
function disconnect(socket) {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

/**
 * Disconnect multiple sockets
 * @param {Array<Socket>} sockets - Sockets to disconnect
 */
function disconnectAll(sockets) {
  sockets.forEach((socket) => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });
}

/**
 * Simulate realistic player input (for load testing)
 * Sends random paddle movements at realistic frequency
 * @param {Socket} socket - Connected socket
 * @param {number} duration - Duration in ms
 * @param {number} inputsPerSecond - Input frequency (default 60)
 * @returns {Function} Stop function
 */
function simulatePlayerInput(socket, duration = 60000, inputsPerSecond = 60) {
  const interval = 1000 / inputsPerSecond;
  let inputCount = 0;

  // Game field dimensions (from PONG_PHYSICS)
  const FIELD_HEIGHT = 600;
  const PADDLE_HEIGHT = 100;
  const MIN_Y = 0;
  const MAX_Y = FIELD_HEIGHT - PADDLE_HEIGHT;

  // Start paddle in the middle
  let currentPaddleY = (FIELD_HEIGHT - PADDLE_HEIGHT) / 2;

  const intervalId = setInterval(() => {
    // Simulate realistic paddle movement
    // Move paddle randomly up/down by small amounts
    const movement = (Math.random() - 0.5) * 20; // -10 to +10 pixels per update
    currentPaddleY = Math.max(MIN_Y, Math.min(MAX_Y, currentPaddleY + movement));

    sendInput(socket, currentPaddleY);
    inputCount++;
  }, interval);

  // Auto-stop after duration
  setTimeout(() => {
    clearInterval(intervalId);
  }, duration);

  // Return manual stop function
  return () => {
    clearInterval(intervalId);
    return inputCount;
  };
}

/**
 * Propose wager amount during lobby negotiation
 * @param {Socket} socket - Connected socket
 * @param {string} gameId - Game ID
 * @param {number} amount - Wager amount to propose
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{currentOffer, proposedBy, round, acceptedBy}>} Wager proposal result
 */
async function proposeWager(socket, gameId, amount, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('wager_proposed');
      socket.off('error');
      reject(new Error('Propose wager timeout'));
    }, timeout);

    socket.once('wager_proposed', (data) => {
      clearTimeout(timeoutId);
      socket.off('error');
      resolve(data);
    });

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('wager_proposed');
      reject(new Error(error.message || 'Propose wager failed'));
    });

    socket.emit('propose_wager', { gameId, amount });
  });
}

/**
 * Accept current wager offer
 * @param {Socket} socket - Connected socket
 * @param {string} gameId - Game ID
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{currentOffer, acceptedBy}>} Wager acceptance result
 */
async function acceptWager(socket, gameId, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      socket.off('wager_accepted');
      socket.off('wager_locked');
      socket.off('error');
      reject(new Error('Accept wager timeout'));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      socket.off('wager_accepted');
      socket.off('wager_locked');
      socket.off('error');
    };

    // When both players accept, server emits wager_accepted then wager_locked immediately
    // We need to handle this sequence properly
    socket.once('wager_accepted', (data) => {
      if (resolved) return;

      // If both players have accepted, wait briefly for wager_locked event
      if (data.acceptedBy && data.acceptedBy.length === 2) {
        // Wait up to 200ms for wager_locked to arrive
        const lockWaitTimeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          // This shouldn't happen, but resolve with locked: false if wager_locked never arrives
          resolve({ ...data, locked: false });
        }, 200);

        // Listen for wager_locked (should arrive immediately)
        const onLocked = (lockedData) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(lockWaitTimeout);
          cleanup();
          resolve({ ...lockedData, locked: true });
        };
        socket.once('wager_locked', onLocked);
      } else {
        // Only one player accepted, resolve immediately
        resolved = true;
        cleanup();
        resolve({ ...data, locked: false });
      }
    });

    // Handle the case where wager_locked arrives first (rare but possible)
    socket.once('wager_locked', (data) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({ ...data, locked: true });
    });

    socket.once('error', (error) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new Error(error.message || 'Accept wager failed'));
    });

    socket.emit('accept_wager', { gameId });
  });
}

/**
 * Reject current wager offer
 * @param {Socket} socket - Connected socket
 * @param {string} gameId - Game ID
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>} Resolves when rejection confirmed
 */
async function rejectWager(socket, gameId, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('wager_rejected');
      socket.off('error');
      reject(new Error('Reject wager timeout'));
    }, timeout);

    socket.once('wager_rejected', () => {
      clearTimeout(timeoutId);
      socket.off('error');
      resolve();
    });

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('wager_rejected');
      reject(new Error(error.message || 'Reject wager failed'));
    });

    socket.emit('reject_wager', { gameId });
  });
}

/**
 * Wait for wager to be locked (both players accepted)
 * @param {Socket} socket - Connected socket
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<{wager, pot}>} Wager lock result
 */
async function waitForWagerLocked(socket, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('wager_locked');
      socket.off('match_cancelled');
      reject(new Error('Wager lock timeout'));
    }, timeout);

    socket.once('wager_locked', (data) => {
      clearTimeout(timeoutId);
      socket.off('match_cancelled');
      resolve(data);
    });

    socket.once('match_cancelled', (data) => {
      clearTimeout(timeoutId);
      socket.off('wager_locked');
      reject(new Error(data.reason || 'Match cancelled'));
    });
  });
}

/**
 * Send chat message in game lobby/room
 * @param {Socket} socket - Connected socket
 * @param {string} gameId - Game ID
 * @param {string} message - Chat message content
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>} Resolves when message sent
 */
async function sendChatMessage(socket, gameId, message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.off('game_chat_message');
      socket.off('error');
      reject(new Error('Send chat message timeout'));
    }, timeout);

    // Wait for our message to be broadcast back
    const messageHandler = (data) => {
      // Check if this is our message (simplified check)
      if (data.message === message) {
        clearTimeout(timeoutId);
        socket.off('game_chat_message', messageHandler);
        socket.off('error');
        resolve();
      }
    };

    socket.on('game_chat_message', messageHandler);

    socket.once('error', (error) => {
      clearTimeout(timeoutId);
      socket.off('game_chat_message', messageHandler);
      reject(new Error(error.message || 'Send chat message failed'));
    });

    socket.emit('game_chat_message', { gameId, message });
  });
}

/**
 * Monitor chat messages
 * @param {Socket} socket - Connected socket
 * @param {Function} callback - Called with each chat message
 * @returns {Function} Cleanup function
 */
function monitorChatMessages(socket, callback) {
  socket.on('game_chat_message', callback);
  return () => socket.off('game_chat_message', callback);
}

module.exports = {
  createPongConnection,
  createMultipleConnections,
  joinLobby,
  createAIMatch,
  createPVPMatch,
  joinMatch,
  setReady,
  sendInput,
  leaveMatch,
  spectateMatch,
  monitorGameState,
  waitForGameEnd,
  measurePing,
  disconnect,
  disconnectAll,
  simulatePlayerInput,
  proposeWager,
  acceptWager,
  rejectWager,
  waitForWagerLocked,
  sendChatMessage,
  monitorChatMessages,
  PONG_SERVER_URL,
};
