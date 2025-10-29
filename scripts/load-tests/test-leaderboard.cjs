#!/usr/bin/env node
/**
 * Load test for leaderboard endpoints
 * Run with: node scripts/load-tests/test-leaderboard.js
 */

const autocannon = require('autocannon');

const API_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const TOKEN = process.env.TEST_AUTH_TOKEN || '';

// Note: Leaderboard endpoints are public, auth token is optional
if (!TOKEN) {
  console.log('ℹ️  No auth token provided (leaderboard endpoints are public)');
}

const tests = [
  {
    title: 'Leaderboard All-Time (25 limit)',
    url: `${API_URL}/api/leaderboard/all-time?limit=25`,
    connections: 20,
    duration: 10,
  },
  {
    title: 'Leaderboard All-Time Paginated',
    url: `${API_URL}/api/leaderboard/all-time/paginated?limit=25&offset=0&metric=profit`,
    connections: 20,
    duration: 10,
  },
  {
    title: 'Leaderboard Daily',
    url: `${API_URL}/api/leaderboard/daily?limit=25`,
    connections: 20,
    duration: 10,
  },
  {
    title: 'Leaderboard Stats',
    url: `${API_URL}/api/leaderboard/stats`,
    connections: 15,
    duration: 10,
  },
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${test.title}`);
  console.log(`${'='.repeat(60)}\n`);

  const headers = {
    'Content-Type': 'application/json',
  };

  // Only add Authorization header if token is provided
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  const result = await autocannon({
    url: test.url,
    connections: test.connections,
    duration: test.duration,
    headers,
  });

  console.log(`\n📊 Results for ${test.title}:`);
  console.log(`   Requests: ${result.requests?.total || 0}`);
  console.log(`   Throughput: ${(result.throughput?.mean || 0).toFixed(2)} bytes/sec`);
  console.log(`   Latency:`);
  console.log(`     Mean: ${(result.latency?.mean || 0).toFixed(2)}ms`);
  console.log(`     p50: ${(result.latency?.p50 || 0).toFixed(2)}ms`);
  console.log(`     p95: ${(result.latency?.p95 || 0).toFixed(2)}ms`);
  console.log(`     p99: ${(result.latency?.p99 || 0).toFixed(2)}ms`);

  const p99 = result.latency?.p99 || 0;
  const status = p99 > 1000 ? '⚠️  WARNING' : p99 > 500 ? '⚡ FAIR' : '✅ GOOD';
  console.log(`   ${status}: p99 latency is ${p99.toFixed(0)}ms`);

  return result;
}

async function main() {
  console.log('\n🚀 Leaderboard Performance Load Testing');
  console.log(`   Server: ${API_URL}`);
  console.log(`   Date: ${new Date().toISOString()}\n`);

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push({ title: test.title, result });
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(({ title, result }) => {
    const p99 = (result.latency?.p99 || 0).toFixed(0);
    const status = p99 > 1000 ? '⚠️ ' : p99 > 500 ? '⚡' : '✅';
    console.log(`${status} ${title}: ${p99}ms (p99)`);
  });

  console.log('\n');
}

main().catch((err) => {
  console.error('Error running load tests:', err);
  process.exit(1);
});
