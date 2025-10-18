# Achievement System Load Tests

Comprehensive load testing suite for verifying the achievement system migration performance improvements.

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

