// scripts/load-tests/helpers/results.js
// Results analysis and formatting for load tests

const fs = require('fs');
const path = require('path');

/**
 * Calculate percentiles from an array of values
 */
function calculatePercentiles(values, percentiles = [50, 95, 99]) {
  if (!values || values.length === 0) {
    return {};
  }

  const sorted = [...values].sort((a, b) => a - b);
  const result = {};

  percentiles.forEach((p) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    result[`p${p}`] = sorted[Math.max(0, index)];
  });

  return result;
}

/**
 * Calculate statistics from duration array
 */
function calculateStats(durations) {
  if (!durations || durations.length === 0) {
    return null;
  }

  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const percentiles = calculatePercentiles(durations);

  return {
    count: durations.length,
    min,
    max,
    avg: Math.round(avg),
    ...percentiles,
  };
}

/**
 * Format test results for display
 */
function formatResults(results) {
  const {
    testName,
    duration,
    totalRequests,
    successfulRequests,
    failedRequests,
    requestDurations,
    errors,
    metadata,
  } = results;

  const stats = calculateStats(requestDurations);
  const successRate = ((successfulRequests / totalRequests) * 100).toFixed(2);

  const output = [
    '',
    '═'.repeat(80),
    `  ${testName}`,
    '═'.repeat(80),
    '',
    `  Duration:           ${duration}ms (${(duration / 1000).toFixed(2)}s)`,
    `  Total Requests:     ${totalRequests}`,
    `  Successful:         ${successfulRequests} (${successRate}%)`,
    `  Failed:             ${failedRequests}`,
    '',
  ];

  if (stats) {
    output.push('  Response Times (ms):');
    output.push(`    Min:              ${stats.min}ms`);
    output.push(`    Max:              ${stats.max}ms`);
    output.push(`    Avg:              ${stats.avg}ms`);
    output.push(`    P50 (median):     ${stats.p50}ms`);
    output.push(`    P95:              ${stats.p95}ms`);
    output.push(`    P99:              ${stats.p99}ms`);
    output.push('');
  }

  if (metadata) {
    output.push('  Metadata:');
    Object.entries(metadata).forEach(([key, value]) => {
      output.push(`    ${key}: ${value}`);
    });
    output.push('');
  }

  if (errors && errors.length > 0) {
    output.push('  Errors:');
    const errorCounts = {};
    errors.forEach((err) => {
      const key = err.message || err.error || 'Unknown error';
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        output.push(`    ${error}: ${count}x`);
      });
    output.push('');
  }

  output.push('═'.repeat(80));
  output.push('');

  return output.join('\n');
}

/**
 * Save results to JSON file
 */
function saveResults(results, filename) {
  const resultsDir = path.join(__dirname, '../results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(resultsDir, `${filename}_${timestamp}.json`);

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

  console.log(`\n📊 Results saved to: ${filepath}`);

  return filepath;
}

/**
 * Compare two test results
 */
function compareResults(before, after) {
  const beforeStats = calculateStats(before.requestDurations);
  const afterStats = calculateStats(after.requestDurations);

  if (!beforeStats || !afterStats) {
    return 'Unable to compare - missing data';
  }

  const improvement = {
    avg: ((beforeStats.avg - afterStats.avg) / beforeStats.avg) * 100,
    p50: ((beforeStats.p50 - afterStats.p50) / beforeStats.p50) * 100,
    p95: ((beforeStats.p95 - afterStats.p95) / beforeStats.p95) * 100,
    p99: ((beforeStats.p99 - afterStats.p99) / beforeStats.p99) * 100,
  };

  const output = [
    '',
    '╔'.repeat(80),
    '  PERFORMANCE COMPARISON',
    '╚'.repeat(80),
    '',
    `  Test: ${before.testName}`,
    '',
    '  BEFORE MIGRATION:',
    `    Avg: ${beforeStats.avg}ms`,
    `    P50: ${beforeStats.p50}ms`,
    `    P95: ${beforeStats.p95}ms`,
    `    P99: ${beforeStats.p99}ms`,
    '',
    '  AFTER MIGRATION:',
    `    Avg: ${afterStats.avg}ms`,
    `    P50: ${afterStats.p50}ms`,
    `    P95: ${afterStats.p95}ms`,
    `    P99: ${afterStats.p99}ms`,
    '',
    '  IMPROVEMENT:',
    `    Avg: ${improvement.avg > 0 ? '+' : ''}${improvement.avg.toFixed(2)}%`,
    `    P50: ${improvement.p50 > 0 ? '+' : ''}${improvement.p50.toFixed(2)}%`,
    `    P95: ${improvement.p95 > 0 ? '+' : ''}${improvement.p95.toFixed(2)}%`,
    `    P99: ${improvement.p99 > 0 ? '+' : ''}${improvement.p99.toFixed(2)}%`,
    '',
    '╚'.repeat(80),
    '',
  ];

  return output.join('\n');
}

module.exports = {
  calculateStats,
  formatResults,
  saveResults,
  compareResults,
};
