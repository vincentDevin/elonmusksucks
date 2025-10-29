# Load Testing Coverage Gaps

**Severity:** 🟡 MEDIUM - Visibility Gap
**Impact:** Cannot identify performance bottlenecks without hard data
**Date Analyzed:** 2025-01-18
**Status:** DIAGNOSED - COMPREHENSIVE PLAN NEEDED

---

## Executive Summary

**Current Coverage:** Only **3 out of 17 controller groups** have load tests (**18% coverage**)

**Tested:** ✅
- Analytics endpoints (comprehensive)
- Leaderboard endpoints (comprehensive)
- Timeline endpoints (comprehensive)

**NOT Tested:** ❌
- **Auth** (login, register, token refresh) - CRITICAL
- **User** (profile, stats, achievements) - HIGH TRAFFIC
- **Betting** (place bet, create prediction, parlays) - CRITICAL PATH
- **Pong** (match creation, results, stats) - HIGH TRAFFIC
- **Posts** (create, get feed, reactions) - MEDIUM TRAFFIC
- **Admin** (moderation, analytics, management) - HEAVY QUERIES
- **Market** (trending, categories)
- **Feeds** (RSS management)
- **Moderation** (bulk operations)
- **Monitoring** (health checks, metrics)
- **Unified Content** (articles, comments)
- **Shame Wall** (public ban list)
- **Payout** (manual payouts)
- **Activity** (global activity stream)

**This gap prevents:**
- Identifying which endpoints are slow under load
- Establishing performance baselines before optimization
- Validating improvements after fixes
- Detecting regressions in CI/CD pipeline

---

## Current Load Test Infrastructure

### Existing Tests (GOOD)

**Location:** `scripts/load-tests/`

**Files:**
1. `test-analytics.cjs` - 4 endpoints tested
2. `test-leaderboard.cjs` - 4 endpoints tested
3. `test-timeline.cjs` - 3 endpoints tested
4. `README.md` - Documentation
5. `quick-start.sh` - Test runner

**Tool:** `autocannon` (HTTP benchmarking)

**Test Configuration:**
```javascript
const test = {
  url: `${API_URL}/api/analytics/dashboard`,
  connections: 5,      // Concurrent connections
  duration: 10,        // Test duration in seconds
  headers: {
    Authorization: `Bearer ${TOKEN}`,
  }
};
```

**Metrics Captured:**
- Mean latency
- p50, p95, p99 latency
- Throughput (bytes/sec)
- Request count
- Error rate

**Results Format:**
```
📊 Results:
   Requests: 45
   Latency:
     Mean: 1234.56ms
     p50: 1100.23ms
     p95: 2345.67ms
     p99: 3456.78ms
   ✅ GOOD: p99 latency is 456ms (<500ms)
```

---

## Coverage Gap Analysis

### Controller Inventory

**File:** `apps/server/src/controllers/`

| Controller | Endpoints | Load Tested? | Priority | Estimated Load |
|------------|-----------|--------------|----------|----------------|
| `auth.controller.ts` | 5 (login, register, refresh, verify, reset) | ❌ | P0 | HIGH |
| `user.controller.ts` | 14 (profile, stats, achievements, activity) | ❌ | P0 | VERY HIGH |
| `predictions.controller.ts` | 8 (create, list, bet, resolve) | ❌ | P0 | CRITICAL |
| `pong.controller.ts` | 6 (stats, history, matches) | ❌ | P1 | HIGH |
| `post.controller.ts` | 9 (create, list, reactions, comments) | ❌ | P1 | MEDIUM |
| `admin.controller.ts` | 24 (user mgmt, moderation, analytics) | ❌ | P1 | HEAVY |
| `leaderboard.controller.ts` | 4 (all-time, daily, stats, rank) | ✅ | - | HIGH |
| `dashboardAnalytics.controller.ts` | 7 (dashboard, health, trends) | ✅ | - | HEAVY |
| `timeline.controller.ts` | 7 (articles, search, trending) | ✅ | - | MEDIUM |
| `market.controller.ts` | 3 (trending, categories) | ❌ | P2 | LOW |
| `feeds.controller.ts` | 4 (list, create, delete) | ❌ | P2 | LOW |
| `moderation.controller.ts` | 6 (queue, approve, reject) | ❌ | P2 | LOW |
| `monitoring.controller.ts` | 2 (health, metrics) | ❌ | P2 | LOW |
| `unified-content.controller.ts` | 5 (articles, comments) | ❌ | P2 | MEDIUM |
| `shameWall.controller.ts` | 2 (list, details) | ❌ | P2 | LOW |
| `payout.controller.ts` | 1 (manual trigger) | ❌ | P3 | LOW |
| `activity.controller.ts` | 2 (global, user) | ❌ | P2 | MEDIUM |

