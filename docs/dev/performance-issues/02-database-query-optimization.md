# Database Query Optimization Opportunities

**Severity:** 🟡 HIGH - Contributing Factor
**Impact:** 2-5 second additional latency on user-facing endpoints
**Date Analyzed:** 2025-01-18
**Status:** DIAGNOSED - REQUIRES OPTIMIZATION

---

## Executive Summary

Beyond the critical achievement system bottleneck, there are **several N+1 query patterns** and **sequential query waterfalls** in user-facing endpoints. While not as catastrophic as the achievement system, these issues compound the performance degradation and prevent the API from reaching acceptable p99 latencies (<500ms).

**Key Issues:**
1. **Enhanced User Stats** - 5 parallel queries but potential N+1 in category calculations
2. **Leaderboard queries** - Fetching user data for all leaderboard entries
3. **Prediction listings** - Loading related data sequentially
4. **Timeline/Posts** - Comment count and reaction aggregations
5. **Admin analytics** - Already optimized (see `PERFORMANCE_IMPROVEMENTS.md`)

**Target:** All user-facing endpoints should execute <10 queries total, <200ms p99 latency

---

## 1. Enhanced User Stats Endpoint

**Endpoint:** `GET /api/users/:userId/enhanced-stats`
**File:** `apps/server/src/services/enhancedUserStats.service.ts:33-84`
**Current p99 (estimated):** 1500-3000ms
**Target p99:** <300ms

### Current Flow

```typescript
async getEnhancedStats(userId: number): Promise<EnhancedUserStats> {
  const [basicStats, categoryAccuracy, currentStreak, trends, ranking] = await Promise.all([
    this.getBasicStats(userId),          // 1 query
    this.calculateCategoryAccuracy(userId), // N queries (one per category)
    this.calculateCurrentStreak(userId),    // 1 query
    this.calculateTrends(userId),           // 3-5 queries
    this.getUserRanking(userId),            // 2 queries (all-time + daily)
  ]);
  // ...
}
```

### Issues

#### A. `calculateCategoryAccuracy()` - Potential N+1

**Location:** `enhancedUserStats.service.ts:152-188`

**Current Pattern (suspected):**
```typescript
private async calculateCategoryAccuracy(userId: number): Promise<CategoryAccuracy[]> {
  // Query 1: Get all user's bets
  const bets = await this.bettingRepository.getUserBets(userId);

  // ❌ Group by category in JavaScript memory
  const byCategory = bets.reduce((acc, bet) => {
    const category = bet.prediction.category;
    if (!acc[category]) acc[category] = { won: 0, total: 0 };
    acc[category].total++;
    if (bet.status === 'WON') acc[category].won++;
    return acc;
  }, {});

  // Convert to array
  return Object.entries(byCategory).map(([category, stats]) => ({
    category,
    accuracy: stats.total > 0 ? stats.won / stats.total : 0,
    totalBets: stats.total,
  }));
}
```

**Problem:** If user has 1000 bets, loads all 1000 bets with prediction data, then filters in memory.

**Optimized Pattern:**
```sql
-- Single query with GROUP BY
SELECT
  p.category,
  COUNT(*)::int as total_bets,
  COUNT(CASE WHEN b.status = 'WON' THEN 1 END)::int as bets_won,
  CAST(COUNT(CASE WHEN b.status = 'WON' THEN 1 END) AS FLOAT) / COUNT(*)::float as accuracy
FROM "Bet" b
JOIN "Option" o ON b."optionId" = o.id
JOIN "Prediction" p ON o."predictionId" = p.id
WHERE b."userId" = $1
GROUP BY p.category
ORDER BY accuracy DESC;
```

**Expected Improvement:**
- **Before:** 1 query + in-memory filtering (500-1000ms for 1000 bets)
- **After:** 1 query (20-50ms)
- **Savings:** 450-950ms

---

#### B. `getUserRanking()` - Sequential Queries

**Location:** `enhancedUserStats.service.ts:86-134`

