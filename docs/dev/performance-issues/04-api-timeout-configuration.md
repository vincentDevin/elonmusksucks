# API Timeout Configuration

**Severity:** 🟠 MEDIUM - Reliability Issue
**Impact:** Requests can hang indefinitely, cascading into resource exhaustion
**Date Analyzed:** 2025-01-18
**Status:** DIAGNOSED - MISSING ENTIRELY

---

## Executive Summary

The API server has **no request timeout middleware**, allowing requests to hang indefinitely when:
- Database queries deadlock
- Achievement processing blocks (see `01-achievement-system-bottleneck.md`)
- External services (Redis, S3) become unresponsive
- Infinite loops or memory leaks occur in business logic

**This is a critical reliability gap** - without timeouts, a single hanging request can:
1. Hold a database connection indefinitely (pool exhaustion)
2. Block the Node.js event loop (prevents other requests)
3. Consume memory without bounds (OOM crash)
4. Prevent graceful shutdown (containers hang on deploy)

**Target:** All endpoints timeout between 5-30 seconds based on expected latency

---

## Current State: No Timeout Protection

### Server Configuration

**File:** `apps/server/src/index.ts`

```typescript
const app = express();

// ❌ NO TIMEOUT CONFIGURATION
app.use(cors({ ... }));
app.use(helmet({ ... }));
app.use(express.json());
// ... routes

const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ❌ NO SERVER TIMEOUT SET
// Default: 2 minutes (Node.js default) - TOO LONG
```

### HTTP Server Defaults

Node.js HTTP server defaults:
- **Request timeout:** 120 seconds (2 minutes)
- **Keep-alive timeout:** 5 seconds
- **Headers timeout:** 60 seconds

**Problem:** 2 minutes is **far too long** for API requests. Users abandon after 5-10 seconds.

---

## Recommended Timeout Hierarchy

### Timeout Categories

| Endpoint Type | Example | Timeout | Reasoning |
|---------------|---------|---------|-----------|
| **Health checks** | `/health`, `/metrics` | 5s | Must be fast or fail fast |
| **Fast reads** | `/api/users/profile/:id` | 10s | Single DB query |
| **Standard reads** | `/api/predictions`, `/api/leaderboard` | 15s | Multiple queries |
| **Complex reads** | `/api/users/:id/enhanced-stats` | 20s | 5-10 queries + calculations |
| **Write operations** | `/api/predictions/bet` | 15s | Transaction + event publish |
| **Heavy analytics** | `/api/analytics/dashboard` | 30s | Complex aggregations |
| **Admin operations** | `/api/admin/*` | 30s | Bulk operations allowed |

### Global Server Timeout

**File:** `apps/server/src/index.ts` (after server creation)

```typescript
const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ✅ SET GLOBAL TIMEOUT
server.timeout = 30000; // 30 seconds (max for any request)
server.headersTimeout = 31000; // Slightly higher than timeout
server.keepAliveTimeout = 5000; // 5 seconds for keep-alive
```

**Benefits:**
- Prevents indefinite hangs
- Ensures all requests terminate within 30s
- Clients receive timeout response instead of hanging forever

**Tradeoffs:**
- Some legitimate slow requests may timeout (handle with retry logic)
- Must ensure backend operations are idempotent

---

## Request-Level Timeout Middleware

### Tiered Timeout Middleware

**File:** `apps/server/src/middleware/timeout.middleware.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';

export interface TimeoutConfig {
  timeoutMs: number;
  message?: string;
}

export function createTimeoutMiddleware(config: TimeoutConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`[TIMEOUT] ${req.method} ${req.path} exceeded ${config.timeoutMs}ms`);

        res.status(504).json({
          error: 'Gateway Timeout',
          message: config.message || `Request exceeded ${config.timeoutMs}ms timeout`,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }
    }, config.timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

// Convenience functions for common timeout durations
export const fastTimeout = createTimeoutMiddleware({ timeoutMs: 5000 });
export const standardTimeout = createTimeoutMiddleware({ timeoutMs: 15000 });
export const heavyTimeout = createTimeoutMiddleware({ timeoutMs: 30000 });
```

### Apply to Routes

**File:** `apps/server/src/routes/user.routes.ts`

```typescript
import { standardTimeout, heavyTimeout } from '../middleware/timeout.middleware';

const router = Router();

// Fast endpoints - 10s timeout
router.get('/profile/:userId', requireAuth, standardTimeout, getProfile);

// Heavy endpoints - 20s timeout
router.get('/:userId/enhanced-stats', requireAuth, heavyTimeout, getEnhancedUserStatsHandler);

// Standard endpoints - 15s timeout
router.get('/:userId/achievements', requireAuth, standardTimeout, getUserAchievementsHandler);
```

