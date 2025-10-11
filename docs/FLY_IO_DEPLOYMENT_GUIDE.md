# Fly.io Production Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-11
**Platform:** Fly.io

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Fly.io Account & CLI Setup](#step-1-flyio-account--cli-setup)
4. [Step 2: PostgreSQL Database Setup](#step-2-postgresql-database-setup)
5. [Step 3: Redis Setup (Upstash)](#step-3-redis-setup-upstash)
6. [Step 4: Tigris S3 Storage Setup](#step-4-tigris-s3-storage-setup)
7. [Step 5: Create Dockerfiles](#step-5-create-dockerfiles)
8. [Step 6: Create fly.toml Configurations](#step-6-create-flytoml-configurations)
9. [Step 7: Deploy Main Server (API Backend)](#step-7-deploy-main-server-api-backend)
10. [Step 8: Deploy Pong Server](#step-8-deploy-pong-server)
11. [Step 9: Deploy Public Site (SSR)](#step-9-deploy-public-site-ssr)
12. [Step 10: Deploy Client App (SPA)](#step-10-deploy-client-app-spa)
13. [Step 11: Custom Domains & SSL](#step-11-custom-domains--ssl)
14. [Step 12: Scaling & Monitoring](#step-12-scaling--monitoring)
15. [Troubleshooting](#troubleshooting)
16. [Cost Estimates](#cost-estimates)

---

## Overview

This guide will deploy **elonmusksucks.net** to Fly.io with a **quad-application architecture**:

| Application | Fly App Name | Port | URL |
|-------------|--------------|------|-----|
| **Main Server** | `ems-api` | 5000 | `api.elonmusksucks.net` |
| **Pong Server** | `ems-pong` | 5001 | `pong.elonmusksucks.net` |
| **Public Site** | `ems-public` | 5173 | `elonmusksucks.net` |
| **Client App** | `ems-client` | 3000 | `app.elonmusksucks.net` |

**Fly.io Services:**
- **Fly Postgres** - PostgreSQL 15+ database
- **Upstash Redis** - Redis for real-time events & BullMQ
- **Tigris S3** - S3-compatible object storage (native Fly.io integration)
- **Fly.io Internal DNS** - Private networking between apps

---

## Prerequisites

### Required Tools

- **Node.js** ≥24.0.0 ([download](https://nodejs.org/))
- **Fly CLI** ([installation instructions](https://fly.io/docs/hands-on/install-flyctl/))
- **Git** for version control
- **Domain name** (e.g., elonmusksucks.net)

### Required Accounts

- [ ] **Fly.io account** (free tier available) - [Sign up](https://fly.io/app/sign-up)
- [ ] **Upstash account** (free tier available) - [Sign up](https://upstash.com/)
- [ ] **SendGrid account** (free tier: 100 emails/day) - [Sign up](https://signup.sendgrid.com/)

---

## Step 1: Fly.io Account & CLI Setup

### 1.1 Install Fly CLI

**macOS:**
```bash
brew install flyctl
```

**Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows:**
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 1.2 Authenticate with Fly.io

```bash
# Login to Fly.io (opens browser)
flyctl auth login

# Verify authentication
flyctl auth whoami

# Expected output: Your email address
```

### 1.3 Add Payment Method (Required for Production)

```bash
# Open Fly.io billing dashboard
flyctl dashboard
```

- Navigate to **Billing** → Add credit card
- Even with free tier, a payment method is required for some resources

### 1.4 Create Fly.io Organization (Optional)

```bash
# Create organization for better resource management
flyctl orgs create elonmusksucks

# List organizations
flyctl orgs list
```

---

## Step 2: PostgreSQL Database Setup

Fly.io offers **Fly Postgres** - managed PostgreSQL with automatic backups.

### 2.1 Create Postgres Cluster

```bash
# Create Postgres cluster (select options in interactive prompt)
flyctl postgres create --name ems-db

# Options to select:
# - Region: Choose closest to your users (e.g., iad for US East)
# - Postgres version: 15 or 16 (recommended)
# - VM size: shared-cpu-1x (256MB RAM) for dev/small prod
#           OR performance-1x (2GB RAM) for production
# - Volume size: 10GB minimum (can be increased later)
# - High availability: No for dev, Yes for production (creates replica)
```

**Production Recommendations:**
- **VM Size:** `performance-1x` (2GB RAM) or larger
- **Volume Size:** 10GB minimum, scale as needed
- **HA:** Enable for production (creates 2 replicas)

### 2.2 Get Database Connection String

```bash
# Get connection details
flyctl postgres connect -a ems-db

# This will show:
# - Host: ems-db.internal (Fly.io internal DNS)
# - Port: 5432
# - Database: postgres
# - Username: postgres
# - Password: (shown once during creation - save it!)

# Full connection string format:
# postgresql://postgres:<password>@ems-db.internal:5432/postgres?sslmode=disable
```

**IMPORTANT:** Save the password shown during creation! You won't be able to retrieve it later.

### 2.3 Create Production Database

```bash
# Connect to Postgres via flyctl
flyctl postgres connect -a ems-db

# Inside psql:
postgres=# CREATE DATABASE elonmusksucks;
postgres=# \l  -- List databases to verify
postgres=# \q  -- Quit

# Your final DATABASE_URL will be:
# postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable
```

### 2.4 Test Connection

```bash
# From your local machine (requires attaching to Fly network)
flyctl proxy 5432:5432 -a ems-db

# In another terminal:
psql "postgresql://postgres:<password>@localhost:5432/elonmusksucks"

# Should connect successfully - press Ctrl+C to stop proxy
```

---

## Step 3: Redis Setup (Upstash)

Fly.io recommends **Upstash Redis** for managed Redis with global low-latency.

### 3.1 Create Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Sign up (free tier: 10,000 commands/day)
3. Connect your Fly.io account (or create manually)

### 3.2 Create Redis Database

**Option A: Via Fly.io (Recommended)**

```bash
# Create Upstash Redis via Fly.io integration
flyctl ext create upstash_redis --name ems-redis

# Select options:
# - Region: Same as your primary app region (e.g., iad)
# - Plan: Free (10K commands/day) or Pay-as-you-go

# Get connection URL
flyctl ext show ems-redis

# Output will show:
# - REDIS_URL: redis://:password@region.upstash.io:6379
```

**Option B: Manual Creation**

1. Log in to [Upstash Console](https://console.upstash.com/)
2. Click **Create Database**
3. Name: `ems-redis`
4. Region: Choose closest to Fly.io region
5. Copy the **Redis URL** (format: `redis://:password@...`)

### 3.3 Test Redis Connection

```bash
# Install redis-cli locally (macOS)
brew install redis

# Test connection
redis-cli -u "redis://:password@region.upstash.io:6379" PING

# Expected: PONG
```

---

## Step 4: Tigris S3 Storage Setup

**Tigris** is Fly.io's native S3-compatible object storage.

### 4.1 Create Tigris Bucket

```bash
# Create Tigris bucket
flyctl ext storage create --name ems-storage

# Select options:
# - Organization: Your Fly.io organization

# Get credentials
flyctl ext storage show ems-storage

# Output will show:
# - Bucket name: ems-storage-xxxxx
# - Endpoint: https://fly.storage.tigris.dev
# - Access Key ID: tid_xxxxx
# - Secret Access Key: tsec_xxxxx
```

### 4.2 Test Tigris Connection

```bash
# Install AWS CLI (works with S3-compatible storage)
brew install awscli

# Configure AWS CLI for Tigris
aws configure --profile tigris
# AWS Access Key ID: tid_xxxxx (from above)
# AWS Secret Access Key: tsec_xxxxx (from above)
# Default region: auto
# Default output format: json

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://ems-storage-xxxxx/test.txt --profile tigris --endpoint-url https://fly.storage.tigris.dev

# Test list
aws s3 ls s3://ems-storage-xxxxx --profile tigris --endpoint-url https://fly.storage.tigris.dev

# Should show test.txt

# Clean up
rm test.txt
aws s3 rm s3://ems-storage-xxxxx/test.txt --profile tigris --endpoint-url https://fly.storage.tigris.dev
```

---

## Step 5: Create Dockerfiles

Now we'll create Dockerfiles for all 4 applications. The existing `apps/server/Dockerfile` is already production-ready, but we'll create new ones for pong-server, public-site, and client.

### 5.1 Pong Server Dockerfile

Create `apps/pong-server/Dockerfile`:

```dockerfile
# Dockerfile for elonmusksucks pong-server
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/pong-server/package.json ./apps/pong-server/

# Install dependencies
RUN npm ci --workspace=apps/pong-server

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/pong-server/node_modules ./apps/pong-server/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY apps/pong-server ./apps/pong-server
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
RUN cd packages/types && npm run build

# Build pong server
RUN cd apps/pong-server && npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ponguser

# Copy built application
COPY --from=builder --chown=ponguser:nodejs /app/apps/pong-server/dist ./apps/pong-server/dist
COPY --from=builder --chown=ponguser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=ponguser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ponguser:nodejs /app/apps/pong-server/node_modules ./apps/pong-server/node_modules
COPY --from=builder --chown=ponguser:nodejs /app/prisma ./prisma

USER ponguser

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "apps/pong-server/dist/server.js"]
```

Save this file at: `apps/pong-server/Dockerfile`

### 5.2 Public Site Dockerfile

Create `apps/public-site/Dockerfile`:

```dockerfile
# Dockerfile for elonmusksucks public-site (SSR)
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/public-site/package.json ./apps/public-site/

# Install dependencies
RUN npm ci --workspace=apps/public-site

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/public-site/node_modules ./apps/public-site/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY apps/public-site ./apps/public-site
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
RUN cd packages/types && npm run build

# Build public site (SSR)
WORKDIR /app/apps/public-site
RUN npm run build

# Production stage (SSR server)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 publicuser

# Copy built application
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/dist ./apps/public-site/dist
COPY --from=builder --chown=publicuser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=publicuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/node_modules ./apps/public-site/node_modules
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/server.ts ./apps/public-site/server.ts
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/index.html ./apps/public-site/index.html
COPY --from=builder --chown=publicuser:nodejs /app/apps/public-site/src ./apps/public-site/src
COPY --from=builder --chown=publicuser:nodejs /app/prisma ./prisma

USER publicuser

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5173/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# SSR server uses tsx to run TypeScript
CMD ["npx", "tsx", "apps/public-site/server.ts"]
```

Save this file at: `apps/public-site/Dockerfile`

### 5.3 Client App Dockerfile

Create `apps/client/Dockerfile`:

```dockerfile
# Dockerfile for elonmusksucks client (SPA)
# Multi-stage build: Build stage -> Nginx serving stage

FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN npm ci --workspace=apps/client

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/client/node_modules ./apps/client/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY apps/client ./apps/client
COPY prisma ./prisma
COPY tsconfig.json ./

# Build shared types
RUN npm run prisma:generate
RUN cd packages/types && npm run build

# Build client app
WORKDIR /app/apps/client
RUN npm run build

# Production stage - Use Nginx to serve static files
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

Save this file at: `apps/client/Dockerfile`

### 5.4 Client Nginx Configuration

Create `apps/client/nginx.conf`:

```nginx
server {
    listen 3000;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable .map files
    location ~* \.map$ {
        return 404;
    }

    # SPA fallback - all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Save this file at: `apps/client/nginx.conf`

---

## Step 6: Create fly.toml Configurations

Each Fly.io app needs a `fly.toml` configuration file.

### 6.1 Main Server fly.toml

Create `apps/server/fly.toml`:

```toml
# fly.toml - Main Server (API Backend)
app = 'ems-api'
primary_region = 'iad' # Change to your preferred region

[build]
  dockerfile = 'apps/server/Dockerfile'

[env]
  NODE_ENV = 'production'
  PORT = '5000'

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = false  # Keep at least 1 machine running
  auto_start_machines = true
  min_machines_running = 1    # Minimum for production availability
  processes = ['app']

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/health'

[[vm]]
  size = 'shared-cpu-1x'  # 1 shared CPU, 256MB RAM (upgrade for production)
  memory = '256mb'
  cpus = 1

# PostgreSQL connection (using Fly.io internal DNS)
[[services]]
  protocol = 'tcp'
  internal_port = 5000

  [[services.ports]]
    port = 80
    handlers = ['http']
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ['tls', 'http']

  [[services.tcp_checks]]
    interval = '15s'
    timeout = '2s'
    grace_period = '5s'

# Restart policy
[restart]
  policy = 'on-failure'
  max_retries = 3
```

Save this file at: `apps/server/fly.toml`

### 6.2 Pong Server fly.toml

Create `apps/pong-server/fly.toml`:

```toml
# fly.toml - Pong Server
app = 'ems-pong'
primary_region = 'iad' # Same region as main server for low latency

[build]
  dockerfile = 'apps/pong-server/Dockerfile'

[env]
  NODE_ENV = 'production'
  PONG_SERVER_PORT = '5001'

[http_service]
  internal_port = 5001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ['app']

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/health'

[[vm]]
  size = 'shared-cpu-1x'  # Upgrade for production load
  memory = '256mb'
  cpus = 1

[[services]]
  protocol = 'tcp'
  internal_port = 5001

  [[services.ports]]
    port = 80
    handlers = ['http']
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ['tls', 'http']

  [[services.tcp_checks]]
    interval = '15s'
    timeout = '2s'
    grace_period = '5s'

[restart]
  policy = 'on-failure'
  max_retries = 3
```

Save this file at: `apps/pong-server/fly.toml`

### 6.3 Public Site fly.toml

Create `apps/public-site/fly.toml`:

```toml
# fly.toml - Public Site (SSR)
app = 'ems-public'
primary_region = 'iad'

[build]
  dockerfile = 'apps/public-site/Dockerfile'

[env]
  NODE_ENV = 'production'
  PORT = '5173'

[http_service]
  internal_port = 5173
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ['app']

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/health'

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
  cpus = 1

[[services]]
  protocol = 'tcp'
  internal_port = 5173

  [[services.ports]]
    port = 80
    handlers = ['http']
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ['tls', 'http']

  [[services.tcp_checks]]
    interval = '15s'
    timeout = '2s'
    grace_period = '5s'

[restart]
  policy = 'on-failure'
  max_retries = 3
```

Save this file at: `apps/public-site/fly.toml`

### 6.4 Client App fly.toml

Create `apps/client/fly.toml`:

```toml
# fly.toml - Client App (SPA with Nginx)
app = 'ems-client'
primary_region = 'iad'

[build]
  dockerfile = 'apps/client/Dockerfile'

[env]
  NODE_ENV = 'production'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ['app']

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/'

[[vm]]
  size = 'shared-cpu-1x'
  memory = '256mb'
  cpus = 1

[[services]]
  protocol = 'tcp'
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ['http']
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ['tls', 'http']

  [[services.tcp_checks]]
    interval = '15s'
    timeout = '2s'
    grace_period = '5s'

[restart]
  policy = 'on-failure'
  max_retries = 3
```

Save this file at: `apps/client/fly.toml`

---

## Step 7: Deploy Main Server (API Backend)

**Deploy Order:** Main server FIRST (other apps depend on it).

### 7.1 Create Fly App

```bash
# From repository root
cd /Users/devin/Desktop/new-personal-site/elonmusksucks

# Create the Fly.io app (uses fly.toml config)
flyctl apps create ems-api --org elonmusksucks
```

### 7.2 Set Environment Secrets

```bash
# Set all required secrets for main server
flyctl secrets set \
  DATABASE_URL="postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable" \
  REDIS_URL="redis://:password@region.upstash.io:6379" \
  ACCESS_TOKEN_SECRET="your_production_access_secret_min_32_chars" \
  REFRESH_TOKEN_SECRET="your_production_refresh_secret_min_32_chars" \
  CLIENT_APP_URL="https://app.elonmusksucks.net" \
  BASE_URL_CLIENT="https://app.elonmusksucks.net" \
  BASE_URL_SERVER="https://api.elonmusksucks.net" \
  BASE_URL_PUBLIC="https://elonmusksucks.net" \
  API_BASE_URL="https://api.elonmusksucks.net" \
  TIGRIS_S3_ENDPOINT="https://fly.storage.tigris.dev" \
  TIGRIS_ACCESS_KEY_ID="tid_your_tigris_access_key" \
  TIGRIS_SECRET_ACCESS_KEY="tsec_your_tigris_secret_key" \
  TIGRIS_S3_BUCKET="ems-storage-xxxxx" \
  SENDGRID_API_KEY="SG.your_sendgrid_api_key" \
  FROM_EMAIL="noreply@elonmusksucks.net" \
  SKIP_EMAIL_FLOW="false" \
  BCRYPT_SALT_ROUNDS="12" \
  GAME_SERVER_SECRET="your_game_server_secret_min_32_chars" \
  -a ems-api

# Verify secrets are set
flyctl secrets list -a ems-api
```

**IMPORTANT:** Replace placeholder values with actual production values:
- Generate secure random secrets: `openssl rand -base64 32`
- Use actual Tigris bucket name from Step 4
- Use actual Redis URL from Step 3

### 7.3 Run Database Migrations

```bash
# Connect to Fly.io network to access internal Postgres
flyctl proxy 5432:5432 -a ems-db &

# In another terminal:
# Set DATABASE_URL for migrations
export DATABASE_URL="postgresql://postgres:<password>@localhost:5432/elonmusksucks"

# Run Prisma migrations
npm run prisma:migrate:deploy

# Generate Prisma client
npm run prisma:generate

# Seed achievements (77 achievements)
npm run seed:achievements

# Stop proxy
killall flyctl
```

### 7.4 Deploy Main Server

```bash
# Deploy from repository root
flyctl deploy --config apps/server/fly.toml --dockerfile apps/server/Dockerfile -a ems-api

# This will:
# 1. Build Docker image
# 2. Push to Fly.io registry
# 3. Deploy and start the app
# 4. Run health checks

# Watch deployment logs
flyctl logs -a ems-api

# Expected:
# ✅ Main Server running on port 5000
# ✅ Environment validation passed
# ✅ Database connected
# ✅ Redis connected
# ✅ Tigris connected
```

### 7.5 Start BullMQ Workers

**Fly.io doesn't support long-running background workers in the same container. We'll deploy workers as a separate machine.**

Create `apps/server/fly.worker.toml`:

```toml
# fly.worker.toml - BullMQ Workers
app = 'ems-workers'
primary_region = 'iad'

[build]
  dockerfile = 'apps/server/Dockerfile.worker'

[env]
  NODE_ENV = 'production'

[[services]]
  # No HTTP service - workers only

[[vm]]
  size = 'shared-cpu-1x'
  memory = '512mb'  # Workers need more memory
  cpus = 1

[restart]
  policy = 'always'  # Always restart workers
```

Create `apps/server/Dockerfile.worker`:

```dockerfile
# Dockerfile for BullMQ workers
FROM node:24-alpine AS base

# (Same deps and builder stages as apps/server/Dockerfile)
# ... copy from main Dockerfile ...

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 workeruser

COPY --from=builder --chown=workeruser:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=workeruser:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=workeruser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=workeruser:nodejs /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder --chown=workeruser:nodejs /app/prisma ./prisma

USER workeruser

# Run all workers
CMD ["node", "apps/server/dist/src/worker.js"]
```

Deploy workers:

```bash
# Create worker app
flyctl apps create ems-workers --org elonmusksucks

# Set same secrets as main server
flyctl secrets set \
  DATABASE_URL="..." \
  REDIS_URL="..." \
  (copy all secrets from step 7.2) \
  -a ems-workers

# Deploy workers
flyctl deploy --config apps/server/fly.worker.toml --dockerfile apps/server/Dockerfile.worker -a ems-workers
```

### 7.6 Verify Main Server

```bash
# Check app status
flyctl status -a ems-api

# Test health endpoint
curl https://ems-api.fly.dev/health

# Expected: {"status":"ok","timestamp":"2025-10-11T..."}

# Check logs for errors
flyctl logs -a ems-api

# Open dashboard
flyctl dashboard -a ems-api
```

---

## Step 8: Deploy Pong Server

### 8.1 Create Fly App

```bash
flyctl apps create ems-pong --org elonmusksucks
```

### 8.2 Set Environment Secrets

```bash
flyctl secrets set \
  DATABASE_URL="postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable" \
  REDIS_URL="redis://:password@region.upstash.io:6379" \
  GAME_SERVER_SECRET="your_game_server_secret_min_32_chars" \
  ACCESS_TOKEN_SECRET="your_production_access_secret_min_32_chars" \
  REFRESH_TOKEN_SECRET="your_production_refresh_secret_min_32_chars" \
  BASE_URL_CLIENT="https://app.elonmusksucks.net" \
  -a ems-pong
```

**IMPORTANT:** `GAME_SERVER_SECRET` must match the main server's secret!

### 8.3 Deploy Pong Server

```bash
flyctl deploy --config apps/pong-server/fly.toml --dockerfile apps/pong-server/Dockerfile -a ems-pong

# Watch logs
flyctl logs -a ems-pong
```

### 8.4 Verify Pong Server

```bash
flyctl status -a ems-pong

curl https://ems-pong.fly.dev/health
```

---

## Step 9: Deploy Public Site (SSR)

### 9.1 Create Fly App

```bash
flyctl apps create ems-public --org elonmusksucks
```

### 9.2 Set Environment Secrets

```bash
flyctl secrets set \
  VITE_API_BASE_URL="https://api.elonmusksucks.net" \
  VITE_CLIENT_APP_URL="https://app.elonmusksucks.net" \
  -a ems-public
```

### 9.3 Deploy Public Site

```bash
flyctl deploy --config apps/public-site/fly.toml --dockerfile apps/public-site/Dockerfile -a ems-public

# Watch logs
flyctl logs -a ems-public
```

### 9.4 Verify Public Site

```bash
flyctl status -a ems-public

curl https://ems-public.fly.dev
# Should return full HTML with SSR content
```

---

## Step 10: Deploy Client App (SPA)

### 10.1 Create Production Environment File

Create `apps/client/.env.production`:

```bash
# Client app environment variables (embedded at build time)
VITE_API_BASE_URL=https://api.elonmusksucks.net
VITE_SOCKET_URL=https://api.elonmusksucks.net
VITE_PUBLIC_SITE_URL=https://elonmusksucks.net

# Feature flags (optional)
VITE_FEATURE_PONG_BETA=false
VITE_FEATURE_ENHANCED_CHAT=false
VITE_FEATURE_ADVANCED_ANALYTICS=false
VITE_FEATURE_EXPERIMENTAL_UI=false
```

**IMPORTANT:** These variables are embedded during build, not runtime!

### 10.2 Create Fly App

```bash
flyctl apps create ems-client --org elonmusksucks
```

### 10.3 Deploy Client App

```bash
# Deploy (environment variables are read from .env.production during build)
flyctl deploy --config apps/client/fly.toml --dockerfile apps/client/Dockerfile -a ems-client

# Watch logs
flyctl logs -a ems-client
```

### 10.4 Verify Client App

```bash
flyctl status -a ems-client

curl -I https://ems-client.fly.dev
# Should return HTML with security headers
```

---

## Step 11: Custom Domains & SSL

Fly.io automatically provides SSL certificates via Let's Encrypt.

### 11.1 Add Custom Domains

```bash
# Main Server (API)
flyctl certs create api.elonmusksucks.net -a ems-api

# Pong Server
flyctl certs create pong.elonmusksucks.net -a ems-pong

# Public Site
flyctl certs create elonmusksucks.net -a ems-public

# Client App
flyctl certs create app.elonmusksucks.net -a ems-client
```

### 11.2 Get DNS Configuration

```bash
# For each domain, get the DNS settings
flyctl certs show api.elonmusksucks.net -a ems-api

# Output will show:
# - CNAME: api.elonmusksucks.net -> ems-api.fly.dev
# OR
# - A record: api.elonmusksucks.net -> <fly.io IP>
```

### 11.3 Configure DNS Records

Go to your domain registrar (e.g., Cloudflare, Namecheap) and add:

```
# A records (if provided)
api.elonmusksucks.net    A    <fly.io IP>
pong.elonmusksucks.net   A    <fly.io IP>
elonmusksucks.net        A    <fly.io IP>
app.elonmusksucks.net    A    <fly.io IP>

# OR CNAME records
api.elonmusksucks.net    CNAME    ems-api.fly.dev
pong.elonmusksucks.net   CNAME    ems-pong.fly.dev
elonmusksucks.net        CNAME    ems-public.fly.dev
app.elonmusksucks.net    CNAME    ems-client.fly.dev
```

### 11.4 Verify SSL Certificates

```bash
# Wait 2-5 minutes for DNS propagation, then:
curl -I https://api.elonmusksucks.net
curl -I https://pong.elonmusksucks.net
curl -I https://elonmusksucks.net
curl -I https://app.elonmusksucks.net

# All should return 200 OK with SSL
```

### 11.5 Update Application URLs

Now update all secrets to use custom domains:

```bash
# Update main server secrets
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

# Client app: Redeploy with updated .env.production
# (Edit apps/client/.env.production with new URLs, then redeploy)
flyctl deploy -a ems-client
```

---

## Step 12: Scaling & Monitoring

### 12.1 Scale Applications

**Scale VM size:**

```bash
# Upgrade main server to 1GB RAM (production recommended)
flyctl scale vm performance-1x -a ems-api

# Upgrade pong server (handles real-time game logic)
flyctl scale vm performance-1x -a ems-pong
```

**Scale VM count (horizontal scaling):**

```bash
# Add more machines for high availability
flyctl scale count 2 -a ems-api    # 2 machines in primary region
flyctl scale count 2 -a ems-pong   # 2 pong servers
```

**Auto-scaling:**

Edit `fly.toml` to enable auto-scaling:

```toml
[http_service]
  auto_start_machines = true
  auto_stop_machines = true
  min_machines_running = 1
  max_machines_running = 3  # Scale up to 3 machines under load
```

### 12.2 Set Up Monitoring

**Fly.io Metrics (Built-in):**

```bash
# Open Fly.io dashboard
flyctl dashboard -a ems-api

# View metrics:
# - CPU usage
# - Memory usage
# - Request rate
# - Response time
```

**External Monitoring (Recommended):**

1. **Uptime Monitoring:**
   - Use UptimeRobot or Pingdom
   - Monitor: `/health` endpoints every 5 minutes

2. **Error Tracking:**
   - Install Sentry in each app
   - Set `SENTRY_DSN` secret for each app

3. **Log Aggregation:**
   - Use Fly.io built-in logging
   - Or forward to external service (Datadog, Logtail)

**View Logs:**

```bash
# Real-time logs
flyctl logs -a ems-api

# Filter by level
flyctl logs -a ems-api | grep ERROR

# Export logs (last 1000 lines)
flyctl logs -a ems-api --output json > logs.json
```

### 12.3 Set Up Alerts

**Fly.io doesn't have built-in alerting. Use external tools:**

```bash
# Option 1: UptimeRobot
# - Add monitors for each /health endpoint
# - Configure email/SMS alerts

# Option 2: Sentry (for errors)
# - Install @sentry/node in each app
# - Configure error alerts

# Option 3: Custom health check script
# - Run cron job that checks endpoints
# - Send alerts via email/Slack on failure
```

---

## Step 13: Backup & Disaster Recovery

### 13.1 Database Backups

Fly Postgres has automatic backups:

```bash
# List backups
flyctl pg backups list -a ems-db

# Create manual backup
flyctl pg backup create -a ems-db
```

### 13.2 Restore from Backup

```bash
# Restore from backup (CAUTION: This replaces current data)
flyctl pg restore <backup-id> -a ems-db
```

### 13.3 Clone Production Database

```bash
# For testing migrations, clone production to staging
flyctl pg create-clone --name ems-db-staging --source ems-db

# Test migrations on staging first
export DATABASE_URL="postgresql://postgres:<password>@ems-db-staging.internal:5432/elonmusksucks"
npm run prisma:migrate:deploy
```

---

## Troubleshooting

### Issue 1: App Won't Start

**Symptoms:** App status shows "crashed" or "failed"

**Diagnosis:**
```bash
# Check logs
flyctl logs -a ems-api

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Redis connection failure
```

**Solution:**
```bash
# Verify all secrets are set
flyctl secrets list -a ems-api

# Test database connection
flyctl proxy 5432:5432 -a ems-db
psql "postgresql://postgres:<password>@localhost:5432/elonmusksucks"

# Test Redis connection
redis-cli -u "$REDIS_URL" PING
```

### Issue 2: Database Connection Timeouts

**Symptoms:** "ECONNREFUSED" or "Connection timed out" errors

**Solution:**
```bash
# Fly.io apps must be in the same organization to use internal DNS
flyctl apps list

# Check DATABASE_URL uses internal DNS (ems-db.internal)
flyctl secrets list -a ems-api | grep DATABASE_URL

# If using external hostname, change to internal:
flyctl secrets set DATABASE_URL="postgresql://postgres:<password>@ems-db.internal:5432/elonmusksucks?sslmode=disable" -a ems-api
```

### Issue 3: CORS Errors

**Symptoms:** Browser console shows CORS errors

**Solution:**
```bash
# Verify all app URLs are set correctly
flyctl secrets list -a ems-api

# Ensure CLIENT_APP_URL and BASE_URL_PUBLIC are set
# These control CORS allowed origins

# Restart app after updating
flyctl apps restart ems-api
```

### Issue 4: Out of Memory (OOM)

**Symptoms:** App crashes with "Killed" or "OOMKilled" in logs

**Solution:**
```bash
# Check memory usage
flyctl dashboard -a ems-api

# Upgrade VM size
flyctl scale vm performance-1x -a ems-api  # 2GB RAM

# Or performance-2x for 4GB RAM
flyctl scale vm performance-2x -a ems-api
```

### Issue 5: Slow API Responses

**Symptoms:** High response times (>500ms)

**Diagnosis:**
```bash
# Check metrics
flyctl dashboard -a ems-api

# Common causes:
# - Database query performance
# - Not enough VMs (single VM overloaded)
# - Redis latency (wrong region)
```

**Solution:**
```bash
# Add more VMs for load distribution
flyctl scale count 2 -a ems-api

# Optimize database queries (check slow query log)
# Ensure Redis is in same region as apps
```

### Issue 6: Client App Not Loading

**Symptoms:** Blank page or "Failed to load module" errors

**Solution:**
```bash
# Check if environment variables were embedded during build
# Rebuild client app with correct .env.production

# Verify nginx config
flyctl ssh console -a ems-client
cat /etc/nginx/conf.d/default.conf

# Check logs
flyctl logs -a ems-client
```

---

## Cost Estimates

**Fly.io Pricing (as of 2025):**

### Free Tier (Hobby Plan)
- **3 shared-cpu-1x VMs** (256MB RAM each)
- **3GB storage** (Postgres)
- **160GB bandwidth**
- **Upstash Redis:** 10K commands/day free

### Monthly Costs (Production Setup)

| Resource | Configuration | Cost/Month |
|----------|---------------|------------|
| **Main Server** | 1x performance-1x (2GB) | $10 |
| **Pong Server** | 1x performance-1x (2GB) | $10 |
| **Public Site** | 1x shared-cpu-1x (256MB) | FREE |
| **Client App** | 1x shared-cpu-1x (256MB) | FREE |
| **Workers** | 1x shared-cpu-1x (512MB) | FREE |
| **Postgres** | performance-1x (2GB) + 10GB | $15 |
| **Upstash Redis** | Pay-as-you-go | $10-20 |
| **Tigris Storage** | 10GB + bandwidth | $5 |
| **Bandwidth** | 200GB+ | $5 |
| **Total** | | **~$55-65/month** |

### High Availability (2x VMs)

| Resource | Configuration | Cost/Month |
|----------|---------------|------------|
| **Main Server** | 2x performance-1x (2GB) | $20 |
| **Pong Server** | 2x performance-1x (2GB) | $20 |
| **Public Site** | 2x shared-cpu-1x (256MB) | $4 |
| **Client App** | 2x shared-cpu-1x (256MB) | $4 |
| **Postgres** | HA (3 nodes) + 20GB | $45 |
| **Upstash Redis** | Pay-as-you-go | $20-30 |
| **Tigris Storage** | 50GB + bandwidth | $15 |
| **Bandwidth** | 500GB+ | $15 |
| **Total** | | **~$140-180/month** |

**Cost Optimization Tips:**
- Start with free tier VMs, upgrade as needed
- Use auto-stop machines for low-traffic apps
- Monitor usage via `flyctl dashboard`
- Consider Fly.io Postgres alternatives (Supabase, Neon) for lower cost

---

## Post-Deployment Checklist

- [ ] All 4 applications deployed and running
- [ ] Health checks passing for all apps
- [ ] Database migrations applied
- [ ] Achievements seeded (77 achievements)
- [ ] All environment secrets set correctly
- [ ] Custom domains configured with SSL
- [ ] DNS records propagated (2-5 minutes)
- [ ] CORS working (test from client app)
- [ ] Authentication working (login/register)
- [ ] Betting flow working
- [ ] Pong game working
- [ ] Timeline/feed working
- [ ] Real-time events working (Socket.IO)
- [ ] BullMQ workers processing jobs
- [ ] Monitoring configured (UptimeRobot, Sentry)
- [ ] Backup strategy in place
- [ ] Team has access to Fly.io dashboard

---

## Useful Fly.io Commands

```bash
# List all apps
flyctl apps list

# Check app status
flyctl status -a ems-api

# View logs (real-time)
flyctl logs -a ems-api

# Restart app
flyctl apps restart ems-api

# SSH into app
flyctl ssh console -a ems-api

# Check secrets
flyctl secrets list -a ems-api

# Set secret
flyctl secrets set KEY=value -a ems-api

# Remove secret
flyctl secrets unset KEY -a ems-api

# Scale VM
flyctl scale vm performance-1x -a ems-api

# Scale count
flyctl scale count 2 -a ems-api

# Open dashboard
flyctl dashboard -a ems-api

# Check database
flyctl pg status -a ems-db
flyctl pg connect -a ems-db

# View metrics
flyctl metrics -a ems-api

# Deploy new version
flyctl deploy -a ems-api

# Rollback to previous version
flyctl releases -a ems-api
flyctl rollback <version> -a ems-api
```

---

## Next Steps

1. **Monitor for 24-48 hours** - Watch logs and metrics
2. **Test all features** - Run through user journey
3. **Set up CI/CD** - Automate deployments (GitHub Actions + Fly.io)
4. **Configure backups** - Automate database backups
5. **Performance testing** - Use artillery/k6 for load testing
6. **SEO optimization** - Submit sitemap, configure meta tags
7. **Analytics** - Add Google Analytics or Plausible

---

## Support & Resources

- **Fly.io Docs:** https://fly.io/docs/
- **Fly.io Community:** https://community.fly.io/
- **Fly.io Status:** https://status.fly.io/
- **Upstash Docs:** https://docs.upstash.com/
- **Tigris Docs:** https://www.tigrisdata.com/docs/

**Questions?** Review the following documents:
- `docs/MASTER_DEPLOYMENT_CHECKLIST.md` - General deployment guide
- `docs/SECURITY_FIXES_IMPLEMENTED.md` - Main server security
- `docs/PONG_SERVER_SECURITY_FIXES_IMPLEMENTED.md` - Pong server security
- `docs/PUBLIC_SITE_SECURITY_FIXES_IMPLEMENTED.md` - Public site security
- `docs/CLIENT_SECURITY_FIXES_IMPLEMENTED.md` - Client app security

---

**🎉 Congratulations! Your elonmusksucks.net application is now deployed to production on Fly.io!**