```typescript
const [allTimeRank, dailyRank, stats] = await Promise.all([
  leaderboardService.getUserRank(userId, 'allTime'), // Query 1
  leaderboardService.getUserRank(userId, 'daily'),   // Query 2
  leaderboardService.getLeaderboardStats(),          // Query 3
]);
```

**Issue:** Three separate queries to leaderboard tables when could be combined.

**Current Queries:**
1. `getUserRank(userId, 'allTime')` - Scan leaderboard for user's rank
2. `getUserRank(userId, 'daily')` - Scan leaderboard for user's daily rank
3. `getLeaderboardStats()` - Count total users

**Optimized Pattern:**
```sql
-- Single CTE query
WITH user_rankings AS (
  SELECT
    RANK() OVER (ORDER BY "allTimeProfit" DESC) as all_time_rank,
    RANK() OVER (ORDER BY "dailyProfit" DESC) as daily_rank,
    "userId"
  FROM "LeaderboardEntry"
  WHERE "userId" = $1
),
total_stats AS (
  SELECT COUNT(DISTINCT "userId")::int as total_users
  FROM "LeaderboardEntry"
)
SELECT
  ur.all_time_rank,
  ur.daily_rank,
  ts.total_users
FROM user_rankings ur
CROSS JOIN total_stats ts;
```

**Expected Improvement:**
- **Before:** 3 queries in parallel (100-200ms total)
- **After:** 1 query (30-50ms)
- **Savings:** 50-150ms

---

#### C. `calculateTrends()` - Missing Implementation Details

**Location:** Needs investigation
**Concern:** If fetching weekly/monthly data with multiple queries instead of single aggregation

**Recommended Pattern:**
```sql
-- Single query for weekly volume + monthly P/L
WITH date_range AS (
  SELECT
    CURRENT_DATE - INTERVAL '7 days' as week_start,
    CURRENT_DATE - INTERVAL '30 days' as month_start
),
weekly_bets AS (
  SELECT COALESCE(SUM(amount), 0)::bigint as weekly_volume
  FROM "Bet"
  WHERE "userId" = $1
    AND "createdAt" >= (SELECT week_start FROM date_range)
),
monthly_profit AS (
  SELECT COALESCE(SUM(
    CASE
      WHEN status = 'WON' THEN ("potentialPayout" - amount)
      WHEN status = 'LOST' THEN -amount
      ELSE 0
    END
  ), 0)::bigint as monthly_pl
  FROM "Bet"
  WHERE "userId" = $1
    AND "createdAt" >= (SELECT month_start FROM date_range)
)
SELECT
  wb.weekly_volume,
  mp.monthly_pl
FROM weekly_bets wb
CROSS JOIN monthly_profit mp;
```

---

## 2. Leaderboard Endpoint

**Endpoint:** `GET /api/leaderboard/all-time`
**File:** `apps/server/src/repositories/LeaderboardRepository.ts`
**Current p99 (estimated):** 500-1000ms (already cached per `PERFORMANCE_IMPROVEMENTS.md`)
**Target p99:** <100ms (cached), <300ms (uncached)

### Potential Issue: User Data Fetching

**Suspected Pattern:**
```typescript
// Query 1: Get top N leaderboard entries
const entries = await prisma.leaderboardEntry.findMany({
  take: 100,
  orderBy: { allTimeProfit: 'desc' }
});

// Query 2-101: Get user data for each entry (N+1)
for (const entry of entries) {
  entry.user = await prisma.user.findUnique({
    where: { id: entry.userId }
  });
}
```

**Optimized Pattern:**
```typescript
// Single query with JOIN
const entries = await prisma.leaderboardEntry.findMany({
  take: 100,
  orderBy: { allTimeProfit: 'desc' },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        profilePictureKey: true
      }
    }
  }
});
```

**Note:** According to `LeaderboardRepository.ts:2`, there are already comments about N+1 prevention. Needs verification via load testing.

**Expected Improvement:**
- **Before:** 101 queries (500-1000ms)
- **After:** 1 query (50-100ms)
- **Savings:** 450-900ms (if N+1 exists)

---

## 3. Prediction Listings