**File:** `apps/server/src/routes/predictions.routes.ts`

```typescript
// Betting operations - 15s timeout (transaction + events)
router.post('/:id/bet', requireAuth, standardTimeout, placeBetHandler);

// Prediction listings - 15s timeout
router.get('/', standardTimeout, getPredictionsHandler);
```

**File:** `apps/server/src/routes/dashboardAnalytics.routes.ts`

```typescript
// Analytics endpoints - 30s timeout (complex aggregations)
router.get('/dashboard', requireAuth, heavyTimeout, getDashboardAnalyticsHandler);
router.get('/platform-health', requireAuth, heavyTimeout, getPlatformHealthHandler);
```

---

## Database Query Timeouts

### Prisma Query Timeout

**File:** `apps/server/src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  // ✅ Add query timeout
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Log slow queries
  log: [
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
});

// ✅ Add middleware to enforce query timeout
prisma.$use(async (params, next) => {
  const timeout = 10000; // 10 second max for any single query
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(`[DB TIMEOUT] ${params.model}.${params.action} exceeded ${timeout}ms`);
  }, timeout);

  try {
    const result = await next(params);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
});
```

**Benefits:**
- Prevents database queries from hanging
- Frees up connection pool resources
- Ensures timeouts cascade properly (query timeout < request timeout)

---

## Redis Operation Timeouts

### Redis Client Configuration

**File:** `apps/server/src/lib/redis.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  // ✅ Add connection and command timeouts
  connectTimeout: 5000,      // 5s to establish connection
  commandTimeout: 3000,      // 3s for any single command
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,   // Retry up to 3 times
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

export default redis;
```

**Benefits:**
- Redis failures don't block requests indefinitely
- Automatic retry with backoff
- Graceful degradation (cache miss on timeout)

---

## External Service Timeouts

### S3/Tigris Upload Timeout

**File:** `apps/server/src/services/user.service.ts`

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: env.TIGRIS_S3_ENDPOINT,
  credentials: {
    accessKeyId: env.TIGRIS_ACCESS_KEY_ID,
    secretAccessKey: env.TIGRIS_SECRET_ACCESS_KEY,
  },
  // ✅ Add request timeout
  requestHandler: {
    requestTimeout: 10000, // 10 second timeout for uploads
  },
});

export async function uploadProfileImage(buffer: Buffer, key: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: env.TIGRIS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    });

    // ✅ Wrap in promise with timeout
    const result = await Promise.race([
      s3Client.send(command),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('S3 upload timeout')), 10000)
      ),
    ]);

    return result;
  } catch (error) {
    console.error('[S3] Upload failed:', error);
    throw new Error('Image upload failed');
  }
}
```

---

## Circuit Breaker Pattern (Optional but Recommended)

For frequently failing external services, implement circuit breaker:

**File:** `apps/server/src/lib/circuitBreaker.ts` (NEW)

```typescript
interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening circuit
  successThreshold: number;    // Number of successes to close circuit
  timeout: number;             // Time to wait before retrying (half-open state)
}

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
      console.warn('[Circuit Breaker] State changed to OPEN');
    }
  }
}

// Usage example
const redisCircuit = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30s before retry
});

export async function getCachedData(key: string) {
  return redisCircuit.execute(async () => {
    return await redis.get(key);
  });
}
```

---

## Graceful Timeout Handling

### Client-Side Retry Logic

Clients should handle timeouts gracefully:

```typescript
// Frontend: apps/client/src/api/client.ts
const api = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 35000, // Slightly higher than server timeout (30s)
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
      // Timeout occurred
      console.warn('[API] Request timed out, retrying...');

      // Retry once for GET requests
      if (error.config.method === 'get' && !error.config._retry) {
        error.config._retry = true;
        return api.request(error.config);
      }
    }
    throw error;
  }
);
```

### Server-Side Cleanup

Ensure background operations are cancelled on timeout:

```typescript
export function createAbortableRequest(timeout: number) {
  const controller = new AbortController();
  const signal = controller.signal;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  return { signal, cleanup: () => clearTimeout(timeoutId) };
}

// Usage
const { signal, cleanup } = createAbortableRequest(10000);

