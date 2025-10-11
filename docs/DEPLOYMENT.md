# Production Deployment Guide (Fly.io)

## Overview

This guide covers deploying elonmusksucks.net to Fly.io with proper horizontal scaling, handling Node.js single-threading concerns through architecture rather than clustering.

## Architecture Philosophy: Why We Don't Worry About Single-Threading

### ✅ **Your Codebase is I/O-Bound, Not CPU-Bound**

**Event Bus Performance:**
- Redis pub/sub operations: **~1-2ms** (I/O, non-blocking)
- JSON serialization: **<1ms** for typical payloads
- Connection pooling: Prevents blocking on Redis connections

**Achievement Engine Performance:**
- Rule evaluation: **~5-10ms** (DB queries + simple conditionals)
- 77 achievements × average 3 rules each = 231 total rules
- Cached in memory with 5-minute TTL
- Per-event processing: **2-5 rules evaluated** (indexed by event key)

**Math:**
```
Peak load scenario:
- 100 concurrent users
- 10 events/user/second = 1,000 events/sec
- Average 3 rules/event × 5ms = 15ms per event
- Single Node.js process: ~66 events/sec sustained
- 2 Fly.io instances: ~132 events/sec (well above typical needs)
```

### 🎯 **Horizontal Scaling > Vertical Clustering**

Instead of using Node.js `cluster` module (complex, state management issues):
- **Fly.io auto-scaling**: 2-4 instances based on load
- **Redis pub/sub**: Shares events across all instances
- **Socket.IO Redis adapter**: Shares WebSocket rooms across instances
- **BullMQ**: Job distribution across worker instances
- **PostgreSQL connection pooling**: Managed by Prisma

## Prerequisites

### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create Fly.io Apps
```bash
# API Server
fly apps create elonmusksucks-api

# Workers
fly apps create elonmusksucks-workers

# Pong Server (if separating)
fly apps create elonmusksucks-pong
```

### 3. Provision Databases

#### PostgreSQL
```bash
# Create Fly Postgres cluster
fly postgres create --name elonmusksucks-db --region sjc

# Attach to API server
fly postgres attach elonmusksucks-db --app elonmusksucks-api

# Attach to workers
fly postgres attach elonmusksucks-db --app elonmusksucks-workers
```

#### Redis (Option A: Upstash - Recommended)
```bash
# Create Upstash Redis (free tier available)
# Visit: https://console.upstash.com/
# Copy REDIS_URL and add as secret
fly secrets set REDIS_URL="redis://..." --app elonmusksucks-api
fly secrets set REDIS_URL="redis://..." --app elonmusksucks-workers
```

#### Redis (Option B: Fly Redis)
```bash
fly redis create --name elonmusksucks-redis --region sjc
fly redis attach elonmusksucks-redis --app elonmusksucks-api
```

## Deployment Steps

### 1. Set Environment Secrets

```bash
# Generate secrets (32+ characters)
openssl rand -base64 32  # For ACCESS_TOKEN_SECRET
openssl rand -base64 32  # For REFRESH_TOKEN_SECRET

# Set secrets on API server
fly secrets set \
  ACCESS_TOKEN_SECRET="your_generated_secret_1" \
  REFRESH_TOKEN_SECRET="your_generated_secret_2" \
  TIGRIS_S3_ENDPOINT="https://fly.storage.tigris.dev" \
  TIGRIS_ACCESS_KEY_ID="tid_xxx" \
  TIGRIS_SECRET_ACCESS_KEY="tsec_xxx" \
  TIGRIS_S3_BUCKET="elonmusksucks" \
  CLIENT_APP_URL="https://elonmusksucks.net" \
  BASE_URL_CLIENT="https://elonmusksucks.net" \
  BASE_URL_PUBLIC="https://elonmusksucks.net" \
  BASE_URL_SERVER="https://api.elonmusksucks.net" \
  API_BASE_URL="https://api.elonmusksucks.net" \
  NODE_ENV="production" \
  --app elonmusksucks-api

# Set secrets on workers (same values)
fly secrets set \
  ACCESS_TOKEN_SECRET="your_generated_secret_1" \
  REFRESH_TOKEN_SECRET="your_generated_secret_2" \
  TIGRIS_S3_ENDPOINT="https://fly.storage.tigris.dev" \
  TIGRIS_ACCESS_KEY_ID="tid_xxx" \
  TIGRIS_SECRET_ACCESS_KEY="tsec_xxx" \
  TIGRIS_S3_BUCKET="elonmusksucks" \
  NODE_ENV="production" \
  --app elonmusksucks-workers
```

### 2. Run Database Migrations

```bash
# SSH into API server
fly ssh console --app elonmusksucks-api

# Run migrations (inside container)
cd /app
npx prisma migrate deploy --schema ./prisma/schema.prisma

# Seed achievements (one time only)
npm run seed:achievements
```