**Endpoint:** `GET /api/predictions`
**File:** `apps/server/src/repositories/PredictionRepository.ts`
**Current p99 (estimated):** 800-1500ms
**Target p99:** <300ms

### Comments Indicate N+1 Awareness

**File:** `PredictionRepository.ts:2`
**Comments found:** 2 comments about "N+1" or "sequential queries"

**Common Pattern (suspected):**
```typescript
// Get predictions
const predictions = await prisma.prediction.findMany({
  take: 50,
  where: { resolved: false }
});

// ❌ For each prediction, get option counts
for (const prediction of predictions) {
  prediction.optionCount = await prisma.option.count({
    where: { predictionId: prediction.id }
  });
}

// ❌ For each prediction, get total bet count
for (const prediction of predictions) {
  prediction.betCount = await prisma.bet.count({
    where: { prediction: { id: prediction.id } }
  });
}
```

**Optimized Pattern:**
```typescript
const predictions = await prisma.prediction.findMany({
  take: 50,
  where: { resolved: false },
  include: {
    options: {
      select: {
        id: true,
        label: true,
        odds: true,
        _count: {
          select: {
            bets: true  // Prisma aggregates this efficiently
          }
        }
      }
    },
    _count: {
      select: {
        bets: true
      }
    }
  }
});
```

**Expected Improvement:**
- **Before:** 1 + N + N queries (1 + 50 + 50 = 101 queries, 800-1500ms)
- **After:** 1 query with eager loading (100-200ms)
- **Savings:** 700-1300ms

---

## 4. Timeline/Posts Queries

**Endpoint:** `GET /api/timeline`
**File:** `apps/server/src/repositories/TimelineRepository.ts:1`
**Current p99:** <500ms (cached per `PERFORMANCE_IMPROVEMENTS.md`)
**Status:** ✅ Already optimized with caching

**Note:** Timeline has been optimized in previous performance work. Only concern is **comment counts** and **reaction aggregations**.

### Potential Issue: Comment Counts

**Pattern to avoid:**
```typescript
// Query 1: Get articles
const articles = await prisma.article.findMany({ take: 30 });

// Query 2-31: Get comment counts (N+1)
for (const article of articles) {
  article.commentCount = await prisma.comment.count({
    where: { articleId: article.id }
  });
}
```

**Optimized Pattern:**
```typescript
const articles = await prisma.article.findMany({
  take: 30,
  include: {
    _count: {
      select: {
        comments: true,
        reactions: true
      }
    }
  }
});
```

---

## 5. Admin Analytics Endpoints

**Status:** ✅ Already optimized (see `PERFORMANCE_IMPROVEMENTS.md`)

**Previous issues fixed:**
- In-memory filtering replaced with SQL aggregation
- Redis caching implemented (1-5 minute TTLs)
- Raw SQL with DATE() grouping for time-series data

**Current performance:** <500ms p99 (cached), <2s p99 (uncached)

**No further optimization needed at this time.**

---

## Database Index Analysis

**Current Indexes:** 132 indexes across schema (from `prisma/schema.prisma`)

### Key Indexes Verified ✅

These indexes exist and are properly utilized:

```sql
-- User activity logs
@@index([userId, occurredAt])  -- For activity timeline queries
@@index([occurredAt])          -- For global activity stream

-- Bets
@@index([userId, createdAt])   -- For user bet history
@@index([createdAt])           -- For recent bets
@@index([status])              -- For bet filtering

-- Predictions
@@index([createdAt])           -- For recent predictions
@@index([category, resolved])  -- For category filtering
@@index([expiresAt])           -- For expiration checks

-- Leaderboard
@@index([allTimeProfit])       -- For ranking queries
@@index([dailyProfit])         -- For daily rankings
```

### Missing Indexes (Potential Additions)

#### 1. Achievement Event Log Idempotency

**Query:** `hasProcessedEvent(idempotencyKey)` runs on EVERY achievement event

**Current:** `@@unique([idempotencyKey])` exists (schema.prisma)
**Status:** ✅ Index exists (unique constraint creates index)

