// scripts/load-tests/helpers/auth.js
// Authentication helper for load tests

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

/**
 * Login and get access token
 */
async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password,
    });

    const accessToken = response.data.data?.accessToken || response.data.accessToken;

    if (!accessToken) {
      throw new Error('No access token in response');
    }

    // Decode JWT to get userId (basic decode, no verification needed for testing)
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
    const userId = payload.userId;

    return {
      accessToken,
      userId,
      username: email.split('@')[0], // Use email prefix as username
    };
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create test user if doesn't exist, then login
 */
async function getOrCreateTestUser(username) {
  const email = `${username}@loadtest.local`;
  const password = 'LoadTest123!';

  try {
    // Try to register (API expects 'name' not 'username')
    await axios.post(`${BASE_URL}/api/auth/register`, {
      email,
      name: username,
      password,
    });
    console.log(`✅ Created test user: ${username}`);
  } catch (error) {
    // User probably already exists, that's fine
    if (error.response?.status !== 409) {
      console.log(`ℹ️  Test user ${username} already exists (or other error)`);
    }
  }

  // Login
  return await login(email, password);
}

/**
 * Create multiple test users for concurrent testing
 */
async function createTestUsers(count) {
  const users = [];

  console.log(`Creating ${count} test users...`);

  for (let i = 0; i < count; i++) {
    const username = `loadtest_user_${i}_${Date.now()}`;
    try {
      const auth = await getOrCreateTestUser(username);
      users.push(auth);
      process.stdout.write(`\r  Created ${i + 1}/${count} users`);
    } catch (error) {
      console.error(`\nFailed to create user ${username}:`, error.message);
    }
  }

  console.log('\n✅ Test users ready');
  return users;
}

module.exports = {
  login,
  getOrCreateTestUser,
  createTestUsers,
  BASE_URL,
};
