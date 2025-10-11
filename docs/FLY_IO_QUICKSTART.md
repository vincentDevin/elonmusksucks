# Fly.io Quick Start - Local Build Approach

**This guide assumes you're building locally and deploying pre-built artifacts.**

---

## Prerequisites

✅ **Fly CLI installed** (`brew install flyctl`)
✅ **Fly.io account** (`flyctl auth login`)
✅ **Node.js ≥24.0.0**
✅ **Project built locally** (see Build Steps below)

---

## Step 1: Build All Applications Locally

```bash
# From repository root
cd /Users/devin/Desktop/new-personal-site/elonmusksucks

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Build shared types
cd packages/types && npm run build && cd ../..

# Build all applications
npm -w apps/server run build
npm -w apps/pong-server run build
npm -w apps/public-site run build
npm -w apps/client run build

# Verify builds exist
ls -la apps/server/dist/
ls -la apps/pong-server/dist/
ls -la apps/public-site/dist/
ls -la apps/client/dist/
```

**✅ Expected output:**
- `apps/server/dist/server.js` ✓
- `apps/pong-server/dist/server.js` ✓
- `apps/public-site/dist/server/` + `dist/client/` ✓
- `apps/client/dist/index.html` + `assets/` ✓

---

## Step 2: Create Fly.io Services

### 2.1 PostgreSQL Database

```bash
# Create Postgres cluster
flyctl postgres create --name ems-db \
  --region iad \
  --vm-size shared-cpu-1x \
  --volume-size 10 \
  --initial-cluster-size 1

# IMPORTANT: Save the connection string shown!
# Format: postgres://postgres:<password>@ems-db.internal:5432/postgres

# Create production database
flyctl postgres connect -a ems-db
# Inside psql:
postgres=# CREATE DATABASE elonmusksucks;
postgres=# \q

# Your DATABASE_URL:
# postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable
```

### 2.2 Fly.io Redis (Native)

**✅ Use Fly.io native Redis (no Upstash account needed!)**

```bash
# Create Fly.io Redis instance
flyctl redis create --name ems-redis \
  --region iad \
  --plan 256mb

# Get connection details
flyctl redis status ems-redis

# Your REDIS_URL will be shown in output:
# redis://default:<password>@ems-redis.internal:6379
```

**Fly.io Redis Benefits:**
- ✅ Native Fly.io integration (no external account)
- ✅ Uses internal DNS (`.internal`)
- ✅ Low latency (same datacenter)
- ✅ Free tier: 256MB RAM

### 2.3 Tigris S3 Storage

```bash
# Create Tigris bucket (Fly.io native S3)
flyctl storage create --name ems-storage

# Get credentials
flyctl storage show ems-storage

# Save these:
# - Bucket: ems-storage-xxxxx
# - Endpoint: https://fly.storage.tigris.dev
# - Access Key: tid_xxxxx
# - Secret Key: tsec_xxxxx
```

---

## Step 3: Deploy Applications

### 3.1 Deploy Main Server (API Backend)

```bash
# Create Fly app
flyctl apps create ems-api

# Set secrets
flyctl secrets set \
  DATABASE_URL="postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable" \
  REDIS_URL="redis://default:<password>@ems-redis.internal:6379" \
  ACCESS_TOKEN_SECRET="$(openssl rand -base64 32)" \
  REFRESH_TOKEN_SECRET="$(openssl rand -base64 32)" \
  CLIENT_APP_URL="https://ems-client.fly.dev" \
  BASE_URL_CLIENT="https://ems-client.fly.dev" \
  BASE_URL_SERVER="https://ems-api.fly.dev" \
  BASE_URL_PUBLIC="https://ems-public.fly.dev" \
  API_BASE_URL="https://ems-api.fly.dev" \
  TIGRIS_S3_ENDPOINT="https://fly.storage.tigris.dev" \
  TIGRIS_ACCESS_KEY_ID="tid_xxxxx" \
  TIGRIS_SECRET_ACCESS_KEY="tsec_xxxxx" \
  TIGRIS_S3_BUCKET="ems-storage-xxxxx" \
  SENDGRID_API_KEY="SG.xxxxx" \
  FROM_EMAIL="noreply@elonmusksucks.net" \
  SKIP_EMAIL_FLOW="false" \
  BCRYPT_SALT_ROUNDS="12" \
  GAME_SERVER_SECRET="$(openssl rand -base64 32)" \
  -a ems-api

# Deploy (from repo root)
flyctl deploy --config apps/server/fly.toml -a ems-api

# Verify
flyctl status -a ems-api
curl https://ems-api.fly.dev/health
```