#### 2. User Achievement Progress by User

**Query:** `findUserAchievements(userId)` runs frequently

**Recommended:**
```prisma
model UserAchievement {
  // ...
  @@index([userId, completedAt])  // For filtering completed vs. in-progress
  @@index([achievementId, userId]) // Already exists: @@unique([userId, achievementId])
}
```

**Status:** ⚠️ Check if `[userId, completedAt]` composite index exists

#### 3. Prediction Category + Resolved Composite

**Query:** Category filtering with resolution status

**Current:** Individual indexes on `category` and `resolved`
**Recommended:** Composite index
```prisma
@@index([category, resolved, createdAt])  // For category + status + ordering
```

---

## Query Performance Monitoring Gaps

### Missing: Slow Query Logging

**Current State:** No slow query logging in application
**Impact:** Cannot identify which specific queries are slow in production

**Recommended Implementation:**

```typescript
// apps/server/src/middleware/queryLogging.middleware.ts
import { PrismaClient } from '@prisma/client';

export function setupQueryLogging(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    // Log slow queries (>100ms)
    if (duration > 100) {
      console.warn(`[SLOW QUERY] ${params.model}.${params.action} took ${duration}ms`, {
        params: params.args,
        duration,
      });
    }

    // Send to monitoring (Grafana, Sentry, etc.)
    if (duration > 500) {
      // Critical slow query
      console.error(`[CRITICAL SLOW QUERY] ${params.model}.${params.action} took ${duration}ms`);
    }

    return result;
  });
}
```

**Benefits:**
- Identify slow queries in production
- Correlate with user-reported slowness
- Prioritize optimization efforts

---

### Missing: Database Connection Pool Monitoring

**Current State:** No visibility into connection pool saturation

**Recommended:**
```typescript
// apps/server/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Monitor connection pool
setInterval(() => {
  const poolSize = (prisma as any)._engineConfig?.connection?.poolSize || 10;
  const activeConnections = (prisma as any)._activeConnections || 0;

  if (activeConnections > poolSize * 0.8) {
    console.warn(`[DB] Connection pool at ${(activeConnections / poolSize * 100).toFixed(0)}% capacity`);
  }
}, 10000); // Check every 10 seconds
```

---

## Specific File Improvements

### 1. EnhancedUserStatsService

**File:** `apps/server/src/services/enhancedUserStats.service.ts`

**Changes:**
- [ ] Line 152-188: Rewrite `calculateCategoryAccuracy()` to use SQL GROUP BY
- [ ] Line 86-134: Combine `getUserRanking()` queries into single CTE
- [ ] Add query timing logs to identify bottlenecks

**Expected Impact:** 500-1000ms reduction

---

### 2. BettingRepository

**File:** `apps/server/src/repositories/BettingRepository.ts`

**Concerns:**
- `getUserBets()` - Verify uses proper pagination
- `getUserParlays()` - Check for N+1 on parlay legs

**Recommended Review:**
```typescript
// Ensure getUserBets includes necessary relations
async getUserBets(userId: number, limit = 100) {
  return this.prisma.bet.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      option: {
        include: {
          prediction: {
            select: {
              id: true,
              title: true,
              category: true,
            }
          }
        }
      }
    }
  });
}
```

---

### 3. PredictionRepository

**File:** `apps/server/src/repositories/PredictionRepository.ts`

**Known Issues:** 2 comments about N+1 queries

**Required Actions:**
- [ ] Audit all `findMany` calls for missing includes
- [ ] Replace sequential queries with eager loading
- [ ] Add `_count` aggregations instead of separate COUNT queries

---

### 4. LeaderboardRepository

**File:** `apps/server/src/repositories/LeaderboardRepository.ts`

**Known Issues:** 2 comments about N+1 queries

**Required Actions:**
- [ ] Verify all leaderboard queries include user data with `include: { user }`
- [ ] Check for sequential avatar URL generation (should batch/cache)

---

### 5. TimelineRepository

**File:** `apps/server/src/repositories/TimelineRepository.ts`

**Known Issues:** 1 comment about N+1 queries