### 3. Deploy API Server

```bash
# Deploy from project root
fly deploy --config fly.toml --app elonmusksucks-api

# Monitor deployment
fly logs --app elonmusksucks-api
```

### 4. Deploy Workers

```bash
# Deploy workers
fly deploy --config fly.worker.toml --app elonmusksucks-workers

# Monitor workers
fly logs --app elonmusksucks-workers
```

### 5. Configure Custom Domain

```bash
# Add your domain
fly certs create api.elonmusksucks.net --app elonmusksucks-api

# Get DNS records to add
fly certs show api.elonmusksucks.net --app elonmusksucks-api
```

## Scaling Configuration

### Auto-Scaling (Already Configured in fly.toml)

```toml
[scaling]
  min_count = 2  # High availability
  max_count = 4  # Scale under load
```

### Manual Scaling (if needed)

```bash
# Scale API servers
fly scale count 3 --app elonmusksucks-api

# Scale workers
fly scale count 2 --app elonmusksucks-workers

# Upgrade VM size (if needed)
fly scale vm shared-cpu-2x --app elonmusksucks-api
```

## Monitoring

### Health Checks

```bash
# Check API health
curl https://api.elonmusksucks.net/health

# View metrics
fly dashboard --app elonmusksucks-api
```

### Logs

```bash
# Real-time logs
fly logs --app elonmusksucks-api

# Worker logs
fly logs --app elonmusksucks-workers

# Filter by level
fly logs --app elonmusksucks-api | grep ERROR
```

### Metrics Dashboard

```bash
# Open Grafana dashboard
fly dashboard --app elonmusksucks-api
```

## Performance Tuning

### 1. Connection Pooling (Already Configured)

Your `EventBus.ts` already uses Redis connection pooling:
```typescript
maxConnections: 8,
minConnections: 2,
acquireTimeoutMs: 10000,
```

### 2. Database Connection Limits

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 10  // Per instance
}
```

### 3. Socket.IO Scaling

Already configured with Redis adapter in `socket.ts`:
```typescript
io.adapter(createAdapter(pubClient, subClient));
```

## Troubleshooting

### Issue: Workers Not Processing Jobs

```bash
# Check Redis connection
fly ssh console --app elonmusksucks-workers
redis-cli -u $REDIS_URL ping

# Check BullMQ queues
fly ssh console --app elonmusksucks-workers
node -e "const {Queue} = require('bullmq'); new Queue('payouts').getJobCounts().then(console.log)"
```

### Issue: High Memory Usage

```bash
# Check current usage
fly status --app elonmusksucks-api

# Increase memory if needed
fly scale memory 512 --app elonmusksucks-api
```

### Issue: Socket.IO Not Connecting

```bash
# Verify Redis adapter is working
fly logs --app elonmusksucks-api | grep "Socket.IO"

# Check CORS configuration
# Ensure BASE_URL_CLIENT matches your frontend URL
```

## Cost Optimization

### Typical Monthly Costs (Fly.io)

```
API Server:
- 2× 256MB shared-cpu instances: ~$5-7/month
- Autoscaling to 4: ~$10-14/month peak

Workers:
- 1× 512MB shared-cpu instance: ~$3-5/month

PostgreSQL:
- Development cluster: ~$10/month
- Production cluster: ~$30/month

Redis (Upstash):
- Free tier: 10,000 commands/day
- Pro: $10/month (100M commands)

Tigris S3:
- 5GB storage: Free
- 100GB storage: ~$5/month

Total: ~$30-60/month for production-ready setup
```

### Free Tier Optimization

```bash
# Use 1 instance instead of 2 (no HA)
fly scale count 1 --app elonmusksucks-api

# Use shared-cpu-1x (slower)
fly scale vm shared-cpu-1x --app elonmusksucks-api

# Use Upstash free tier for Redis
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Flyctl
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy API
        run: flyctl deploy --config fly.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Workers
        run: flyctl deploy --config fly.worker.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Rollback Procedure

```bash
# List releases
fly releases --app elonmusksucks-api

# Rollback to previous version
fly releases rollback v42 --app elonmusksucks-api
```

## Zero-Downtime Deployments

Fly.io handles this automatically with:
- Rolling deployments (configured in fly.toml)
- Health checks before routing traffic
- Graceful shutdown of old instances

## Questions?

- Fly.io Docs: https://fly.io/docs
- BullMQ Scaling: https://docs.bullmq.io/guide/workers/concurrency
- Socket.IO Scaling: https://socket.io/docs/v4/using-multiple-nodes/

---

**Key Takeaway**: Your architecture already handles Node.js single-threading through horizontal scaling, Redis pub/sub, and proper async I/O patterns. No need for cluster module complexity!
