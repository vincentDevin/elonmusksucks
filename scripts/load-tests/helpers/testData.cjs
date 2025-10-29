// scripts/load-tests/helpers/testData.js
// Test data generator for load tests

const axios = require('axios');
const { io } = require('socket.io-client');
const { BASE_URL } = require('./auth.cjs');

/**
 * Get active predictions to bet on
 */
async function getActivePredictions(accessToken, limit = 10) {
  try {
    const response = await axios.get(`${BASE_URL}/api/predictions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        status: 'open',  // Only fetch open predictions
        limit
      },
    });

    return response.data.predictions || [];
  } catch (error) {
    console.error('Failed to fetch predictions:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Connect to Socket.IO server with authentication
 */
function connectSocket(accessToken) {
  const socket = io(BASE_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: false, // Don't reconnect for load tests
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connection timeout'));
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });
}

/**
 * Get a random prediction option from a prediction
 */
function getRandomOption(prediction) {
  if (!prediction.options || prediction.options.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * prediction.options.length);
  return prediction.options[randomIndex];
}

/**
 * Generate random bet amount (10-1000 MuskBucks)
 */
function getRandomBetAmount(min = 10, max = 1000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Place a bet via Socket.IO (this is how the app actually places bets)
 */
async function placeBet(accessToken, predictionId, optionId, amount) {
  const startTime = Date.now();
  let socket;

  try {
    // Connect to Socket.IO server
    socket = await connectSocket(accessToken);

    // Place bet via socket event
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bet placement timeout'));
      }, 10000); // 10 second timeout

      socket.emit(
        'bet:place',
        {
          optionId,
          amount,
        },
        (ack) => {
          clearTimeout(timeout);
          // Server returns null on success, error string on failure
          if (ack === null) {
            resolve({ success: true });
          } else {
            reject(new Error(ack || 'Bet placement failed'));
          }
        }
      );
    });

    const duration = Date.now() - startTime;

    // Disconnect socket
    socket.disconnect();

    return {
      success: true,
      duration,
      betId: result.bet?.id,
      response: result,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Make sure to disconnect socket on error
    if (socket) {
      socket.disconnect();
    }

    return {
      success: false,
      duration,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Place a random bet (useful for load testing)
 */
async function placeRandomBet(accessToken, predictions) {
  if (!predictions || predictions.length === 0) {
    throw new Error('No predictions available to bet on');
  }

  // Pick random prediction
  const prediction = predictions[Math.floor(Math.random() * predictions.length)];

  // Pick random option
  const option = getRandomOption(prediction);
  if (!option) {
    throw new Error(`No options available for prediction ${prediction.id}`);
  }

  // Generate random amount
  const amount = getRandomBetAmount();

  return await placeBet(accessToken, prediction.id, option.id, amount);
}

/**
 * Get user's achievements
 */
async function getUserAchievements(accessToken, userId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/achievements/user/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to fetch achievements:', error.response?.data || error.message);
    return [];
  }
}

module.exports = {
  getActivePredictions,
  getRandomOption,
  getRandomBetAmount,
  placeBet,
  placeRandomBet,
  getUserAchievements,
};