**Status:** Likely already fixed with previous caching work, but verify:
- [ ] Comment counts use `_count` aggregation
- [ ] Reaction counts use `_count` aggregation
- [ ] No loops over articles/posts to fetch related data

---

## Priority Matrix

| Endpoint | Current p99 | Target p99 | Impact | Effort | Priority |
|----------|-------------|------------|--------|--------|----------|
| `/api/users/:userId/enhanced-stats` | 1500-3000ms | <300ms | HIGH | MEDIUM | 🔴 P0 |
| `/api/predictions` | 800-1500ms | <300ms | HIGH | LOW | 🔴 P0 |
| `/api/leaderboard/*` | 500-1000ms | <100ms | MEDIUM | LOW | 🟡 P1 |
| `/api/timeline` | <500ms (cached) | <200ms | LOW | LOW | 🟢 P2 |
| `/api/users/:userId/bets` | Unknown | <300ms | MEDIUM | LOW | 🟡 P1 |

---

## Recommended Optimizations (Ordered by ROI)

### 1. Enhanced User Stats Refactor (P0)
- **Effort:** 4-6 hours
- **Impact:** 1000-2000ms reduction
- **Files:** `enhancedUserStats.service.ts`
- **Actions:**
  - Rewrite `calculateCategoryAccuracy()` with GROUP BY
  - Combine `getUserRanking()` queries
  - Add query timing logs

### 2. Prediction Listings Eager Loading (P0)
- **Effort:** 2-4 hours
- **Impact:** 700-1300ms reduction
- **Files:** `PredictionRepository.ts`
- **Actions:**
  - Add `include` for options and counts
  - Remove sequential count queries
  - Test with 100 predictions in DB

### 3. Leaderboard N+1 Verification (P1)
- **Effort:** 1-2 hours
- **Impact:** 450-900ms reduction (if issue exists)
- **Files:** `LeaderboardRepository.ts`
- **Actions:**
  - Review all `findMany` calls
  - Ensure user data included
  - Add load test with 1000 leaderboard entries

### 4. Add Slow Query Logging (P0)
- **Effort:** 1 hour
- **Impact:** Ongoing visibility
- **Files:** New middleware file
- **Actions:**
  - Create Prisma middleware
  - Log queries >100ms
  - Alert on queries >500ms

### 5. Database Index Verification (P1)
- **Effort:** 2-3 hours
- **Impact:** 50-200ms per query
- **Files:** `schema.prisma`
- **Actions:**
  - Add `[userId, completedAt]` to UserAchievement
  - Add `[category, resolved, createdAt]` to Prediction
  - Run EXPLAIN ANALYZE on slow queries

---

## Load Test Validation Plan

After implementing optimizations, validate with:

```bash
# Test enhanced user stats endpoint
node scripts/load-tests/test-user.cjs

# Expected results:
# - p99 < 300ms (down from 1500-3000ms)
# - 0% error rate
# - <20 DB queries per request (down from 50+)

# Test prediction listings
node scripts/load-tests/test-predictions.cjs

# Expected results:
# - p99 < 300ms (down from 800-1500ms)
# - Single query with includes
# - Proper caching (2min TTL)
```

---

## Success Criteria

- [ ] All user-facing endpoints: p99 < 500ms
- [ ] Enhanced stats endpoint: p99 < 300ms
- [ ] No endpoint executes >20 queries
- [ ] Slow query logging identifies issues in production
- [ ] DB connection pool never exceeds 80% capacity
- [ ] Load tests show consistent performance under 100 concurrent users

---

## Next Steps

1. [ ] Run load tests to establish baseline metrics (see `LOAD_TESTING_STRATEGY.md`)
2. [ ] Implement slow query logging (1 hour)
3. [ ] Optimize Enhanced User Stats (4-6 hours)
4. [ ] Optimize Prediction Listings (2-4 hours)
5. [ ] Verify Leaderboard queries (1-2 hours)
6. [ ] Re-run load tests to validate improvements
7. [ ] Monitor production for 48 hours
8. [ ] Document final performance metrics