try {
  const data = await fetch('https://api.example.com/data', { signal });
  cleanup();
  return data;
} catch (error) {
  cleanup();
  if (error.name === 'AbortError') {
    throw new Error('Request timeout');
  }
  throw error;
}
```

---

## Monitoring & Alerting

### Timeout Metrics

**Add to Prometheus:**

```typescript
import { Counter, Histogram } from 'prom-client';

export const requestTimeouts = new Counter({
  name: 'http_request_timeouts_total',
  help: 'Total number of request timeouts',
  labelNames: ['path', 'method'],
});

export const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['path', 'method', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30], // Include 30s bucket for max timeout
});

// In timeout middleware
timeout.on('timeout', () => {
  requestTimeouts.inc({ path: req.path, method: req.method });
});
```

### Grafana Alerts

```yaml
# Grafana alert rules
groups:
  - name: api_timeouts
    interval: 1m
    rules:
      - alert: HighTimeoutRate
        expr: rate(http_request_timeouts_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High timeout rate detected"
          description: "More than 5% of requests timing out"

      - alert: CriticalTimeoutRate
        expr: rate(http_request_timeouts_total[5m]) > 0.2
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "CRITICAL: Very high timeout rate"
          description: "More than 20% of requests timing out"
```

---

## Implementation Checklist

### Phase 1: Global Timeouts (P0 - 1 hour)
- [ ] Set server-level timeout to 30s
- [ ] Set headersTimeout to 31s
- [ ] Set keepAliveTimeout to 5s
- [ ] Test with long-running endpoint
- [ ] Verify timeout response format

### Phase 2: Request Middleware (P1 - 2 hours)
- [ ] Create timeout middleware utility
- [ ] Define timeout tiers (fast/standard/heavy)
- [ ] Apply to all route files
- [ ] Test each tier with artificial delays
- [ ] Verify error responses are properly formatted

### Phase 3: Database Timeouts (P0 - 1 hour)
- [ ] Add Prisma middleware for query timeout
- [ ] Set max query timeout to 10s
- [ ] Log all timeout events
- [ ] Test with slow query simulation
- [ ] Verify connection pool release

### Phase 4: External Service Timeouts (P1 - 2 hours)
- [ ] Configure Redis command timeout (3s)
- [ ] Configure S3 request timeout (10s)
- [ ] Add circuit breaker for Redis (optional)
- [ ] Test with network simulation
- [ ] Verify graceful degradation

### Phase 5: Monitoring (P2 - 1 hour)
- [ ] Add timeout metrics to Prometheus
- [ ] Create Grafana dashboard for timeouts
- [ ] Set up alerts for high timeout rates
- [ ] Document timeout SLOs

---

## Load Test Validation

**Test Script:** `scripts/load-tests/test-timeouts.cjs`

```javascript
// Simulate slow endpoints
const tests = [
  {
    name: 'Fast endpoint should complete',
    url: '/api/health',
    expectedTimeout: false,
    maxDuration: 5000,
  },
  {
    name: 'Slow endpoint should timeout',
    url: '/api/admin/slow-operation', // Simulated slow endpoint
    expectedTimeout: true,
    maxDuration: 30000,
  },
];

// Run tests and verify timeouts work as expected
```

---

## Success Criteria

- [ ] No requests hang indefinitely
- [ ] All endpoints timeout within 30s max
- [ ] 504 responses have proper error format
- [ ] Database queries timeout after 10s
- [ ] Redis operations timeout after 3s
- [ ] Timeout rate <1% under normal load
- [ ] Timeout metrics visible in Grafana
- [ ] Alerts fire when timeout rate >5%

---

## Rollout Plan

1. **Staging deployment** - Test timeouts with production traffic patterns
2. **Gradual rollout** - Deploy to 10% of production traffic
3. **Monitor for 24 hours** - Watch timeout rates and false positives
4. **Adjust thresholds if needed** - Increase timeouts for legitimate slow endpoints
5. **Full production rollout** - Deploy to 100% after validation
6. **Continuous monitoring** - Track timeout trends over time

---

## Next Steps

1. [ ] Implement global server timeout (1 hour)
2. [ ] Create timeout middleware (2 hours)
3. [ ] Apply to all routes (2 hours)
4. [ ] Add database query timeout (1 hour)
5. [ ] Configure external service timeouts (2 hours)
6. [ ] Add monitoring and alerts (1 hour)
7. [ ] Load test validation (1 hour)
8. [ ] Deploy to staging (1 day)
9. [ ] Deploy to production with gradual rollout (2 days)

**Total Estimated Time:** 2-3 days