**Total Endpoints:** ~110 endpoints
**Tested:** ~11 endpoints (**10% coverage**)
**Not Tested:** ~99 endpoints (**90% gap**)

---

## Critical Path Analysis

### 1. User Authentication Flow (P0 - MISSING)

**Endpoints:**
- `POST /api/auth/login` - Initial login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh (happens every 15 min)
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset

**Why Critical:**
- **Highest traffic** - Every user session starts here
- **Session establishment** - Token refresh happens constantly
- **Blocking operation** - Users can't proceed without successful auth

**Test Scenarios Needed:**
1. **Concurrent logins** - 100 users logging in simultaneously
2. **Token refresh burst** - 500 users refreshing tokens at once
3. **Invalid credentials** - Error handling under load
4. **Registration spike** - Viral signup event simulation

**Expected Issues:**
- bcrypt hashing may block event loop
- Database connection pool exhaustion on registration spikes
- JWT signing/verification slowness

---

### 2. User Dashboard & Stats (P0 - MISSING)

**Endpoints:**
- `GET /api/users/:userId/enhanced-stats` - Dashboard widget data
- `GET /api/users/:userId/achievements` - Achievement progress
- `GET /api/users/:userId/bets` - Bet history
- `GET /api/users/:userId/activity` - Activity timeline
- `GET /api/users/profile/:userId` - Profile view

**Why Critical:**
- **Every dashboard load** - Users see this first after login
- **Multiple queries** - 5-10 DB queries per request
- **No caching currently** (see `03-caching-strategy-gaps.md`)

**Test Scenarios Needed:**
1. **Dashboard load spike** - 200 users loading dashboard simultaneously
2. **Profile browsing** - Users viewing other profiles rapidly
3. **Stats refresh** - Rapid reloading of stats widget
4. **Achievement viewing** - All 77 achievements loaded

**Expected Issues:**
- Enhanced stats endpoint: 1500-3000ms (see `02-database-query-optimization.md`)
- Achievement progress loading all 77 achievements
- N+1 query patterns on bet history

---

### 3. Bet Placement & Predictions (P0 - MISSING - MOST CRITICAL)

**Endpoints:**
- `POST /api/predictions/:id/bet` - Place bet (TRIGGERS ACHIEVEMENTS!)
- `GET /api/predictions` - Browse predictions
- `GET /api/predictions/:id` - View prediction details
- `POST /api/predictions` - Create prediction
- `POST /api/predictions/:id/resolve` - Admin resolves

**Why MOST Critical:**
- **Core revenue path** - Users placing bets
- **Achievement trigger** - Every bet triggers 10-20+ DB queries (see `01-achievement-system-bottleneck.md`)
- **Real-time updates** - Socket.IO events to all connected clients
- **Transaction safety** - Money operations must be atomic

**Test Scenarios Needed:**
1. **Concurrent betting** - 50 users betting on same prediction simultaneously
2. **Prediction browsing** - Users rapidly scrolling prediction list
3. **Bet placement burst** - 100 bets placed in 10 seconds
4. **Parlay creation** - Users building multi-leg parlays
5. **Resolution processing** - Resolving prediction with 1000+ bets

**Expected Issues:**
- **CATASTROPHIC:** Achievement processing blocks API for 12-20 seconds per bet
- Race conditions on odds recalculation
- Database deadlocks on concurrent bets to same prediction
- Redis pub/sub backpressure

---

### 4. Pong Game Endpoints (P1 - MISSING)

**Endpoints:**
- `GET /api/users/:userId/pong-stats` - Player stats
- `GET /api/users/:userId/pong-history` - Match history
- `POST /api/pong/match/create` - Start match
- `POST /api/pong/match/:id/result` - Record result

**Why Important:**
- **High engagement** - Popular feature
- **Wager processing** - Money in/out on every match
- **Achievement triggers** - Pong achievements on every match
- **Real-time requirements** - Match results broadcast immediately

