# Grafana Monitoring Setup for elonmusksucks.net

**Last Updated:** January 2025
**Author:** System Documentation
**Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Access Fly.io Managed Grafana](#phase-1-access-flyio-managed-grafana)
4. [Phase 2: Implement Prometheus Metrics Endpoints](#phase-2-implement-prometheus-metrics-endpoints)
5. [Phase 3: Configure fly.toml Metrics Scraping](#phase-3-configure-flytoml-metrics-scraping)
6. [Phase 4: Create Custom Grafana Dashboards](#phase-4-create-custom-grafana-dashboards)
7. [Phase 5: Enhanced Error Logging](#phase-5-enhanced-error-logging)
8. [Phase 6: Alerts & Monitoring](#phase-6-alerts--monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

This guide provides complete instructions for setting up comprehensive Grafana monitoring for all elonmusksucks.net production applications running on Fly.io. The monitoring system uses:

- **Fly.io Managed Grafana** (fly-metrics.net) - Pre-configured Grafana instance
- **VictoriaMetrics** - Prometheus-compatible time series storage
- **Prometheus Metrics** - Industry-standard metrics format
- **Custom Application Metrics** - Business-specific monitoring

### Goals

1. **Real-time Visibility**: Monitor all apps, databases, and services in one place
2. **Proactive Alerting**: Catch issues before users notice them
3. **Performance Optimization**: Identify bottlenecks and slow queries
4. **Troubleshooting**: Quick diagnosis of production issues
5. **Capacity Planning**: Understand resource usage trends

### Current State

The application already has:
- ✅ Basic health check endpoints (`/health`)
- ✅ Internal metrics collection (`lib/metrics.ts`)
- ✅ Database query performance tracking
- ✅ Event system metrics service
- ✅ Socket.IO connection monitoring
- ✅ BullMQ worker metrics

**What's Missing:**
- ❌ Prometheus-format metrics endpoints
- ❌ Fly.io metrics scraping configuration
- ❌ Grafana dashboards
- ❌ Production alerting
- ❌ Structured logging

---

## Architecture

### Deployed Applications

| App | Fly App Name | Port | Purpose | Metrics Priority |
|-----|-------------|------|---------|-----------------|
| **API Server** | `ems-api` | 5000 | Main backend, Socket.IO, REST API | **Critical** |
| **Client App** | `ems-client` | 3000 | React SPA (Nginx) | Low (static) |
| **Pong Server** | `ems-pong` | 5001 | Real-time game server | High |
| **Public Site** | `ems-public` | 5173 | SSR marketing site | Medium |
| **Redis** | `ems-redis` | 6379 | Cache & pub/sub | **Critical** |
| **PostgreSQL** | (managed) | 5432 | Primary database | **Critical** |

### Metrics Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fly.io Applications                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ ems-api  │  │ ems-pong │  │ ems-public│  │ ems-redis│       │
│  │          │  │          │  │           │  │          │       │
│  │ /metrics │  │ /metrics │  │ /metrics  │  │  (built-in)     │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └────┬─────┘       │
│       │             │              │              │             │
└───────┼─────────────┼──────────────┼──────────────┼─────────────┘
        │             │              │              │
        ▼             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fly.io Prometheus Scraper                          │
│         (Scrapes every 15 seconds automatically)                │
│                                                                 │
│   Endpoint: https://api.fly.io/prometheus/<org-slug>           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              VictoriaMetrics (Time Series DB)                   │
│           (Managed by Fly.io, Prometheus-compatible)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                Grafana Dashboards                               │
│               (fly-metrics.net)                                 │
│                                                                 │
│  • API Server Dashboard                                         │
│  • Pong Server Dashboard                                        │
│  • Worker Dashboard (BullMQ)                                    │
│  • Database Dashboard                                           │
│  • System Overview Dashboard                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Worker Processes

The `ems-api` app runs multiple processes (configured in fly.toml):

1. **app** - Main API server (Express + Socket.IO)
2. **worker** - BullMQ workers (6 concurrent):
   - `payout.worker.js` - Bet payouts
   - `pong-payout.worker.js` - Pong game payouts
   - `leaderboard.worker.js` - Leaderboard updates
   - `leaderboard-snapshot.worker.js` - Daily snapshots
   - `feed.worker.js` - RSS feed fetching
   - `article.worker.js` - Article processing

**Important:** Metrics must be exposed on all processes, not just the main app.

---

## Phase 1: Access Fly.io Managed Grafana

### Step 1.1: Access the Dashboard

1. **Navigate to Fly.io Grafana:**
   ```bash
   # Open in browser (auto-authenticates with Fly.io session)
   open https://fly-metrics.net
   ```

2. **Verify Organization Access:**
   - Confirm you see your organization in the dropdown
   - Check that you can see existing Fly.io built-in dashboards

### Step 1.2: Generate API Tokens

For programmatic access and automation:

```bash
# Generate full access token
flyctl auth token

# Generate organization-specific read-only token (recommended for monitoring tools)
flyctl tokens create readonly -o <org-name>
```

**Save tokens securely** - You'll need them for:
- Custom Grafana instances (if needed)
- CI/CD integration
- External monitoring tools

### Step 1.3: Review Built-in Metrics

Fly.io automatically collects these metrics for all apps:

#### Proxy Metrics (Edge Performance)
- `fly_edge_http_responses_count` - Total HTTP responses by app, status code
- `fly_edge_http_response_time_seconds` - Response time histogram
- `fly_app_http_responses_count` - App-level HTTP responses
- `fly_app_http_response_time_seconds` - App-level response times

#### Instance Metrics (Resource Usage)
- `fly_instance_up` - Instance health (1=up, 0=down)
- `fly_instance_memory_bytes` - Memory usage
- `fly_instance_cpu_seconds_total` - CPU usage
- `fly_instance_net_recv_bytes_total` - Network RX
- `fly_instance_net_sent_bytes_total` - Network TX
- `fly_instance_fs_reads_total` - Disk reads
- `fly_instance_fs_writes_total` - Disk writes

#### Volume Metrics
- `fly_volume_size_bytes` - Volume size
- `fly_volume_used_bytes` - Used space

#### Postgres Metrics (if using Fly Postgres)
- `pg_stat_database_*` - Database activity
- `pg_stat_replication_*` - Replication lag
- Connection pool metrics

### Step 1.4: Explore Pre-built Dashboards

Navigate to **Dashboards** → **Browse** and review:

1. **Fly App** - General app metrics
2. **Postgres** - Database monitoring (if applicable)
3. **Redis** - Cache monitoring

**Action Item:** Take screenshots or notes of what metrics are already available to avoid duplication.

---

## Phase 2: Implement Prometheus Metrics Endpoints

### Overview

We'll add Prometheus metrics to:
1. **ems-api** - API server + workers
2. **ems-pong** - Pong game server
3. **ems-public** - Public site (SSR)

### Step 2.1: Install Dependencies

Add `prom-client` to server packages:

```bash
# From project root
npm install --save prom-client --workspace=apps/server
npm install --save prom-client --workspace=apps/pong-server
npm install --save prom-client --workspace=apps/public-site
```

Update `apps/server/package.json`, `apps/pong-server/package.json`, `apps/public-site/package.json`:

```json
{
  "dependencies": {
    "prom-client": "^15.1.0"
  }
}
```

### Step 2.2: Create Metrics Service (ems-api)

**File:** `apps/server/src/lib/prometheusMetrics.ts`

```typescript
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ prefix: 'ems_api_' });

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestDuration = new Histogram({
  name: 'ems_api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: 'ems_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpErrorsTotal = new Counter({
  name: 'ems_api_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
});

// ============================================================================
// Database Metrics
// ============================================================================

export const dbQueryDuration = new Histogram({
  name: 'ems_api_db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const dbQueryTotal = new Counter({
  name: 'ems_api_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model'],
});

export const dbSlowQueries = new Counter({
  name: 'ems_api_db_slow_queries_total',
  help: 'Total number of slow queries (>100ms)',
  labelNames: ['operation', 'model'],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'ems_api_db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'], // 'active', 'idle', 'total'
});

// ============================================================================
// Redis Metrics
// ============================================================================

export const redisOperationDuration = new Histogram({
  name: 'ems_api_redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const redisOperationsTotal = new Counter({
  name: 'ems_api_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['command', 'status'],
});

export const redisConnectionPoolSize = new Gauge({
  name: 'ems_api_redis_connection_pool_size',
  help: 'Current Redis connection pool size',
  labelNames: ['state'], // 'active', 'idle'
});

export const redisPubSubEventsTotal = new Counter({
  name: 'ems_api_redis_pubsub_events_total',
  help: 'Total Redis pub/sub events published',
  labelNames: ['channel'],
});

// ============================================================================
// Socket.IO Metrics
// ============================================================================

export const socketConnectionsActive = new Gauge({
  name: 'ems_api_socket_connections_active',
  help: 'Current number of active Socket.IO connections',
});

export const socketConnectionsTotal = new Counter({
  name: 'ems_api_socket_connections_total',
  help: 'Total Socket.IO connections (cumulative)',
  labelNames: ['event'], // 'connect', 'disconnect'
});

export const socketEventDuration = new Histogram({
  name: 'ems_api_socket_event_duration_seconds',
  help: 'Duration of Socket.IO event handlers',
  labelNames: ['event', 'handler'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const socketEventsTotal = new Counter({
  name: 'ems_api_socket_events_total',
  help: 'Total Socket.IO events processed',
  labelNames: ['event', 'status'],
});

export const socketRoomsActive = new Gauge({
  name: 'ems_api_socket_rooms_active',
  help: 'Current number of active Socket.IO rooms',
});

// ============================================================================
// BullMQ Worker Metrics
// ============================================================================

export const queueJobsProcessed = new Counter({
  name: 'ems_api_queue_jobs_processed_total',
  help: 'Total jobs processed by queue',
  labelNames: ['queue', 'status'], // 'completed', 'failed'
});

export const queueJobDuration = new Histogram({
  name: 'ems_api_queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
});

export const queueDepth = new Gauge({
  name: 'ems_api_queue_depth',
  help: 'Current queue depth (waiting jobs)',
  labelNames: ['queue', 'state'], // 'waiting', 'active', 'delayed'
});

export const queueOldestJobAge = new Gauge({
  name: 'ems_api_queue_oldest_job_age_seconds',
  help: 'Age of oldest job in queue',
  labelNames: ['queue'],
});

// ============================================================================
// Application Metrics
// ============================================================================

export const activePredictions = new Gauge({
  name: 'ems_api_active_predictions',
  help: 'Current number of active predictions',
});

export const activeUsers = new Gauge({
  name: 'ems_api_active_users',
  help: 'Current number of active users (socket connections)',
});

export const betsPlacedTotal = new Counter({
  name: 'ems_api_bets_placed_total',
  help: 'Total bets placed',
  labelNames: ['prediction_type'],
});

export const muskBucksVolume = new Counter({
  name: 'ems_api_muskbucks_volume_total',
  help: 'Total MuskBucks transacted',
  labelNames: ['transaction_type'], // 'bet', 'payout', 'pong_wager', etc.
});

// ============================================================================
// Export Registry
// ============================================================================

export { register };
```

### Step 2.3: Add Metrics Middleware (ems-api)

**File:** `apps/server/src/middleware/prometheusMiddleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal, httpErrorsTotal } from '../lib/prometheusMetrics';

/**
 * Express middleware to track HTTP request metrics
 */
export function prometheusMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode });

    // Track errors
    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      httpErrorsTotal.inc({
        method,
        route,
        status_code: statusCode,
        error_type: statusCode.startsWith('4') ? 'client_error' : 'server_error',
      });
    }
  });

  next();
}
```

### Step 2.4: Create Metrics Endpoint (ems-api)

**File:** `apps/server/src/routes/prometheus.routes.ts`

```typescript
import express from 'express';
import { register } from '../lib/prometheusMetrics';

const router = express.Router();

/**
 * Prometheus metrics endpoint
 * No authentication - Fly.io scrapes this from internal network
 */
router.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    console.error('[prometheus] Error generating metrics:', error);
    res.status(500).end();
  }
});

export default router;
```

### Step 2.5: Integrate Metrics into Main Server

**File:** `apps/server/src/index.ts`

Add these changes:

```typescript
// ... existing imports ...
import { prometheusMiddleware } from './middleware/prometheusMiddleware';
import prometheusRoutes from './routes/prometheus.routes';

// ... existing code ...

// Add Prometheus middleware EARLY (before other routes)
app.use(prometheusMiddleware);

// ... existing middleware ...

// Add Prometheus metrics endpoint
app.use('/', prometheusRoutes);

// ... rest of the code ...
```

### Step 2.6: Instrument Database Queries

**File:** `apps/server/src/db.ts`

Modify the Prisma client extension to export metrics:

```typescript
import { dbQueryDuration, dbQueryTotal, dbSlowQueries } from './lib/prometheusMetrics';

// ... existing code ...

// In your Prisma middleware or client extension:
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = (Date.now() - start) / 1000;

  const operation = params.action;
  const model = params.model || 'unknown';

  // Record metrics
  dbQueryDuration.observe({ operation, model }, duration);
  dbQueryTotal.inc({ operation, model });

  // Track slow queries (>100ms threshold)
  if (duration > 0.1) {
    dbSlowQueries.inc({ operation, model });
    console.warn(`[db] Slow query detected: ${model}.${operation} took ${duration.toFixed(3)}s`);
  }

  return result;
});
```

### Step 2.7: Instrument Redis Operations

**File:** `apps/server/src/lib/redis.ts`

Wrap Redis client to track metrics:

```typescript
import { redisOperationDuration, redisOperationsTotal } from './prometheusMetrics';

// ... existing Redis client setup ...

// Wrap Redis commands with metrics tracking
const originalGet = redisClient.get.bind(redisClient);
redisClient.get = async function (key: string) {
  const start = Date.now();
  try {
    const result = await originalGet(key);
    const duration = (Date.now() - start) / 1000;
    redisOperationDuration.observe({ command: 'get' }, duration);
    redisOperationsTotal.inc({ command: 'get', status: 'success' });
    return result;
  } catch (error) {
    redisOperationsTotal.inc({ command: 'get', status: 'error' });
    throw error;
  }
};

// Repeat for other common operations: set, del, publish, etc.
```

**Note:** For comprehensive coverage, consider using a Redis monitoring library or creating a wrapper class.

### Step 2.8: Instrument Socket.IO Events

**File:** `apps/server/src/socket.ts`

Add Socket.IO metrics tracking:

```typescript
import {
  socketConnectionsActive,
  socketConnectionsTotal,
  socketEventDuration,
  socketEventsTotal,
  socketRoomsActive,
} from './lib/prometheusMetrics';

// ... in initSocket function ...

io.on('connection', (socket) => {
  // Track connection
  socketConnectionsActive.inc();
  socketConnectionsTotal.inc({ event: 'connect' });

  // Update active rooms count
  updateRoomsMetric();

  socket.on('disconnect', () => {
    socketConnectionsActive.dec();
    socketConnectionsTotal.inc({ event: 'disconnect' });
    updateRoomsMetric();
  });

  // Wrap all event handlers with metrics
  const originalOn = socket.on.bind(socket);
  socket.on = function (event: string, handler: Function) {
    const wrappedHandler = async (...args: any[]) => {
      const start = Date.now();
      try {
        await handler(...args);
        const duration = (Date.now() - start) / 1000;
        socketEventDuration.observe({ event, handler: handler.name || 'anonymous' }, duration);
        socketEventsTotal.inc({ event, status: 'success' });
      } catch (error) {
        socketEventsTotal.inc({ event, status: 'error' });
        throw error;
      }
    };
    return originalOn(event, wrappedHandler);
  };
});

function updateRoomsMetric() {
  const roomCount = io.sockets.adapter.rooms.size;
  socketRoomsActive.set(roomCount);
}
```

### Step 2.9: Instrument BullMQ Workers

**File:** `apps/server/src/workers/payout.worker.ts` (and other workers)

Add metrics to each worker:

```typescript
import { queueJobsProcessed, queueJobDuration, queueDepth, queueOldestJobAge } from '../lib/prometheusMetrics';
import { Worker, Queue } from 'bullmq';

const queueName = 'payouts';
const worker = new Worker(
  queueName,
  async (job) => {
    const start = Date.now();
    try {
      // ... job processing logic ...

      const duration = (Date.now() - start) / 1000;
      queueJobDuration.observe({ queue: queueName, job_type: job.name }, duration);
      queueJobsProcessed.inc({ queue: queueName, status: 'completed' });
    } catch (error) {
      queueJobsProcessed.inc({ queue: queueName, status: 'failed' });
      throw error;
    }
  },
  { connection: redisConnection }
);

// Periodically update queue depth metrics
const queue = new Queue(queueName, { connection: redisConnection });

setInterval(async () => {
  const [waiting, active, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
  ]);

  queueDepth.set({ queue: queueName, state: 'waiting' }, waiting);
  queueDepth.set({ queue: queueName, state: 'active' }, active);
  queueDepth.set({ queue: queueName, state: 'delayed' }, delayed);

  // Get oldest job age
  const jobs = await queue.getWaiting(0, 1);
  if (jobs.length > 0) {
    const age = (Date.now() - jobs[0].timestamp) / 1000;
    queueOldestJobAge.set({ queue: queueName }, age);
  }
}, 15000); // Update every 15 seconds
```

### Step 2.10: Create Pong Server Metrics

**File:** `apps/pong-server/src/lib/prometheusMetrics.ts`

```typescript
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

collectDefaultMetrics({ prefix: 'ems_pong_' });

// Game Metrics
export const activeGames = new Gauge({
  name: 'ems_pong_active_games',
  help: 'Current number of active pong games',
  labelNames: ['type'], // 'pvp', 'ai'
});

export const playersOnline = new Gauge({
  name: 'ems_pong_players_online',
  help: 'Current number of players online',
});

export const gamesTotal = new Counter({
  name: 'ems_pong_games_total',
  help: 'Total pong games played',
  labelNames: ['type', 'outcome'], // type: 'pvp'/'ai', outcome: 'completed'/'forfeit'
});

export const gameDuration = new Histogram({
  name: 'ems_pong_game_duration_seconds',
  help: 'Duration of pong games',
  labelNames: ['type'],
  buckets: [10, 30, 60, 120, 300, 600],
});

export const wagerVolume = new Counter({
  name: 'ems_pong_wager_volume_total',
  help: 'Total MuskBucks wagered in pong games',
  labelNames: ['type', 'difficulty'], // difficulty only for AI games
});

export const gameTickRate = new Histogram({
  name: 'ems_pong_game_tick_duration_seconds',
  help: 'Duration of game tick processing',
  buckets: [0.001, 0.005, 0.01, 0.016, 0.033, 0.05],
});

export { register };
```

**File:** `apps/pong-server/src/routes/metrics.routes.ts`

```typescript
import express from 'express';
import { register } from '../lib/prometheusMetrics';

const router = express.Router();

router.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('[prometheus] Error:', error);
    res.status(500).end();
  }
});

export default router;
```

Integrate into `apps/pong-server/src/server.ts` similar to ems-api.

### Step 2.11: Create Public Site Metrics

**File:** `apps/public-site/src/lib/prometheusMetrics.ts`

```typescript
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

collectDefaultMetrics({ prefix: 'ems_public_' });

export const ssrRequestDuration = new Histogram({
  name: 'ems_public_ssr_request_duration_seconds',
  help: 'SSR request duration',
  labelNames: ['route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const ssrRequestsTotal = new Counter({
  name: 'ems_public_ssr_requests_total',
  help: 'Total SSR requests',
  labelNames: ['route', 'status_code'],
});

export const apiCallDuration = new Histogram({
  name: 'ems_public_api_call_duration_seconds',
  help: 'Duration of API calls from SSR',
  labelNames: ['endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export { register };
```

Add `/metrics` endpoint similar to other apps.

---

## Phase 3: Configure fly.toml Metrics Scraping

### Step 3.1: Update ems-api fly.toml

**File:** `apps/server/fly.toml`

Add metrics configuration:

```toml
# ... existing configuration ...

# Metrics scraping configuration
[metrics]
  port = 5000
  path = "/metrics"

# Enable metrics for worker process as well
[[services]]
  internal_port = 5000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["http", "tls"]
```

**Important Notes:**
- The `/metrics` endpoint is scraped from Fly.io's **internal network only**
- No authentication needed for the metrics endpoint (it's not publicly accessible)
- Metrics are scraped every **15 seconds** automatically

### Step 3.2: Update ems-pong fly.toml

**File:** `apps/pong-server/fly.toml`

```toml
# ... existing configuration ...

[metrics]
  port = 5001
  path = "/metrics"
```

### Step 3.3: Update ems-public fly.toml

**File:** `apps/public-site/fly.toml`

```toml
# ... existing configuration ...

[metrics]
  port = 5173
  path = "/metrics"
```

### Step 3.4: Deploy with Metrics Enabled

After updating code and fly.toml files:

```bash
# Build and deploy ems-api
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-api:latest -f apps/server/Dockerfile . --load
docker push registry.fly.io/ems-api:latest
fly deploy --app ems-api --image registry.fly.io/ems-api:latest

# Build and deploy ems-pong
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-pong:latest -f apps/pong-server/Dockerfile . --load
docker push registry.fly.io/ems-pong:latest
fly deploy --app ems-pong --image registry.fly.io/ems-pong:latest

# Build and deploy ems-public
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-public:latest -f apps/public-site/Dockerfile . --load
docker push registry.fly.io/ems-public:latest
fly deploy --app ems-public --image registry.fly.io/ems-public:latest
```

### Step 3.5: Verify Metrics Scraping

After deployment, check that metrics are being scraped:

```bash
# SSH into a container and check the metrics endpoint
fly ssh console --app ems-api

# Inside the container:
curl http://localhost:5000/metrics

# You should see Prometheus-format metrics output
```

Verify in Grafana:

1. Go to https://fly-metrics.net
2. Navigate to **Explore**
3. Query: `ems_api_http_requests_total`
4. You should see data points if metrics are being scraped

---

## Phase 4: Create Custom Grafana Dashboards

### Step 4.1: Dashboard Design Principles

Before creating dashboards, follow these principles:

1. **Start with Overview, Drill Down to Details**
2. **Use Consistent Color Coding**
   - Green: Normal/healthy
   - Yellow: Warning
   - Orange: Degraded
   - Red: Critical/error
3. **Show Both Current State and Trends**
4. **Include Key SLIs** (Service Level Indicators):
   - Availability (uptime)
   - Latency (response times)
   - Throughput (requests/sec)
   - Error rate

### Step 4.2: System Overview Dashboard

**Dashboard Name:** `ElonMuskSucks - System Overview`

**Purpose:** High-level health across all apps

#### Row 1: Service Health

- **Panel: Service Uptime**
  - Type: Stat
  - Query: `fly_instance_up{app=~"ems-.*"}`
  - Thresholds: 0 = red, 1 = green

- **Panel: HTTP Error Rate**
  - Type: Stat with sparkline
  - Query:
    ```promql
    sum(rate(ems_api_http_errors_total[5m])) /
    sum(rate(ems_api_http_requests_total[5m])) * 100
    ```
  - Unit: Percent (%)
  - Thresholds: <1% green, 1-5% yellow, >5% red

- **Panel: Active Users**
  - Type: Stat
  - Query: `ems_api_active_users`

- **Panel: Active Pong Games**
  - Type: Stat
  - Query: `sum(ems_pong_active_games)`

#### Row 2: Request Rates

- **Panel: API Request Rate**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_http_requests_total[5m])) by (status_code)
    ```
  - Legend: `{{status_code}}`

- **Panel: Socket.IO Events Rate**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_socket_events_total[5m])) by (event)
    ```

#### Row 3: Resource Usage

- **Panel: Memory Usage**
  - Type: Time series
  - Queries:
    ```promql
    fly_instance_memory_bytes{app="ems-api"} / 1024 / 1024
    fly_instance_memory_bytes{app="ems-pong"} / 1024 / 1024
    ```
  - Unit: MiB

- **Panel: CPU Usage**
  - Type: Time series
  - Query:
    ```promql
    rate(fly_instance_cpu_seconds_total{app=~"ems-.*"}[5m]) * 100
    ```
  - Unit: %

#### Row 4: Database & Redis

- **Panel: Database Query Duration (p95)**
  - Type: Stat
  - Query:
    ```promql
    histogram_quantile(0.95,
      sum(rate(ems_api_db_query_duration_seconds_bucket[5m])) by (le)
    )
    ```
  - Unit: seconds (s)
  - Thresholds: <0.1s green, 0.1-0.5s yellow, >0.5s red

- **Panel: Redis Pub/Sub Event Rate**
  - Type: Stat with sparkline
  - Query: `sum(rate(ems_api_redis_pubsub_events_total[5m]))`

#### Row 5: Queue Health

- **Panel: Queue Depth (All Queues)**
  - Type: Bar gauge
  - Query:
    ```promql
    sum(ems_api_queue_depth{state="waiting"}) by (queue)
    ```
  - Thresholds: <10 green, 10-25 yellow, >25 red

- **Panel: Queue Processing Rate**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_queue_jobs_processed_total[5m])) by (queue, status)
    ```

**Export JSON:** Save as `grafana-dashboards/system-overview.json`

### Step 4.3: API Server Dashboard

**Dashboard Name:** `ElonMuskSucks - API Server (ems-api)`

#### Row 1: Request Overview

- **Panel: Request Rate by Endpoint**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_http_requests_total[5m])) by (route)
    ```
  - Top 10 routes

- **Panel: Error Rate by Endpoint**
  - Type: Table
  - Queries:
    - Total Requests: `sum(rate(ems_api_http_requests_total[5m])) by (route)`
    - Errors: `sum(rate(ems_api_http_errors_total[5m])) by (route)`
    - Error Rate: `(Errors / Total Requests) * 100`

#### Row 2: Latency

- **Panel: Request Duration Heatmap**
  - Type: Heatmap
  - Query:
    ```promql
    sum(increase(ems_api_http_request_duration_seconds_bucket[1m])) by (le)
    ```

- **Panel: p50, p95, p99 Latency**
  - Type: Time series
  - Queries:
    ```promql
    # p50
    histogram_quantile(0.50, sum(rate(ems_api_http_request_duration_seconds_bucket[5m])) by (le))
    # p95
    histogram_quantile(0.95, sum(rate(ems_api_http_request_duration_seconds_bucket[5m])) by (le))
    # p99
    histogram_quantile(0.99, sum(rate(ems_api_http_request_duration_seconds_bucket[5m])) by (le))
    ```

#### Row 3: Database Performance

- **Panel: Query Duration by Model**
  - Type: Time series
  - Query:
    ```promql
    histogram_quantile(0.95, sum(rate(ems_api_db_query_duration_seconds_bucket[5m])) by (model, le))
    ```

- **Panel: Slow Queries**
  - Type: Stat
  - Query: `sum(rate(ems_api_db_slow_queries_total[5m]))`
  - Thresholds: 0 green, >0 red

- **Panel: Top 10 Slowest Operations**
  - Type: Table
  - Query:
    ```promql
    topk(10, avg(rate(ems_api_db_query_duration_seconds_sum[5m])) by (model, operation) /
             avg(rate(ems_api_db_query_duration_seconds_count[5m])) by (model, operation))
    ```

#### Row 4: Socket.IO

- **Panel: Active Connections**
  - Type: Time series
  - Query: `ems_api_socket_connections_active`

- **Panel: Active Rooms**
  - Type: Stat
  - Query: `ems_api_socket_rooms_active`

- **Panel: Event Processing Duration (p95)**
  - Type: Time series
  - Query:
    ```promql
    histogram_quantile(0.95, sum(rate(ems_api_socket_event_duration_seconds_bucket[5m])) by (event, le))
    ```

#### Row 5: Redis

- **Panel: Redis Operation Rate**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_redis_operations_total[5m])) by (command, status)
    ```

- **Panel: Pub/Sub Events by Channel**
  - Type: Bar chart
  - Query:
    ```promql
    topk(10, sum(rate(ems_api_redis_pubsub_events_total[5m])) by (channel))
    ```

### Step 4.4: Pong Server Dashboard

**Dashboard Name:** `ElonMuskSucks - Pong Server (ems-pong)`

#### Row 1: Game Overview

- **Panel: Active Games**
  - Type: Stat
  - Query: `sum(ems_pong_active_games)`

- **Panel: Players Online**
  - Type: Stat
  - Query: `ems_pong_players_online`

- **Panel: Games Played (24h)**
  - Type: Stat
  - Query:
    ```promql
    sum(increase(ems_pong_games_total[24h]))
    ```

#### Row 2: Game Metrics

- **Panel: Games Started Rate**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_pong_games_total[5m])) by (type)
    ```
  - Legend: `{{type}}`

- **Panel: Average Game Duration**
  - Type: Stat
  - Query:
    ```promql
    avg(rate(ems_pong_game_duration_seconds_sum[5m]) /
        rate(ems_pong_game_duration_seconds_count[5m]))
    ```
  - Unit: seconds

- **Panel: Game Outcome Distribution**
  - Type: Pie chart
  - Query:
    ```promql
    sum(increase(ems_pong_games_total[1h])) by (outcome)
    ```

#### Row 3: Wager Metrics

- **Panel: MuskBucks Wagered (24h)**
  - Type: Stat
  - Query:
    ```promql
    sum(increase(ems_pong_wager_volume_total[24h]))
    ```
  - Unit: MuskBucks

- **Panel: Wager Volume by Type**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_pong_wager_volume_total[5m])) by (type)
    ```

#### Row 4: Performance

- **Panel: Game Tick Duration**
  - Type: Time series
  - Query:
    ```promql
    histogram_quantile(0.95, sum(rate(ems_pong_game_tick_duration_seconds_bucket[5m])) by (le))
    ```
  - Threshold Line: 0.016 (60 FPS target)

- **Panel: Tick Rate Consistency**
  - Type: Stat
  - Query: Percentage of ticks under 16ms
  - Unit: %

### Step 4.5: Worker Dashboard

**Dashboard Name:** `ElonMuskSucks - Background Workers`

#### Row 1: Queue Overview

- **Panel: Queue Depths**
  - Type: Time series (stacked)
  - Query:
    ```promql
    sum(ems_api_queue_depth{state="waiting"}) by (queue)
    ```

- **Panel: Active Jobs**
  - Type: Time series
  - Query:
    ```promql
    sum(ems_api_queue_depth{state="active"}) by (queue)
    ```

#### Row 2: Processing Performance

- **Panel: Jobs Processed per Minute**
  - Type: Bar gauge
  - Query:
    ```promql
    sum(rate(ems_api_queue_jobs_processed_total[1m]) * 60) by (queue)
    ```

- **Panel: Job Processing Duration (p95)**
  - Type: Time series
  - Query:
    ```promql
    histogram_quantile(0.95, sum(rate(ems_api_queue_job_duration_seconds_bucket[5m])) by (queue, le))
    ```

#### Row 3: Failures

- **Panel: Failed Jobs**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_queue_jobs_processed_total{status="failed"}[5m])) by (queue)
    ```
  - Alert when > 0

