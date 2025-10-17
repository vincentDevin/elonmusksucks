# Load Testing Scripts

These scripts use `autocannon` to benchmark API endpoints and identify performance bottlenecks.

## Prerequisites

1. Server must be running locally:
   ```bash
   npm run dev
   ```

2. Get an authentication token:
   - Open the client app in browser (http://localhost:3000)
   - Login to your account
   - Open DevTools Console
   - Run: `localStorage.getItem('accessToken')`
   - Copy the token value

3. Set environment variable:
   ```bash
   export TEST_AUTH_TOKEN="your_token_here"
   ```

## Running Tests

### Analytics Endpoints
```bash
node scripts/load-tests/test-analytics.js
```

Tests the following endpoints:
- `/api/analytics/dashboard` - Comprehensive dashboard (4 parallel queries)
- `/api/analytics/platform-health` - Platform metrics
- `/api/analytics/trends` - Trend analysis
- `/api/analytics/cross-feature` - Cross-feature analytics

### Leaderboard Endpoints
```bash
node scripts/load-tests/test-leaderboard.js
```

Tests the following endpoints:
- `/api/leaderboard/all-time` - All-time leaderboard
- `/api/leaderboard/all-time/paginated` - Paginated all-time
- `/api/leaderboard/daily` - Daily leaderboard
- `/api/leaderboard/stats` - Leaderboard statistics

### Run All Tests
```bash
# Set your token
export TEST_AUTH_TOKEN="your_token_here"

# Run analytics tests
node scripts/load-tests/test-analytics.js

# Wait a bit, then run leaderboard tests
node scripts/load-tests/test-leaderboard.js
```

## Understanding Results

### Latency Metrics
- **Mean**: Average response time
- **p50 (median)**: 50% of requests completed faster than this
- **p95**: 95% of requests completed faster than this
- **p99**: 99% of requests completed faster than this (most important for SLA)

### Performance Targets
- ✅ **GOOD**: p99 < 500ms
- ⚡ **FAIR**: p99 < 1000ms (1 second)
- ⚠️  **WARNING**: p99 < 5000ms (5 seconds)
- ❌ **CRITICAL**: p99 > 5000ms (5+ seconds)

### Example Output
```
🧪 Testing: Analytics Dashboard (Comprehensive)
============================================================

📊 Results:
   Requests: 45
   Throughput: 2450.32 bytes/sec
   Latency:
     Mean: 1234.56ms
     p50: 1100.23ms
     p95: 2345.67ms
     p99: 3456.78ms
     Max: 4500.00ms
   ⚠️  WARNING: p99 latency is 3456ms (>1s)
```

## Troubleshooting

### "Cannot connect to server"
- Make sure server is running on port 5000
- Check that `API_BASE_URL` is correct (defaults to `http://localhost:5000`)

### "401 Unauthorized"
- Your token may have expired
- Get a fresh token from the browser console

### "Socket hang up" or timeouts
- Server may be overloaded
- Reduce `connections` parameter in test scripts
- Increase `duration` to give server more time

## Monitoring During Tests

While tests are running, you can monitor:

1. **Server Logs**: Watch for slow queries and errors in terminal running `npm run dev`

2. **Grafana Metrics**: Check http://localhost:3001 for real-time metrics:
   - HTTP request duration
   - Database query times
   - CPU and memory usage

3. **Database**: Monitor active connections and slow queries:
   ```sql
   -- Show active queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC;
   ```

## Next Steps

After running baseline tests:
1. Document current p99 latencies
2. Implement optimizations (caching, query rewrites, indexes)
3. Re-run tests to measure improvements
4. Compare before/after metrics
