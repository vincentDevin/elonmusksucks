#!/usr/bin/env node
// scripts/load-tests/tests/health-monitor.js
// Monitors health of main server and achievement server during load tests

const axios = require('axios');

const MAIN_SERVER_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ACHIEVEMENT_SERVER_URL = process.env.ACHIEVEMENT_SERVER_URL || 'http://localhost:3001';

/**
 * Check health of a single endpoint
 */
async function checkHealth(url, name) {
  try {
    const startTime = Date.now();
    const response = await axios.get(`${url}/health`, {
      timeout: 5000,
    });
    const duration = Date.now() - startTime;

    return {
      name,
      url,
      status: 'healthy',
      responseTime: duration,
      data: response.data,
    };
  } catch (error) {
    return {
      name,
      url,
      status: 'unhealthy',
      error: error.message,
      code: error.code,
    };
  }
}

/**
 * Monitor health of both servers
 */
async function monitorHealth(options = {}) {
  const { interval = 5000, duration = 30000 } = options;

  console.log('\n💓 HEALTH MONITOR');
  console.log('═'.repeat(80));
  console.log(`  Main Server:        ${MAIN_SERVER_URL}`);
  console.log(`  Achievement Server: ${ACHIEVEMENT_SERVER_URL}`);
  console.log(`  Check Interval:     ${interval}ms`);
  console.log(`  Duration:           ${duration}ms (${duration / 1000}s)`);
  console.log('═'.repeat(80));
  console.log('');

  const startTime = Date.now();
  const checks = [];

  while (Date.now() - startTime < duration) {
    const timestamp = new Date().toISOString();

    // Check both servers concurrently
    const [mainHealth, achievementHealth] = await Promise.all([
      checkHealth(MAIN_SERVER_URL, 'Main Server'),
      checkHealth(ACHIEVEMENT_SERVER_URL, 'Achievement Server'),
    ]);

    checks.push({
      timestamp,
      main: mainHealth,
      achievement: achievementHealth,
    });

    // Display status
    const mainStatus = mainHealth.status === 'healthy' ? '✅' : '❌';
    const achievementStatus = achievementHealth.status === 'healthy' ? '✅' : '❌';

    const mainTime = mainHealth.responseTime ? `${mainHealth.responseTime}ms` : 'N/A';
    const achievementTime = achievementHealth.responseTime
      ? `${achievementHealth.responseTime}ms`
      : 'N/A';

    console.log(`[${timestamp}]`);
    console.log(`  Main:        ${mainStatus} ${mainTime}`);
    console.log(`  Achievement: ${achievementStatus} ${achievementTime}`);

    if (mainHealth.status === 'unhealthy') {
      console.log(`  ⚠️  Main server error: ${mainHealth.error}`);
    }

    if (achievementHealth.status === 'unhealthy') {
      console.log(`  ⚠️  Achievement server error: ${achievementHealth.error}`);
    }

    console.log('');

    // Wait for next check
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // Summary
  const mainHealthy = checks.filter((c) => c.main.status === 'healthy').length;
  const achievementHealthy = checks.filter((c) => c.achievement.status === 'healthy').length;
  const totalChecks = checks.length;

  console.log('═'.repeat(80));
  console.log('\n📊 HEALTH SUMMARY:\n');
  console.log(`  Total checks:       ${totalChecks}`);
  console.log(`  Main Server:        ${mainHealthy}/${totalChecks} healthy (${((mainHealthy / totalChecks) * 100).toFixed(1)}%)`);
  console.log(`  Achievement Server: ${achievementHealthy}/${totalChecks} healthy (${((achievementHealthy / totalChecks) * 100).toFixed(1)}%)`);
  console.log('');

  if (mainHealthy === totalChecks && achievementHealthy === totalChecks) {
    console.log('  ✅ Both servers maintained 100% uptime during monitoring');
  } else if (mainHealthy < totalChecks) {
    console.log('  ⚠️  Main server experienced downtime');
  }

  if (achievementHealthy < totalChecks) {
    console.log('  ⚠️  Achievement server experienced downtime');
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  return {
    checks,
    summary: {
      totalChecks,
      mainHealthy,
      achievementHealthy,
      mainUptime: (mainHealthy / totalChecks) * 100,
      achievementUptime: (achievementHealthy / totalChecks) * 100,
    },
  };
}

/**
 * Quick health check (single check for both servers)
 */
async function quickHealthCheck() {
  console.log('\n💓 QUICK HEALTH CHECK');
  console.log('═'.repeat(80));

  const [mainHealth, achievementHealth] = await Promise.all([
    checkHealth(MAIN_SERVER_URL, 'Main Server'),
    checkHealth(ACHIEVEMENT_SERVER_URL, 'Achievement Server'),
  ]);

  console.log('\n  Main Server:');
  console.log(`    URL:      ${mainHealth.url}`);
  console.log(`    Status:   ${mainHealth.status}`);
  if (mainHealth.responseTime) {
    console.log(`    Response: ${mainHealth.responseTime}ms`);
  }
  if (mainHealth.error) {
    console.log(`    Error:    ${mainHealth.error}`);
  }

  console.log('\n  Achievement Server:');
  console.log(`    URL:      ${achievementHealth.url}`);
  console.log(`    Status:   ${achievementHealth.status}`);
  if (achievementHealth.responseTime) {
    console.log(`    Response: ${achievementHealth.responseTime}ms`);
  }
  if (achievementHealth.error) {
    console.log(`    Error:    ${achievementHealth.error}`);
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  const bothHealthy =
    mainHealth.status === 'healthy' && achievementHealth.status === 'healthy';

  if (bothHealthy) {
    console.log('✅ Both servers are healthy and ready for testing\n');
  } else {
    console.log('❌ One or more servers are not healthy\n');
    console.log('Please ensure both servers are running:');
    console.log('  - Main server:        npm run dev (or start the server)');
    console.log('  - Achievement server: npm run achievement-server\n');
  }

  return bothHealthy;
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--quick')) {
    quickHealthCheck()
      .then((healthy) => {
        process.exit(healthy ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      });
  } else {
    const options = {};

    args.forEach((arg) => {
      const [key, value] = arg.split('=');
      if (key === '--interval') options.interval = parseInt(value, 10);
      if (key === '--duration') options.duration = parseInt(value, 10);
    });

    monitorHealth(options)
      .then(() => {
        console.log('✅ Health monitoring completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Health monitoring failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { monitorHealth, quickHealthCheck, checkHealth };
