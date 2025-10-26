# Load Testing Suite

Comprehensive load testing for the elonmusksucks.net platform, covering both the main betting system and the pong game server.

## 📋 Table of Contents

- [Achievement System Tests](#achievement-system-tests)
- [Pong Server Tests](#pong-server-tests)

---

# Achievement System Tests

## 🎯 Purpose

These tests verify that migrating achievement processing from the main server to a dedicated achievement-server achieves the expected performance improvements:

- **Before:** Bet placement blocks on achievement evaluation (12-20 seconds)
- **After:** Bet placement returns immediately (<500ms), achievements process asynchronously

## 📋 Prerequisites

### 1. Start Both Servers

```bash
# Terminal 1: Main server + workers
npm run dev

# Terminal 2: Achievement server (IN SEPARATE TERMINAL!)
cd apps/achievement-server && npm run dev
```

### 2. Ensure Database Has Predictions

The tests require active predictions to place bets on. If you don't have any:

```bash
npm run seed:dev
```

## 🚀 Quick Start

### Run All Tests

```bash
node scripts/load-tests/run-all-tests.js
```

This runs the full test suite:
1. Health check (verifies both servers are running)
2. Bet placement load test (50 bets, 5 concurrent)
3. Achievement verification test (10 bets, verify unlocks)
4. Concurrent users stress test (10 users, 5 bets each)

### Run Individual Tests

```bash
# Health check
node scripts/load-tests/tests/health-monitor.js --quick

# Bet placement test
node scripts/load-tests/tests/bet-placement.js

# Achievement verification
node scripts/load-tests/tests/achievement-verification.js

# Concurrent users stress test
node scripts/load-tests/tests/concurrent-users.js
```

## 🎯 Success Criteria Summary

The achievement system migration is successful if:

1. ✅ **Bet placement latency < 500ms** (down from 12-20s)
2. ✅ **P95 latency < 1000ms**
3. ✅ **Achievements still unlock correctly**
4. ✅ **>95% success rate under load**
5. ✅ **Both servers maintain >99% uptime**

---

# Pong Server Tests

## 🎯 Purpose

Comprehensive load testing for the dedicated pong game server to ensure stability, performance, and connection handling under heavy concurrent load.

**What we test:**
- 🏓 **Lobby handling:** 50+ concurrent users browsing matches
- 🎮 **Match creation:** 20+ AI and 10+ PVP matches created simultaneously
- ⚡ **Game performance:** 10+ concurrent games with 128fps game loops
- 👀 **Spectator system:** 30+ spectators watching active games
- 💥 **Connection chaos:** Rapid connect/disconnect cycles, mid-game disconnects
- 🚦 **Rate limiting:** Verification of all rate limit enforcement
- 🚀 **Full system:** Combined stress test with all scenarios

## 📋 Prerequisites

### 1. Start Required Servers

```bash
# Terminal 1: Main server (required for authentication and database)
npm run dev

# Terminal 2: Pong server (port 5001)
npm -w apps/pong-server run dev
```

**Note:** Both servers must be running for pong tests to work (pong server needs main server for user authentication).

### 2. Verify Server Health

```bash
# Check main server
curl http://localhost:5000/health

# Check pong server
curl http://localhost:5001/health
```

## 🚀 Quick Start

### Run All Pong Tests

```bash
# Full test suite (takes ~15-20 minutes)
node scripts/load-tests/run-pong-tests.cjs

# Quick mode (reduced scale, takes ~5-8 minutes)
node scripts/load-tests/run-pong-tests.cjs --quick

# Skip specific tests
node scripts/load-tests/run-pong-tests.cjs --skip-full-system
```

### Run Individual Tests

```bash
# 1. Lobby Stress Test (50 concurrent users)
node scripts/load-tests/tests/pong-lobby-stress.cjs

# 2. Match Creation Load Test (20 AI + 10 PVP)
node scripts/load-tests/tests/pong-match-creation.cjs

# 3. Concurrent Games Test (10 simultaneous games)
node scripts/load-tests/tests/pong-concurrent-games.cjs

# 4. Spectator Load Test (5 games, 5 spectators each)
node scripts/load-tests/tests/pong-spectator-load.cjs

# 5. Connection Chaos Test (rapid connect/disconnect)
node scripts/load-tests/tests/pong-connection-chaos.cjs

# 6. Rate Limit Validation Test
node scripts/load-tests/tests/pong-rate-limit.cjs

# 7. Full System Load Test (50 lobby + 15 games + 30 spectators, 5 min)
node scripts/load-tests/tests/pong-full-system.cjs
```

### Customize Test Parameters

All tests accept command-line arguments:

```bash
# Lobby stress with custom parameters
node scripts/load-tests/tests/pong-lobby-stress.cjs --users=30 --duration=20

# Match creation with custom counts
node scripts/load-tests/tests/pong-match-creation.cjs --ai-matches=30 --pvp-matches=15

# Concurrent games with custom game count
node scripts/load-tests/tests/pong-concurrent-games.cjs --games=15

# Spectator load with custom distribution
node scripts/load-tests/tests/pong-spectator-load.cjs --games=8 --spectators-per-game=4 --duration=45

# Connection chaos with custom cycles
node scripts/load-tests/tests/pong-connection-chaos.cjs --users=30 --cycles=5 --mid-game=8

# Full system with custom scale
node scripts/load-tests/tests/pong-full-system.cjs --lobby-users=100 --active-games=20 --spectators=50 --duration=600
```

## 🎯 Success Criteria

### Per-Test Criteria

| Test | Success Criteria |
|------|------------------|
| **Lobby Stress** | • 95%+ connection rate<br>• <500ms lobby state latency<br>• 0 stale connections<br>• 0 unexpected disconnects |
| **Match Creation** | • 95%+ creation success<br>• <1s creation latency<br>• Wager validation works<br>• Rate limits enforced |
| **Concurrent Games** | • 80%+ game completion<br>• ≥50Hz game state updates<br>• Smooth 128fps game loop<br>• <5% dropped frames |
| **Spectator Load** | • 95%+ spectator connections<br>• <500ms join latency<br>• ≥80% update delivery |
| **Connection Chaos** | • 95%+ reconnection success<br>• 100% stale cleanup<br>• <10% error rate |
| **Rate Limit** | • All limits enforced correctly<br>• 0 false positives<br>• 100% malicious blocked |
| **Full System** | • 95%+ connection success<br>• <5% error rate<br>• 0 unexpected disconnects<br>• 5min sustained load |

### Overall System Health

✅ **EXCELLENT:** All tests pass, system is production-ready
⚠️ **GOOD:** Minor issues, investigate warnings
❌ **POOR:** Critical failures, system not ready for load

## 📊 Understanding Results

### Metrics Collected

All tests collect comprehensive metrics:

- **Connections:** Success rate, latency, failures
- **Authentication:** Auth success rate, timing
- **Match Operations:** Creation/join success, latency
- **Game State Updates:** Frequency, delivery rate
- **Ping:** Average, P95, P99
- **Errors:** Total count, error types
- **Disconnections:** Intentional vs unexpected

### Results Location

Test results are saved to `scripts/load-tests/results/` with timestamps:

```
results/
├── pong-lobby-stress_2025-10-26T12-00-00-000Z.json
├── pong-match-creation_2025-10-26T12-05-00-000Z.json
├── pong-concurrent-games_2025-10-26T12-10-00-000Z.json
└── pong-all-tests-summary_2025-10-26T12-30-00-000Z.json
```

### Interpreting Results

**Good Performance Indicators:**
- Connection success rate: 95-100%
- Match creation latency: <1000ms
- Game state frequency: 50-120Hz
- Error rate: <5%
- Unexpected disconnects: 0

**Warning Signs:**
- Connection success rate: <95%
- High latency (>2s for match operations)
- Game state frequency: <50Hz
- Error rate: >5%
- Unexpected disconnects: >0

**Critical Issues:**
- Connection failures: >10%
- Timeouts: frequent
- Server crashes or hangs
- Memory leaks (increasing memory over time)
- Stale connections accumulating

## 🔧 Troubleshooting

### Tests Failing to Connect

```bash
# Verify pong server is running
curl http://localhost:5001/health

# Check pong server logs
# (should see connection attempts)

# Verify main server is running (auth required)
curl http://localhost:5000/health
```

### High Error Rates

- Check server logs for error patterns
- Verify database connections
- Check Redis connectivity
- Monitor CPU/memory usage

### Rate Limit Tests Failing

- Ensure rate limiter middleware is enabled
- Check rate limit configuration in `apps/pong-server/src/middleware/socketRateLimiter.ts`
- Verify timing windows in tests match server config

### Memory Issues During Full System Test

- Full system test is intentionally intensive
- Monitor with `top` or Activity Monitor
- Expected memory usage: 200-500MB for pong server
- If memory grows continuously: potential leak

## 📝 Test Architecture

### Test Files

```
scripts/load-tests/
├── helpers/
│   ├── auth.cjs              # User creation, authentication
│   ├── pong.cjs              # Pong-specific socket utilities
│   ├── pongMetrics.cjs       # Metrics collection
│   └── results.cjs           # Result saving/formatting
├── tests/
│   ├── pong-lobby-stress.cjs       # Test 1: Lobby
│   ├── pong-match-creation.cjs     # Test 2: Match creation
│   ├── pong-concurrent-games.cjs   # Test 3: Active games
│   ├── pong-spectator-load.cjs     # Test 4: Spectators
│   ├── pong-connection-chaos.cjs   # Test 5: Connections
│   ├── pong-rate-limit.cjs         # Test 6: Rate limits
│   └── pong-full-system.cjs        # Test 7: Full load
└── run-pong-tests.cjs        # Main test runner
```

### Key Features

- ✅ Realistic player input simulation (60 Hz)
- ✅ Concurrent test execution
- ✅ Comprehensive metrics tracking
- ✅ Automatic cleanup on failures
- ✅ Progress monitoring and reporting
- ✅ Configurable test parameters
- ✅ Saved results with timestamps

## 🎮 What Each Test Does

### 1. Lobby Stress Test
Simulates 50 users browsing the lobby simultaneously, periodically refreshing to see available matches. Tests lobby state broadcast performance and connection tracking.

### 2. Match Creation Load Test
Creates 20 AI matches (various difficulties) and 10 PVP lobbies concurrently. Tests wager validation, database transactions, and match initialization under load.

### 3. Concurrent Games Test
Runs 10 active games simultaneously with realistic player input (60 Hz). Tests the 128fps game loop, physics simulation, and game state broadcasting at 120Hz.

### 4. Spectator Load Test
Adds 5 spectators to each of 5 active games (25 total spectators). Tests spectator room management and efficient game state delivery to multiple clients.

### 5. Connection Chaos Test
Performs rapid connect/disconnect cycles (3 rounds with 20 users), then tests mid-game disconnections and reconnections. Validates stale connection cleanup and reconnection grace period.

### 6. Rate Limit Validation Test
Intentionally exceeds rate limits for each event type to verify enforcement. Ensures malicious traffic is blocked while legitimate gameplay is unaffected.

### 7. Full System Load Test
The ultimate stress test: 50 lobby users + 15 active games + 30 spectators running for 5 minutes. Tests sustained load, memory stability, and overall system performance.

## 🚦 CI/CD Integration

To integrate pong tests into CI/CD:

```bash
# Quick smoke test (5-8 minutes)
npm run test:pong:quick

# Full test suite (before deployment)
npm run test:pong:full

# Or use the runner directly
node scripts/load-tests/run-pong-tests.cjs --quick

# Exit code 0 = all passed, 1 = failures
```

Add to `package.json`:
```json
{
  "scripts": {
    "test:pong:quick": "node scripts/load-tests/run-pong-tests.cjs --quick",
    "test:pong:full": "node scripts/load-tests/run-pong-tests.cjs"
  }
}
```

## 📈 Performance Baselines

Expected performance on reasonable hardware (4 cores, 8GB RAM):

| Metric | Target | Excellent | Acceptable | Poor |
|--------|--------|-----------|------------|------|
| Connection Success | 95%+ | 98%+ | 95-98% | <95% |
| Match Creation Latency | <1s | <500ms | 500ms-1s | >1s |
| Game State Frequency | 50-120Hz | 100-120Hz | 50-100Hz | <50Hz |
| Concurrent Games | 10+ | 15+ | 10-15 | <10 |
| Error Rate | <5% | <1% | 1-5% | >5% |
| Memory Growth | Stable | <10% over 5min | 10-20% | >20% |