**Test Scenarios Needed:**
1. **Match creation spike** - 50 users starting matches simultaneously
2. **Result submission** - Concurrent match completions
3. **Stats viewing** - Users checking leaderboards
4. **History pagination** - Loading long match histories

**Expected Issues:**
- Achievement processing on every match (see `01-achievement-system-bottleneck.md`)
- Pong Elo calculation slowness
- Stats aggregation queries

---

## Missing Test Categories

### A. Error Handling Under Load

**Not Currently Tested:**
- 400 Bad Request scenarios (invalid input)
- 401 Unauthorized scenarios (expired tokens)
- 403 Forbidden scenarios (insufficient permissions)
- 404 Not Found scenarios
- 429 Rate Limiting (if implemented)
- 500 Internal Server Error recovery

**Why Important:**
- Error responses may be slower than successful responses
- Error logging can overwhelm systems
- Error paths may have different resource usage

---

### B. Realistic User Journeys

**Not Currently Tested:**
- Complete login → dashboard → place bet → view results flow
- Browse predictions → read details → place bet → check leaderboard flow
- Play pong → check stats → view achievements flow
- Admin login → moderation queue → bulk operations flow

**Why Important:**
- Real users don't hit single endpoints in isolation
- Connection pooling behaves differently with mixed workloads
- Caching effectiveness varies with usage patterns

---

### C. Concurrent Load Patterns

**Not Currently Tested:**
- Mixed workload (read + write operations)
- Spike traffic (viral event simulation)
- Sustained load (soak testing for memory leaks)
- Geographic distribution (latency simulation)

**Why Important:**
- Production traffic is never uniform
- Memory leaks only appear under sustained load
- Race conditions only appear under high concurrency

---

### D. Database Stress Testing

**Not Currently Tested:**
- Connection pool exhaustion scenarios
- Deadlock detection and recovery
- Slow query identification under load
- Transaction rollback performance
- Index effectiveness under concurrent queries

**Why Important:**
- Database is often the bottleneck
- Connection pools have hard limits
- Deadlocks can cascade into timeouts

---

### E. Redis/Cache Testing

**Not Currently Tested:**
- Cache miss scenarios (cold start)
- Cache eviction under memory pressure
- Redis connection failures
- Pub/sub message queuing
- Cache invalidation storm scenarios

**Why Important:**
- Cache failures can cause cascading load on database
- Pub/sub backpressure can block publishers
- Memory limits can cause evictions

---

## Recommended Load Test Suite

### Phase 1: Individual Endpoint Baselines (P0)

**Goal:** Establish p50/p95/p99 latency for ALL endpoints

**Tests to Create:**

1. `test-auth.cjs` - Auth endpoints (login, register, refresh)
2. `test-user.cjs` - User endpoints (profile, stats, achievements)
3. `test-betting.cjs` - Betting endpoints (place bet, create prediction)
4. `test-pong.cjs` - Pong endpoints (stats, matches)
5. `test-posts.cjs` - Post endpoints (create, feed, reactions)
6. `test-admin.cjs` - Admin endpoints (moderation, analytics)

**Configuration:**
- **Connections:** 10 concurrent
- **Duration:** 30 seconds
- **Measure:** p50, p95, p99, error rate
- **Target:** p99 < 500ms

**Expected Time:** 2-3 days to create and run all tests

---

### Phase 2: User Journey Testing (P1)

**Goal:** Test realistic workflows end-to-end

**Tests to Create:**

1. `test-user-flow-betting.cjs` - Login → Dashboard → Browse → Bet
2. `test-user-flow-pong.cjs` - Login → Pong → View Stats → Achievements
3. `test-user-flow-social.cjs` - Login → Create Post → Browse Feed → React
4. `test-admin-flow.cjs` - Admin Login → Moderation → Analytics → User Management

**Configuration:**
- **Users:** 50 concurrent
- **Duration:** 60 seconds
- **Measure:** End-to-end latency, error rate at each step
- **Target:** <5s total workflow time

**Expected Time:** 1-2 days

---

### Phase 3: Concurrency & Stress Testing (P1)

**Goal:** Find breaking points and race conditions

**Tests to Create:**

1. `test-concurrent-betting.cjs` - 100 users bet on same prediction
2. `test-spike-traffic.cjs` - Simulate viral event (0 → 500 users in 10s)
3. `test-database-stress.cjs` - Push connection pool to limits
4. `test-mixed-workload.cjs` - 50% reads, 30% writes, 20% heavy queries

