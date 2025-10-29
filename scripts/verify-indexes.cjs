#!/usr/bin/env node

/**
 * Index Verification Script
 *
 * Verifies that database indexes are properly utilized by critical queries.
 * Uses EXPLAIN ANALYZE to check query execution plans and index usage.
 *
 * Usage: node scripts/verify-indexes.cjs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

/**
 * Analyze a query and check if it uses indexes
 */
async function analyzeQuery(queryName, sqlQuery, expectedIndexes = []) {
  log(`\n📊 Analyzing: ${queryName}`, 'bold');
  console.log(`Query: ${sqlQuery.substring(0, 100)}...`);

  try {
    const explainResult = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE ${sqlQuery}`);

    let usesIndex = false;
    let usesSeqScan = false;
    let executionTime = 0;

    const planText = explainResult.map(row => row['QUERY PLAN']).join('\n');

    // Check for index usage
    for (const expectedIndex of expectedIndexes) {
      if (planText.includes(expectedIndex)) {
        usesIndex = true;
        log(`  ✅ Using index: ${expectedIndex}`, 'green');
      }
    }

    // Check for sequential scans (bad for large tables)
    if (planText.includes('Seq Scan')) {
      usesSeqScan = true;
      log(`  ⚠️  WARNING: Sequential scan detected (may be slow on large tables)`, 'yellow');
    }

    // Extract execution time
    const timeMatch = planText.match(/Execution Time: ([\d.]+) ms/);
    if (timeMatch) {
      executionTime = parseFloat(timeMatch[1]);
      const timeColor = executionTime > 100 ? 'red' : executionTime > 50 ? 'yellow' : 'green';
      log(`  ⏱️  Execution time: ${executionTime.toFixed(2)}ms`, timeColor);
    }

    // Print full plan for manual inspection
    if (process.env.VERBOSE === 'true') {
      console.log('\nFull execution plan:');
      console.log(planText);
    }

    return {
      queryName,
      usesIndex,
      usesSeqScan,
      executionTime,
      success: true,
    };
  } catch (error) {
    log(`  ❌ Error analyzing query: ${error.message}`, 'red');
    return {
      queryName,
      usesIndex: false,
      usesSeqScan: false,
      executionTime: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main verification function
 */
async function verifyIndexes() {
  logSection('DATABASE INDEX VERIFICATION');

  const results = [];

  // Get a sample user ID for testing
  const sampleUser = await prisma.user.findFirst({
    select: { id: true },
  });

  if (!sampleUser) {
    log('⚠️  No users found in database. Skipping user-specific queries.', 'yellow');
  }

  const userId = sampleUser?.id || 1;

  // ============================================================================
  // 1. Category Accuracy Query (StatsRepository.getCategoryAccuracy)
  // ============================================================================
  logSection('1. Category Accuracy Query (User Stats)');
  results.push(await analyzeQuery(
    'Category Accuracy - GROUP BY with JOIN',
    `
      SELECT
        p.category,
        COUNT(*)::bigint as "totalBets",
        SUM(CASE WHEN b.status = 'WON' THEN 1 ELSE 0 END)::bigint as wins,
        AVG(CASE WHEN b.status = 'WON' THEN 1.0 ELSE 0.0 END) as accuracy
      FROM "Bet" b
      JOIN "Prediction" p ON b."predictionId" = p.id
      WHERE b."userId" = ${userId} AND b.status IN ('WON', 'LOST')
      GROUP BY p.category
      HAVING COUNT(*) >= 3
      ORDER BY accuracy DESC
    `,
    ['Bet_userId_createdAt_idx', 'Bet_predictionId'] // Expected indexes
  ));

  // ============================================================================
  // 2. User Ranking Combined Query (NEW OPTIMIZED)
  // ============================================================================
  logSection('2. User Ranking Combined Query (NEW - Single CTE)');
  results.push(await analyzeQuery(
    'User Ranking Combined - All-Time + Daily + Stats',
    `
      WITH all_time_ranks AS (
        SELECT
          "userId",
          ROW_NUMBER() OVER (ORDER BY profit DESC) as rank
        FROM "UserStats"
      ),
      daily_profits AS (
        SELECT
          us."userId",
          COALESCE(
            (SELECT SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END)
             FROM "Bet" b
             WHERE b."userId" = us."userId" AND b."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
            ), 0
          ) as daily_profit
        FROM "UserStats" us
      ),
      daily_ranks AS (
        SELECT
          "userId",
          ROW_NUMBER() OVER (ORDER BY daily_profit DESC) as rank
        FROM daily_profits
      ),
      user_stats AS (
        SELECT COUNT(*)::bigint as total_users
        FROM "UserStats"
      )
      SELECT
        atr.rank as all_time_rank,
        dr.rank as daily_rank,
        us.total_users
      FROM user_stats us
      LEFT JOIN all_time_ranks atr ON atr."userId" = ${userId}
      LEFT JOIN daily_ranks dr ON dr."userId" = ${userId}
    `,
    ['UserStats_pkey', 'Bet_userId_createdAt_idx']
  ));

  // ============================================================================
  // 3. Prediction Listings with Category + Status Filter (NEW INDEX)
  // ============================================================================
  logSection('3. Prediction Listings - Category + Resolved Filter (NEW INDEX)');

  const sampleCategory = await prisma.category.findFirst({ select: { id: true } });
  const categoryId = sampleCategory?.id || 1;

  results.push(await analyzeQuery(
    'Predictions by Category + Status',
    `
      SELECT * FROM "Prediction"
      WHERE "categoryId" = ${categoryId}
        AND "resolved" = false
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
    ['idx_prediction_category_status', 'Prediction_categoryId_createdAt_idx']
  ));

  // ============================================================================
  // 4. User Achievements - Completed Filter (NEW INDEX)
  // ============================================================================
  logSection('4. User Achievements - Completed Achievements (NEW INDEX)');
  results.push(await analyzeQuery(
    'User Completed Achievements',
    `
      SELECT * FROM "UserAchievement"
      WHERE "userId" = ${userId}
        AND "completedAt" IS NOT NULL
      ORDER BY "completedAt" DESC
    `,
    ['idx_user_achievement_completion', 'UserAchievement_userId_progress_idx']
  ));

  // ============================================================================
  // 5. Leaderboard All-Time Query
  // ============================================================================
  logSection('5. Leaderboard All-Time Query');
  results.push(await analyzeQuery(
    'Leaderboard All-Time Top 25',
    `
      SELECT us.*, u.name, u."avatarUrl"
      FROM "UserStats" us
      JOIN "User" u ON us."userId" = u.id
      ORDER BY us.profit DESC
      LIMIT 25
    `,
    ['UserStats_profit', 'User_pkey']
  ));

  // ============================================================================
  // 6. Recent Bets for Streak Calculation
  // ============================================================================
  logSection('6. Recent Bets for Streak Calculation');
  results.push(await analyzeQuery(
    'Recent Bets for Streak',
    `
      SELECT status, "createdAt" FROM "Bet"
      WHERE "userId" = ${userId}
        AND status IN ('WON', 'LOST')
      ORDER BY "createdAt" DESC
      LIMIT 50
    `,
    ['Bet_userId_createdAt_idx']
  ));

  // ============================================================================
  // Summary Report
  // ============================================================================
  logSection('VERIFICATION SUMMARY');

  const successCount = results.filter(r => r.success).length;
  const indexedCount = results.filter(r => r.usesIndex).length;
  const seqScanCount = results.filter(r => r.usesSeqScan).length;
  const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

  console.log(`Total queries tested: ${results.length}`);
  log(`✅ Successful analyses: ${successCount}/${results.length}`, 'green');
  log(`📊 Queries using indexes: ${indexedCount}/${results.length}`, indexedCount === results.length ? 'green' : 'yellow');
  log(`⚠️  Queries with sequential scans: ${seqScanCount}/${results.length}`, seqScanCount === 0 ? 'green' : 'yellow');
  log(`⏱️  Average execution time: ${avgTime.toFixed(2)}ms`, avgTime < 100 ? 'green' : 'yellow');

  // Performance targets
  console.log('\n📈 Performance Targets:');
  const slowQueries = results.filter(r => r.executionTime > 100);
  if (slowQueries.length === 0) {
    log('  ✅ All queries under 100ms threshold', 'green');
  } else {
    log(`  ⚠️  ${slowQueries.length} queries exceed 100ms:`, 'yellow');
    slowQueries.forEach(q => {
      console.log(`     - ${q.queryName}: ${q.executionTime.toFixed(2)}ms`);
    });
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (seqScanCount > 0) {
    log('  • Consider adding indexes for queries with sequential scans', 'yellow');
  }
  if (avgTime > 50) {
    log('  • Average query time is above 50ms - review slow queries', 'yellow');
  }
  if (indexedCount === results.length && avgTime < 50) {
    log('  • All queries are well-optimized! 🎉', 'green');
  }

  console.log('\n' + '='.repeat(80));
  log('Tip: Run with VERBOSE=true for full execution plans', 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Run verification
verifyIndexes()
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
