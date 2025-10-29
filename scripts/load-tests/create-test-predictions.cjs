#!/usr/bin/env node
// scripts/load-tests/create-test-predictions.cjs
// Creates test predictions for load testing

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function createAdminUser() {
  const email = 'admin@loadtest.local';
  const password = 'Admin123!';
  const name = 'LoadTest Admin';

  try {
    // Try to register
    await axios.post(`${BASE_URL}/api/auth/register`, {
      email,
      name,
      password,
    });
    console.log('✅ Created admin user');
  } catch (error) {
    // User probably already exists
    console.log('ℹ️  Admin user already exists');
  }

  // Login
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    email,
    password,
  });

  const accessToken = response.data.data?.accessToken || response.data.accessToken;
  return accessToken;
}

async function createTestPrediction(accessToken, index) {
  const titles = [
    `Will Tesla stock reach $300 by end of ${new Date().getFullYear()}?`,
    `Will SpaceX launch successfully this month?`,
    `Will Twitter/X gain 10M users this quarter?`,
    `Will a new Tesla model be announced this year?`,
    `Will Starlink expand to 50 new countries?`,
  ];

  const title = `${titles[index % titles.length]} (Test ${index + 1})`;

  try {
    const response = await axios.post(
      `${BASE_URL}/api/predictions`,
      {
        title,
        description: `Load test prediction ${index + 1} for testing achievement system performance`,
        type: 'BINARY',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now (CORRECT FIELD)
        options: [
          { text: 'Yes', order: 0 },
          { text: 'No', order: 1 }
        ],
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Failed to create prediction ${index}:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  const count = parseInt(process.argv[2]) || 10;

  console.log('\\n📝 CREATING TEST PREDICTIONS');
  console.log('═'.repeat(80));
  console.log(`  Creating ${count} test predictions...\\n`);

  try {
    // Create admin user and login
    const accessToken = await createAdminUser();

    // Create predictions with delays to avoid rate limiting
    const predictions = [];
    for (let i = 0; i < count; i++) {
      const prediction = await createTestPrediction(accessToken, i);
      if (prediction) {
        predictions.push(prediction);
        process.stdout.write(`\\r  Created ${predictions.length}/${count} predictions`);
      }
      // Wait 2 seconds between creations to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\\n\\n✅ Test predictions created successfully!');
    console.log(`   Total predictions: ${predictions.length}`);
    console.log('\\n═'.repeat(80) + '\\n');
  } catch (error) {
    console.error('\\n❌ Failed to create test predictions:', error.message);
    process.exit(1);
  }
}

main();