### 3.2 Run Database Migrations

```bash
# Proxy to database
flyctl proxy 5432:5432 -a ems-db &

# Run migrations (in another terminal)
export DATABASE_URL="postgresql://postgres:<password>@localhost:5432/elonmusksucks"
npm run prisma:migrate:deploy
npm run seed:achievements  # 77 achievements

# Stop proxy
killall flyctl
```

### 3.3 Deploy Pong Server

```bash
# Create app
flyctl apps create ems-pong

# Set secrets (use same GAME_SERVER_SECRET as main server!)
flyctl secrets set \
  DATABASE_URL="postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable" \
  REDIS_URL="redis://default:<password>@ems-redis.internal:6379" \
  GAME_SERVER_SECRET="<same-as-main-server>" \
  ACCESS_TOKEN_SECRET="<same-as-main-server>" \
  REFRESH_TOKEN_SECRET="<same-as-main-server>" \
  BASE_URL_CLIENT="https://ems-client.fly.dev" \
  -a ems-pong

# Deploy
flyctl deploy --config apps/pong-server/fly.toml -a ems-pong

# Verify
curl https://ems-pong.fly.dev/health
```

### 3.4 Deploy Public Site (SSR with Nginx)

```bash
# Create app
flyctl apps create ems-public

# Set secrets
flyctl secrets set \
  VITE_API_BASE_URL="https://ems-api.fly.dev" \
  VITE_CLIENT_APP_URL="https://ems-client.fly.dev" \
  -a ems-public

# Deploy
flyctl deploy --config apps/public-site/fly.toml -a ems-public

# Verify (should return full HTML)
curl https://ems-public.fly.dev
```

### 3.5 Deploy Client App (SPA)

**⚠️ IMPORTANT:** Client environment variables are embedded at BUILD time, not runtime!

```bash
# Update .env.production with production URLs
cat > apps/client/.env.production <<EOF
VITE_API_BASE_URL=https://ems-api.fly.dev
VITE_SOCKET_URL=https://ems-api.fly.dev
VITE_PUBLIC_SITE_URL=https://ems-public.fly.dev
VITE_FEATURE_PONG_BETA=false
VITE_FEATURE_ENHANCED_CHAT=false
VITE_FEATURE_ADVANCED_ANALYTICS=false
VITE_FEATURE_EXPERIMENTAL_UI=false
EOF

# Rebuild client with production URLs
npm -w apps/client run build

# Create app
flyctl apps create ems-client

# Deploy
flyctl deploy --config apps/client/fly.toml -a ems-client

# Verify
curl -I https://ems-client.fly.dev
```

---

## Step 4: Custom Domains (Production)

```bash
# Add custom domains
flyctl certs create api.elonmusksucks.net -a ems-api
flyctl certs create pong.elonmusksucks.net -a ems-pong
flyctl certs create elonmusksucks.net -a ems-public
flyctl certs create app.elonmusksucks.net -a ems-client

# Get DNS records
flyctl certs show api.elonmusksucks.net -a ems-api

# Add to DNS provider (Cloudflare, Namecheap, etc):
# A records (if provided)
api.elonmusksucks.net    → <fly.io IP>
pong.elonmusksucks.net   → <fly.io IP>
elonmusksucks.net        → <fly.io IP>
app.elonmusksucks.net    → <fly.io IP>

# Wait 2-5 minutes for DNS propagation
# SSL certificates are auto-provisioned via Let's Encrypt
```

### Update URLs After Custom Domains

```bash
# Update main server
flyctl secrets set \
  CLIENT_APP_URL="https://app.elonmusksucks.net" \
  BASE_URL_CLIENT="https://app.elonmusksucks.net" \
  BASE_URL_SERVER="https://api.elonmusksucks.net" \
  BASE_URL_PUBLIC="https://elonmusksucks.net" \
  API_BASE_URL="https://api.elonmusksucks.net" \
  -a ems-api

# Update pong server
flyctl secrets set \
  BASE_URL_CLIENT="https://app.elonmusksucks.net" \
  -a ems-pong

# Update public site
flyctl secrets set \
  VITE_API_BASE_URL="https://api.elonmusksucks.net" \
  VITE_CLIENT_APP_URL="https://app.elonmusksucks.net" \
  -a ems-public

# Rebuild and redeploy client with custom domains
cat > apps/client/.env.production <<EOF
VITE_API_BASE_URL=https://api.elonmusksucks.net
VITE_SOCKET_URL=https://api.elonmusksucks.net
VITE_PUBLIC_SITE_URL=https://elonmusksucks.net
EOF

npm -w apps/client run build
flyctl deploy -a ems-client
```

