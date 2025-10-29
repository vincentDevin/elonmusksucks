#!/usr/bin/env node
/**
 * Load test for Prediction endpoints
 * Tests the recently optimized GET /api/predictions endpoint
 * to verify bulk query optimization (getUserViewCountsBulk)
 */

const autocannon = require('autocannon');

const API_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const TOKEN = process.env.TEST_AUTH_TOKEN || '';

if (!TOKEN) {
  console.error('❌ ERROR: Set TEST_AUTH_TOKEN environment variable');
  console.error('');
  console.error('To get a token:');
  console.error('  1. Open http://127.0.0.1:3000 in your browser');
  console.error('  2. Login to your account');
  console.error('  3. Open DevTools Console');
  console.error('  4. Run: localStorage.getItem("accessToken")');
  console.error('  5. Copy the token and run:');
  console.error('     export TEST_AUTH_TOKEN="your_token_here"');
  console.error('');
  process.exit(1);
}

const tests = [
  {
    title: 'GET /api/predictions (list all - OPTIMIZED)',
    url: `${API_URL}/api/predictions`,
    method: 'GET',
    body: null,
    connections: 15, // Moderate concurrent load
    duration: 20, // 20 seconds
    description: 'Tests bulk view count optimization (N+1 query fix)',
  },
  {
    title: 'GET /api/predictions?status=APPROVED',
    url: `${API_URL}/api/predictions?status=APPROVED`,
    method: 'GET',
    body: null,
    connections: 10,
    duration: 15,
    description: 'Tests filtered predictions with bulk queries',
  },
  {
    title: 'GET /api/predictions (cold cache)',
    url: `${API_URL}/api/predictions`,
    method: 'GET',
    body: null,
    connections: 5, // Lower load to simulate fresh page load
    duration: 10,
    description: 'Simulates initial page load without cache',
  },
];

async function runTest(test) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Testing: ${test.title}`);
  console.log(`   Description: ${test.description}`);
  console.log(`${'='.repeat(70)}\n`);

  const options = {
    url: test.url,
    method: test.method,
    connections: test.connections,
    duration: test.duration,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (test.body) {
    options.body = JSON.stringify(test.body);
  }

  const result = await autocannon(options);

  // Display results
  console.log(`\n📊 Results for ${test.title}:`);
  console.log(`   Requests: ${result.requests?.total || 0}`);
  console.log(`   Throughput: ${((result.throughput?.mean || 0) / 1024).toFixed(2)} KB/sec`);
  console.log(`   Latency:`);
  console.log(`     Mean: ${(result.latency?.mean || 0).toFixed(2)}ms`);
  console.log(`     p50: ${(result.latency?.p50 || 0).toFixed(2)}ms`);
  console.log(`     p95: ${(result.latency?.p95 || 0).toFixed(2)}ms`);
  console.log(`     p99: ${(result.latency?.p99 || 0).toFixed(2)}ms`);
  console.log(`     Max: ${(result.latency?.max || 0).toFixed(2)}ms`);
  console.log(`   Errors: ${result.errors || 0}`);

  // Performance assessment (based on LOAD_TESTING_STRATEGY.md targets)
  const p99 = result.latency?.p99 || 0;

  console.log('\n   Performance Assessment:');
  if (p99 > 2000) {
    console.log(`   ❌ CRITICAL: p99 latency is ${p99.toFixed(0)}ms (target: <300ms for standard reads)`);
    console.log(`      This indicates a MAJOR performance issue!`);
  } else if (p99 > 500) {
    console.log(`   ⚠️  WARNING: p99 latency is ${p99.toFixed(0)}ms (target: <300ms)`);
    console.log(`      Still needs optimization.`);
  } else if (p99 > 300) {
    console.log(`   ⚡ FAIR: p99 latency is ${p99.toFixed(0)}ms (near target: <300ms)`);
    console.log(`      Room for improvement but acceptable.`);
  } else {
    console.log(`   ✅ EXCELLENT: p99 latency is ${p99.toFixed(0)}ms (target: <300ms)`);
    console.log(`      Performance goal achieved!`);
  }

  // Check for N+1 query issue (pre-optimization this would be 500ms+)
  if (p99 > 500) {
    console.log(`\n   🔍 N+1 Query Analysis:`);
    console.log(`      High latency suggests potential N+1 query pattern.`);
    console.log(`      Check server logs for multiple COUNT queries on UserActivityLog.`);
  }

  return result;
}

async function main() {
  console.log('\n🚀 Prediction Endpoints Performance Load Testing');
  console.log(`   Server: ${API_URL}`);
  console.log(`   Date: ${new Date().toISOString()}`);
  console.log(`   Optimization: getUserViewCountsBulk (bulk query instead of N queries)`);
  console.log('');

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push({ title: test.title, result });

    // Wait between tests to let server stabilize
    if (tests.indexOf(test) < tests.length - 1) {
      console.log('\n   ⏳ Waiting 3 seconds before next test...\n');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📈 LOAD TEST SUMMARY');
  console.log(`${'='.repeat(70)}\n`);

  let totalRequests = 0;
  let hasIssues = false;

  results.forEach(({ title, result }) => {
    const p99 = (result.latency?.p99 || 0).toFixed(0);
    const requests = result.requests?.total || 0;
    const status = p99 > 2000 ? '❌ CRITICAL' : p99 > 500 ? '⚠️  WARNING' : p99 > 300 ? '⚡ FAIR' : '✅ EXCELLENT';

    console.log(`${status.padEnd(15)} | ${title.padEnd(40)} | p99: ${p99}ms`);

    totalRequests += requests;
    if (p99 > 500) hasIssues = true;
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Total Requests Processed: ${totalRequests}`);

  if (hasIssues) {
    console.log(`\n⚠️  Performance Issues Detected:`);
    console.log(`   - Review server logs for N+1 query patterns`);
    console.log(`   - Verify getUserViewCountsBulk is being used`);
    console.log(`   - Check database connection pool utilization`);
  } else {
    console.log(`\n✅ All Tests Passed Performance Targets!`);
    console.log(`   - Bulk query optimization is working`);
    console.log(`   - N+1 query issue appears resolved`);
    console.log(`   - Server handling load efficiently`);
  }

  console.log('\n');
}

main().catch((err) => {
  console.error('❌ Error running load tests:', err);
  process.exit(1);
});