- **Panel: Success Rate**
  - Type: Stat
  - Query:
    ```promql
    sum(rate(ems_api_queue_jobs_processed_total{status="completed"}[5m])) /
    sum(rate(ems_api_queue_jobs_processed_total[5m])) * 100
    ```
  - Unit: %
  - Thresholds: >99% green, 95-99% yellow, <95% red

#### Row 4: Queue Age

- **Panel: Oldest Job Age**
  - Type: Time series
  - Query:
    ```promql
    ems_api_queue_oldest_job_age_seconds
    ```
  - Unit: seconds
  - Alert when > 300 (5 minutes)

### Step 4.6: Database Dashboard

**Dashboard Name:** `ElonMuskSucks - Database Performance`

#### Row 1: Query Performance

- **Panel: Query Rate by Model**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_db_queries_total[5m])) by (model)
    ```

- **Panel: Query Duration Distribution**
  - Type: Heatmap
  - Query:
    ```promql
    sum(increase(ems_api_db_query_duration_seconds_bucket[1m])) by (le)
    ```

#### Row 2: Slow Queries

- **Panel: Slow Query Rate**
  - Type: Time series
  - Query:
    ```promql
    sum(rate(ems_api_db_slow_queries_total[5m])) by (model, operation)
    ```

- **Panel: Slowest Models (p95)**
  - Type: Table
  - Columns:
    - Model
    - Operation
    - p95 Duration
    - Query Count
  - Query:
    ```promql
    topk(20, histogram_quantile(0.95, sum(rate(ems_api_db_query_duration_seconds_bucket[5m])) by (model, operation, le)))
    ```

#### Row 3: Connection Pool

- **Panel: Connection Pool Usage**
  - Type: Time series (stacked)
  - Query:
    ```promql
    ems_api_db_connection_pool_size
    ```
  - Legend: `{{state}}`

- **Panel: Connection Pool Utilization**
  - Type: Gauge
  - Query:
    ```promql
    ems_api_db_connection_pool_size{state="active"} /
    ems_api_db_connection_pool_size{state="total"} * 100
    ```
  - Unit: %

#### Row 4: Postgres Built-in Metrics (if using Fly Postgres)

- **Panel: Active Connections**
  - Type: Time series
  - Query: `pg_stat_activity_count{state="active"}`

- **Panel: Transaction Rate**
  - Type: Time series
  - Query: `rate(pg_stat_database_xact_commit[5m])`

### Step 4.7: Import Dashboards into Grafana

**Option 1: Manual Import**

1. Copy dashboard JSON from repository
2. Go to https://fly-metrics.net
3. Navigate to **Dashboards** → **Import**
4. Paste JSON and click **Load**
5. Select Prometheus data source
6. Click **Import**

**Option 2: Provisioning (for teams)**

Create a `grafana-dashboards/` directory in your repository with all dashboard JSON files. Document the import process in your deployment guide.

---

## Phase 5: Enhanced Error Logging

### Step 5.1: Install Logging Library

While Prometheus is excellent for metrics, structured logging is essential for debugging. We'll implement a lightweight structured logger.

**Option A: Use Pino (recommended for Node.js)**

```bash
npm install pino pino-pretty --workspace=apps/server
npm install pino pino-pretty --workspace=apps/pong-server
npm install pino pino-pretty --workspace=apps/public-site
```

**Option B: Stick with console.log but structure it**

For minimal changes, structure console.log output:

**File:** `apps/server/src/lib/logger.ts`

```typescript
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDevelopment) {
      // Pretty print in development
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${context ? JSON.stringify(context, null, 2) : ''}`;
    } else {
      // JSON in production for easy parsing
      return JSON.stringify(logEntry);
    }
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatLog(LogLevel.ERROR, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context));
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }
}

export const logger = new Logger();
```

### Step 5.2: Add Request ID Tracking

**File:** `apps/server/src/middleware/requestId.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}
```

Add to `apps/server/src/index.ts`:

```typescript
import { requestIdMiddleware } from './middleware/requestId.middleware';

app.use(requestIdMiddleware);
```

### Step 5.3: Replace console.log with Logger

Gradually replace `console.log` calls with structured logger:

**Before:**
```typescript
console.log('User authenticated:', userId);
```

**After:**
```typescript
logger.info('User authenticated', { userId, requestId: req.id });
```

**Before:**
```typescript
console.error('Database error:', error);
```

**After:**
```typescript
logger.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: params.action,
  model: params.model,
  requestId: req.id,
});
```

### Step 5.4: Configure Log Levels

**File:** `apps/server/src/config/env.ts`

Add environment variable for log level:

```typescript
LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
```

Update logger to respect log level.

### Step 5.5: View Logs in Fly.io

Access logs via Fly.io CLI:

```bash
# Real-time logs
fly logs --app ems-api

# Filter by level (JSON logs)
fly logs --app ems-api | grep '"level":"error"'

# Follow logs from specific instance
fly logs --app ems-api --instance <instance-id>

# Export logs to file for analysis
fly logs --app ems-api > logs.json
```

**Pro Tip:** Use `jq` for parsing JSON logs:

```bash
fly logs --app ems-api | jq 'select(.level == "error")'
```

---

## Phase 6: Alerts & Monitoring

### Step 6.1: Define Alert Rules

Create alert rules in Grafana for critical metrics:

#### Critical Alerts (Immediate Action Required)

1. **Service Down**
   - Metric: `fly_instance_up{app=~"ems-.*"}`
   - Condition: `== 0` for > 1 minute
   - Severity: Critical

2. **High Error Rate**
   - Metric: `sum(rate(ems_api_http_errors_total[5m])) / sum(rate(ems_api_http_requests_total[5m])) * 100`
   - Condition: `> 5%` for > 5 minutes
   - Severity: Critical

3. **Database Connection Failed**
   - Metric: Check `/health` endpoint or connection pool metrics
   - Condition: Unavailable
   - Severity: Critical

4. **Queue Depth Critical**
   - Metric: `ems_api_queue_depth{state="waiting"}`
   - Condition: `> 100` jobs for > 10 minutes
   - Severity: Critical

#### Warning Alerts (Investigate Soon)

1. **Elevated Latency**
   - Metric: `histogram_quantile(0.95, sum(rate(ems_api_http_request_duration_seconds_bucket[5m])) by (le))`
   - Condition: p95 `> 1s` for > 10 minutes
   - Severity: Warning

2. **Slow Queries**
   - Metric: `rate(ems_api_db_slow_queries_total[5m])`
   - Condition: `> 5` slow queries/minute
   - Severity: Warning

3. **High Memory Usage**
   - Metric: `fly_instance_memory_bytes{app="ems-api"}`
   - Condition: `> 450MB` (90% of 512MB)
   - Severity: Warning

4. **Queue Processing Lag**
   - Metric: `ems_api_queue_oldest_job_age_seconds`
   - Condition: `> 300s` (5 minutes)
   - Severity: Warning

### Step 6.2: Create Alert Rules in Grafana

1. Navigate to https://fly-metrics.net
2. Go to **Alerting** → **Alert rules**
3. Click **New alert rule**

**Example: High Error Rate Alert**

- **Alert name:** `API Error Rate High`
- **Query:**
  ```promql
  sum(rate(ems_api_http_errors_total[5m])) /
  sum(rate(ems_api_http_requests_total[5m])) * 100
  ```
- **Condition:** `WHEN last() OF query(A) IS ABOVE 5`
- **Evaluate every:** `1m`
- **For:** `5m` (alert fires after 5 minutes of breach)
- **Annotations:**
  - Summary: `Error rate is {{ $value }}%`
  - Description: `API error rate exceeded 5% threshold`
- **Labels:**
  - `severity: critical`
  - `service: ems-api`

### Step 6.3: Configure Notification Channels

**Option 1: Email Notifications**

1. Go to **Alerting** → **Contact points**
2. Click **New contact point**
3. Select **Email**
4. Enter email addresses
5. Test and save

**Option 2: Slack Integration**

1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create app → Incoming Webhooks
   - Add to workspace
   - Copy webhook URL

2. In Grafana:
   - Go to **Alerting** → **Contact points**
   - Select **Slack**
   - Paste webhook URL
   - Configure channel and message template
   - Test and save

**Option 3: PagerDuty (for 24/7 on-call)**

1. Create PagerDuty service with Grafana integration
2. Get integration key
3. In Grafana:
   - Select **PagerDuty**
   - Enter integration key
   - Test and save

### Step 6.4: Create Notification Policies

Route different severity alerts to different channels:

1. **Critical Alerts** → Slack #alerts-critical + PagerDuty
2. **Warning Alerts** → Slack #alerts-warning
3. **Info Alerts** → Email only

Configure in **Alerting** → **Notification policies**.

### Step 6.5: Create Monitoring Runbook

**File:** `docs/MONITORING_RUNBOOK.md`

```markdown
# Monitoring Runbook

## Alert Response Guide

### Critical: Service Down

**Alert:** `fly_instance_up == 0`

**Immediate Actions:**
1. Check Fly.io status page: https://status.fly.io
2. View app logs: `fly logs --app <app-name>`
3. Check recent deployments: `fly releases --app <app-name>`
4. Restart app if necessary: `fly apps restart <app-name>`

**Investigation:**
- Check for OOM kills in logs
- Review recent code changes
- Check database connectivity

---

### Critical: High Error Rate

**Alert:** Error rate > 5%

**Immediate Actions:**
1. View error logs: `fly logs --app ems-api | grep "ERROR"`
2. Check error distribution by endpoint in Grafana
3. Check database health: `curl https://api.elonmusksucks.net/health`

**Common Causes:**
- Database connection issues
- Redis unavailable
- Code bug in recent deployment
- External API timeouts

**Resolution:**
1. If recent deployment, rollback: `fly releases --app ems-api` then `fly releases rollback <version>`
2. If database issue, check connection pool and query performance
3. If specific endpoint, disable feature flag if available

---

### Warning: High Memory Usage

**Alert:** Memory > 90%

**Immediate Actions:**
1. Check memory trend in Grafana (is it growing?)
2. Check for memory leaks in logs
3. Identify largest processes: `fly ssh console --app ems-api`, then `top`

**Resolution:**
1. Restart app to free memory (temporary): `fly apps restart ems-api`
2. Scale VM memory: `fly scale memory 1024 --app ems-api`
3. Investigate memory leak in code (if recurring)

---

### Warning: Queue Depth High

**Alert:** Queue depth > 100

**Immediate Actions:**
1. Check queue processing rate in Grafana
2. View worker logs: `fly logs --app ems-api --process worker`
3. Check for failed jobs: query BullMQ dashboard

**Resolution:**
1. Scale worker concurrency (if CPU/memory allows)
2. Check for stuck jobs: clear failed queue if necessary
3. Investigate slow job processing

---

## Maintenance Procedures

### Planned Deployment

1. Announce in #engineering (if significant)
2. Deploy during low-traffic hours (2-5 AM EST)
3. Monitor dashboards for 15 minutes post-deployment
4. Rollback if error rate increases

### Database Maintenance

1. Schedule during maintenance window
2. Enable maintenance mode on public site
3. Backup database before schema changes
4. Monitor query performance after migration

### Scaling Resources

**Memory:**
```bash
fly scale memory <size-mb> --app <app-name>
```

**Instances:**
```bash
fly scale count <count> --app <app-name>
```

**VM Size:**
```bash
fly scale vm <vm-size> --app <app-name>
```
```

### Step 6.6: Test Alerts

1. **Trigger a Test Alert:**
   - Temporarily lower alert threshold
   - Generate load to trigger condition
   - Verify notification received

2. **Alert Silencing:**
   - During maintenance, silence alerts temporarily
   - Use Grafana's **Silences** feature

3. **Alert Acknowledgement:**
   - Document who is on-call
   - Require acknowledgement within 15 minutes

---

## Troubleshooting

### Metrics Not Appearing in Grafana

**Symptoms:** Dashboard shows "No Data" or metrics queries return empty

**Checklist:**

1. **Verify `/metrics` endpoint is working:**
   ```bash
   fly ssh console --app ems-api
   curl http://localhost:5000/metrics
   ```
   Should return Prometheus-format metrics.

2. **Check fly.toml configuration:**
   ```toml
   [metrics]
     port = 5000
     path = "/metrics"
   ```

3. **Verify app is deployed with latest code:**
   ```bash
   fly releases --app ems-api
   ```

4. **Check Fly.io logs for scraping errors:**
   ```bash
   fly logs --app ems-api | grep metrics
   ```

5. **Wait 2-3 minutes:** Metrics are scraped every 15 seconds, but aggregation may take time.

6. **Test query in Grafana Explore:**
   - Go to **Explore**
   - Query: `ems_api_http_requests_total`
   - Time range: Last 15 minutes

### Metrics Show Incorrect Values

**Symptoms:** Metrics are present but values seem wrong

**Common Issues:**

1. **Labels mismatch:**
   - Ensure label names are consistent
   - Check for typos in label values

2. **Rate vs. Counter:**
   - Use `rate()` for counters in queries
   - Don't use `rate()` for gauges

3. **Time range too short:**
   - Increase time range in query
   - Use appropriate rate interval (e.g., `[5m]`)

### High Cardinality Issues

**Symptoms:** Queries are slow, Grafana timeouts

**Cause:** Too many unique label combinations

**Solution:**

1. **Identify high-cardinality labels:**
   - User IDs: Don't include in labels
   - Request IDs: Don't include in labels
   - Timestamps: Use Prometheus timestamps

2. **Limit label values:**
   - Use generic labels (e.g., "other" for uncommon routes)
   - Cap number of unique values

3. **Use aggregation:**
   - `sum() by (label)` instead of raw metrics

### Grafana Alerts Not Firing

**Checklist:**

1. **Check alert rule status:**
   - Go to **Alerting** → **Alert rules**
   - Verify rule is "Firing" or "Normal"

2. **Check evaluation interval:**
   - Ensure alert has enough data points

3. **Check contact points:**
   - Test contact point manually

4. **Check notification policies:**
   - Verify routing is correct

5. **Check Grafana logs:**
   - May need Fly.io support to access Grafana logs

### Missing Built-in Fly.io Metrics

**Symptoms:** `fly_instance_*` metrics not appearing

**Solution:**

1. **Check app is running:**
   ```bash
   fly status --app ems-api
   ```

2. **Verify organization access:**
   - Ensure you're viewing the correct organization in Grafana

3. **Contact Fly.io Support:**
   - If built-in metrics are completely missing

---

## Best Practices

### 1. Metric Naming Conventions

Follow Prometheus naming conventions:

- **Prefix:** `ems_<service>_<name>`
  - `ems_api_http_requests_total`
  - `ems_pong_games_total`

- **Counters:** Suffix with `_total`
  - `ems_api_errors_total`

- **Histograms:** Suffix with unit
  - `ems_api_request_duration_seconds`

- **Gauges:** Use current state
  - `ems_api_active_connections`

### 2. Label Best Practices

- **Keep cardinality low:** Limit unique label values
- **Use meaningful names:** `status_code` not `code`
- **Be consistent:** Use same label names across metrics
- **Avoid high-cardinality labels:**
  - ❌ `user_id`
  - ❌ `request_id`
  - ✅ `status_code`
  - ✅ `route`

### 3. Dashboard Organization

- **One dashboard per service**
- **Start with overview, drill down to details**
- **Use templating for dynamic filtering**
- **Include documentation links in dashboard descriptions**

### 4. Alert Tuning

- **Start conservative:** High thresholds, long evaluation periods
- **Reduce noise:** Tune thresholds based on false positives
- **Document false positives:** Update runbook with learnings
- **Regular review:** Monthly review of alert effectiveness

### 5. Query Performance

- **Use recording rules for expensive queries:**
  ```yaml
  # In Prometheus config (if self-hosting)
  - record: job:ems_api_http_request_duration_seconds:p95
    expr: histogram_quantile(0.95, sum(rate(ems_api_http_request_duration_seconds_bucket[5m])) by (le))
  ```

- **Limit time ranges:** Default to last 6-24 hours
- **Use appropriate rate intervals:** `[5m]` for most queries
- **Aggregate when possible:** Use `sum()`, `avg()`, etc.

### 6. Security

- **No sensitive data in labels:** Never include passwords, tokens, etc.
- **Limit metrics endpoint access:** Fly.io handles this (internal network only)
- **Sanitize user input in labels:** Prevent injection attacks

### 7. Documentation

- **Document all custom metrics:** Add comments in code
- **Maintain dashboard change log:** Track dashboard updates
- **Update runbook regularly:** After incidents, update procedures

### 8. Regular Maintenance

**Weekly:**
- Review alert noise (false positives)
- Check for metric gaps (missing data)

**Monthly:**
- Review dashboard effectiveness
- Update alert thresholds based on trends
- Clean up unused dashboards

**Quarterly:**
- Capacity planning review
- Cost optimization (if self-hosting Grafana)

---

## Next Steps

After completing this guide:

1. ✅ **Phase 1:** Access Fly.io Grafana
2. ✅ **Phase 2:** Implement Prometheus metrics in all apps
3. ✅ **Phase 3:** Configure fly.toml and deploy
4. ✅ **Phase 4:** Create Grafana dashboards
5. ✅ **Phase 5:** Implement structured logging
6. ✅ **Phase 6:** Set up alerts and monitoring

**Ongoing:**
- Monitor dashboards daily
- Respond to alerts promptly
- Tune alert thresholds monthly
- Review and update runbook after incidents

**Advanced Topics (Future):**
- Distributed tracing with OpenTelemetry
- Log aggregation with Loki
- SLO tracking and error budgets
- Synthetic monitoring (uptime checks)
- Cost monitoring and optimization

---

## Resources

### Fly.io Documentation
- [Metrics on Fly.io](https://fly.io/docs/monitoring/metrics/)
- [Grafana Dashboards](https://fly.io/blog/hooking-up-fly-metrics/)
- [Fly.io Status Page](https://status.fly.io)

### Prometheus Documentation
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Histograms and Summaries](https://prometheus.io/docs/practices/histograms/)

### Grafana Documentation
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/)
- [Query Optimization](https://grafana.com/docs/grafana/latest/administration/performance/)

### elonmusksucks.net Specific
- [CLAUDE.md](./CLAUDE.md) - Architecture overview
- [FLY_DEPLOY.md](./FLY_DEPLOY.md) - Deployment guide
- [CURRENT_ISSUES.md](./CURRENT_ISSUES.md) - Known issues

---

**Last Updated:** January 2025
**Maintainer:** Development Team
**Questions?** Create an issue or contact DevOps team