---

## Step 5: Verify Deployment

```bash
# Check all apps
flyctl status -a ems-api
flyctl status -a ems-pong
flyctl status -a ems-public
flyctl status -a ems-client

# Test health endpoints
curl https://api.elonmusksucks.net/health
curl https://pong.elonmusksucks.net/health
curl https://elonmusksucks.net/health  # Should return HTML
curl -I https://app.elonmusksucks.net   # Should return HTML

# Check logs
flyctl logs -a ems-api
flyctl logs -a ems-pong
flyctl logs -a ems-public
flyctl logs -a ems-client
```

---

## Redeployment Workflow (After Code Changes)

```bash
# 1. Build locally
npm run build  # Or build specific apps

# 2. Deploy changed apps
flyctl deploy -a ems-api        # If server changed
flyctl deploy -a ems-pong       # If pong server changed
flyctl deploy -a ems-public     # If public site changed

# For client (if URLs changed)
npm -w apps/client run build
flyctl deploy -a ems-client

# If only client code changed (no URL changes)
flyctl deploy -a ems-client
```

---

## Useful Commands

```bash
# View logs (real-time)
flyctl logs -a ems-api

# SSH into app
flyctl ssh console -a ems-api

# Scale up
flyctl scale vm performance-1x -a ems-api  # 2GB RAM
flyctl scale count 2 -a ems-api            # 2 machines

# Database console
flyctl postgres connect -a ems-db

# Redis console
flyctl redis connect ems-redis

# List all apps
flyctl apps list

# Open dashboard
flyctl dashboard -a ems-api
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     elonmusksucks.net                       │
│                  (Public Site - SSR)                        │
│             Nginx (5173) + Node (3001)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (API proxy)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   api.elonmusksucks.net                     │
│                  (Main Server - API)                        │
│                      Express (5000)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
        ┌──────────┐  ┌─────────┐  ┌────────┐
        │PostgreSQL│  │  Redis  │  │Tigris S3│
        │ (ems-db) │  │(ems-redis)│ │(storage)│
        └──────────┘  └─────────┘  └────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Pong Server  │    │  Public Site │    │  Client App  │
│pong.ems.net  │    │   ems.net    │    │app.ems.net   │
│Express (5001)│    │Nginx + Node  │    │Nginx (3000)  │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Cost Estimate

**Free Tier (Testing):**
- 3 shared-cpu-1x VMs: FREE
- Postgres 10GB: $0-5/month
- Redis 256MB: FREE
- Tigris 5GB: FREE
- **Total: ~$5/month**

**Production (Recommended):**
- 2x Main Server (performance-1x): $20/month
- 2x Pong Server (performance-1x): $20/month
- 2x Public Site (shared-cpu-1x): $8/month
- 2x Client App (shared-cpu-1x): $8/month
- Postgres (performance-1x, HA): $45/month
- Redis 1GB: $10/month
- Tigris 50GB: $15/month
- **Total: ~$125-150/month**

---

## Troubleshooting

**App won't start:**
```bash
flyctl logs -a ems-api
# Check for missing secrets
flyctl secrets list -a ems-api
```

**Database connection fails:**
```bash
# Verify DATABASE_URL uses .internal domain
flyctl secrets list -a ems-api | grep DATABASE_URL
# Should be: ems-db.internal (not fly.dev)
```

**Client app not loading:**
```bash
# Verify build includes correct URLs
grep -r "VITE_API_BASE_URL" apps/client/dist/assets/*.js
# Should show production URL, not localhost
```

**Public site SSR not working:**
```bash
# Check both Nginx and Node are running
flyctl ssh console -a ems-public
ps aux | grep nginx
ps aux | grep node
```

---

## Next Steps

1. ✅ Set up monitoring (UptimeRobot, Sentry)
2. ✅ Configure auto-scaling
3. ✅ Set up CI/CD (GitHub Actions)
4. ✅ Enable database backups
5. ✅ Performance testing

See `FLY_IO_DEPLOYMENT_GUIDE.md` for full documentation.
