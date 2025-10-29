#!/usr/bin/env node
/**
 * Load test for timeline endpoints
 * Run with: node scripts/load-tests/test-timeline.js
 */

const autocannon = require('autocannon');

const API_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const TOKEN = process.env.TEST_AUTH_TOKEN || '';

if (!TOKEN) {
  console.error('❌ ERROR: Set TEST_AUTH_TOKEN environment variable first');
  console.error('   Get a token by logging into the app and copying it from localStorage');
  process.exit(1);
}

const tests = [
  {
    title: 'Timeline Articles Only',
    url: `${API_URL}/api/timeline/articles?limit=30`,
    connections: 10,
    duration: 10,
  },
  {
    title: 'Unified Timeline (Articles + Posts)',
    url: `${API_URL}/api/timeline?limit=30`,
    connections: 10,
    duration: 10,
  },
  {
    title: 'Timeline Search (Empty Query)',
    url: `${API_URL}/api/timeline/search?q=&limit=30`,
    connections: 5,
    duration: 10,
  },
  {
    title: 'Timeline Search (Keyword: Tesla)',
    url: `${API_URL}/api/timeline/search?q=tesla&limit=30`,
    connections: 5,
    duration: 10,
  },
  {
    title: 'Trending Content (Day)',
    url: `${API_URL}/api/timeline/trending?timeRange=day&limit=10&type=all`,
    connections: 10,
    duration: 10,
  },
  {
    title: 'Trending Content (Week)',
    url: `${API_URL}/api/timeline/trending?timeRange=week&limit=10&type=all`,
    connections: 5,
    duration: 10,
  },
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${test.title}`);
  console.log(`${'='.repeat(60)}\n`);

  const result = await autocannon({
    url: test.url,
    connections: test.connections,
    duration: test.duration,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    setupClient: (client) => {
      // Track individual request timings
      client.on('response', (statusCode, resBytes, responseTime) => {
        if (responseTime > 1000) {
          console.warn(`⚠️  Slow response: ${responseTime}ms (status: ${statusCode})`);
        }
      });
    },
  });

  // Display results
  console.log(`\n📊 Results for ${test.title}:`);
  console.log(`   Requests: ${result.requests?.total || 0}`);
  console.log(`   Throughput: ${(result.throughput?.mean || 0).toFixed(2)} bytes/sec`);
  console.log(`   Latency:`);
  console.log(`     Mean: ${(result.latency?.mean || 0).toFixed(2)}ms`);
  console.log(`     p50: ${(result.latency?.p50 || 0).toFixed(2)}ms`);
  console.log(`     p95: ${(result.latency?.p95 || 0).toFixed(2)}ms`);
  console.log(`     p99: ${(result.latency?.p99 || 0).toFixed(2)}ms`);
  console.log(`     Max: ${(result.latency?.max || 0).toFixed(2)}ms`);
  console.log(`   Errors: ${result.errors || 0}`);
  console.log(`   Timeouts: ${result.timeouts || 0}`);

  // Performance assessment for timeline endpoints
  const p99 = result.latency?.p99 || 0;
  if (p99 > 3000) {
    console.log(`   ❌ CRITICAL: p99 latency is ${p99.toFixed(0)}ms (>3s)`);
  } else if (p99 > 1000) {
    console.log(`   ⚠️  WARNING: p99 latency is ${p99.toFixed(0)}ms (>1s)`);
  } else if (p99 > 500) {
    console.log(`   ⚡ FAIR: p99 latency is ${p99.toFixed(0)}ms (>500ms)`);
  } else {
    console.log(`   ✅ GOOD: p99 latency is ${p99.toFixed(0)}ms (<500ms)`);
  }

  return result;
}

async function main() {
  console.log('\n🚀 Timeline Performance Load Testing');
  console.log(`   Server: ${API_URL}`);
  console.log(`   Date: ${new Date().toISOString()}\n`);

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push({ title: test.title, result });

    // Wait between tests to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(({ title, result }) => {
    const p99 = (result.latency?.p99 || 0).toFixed(0);
    const status = p99 > 3000 ? '❌' : p99 > 1000 ? '⚠️ ' : p99 > 500 ? '⚡' : '✅';
    console.log(`${status} ${title}: ${p99}ms (p99)`);
  });

  console.log('\n');
}

main().catch((err) => {
  console.error('Error running load tests:', err);
  process.exit(1);
});