**Configuration:**
- **Ramp-up:** 0 → max users over 30 seconds
- **Sustain:** Max load for 60 seconds
- **Ramp-down:** Gradual decrease
- **Measure:** Breaking point, error rates, resource saturation

**Expected Time:** 1-2 days

---

### Phase 4: Soak Testing (P2)

**Goal:** Detect memory leaks and resource exhaustion over time

**Tests to Create:**

1. `test-soak-8hr.cjs` - Sustained moderate load for 8 hours
2. `test-memory-leak.cjs` - Monitor memory growth over 4 hours
3. `test-connection-pool.cjs` - Verify connections are released properly

**Configuration:**
- **Load:** 50 concurrent users (moderate)
- **Duration:** 8+ hours
- **Measure:** Memory usage, connection pool size, response time degradation
- **Target:** No memory growth, no connection leaks

**Expected Time:** 1 day setup + overnight runs

---

## Load Test Template

**File:** `scripts/load-tests/test-template.cjs`

```javascript
#!/usr/bin/env node
/**
 * Load test template
 * Copy and modify for new endpoint tests
 */

const autocannon = require('autocannon');

const API_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const TOKEN = process.env.TEST_AUTH_TOKEN || '';

if (!TOKEN) {
  console.error('❌ ERROR: Set TEST_AUTH_TOKEN environment variable');
  process.exit(1);
}

const tests = [
  {
    title: 'Endpoint Name',
    url: `${API_URL}/api/endpoint/path`,
    method: 'GET', // or 'POST', 'PUT', 'DELETE'
    body: null, // JSON body for POST/PUT
    connections: 10, // Concurrent connections
    duration: 30, // Test duration in seconds
  },
];

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${test.title}`);
  console.log(`${'='.repeat(60)}\n`);

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
  console.log(`   Throughput: ${(result.throughput?.mean || 0).toFixed(2)} bytes/sec`);
  console.log(`   Latency:`);
  console.log(`     Mean: ${(result.latency?.mean || 0).toFixed(2)}ms`);
  console.log(`     p50: ${(result.latency?.p50 || 0).toFixed(2)}ms`);
  console.log(`     p95: ${(result.latency?.p95 || 0).toFixed(2)}ms`);
  console.log(`     p99: ${(result.latency?.p99 || 0).toFixed(2)}ms`);
  console.log(`     Max: ${(result.latency?.max || 0).toFixed(2)}ms`);
  console.log(`   Errors: ${result.errors || 0}`);

  // Performance assessment
  const p99 = result.latency?.p99 || 0;
  if (p99 > 5000) {
    console.log(`   ❌ CRITICAL: p99 latency is ${p99.toFixed(0)}ms (>5s)`);
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
  console.log('\n🚀 [ENDPOINT CATEGORY] Performance Load Testing');
  console.log(`   Server: ${API_URL}`);
  console.log(`   Date: ${new Date().toISOString()}\n`);

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push({ title: test.title, result });

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(({ title, result }) => {
    const p99 = (result.latency?.p99 || 0).toFixed(0);
    const status = p99 > 5000 ? '❌' : p99 > 1000 ? '⚠️ ' : p99 > 500 ? '⚡' : '✅';
    console.log(`${status} ${title}: ${p99}ms (p99)`);
  });

  console.log('\n');
}

main().catch((err) => {
  console.error('Error running load tests:', err);
  process.exit(1);
});
```

---

## Success Criteria

- [ ] All 17 controller groups have load tests
- [ ] 100% endpoint coverage for P0 endpoints
- [ ] All tests automated in CI/CD pipeline
- [ ] Load test results documented with baseline metrics
- [ ] Performance regression detection in place
- [ ] Soak tests run weekly to detect memory leaks

---

## Next Steps

1. [ ] Create all Phase 1 load tests (2-3 days)
2. [ ] Run tests and document baseline metrics (1 day)
3. [ ] Create Phase 2 user journey tests (1-2 days)
4. [ ] Create Phase 3 stress tests (1-2 days)
5. [ ] Set up Phase 4 soak testing (1 day + overnight)
6. [ ] Integrate into CI/CD pipeline (1 day)
7. [ ] Create Grafana dashboard for load test results (1 day)

**Total Estimated Time:** 8-12 days for comprehensive load testing infrastructure

**See `LOAD_TESTING_STRATEGY.md` for detailed implementation plan.**
