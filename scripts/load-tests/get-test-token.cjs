#!/usr/bin/env node
/**
 * Create test user and get auth token for load testing
 */

const axios = require('axios');

const API_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';

// Generate unique username for test user
const timestamp = Date.now();
const testUser = {
  name: `LoadTest_${timestamp}`,
  email: `loadtest_${timestamp}@test.com`,
  password: 'LoadTest123!',
};

async function registerAndLogin() {
  console.log('🔧 Creating test user for load testing...\n');

  try {
    // Step 1: Register
    console.log(`📝 Registering user: ${testUser.name}`);
    const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
    });

    if (registerResponse.data.message) {
      console.log(`✅ User registered successfully`);
    } else {
      console.error('❌ Registration failed:', registerResponse.data);
      process.exit(1);
    }

    // Step 2: Login
    console.log(`\n🔐 Logging in as: ${testUser.name}`);
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });

    // Response can be { accessToken } or { data: { accessToken } }
    const token = loginResponse.data.accessToken || loginResponse.data.data?.accessToken;

    if (token) {
      console.log(`✅ Login successful\n`);
      console.log('═'.repeat(70));
      console.log('🎫 ACCESS TOKEN:');
      console.log('═'.repeat(70));
      console.log(token);
      console.log('═'.repeat(70));
      console.log('\n✅ Token saved! Run load tests with:');
      console.log(`\nexport TEST_AUTH_TOKEN="${token}"`);
      console.log('node scripts/load-tests/test-predictions.cjs\n');

      // Return just the token for easy export
      return token;
    } else {
      console.error('❌ Login failed:', loginResponse.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

registerAndLogin();
