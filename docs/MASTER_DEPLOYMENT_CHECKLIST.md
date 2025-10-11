# Master Production Deployment Checklist

**Version:** 1.0.0
**Last Updated:** 2025-10-11
**Status:** Ready for Production Deployment

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Requirements](#pre-deployment-requirements)
3. [Application 1: Main Server (API Backend)](#application-1-main-server-api-backend)
4. [Application 2: Pong Server](#application-2-pong-server)
5. [Application 3: Public Site (SSR)](#application-3-public-site-ssr)
6. [Application 4: Client App (SPA)](#application-4-client-app-spa)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Rollback Procedures](#rollback-procedures)
10. [Emergency Procedures](#emergency-procedures)

---

## Overview

**elonmusksucks.net** is a full-stack TypeScript prediction market platform with a **quad-application architecture**:

| Application | Type | Port | Purpose | Status |
|-------------|------|------|---------|--------|
| **Main Server** | Express API | 5000 | REST API + Socket.IO hub | ✅ Production Ready |
| **Pong Server** | Game Server | 5001 | Real-time Pong game | ✅ Production Ready |
| **Public Site** | SSR (Express 5 + Vite 7) | 5173 | Marketing/SEO | ✅ Production Ready |
| **Client App** | React SPA (Vite 7) | 3000 | Authenticated users | ✅ Production Ready |

**Key Technologies:**
- **Runtime:** Node.js ≥24.0.0
- **Frontend:** React 19.1.0 + Vite 7.1.9 + TypeScript 5.8.3 + TailwindCSS 4
- **Backend:** Express 5.1.0 + Prisma 6.11 + PostgreSQL 15
- **Real-time:** Socket.IO + Redis (IORedis) pub/sub
- **Jobs:** BullMQ workers for async processing
- **Storage:** Tigris S3-compatible object storage

**Security Audits Completed:**
- ✅ Main Server Security Audit (3 CRITICAL, 4 HIGH, 5 MEDIUM - ALL FIXED)
- ✅ Pong Server Security Audit (2 CRITICAL, 3 HIGH, 3 MEDIUM - ALL FIXED)
- ✅ Public Site Security Audit (3 CRITICAL, 3 HIGH, 3 MEDIUM - ALL FIXED)
- ✅ Client App Security Audit (4 CRITICAL, 3 HIGH, 4 MEDIUM - ALL FIXED)

**Total Security Issues Resolved:** 40 issues across all applications

---

## Pre-Deployment Requirements

### 1. Infrastructure Requirements

- [ ] **PostgreSQL 15+** database provisioned and accessible
- [ ] **Redis 7+** instance provisioned and accessible
- [ ] **Tigris S3** bucket created and configured
- [ ] **SendGrid** account (or email service) configured
- [ ] **Domain names** configured:
  - [ ] `api.elonmusksucks.net` → Main Server (port 5000)
  - [ ] `pong.elonmusksucks.net` → Pong Server (port 5001)
  - [ ] `elonmusksucks.net` → Public Site (port 5173)
  - [ ] `app.elonmusksucks.net` → Client App (port 3000)
- [ ] **SSL certificates** provisioned for all domains (Let's Encrypt recommended)
- [ ] **Reverse proxy** configured (Nginx/Caddy/Traefik)
- [ ] **Firewall rules** configured:
  - [ ] Allow port 443 (HTTPS)
  - [ ] Allow port 80 (HTTP redirect to HTTPS)
  - [ ] Block direct access to ports 3000, 5000, 5001, 5173

### 2. Database Setup

```bash
# Run all migrations
npm run prisma:migrate:deploy

# Generate Prisma client
npm run prisma:generate

# Seed achievements (77 achievements)
npm run seed:achievements

# (Optional) Seed development data
npm run seed:dev
```

- [ ] Migrations applied successfully
- [ ] Prisma client generated
- [ ] Achievements seeded (77 achievements)
- [ ] Database connection verified

### 3. Repository Setup

```bash
# Clone repository
git clone https://github.com/yourusername/elonmusksucks.git
cd elonmusksucks

# Checkout production branch
git checkout master

# Install dependencies
npm install

# Verify Node.js version (must be ≥24.0.0)
node --version
```

- [ ] Repository cloned
- [ ] On correct branch (master/main)
- [ ] Dependencies installed
- [ ] Node.js version ≥24.0.0 verified

### 4. Environment Variables Setup

Create a `.env` file in the project root with ALL required variables (see individual application sections below for complete lists).

**CRITICAL:** Never commit `.env` files to version control!

```bash
# Copy example and fill in values
cp .env.example .env
nano .env  # or vim, code, etc.
```

### 5. Pre-Deployment Testing

```bash
# Type checking (all apps)
npm -w apps/server run tsc -- --noEmit
npm -w apps/pong-server run tsc -- --noEmit
npm -w apps/public-site run tsc -- --noEmit
npm -w apps/client run tsc -- --noEmit

# Run tests
npm test
npm run test:server

# Lint all code
npm run lint
```

- [ ] All TypeScript compilation passes
- [ ] All tests pass
- [ ] Linting passes (zero warnings)

---

## Application 1: Main Server (API Backend)

**Port:** 5000
**Type:** Express 5 REST API + Socket.IO Hub
**Security Audit:** `docs/SECURITY_FIXES_IMPLEMENTED.md`

### 1.1 Environment Variables

**Location:** Root `.env` file

**REQUIRED Variables:**

```bash
# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@host:5432/elonmusksucks?schema=public&sslmode=require"

# ═══════════════════════════════════════════════════════════════
# REDIS (REQUIRED - No Fallback)
# ═══════════════════════════════════════════════════════════════
REDIS_URL="redis://default:password@host:6379"

# ═══════════════════════════════════════════════════════════════
# JWT SECRETS (MUST be 32+ characters, cryptographically random)
# ═══════════════════════════════════════════════════════════════
ACCESS_TOKEN_SECRET="your_secure_access_token_secret_min_32_chars_production"
REFRESH_TOKEN_SECRET="your_secure_refresh_token_secret_min_32_chars_production"

# ═══════════════════════════════════════════════════════════════
# APPLICATION URLs (NO TRAILING SLASHES)
# ═══════════════════════════════════════════════════════════════
CLIENT_APP_URL="https://app.elonmusksucks.net"
BASE_URL_CLIENT="https://app.elonmusksucks.net"
BASE_URL_SERVER="https://api.elonmusksucks.net"
BASE_URL_PUBLIC="https://elonmusksucks.net"
API_BASE_URL="https://api.elonmusksucks.net"

# ═══════════════════════════════════════════════════════════════
# TIGRIS S3 STORAGE (REQUIRED)
# ═══════════════════════════════════════════════════════════════
TIGRIS_S3_ENDPOINT="https://fly.storage.tigris.dev"
TIGRIS_ACCESS_KEY_ID="tid_your_production_access_key"
TIGRIS_SECRET_ACCESS_KEY="tsec_your_production_secret_key"
TIGRIS_S3_BUCKET="elonmusksucks-production"

# ═══════════════════════════════════════════════════════════════
# EMAIL (REQUIRED if SKIP_EMAIL_FLOW=false)
# ═══════════════════════════════════════════════════════════════
SENDGRID_API_KEY="SG.your_production_sendgrid_api_key"
FROM_EMAIL="noreply@elonmusksucks.net"

# ═══════════════════════════════════════════════════════════════
# OPTIONAL CONFIGURATION
# ═══════════════════════════════════════════════════════════════
SKIP_EMAIL_FLOW="false"  # Set to true to skip email verification (NOT RECOMMENDED IN PRODUCTION)
BCRYPT_SALT_ROUNDS="12"  # 10-14 recommended for production
NODE_ENV="production"
PORT="5000"

# ═══════════════════════════════════════════════════════════════
# GAME SERVER SECRET (for pong-server communication)
# ═══════════════════════════════════════════════════════════════
GAME_SERVER_SECRET="your_secure_game_server_secret_production_min_32_chars"
```

**CRITICAL VALIDATIONS:**

- [ ] `DATABASE_URL` is a valid PostgreSQL connection string with SSL enabled
- [ ] `REDIS_URL` is a valid Redis connection string (NO fallback to localhost allowed)
- [ ] `ACCESS_TOKEN_SECRET` is ≥32 characters, cryptographically random
- [ ] `REFRESH_TOKEN_SECRET` is ≥32 characters, cryptographically random, DIFFERENT from access secret
- [ ] All URLs use HTTPS (not HTTP) in production
- [ ] `TIGRIS_S3_BUCKET` exists and is accessible
- [ ] `SENDGRID_API_KEY` is valid and has send permissions
- [ ] `GAME_SERVER_SECRET` is ≥32 characters, shared with pong-server
- [ ] `SKIP_EMAIL_FLOW` is set to `"false"` (email verification enabled)
- [ ] `BCRYPT_SALT_ROUNDS` is 10-14 (12 recommended)

### 1.2 Build & Deploy

```bash
# Build the server
npm -w apps/server run build

# Verify build output
ls -la apps/server/dist/
# Should see: server.js and other compiled files
```

- [ ] Build completed successfully
- [ ] `apps/server/dist/` directory exists and contains compiled JavaScript

### 1.3 Start Production Server

```bash
# Start server (use process manager in production)
cd apps/server
NODE_ENV=production node dist/server.js

# OR with PM2 (recommended)
pm2 start dist/server.js --name "ems-api" --env production

# OR with systemd (recommended for VPS)
sudo systemctl start elonmusksucks-api.service
```

- [ ] Server starts without errors
- [ ] Listens on port 5000
- [ ] Environment validation passes (no missing required variables)
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Tigris S3 connection successful

### 1.4 Start BullMQ Workers

**CRITICAL:** Workers must be running for bet payouts, leaderboard updates, and feed processing.

```bash
# Start all workers
npm -w apps/server run worker

# OR with PM2 (recommended)
pm2 start dist/workers/payout.worker.js --name "ems-worker-payout"
pm2 start dist/workers/pong-payout.worker.js --name "ems-worker-pong-payout"
pm2 start dist/workers/leaderboard.worker.js --name "ems-worker-leaderboard"
pm2 start dist/workers/leaderboard-snapshot.worker.js --name "ems-worker-leaderboard-snapshot"
pm2 start dist/workers/feed.worker.js --name "ems-worker-feed"
pm2 start dist/workers/article.worker.js --name "ems-worker-article"
```

- [ ] All 6 workers started successfully:
  - [ ] `payout.worker` - Processes bet resolution payouts
  - [ ] `pong-payout.worker` - Processes pong game payouts
  - [ ] `leaderboard.worker` - Recalculates user rankings
  - [ ] `leaderboard-snapshot.worker` - Daily leaderboard snapshots
  - [ ] `feed.worker` - RSS/Atom content fetching
  - [ ] `article.worker` - Article processing & deduplication
- [ ] Workers connected to Redis successfully
- [ ] Workers connected to database successfully

### 1.5 Security Verification

**Test these security features:**

```bash
# 1. Environment validation (should throw error with missing vars)
unset REDIS_URL
npm -w apps/server run build && node apps/server/dist/server.js
# Expected: Error message listing missing REDIS_URL

# 2. Verify no hardcoded localhost fallbacks
rg -n "localhost" apps/server/src/ --hidden -g '!**/node_modules/**'
# Expected: No results (all localhost references removed)

# 3. Verify JWT secrets are not default values
grep -r "changeme" .env
# Expected: No results

# 4. Check CORS configuration
curl -H "Origin: https://malicious.com" https://api.elonmusksucks.net/health
# Expected: CORS error (origin not allowed)
```

- [ ] Environment validation enforced (no fallbacks)
- [ ] No hardcoded localhost references
- [ ] JWT secrets are production-ready (not defaults)
- [ ] CORS only allows configured origins
- [ ] Rate limiting enabled (100 req/15min per IP)
- [ ] Helmet security headers applied
- [ ] Socket.IO authentication enforced

**Security Headers Verification:**

```bash
curl -I https://api.elonmusksucks.net/health
```

Expected headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 0
```

- [ ] All security headers present

---

## Application 2: Pong Server

**Port:** 5001
**Type:** Dedicated Socket.IO Game Server
**Security Audit:** `docs/PONG_SERVER_SECURITY_FIXES_IMPLEMENTED.md`

### 2.1 Environment Variables

**Location:** Root `.env` file

**REQUIRED Variables:**

```bash
# ═══════════════════════════════════════════════════════════════
# DATABASE (Same as main server)
# ═══════════════════════════════════════════════════════════════
DATABASE_URL="postgresql://user:password@host:5432/elonmusksucks?schema=public&sslmode=require"

# ═══════════════════════════════════════════════════════════════
# REDIS (Same as main server)
# ═══════════════════════════════════════════════════════════════
REDIS_URL="redis://default:password@host:6379"

# ═══════════════════════════════════════════════════════════════
# GAME SERVER SECRET (Must match main server)
# ═══════════════════════════════════════════════════════════════
GAME_SERVER_SECRET="your_secure_game_server_secret_production_min_32_chars"

# ═══════════════════════════════════════════════════════════════
# PONG SERVER CONFIGURATION
# ═══════════════════════════════════════════════════════════════
PONG_SERVER_PORT="5001"
BASE_URL_CLIENT="https://app.elonmusksucks.net"  # For CORS

# ═══════════════════════════════════════════════════════════════
# JWT SECRETS (Same as main server - required for token validation)
# ═══════════════════════════════════════════════════════════════
ACCESS_TOKEN_SECRET="your_secure_access_token_secret_min_32_chars_production"
REFRESH_TOKEN_SECRET="your_secure_refresh_token_secret_min_32_chars_production"
```

**CRITICAL VALIDATIONS:**

- [ ] `DATABASE_URL` matches main server configuration
- [ ] `REDIS_URL` matches main server configuration
- [ ] `GAME_SERVER_SECRET` matches main server AND is ≥32 characters
- [ ] `ACCESS_TOKEN_SECRET` matches main server (required for JWT validation)
- [ ] `REFRESH_TOKEN_SECRET` matches main server
- [ ] `BASE_URL_CLIENT` uses HTTPS in production

### 2.2 Build & Deploy

```bash
# Build the pong server
npm -w apps/pong-server run build

# Verify build output
ls -la apps/pong-server/dist/
# Should see: server.js and other compiled files
```

- [ ] Build completed successfully
- [ ] `apps/pong-server/dist/` directory exists and contains compiled JavaScript

### 2.3 Start Production Server

```bash
# Start pong server (use process manager in production)
cd apps/pong-server
NODE_ENV=production node dist/server.js

# OR with PM2 (recommended)
pm2 start dist/server.js --name "ems-pong" --env production

# OR with systemd
sudo systemctl start elonmusksucks-pong.service
```

- [ ] Pong server starts without errors
- [ ] Listens on port 5001
- [ ] Environment validation passes
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Socket.IO server initialized

### 2.4 Security Verification

```bash
# 1. Verify game server secret is enforced
curl -X POST https://pong.elonmusksucks.net/api/game/result \
  -H "Content-Type: application/json" \
  -d '{"secret":"wrong-secret","winner":"player1"}'
# Expected: 403 Forbidden

# 2. Verify authentication is required for Socket.IO
# Try connecting without auth token
wscat -c "wss://pong.elonmusksucks.net"
# Expected: Connection rejected

# 3. Verify no hardcoded secrets
rg -n "changeme|localhost" apps/pong-server/src/ --hidden -g '!**/node_modules/**'
# Expected: No results
```

- [ ] Game server secret validation enforced
- [ ] Socket.IO authentication required
- [ ] No hardcoded secrets or localhost references
- [ ] CORS only allows configured client origin
- [ ] Rate limiting enabled
- [ ] Helmet security headers applied

---

## Application 3: Public Site (SSR)

**Port:** 5173
**Type:** Server-Side Rendered Marketing Site (Express 5 + Vite 7)
**Security Audit:** `docs/PUBLIC_SITE_SECURITY_FIXES_IMPLEMENTED.md`

### 3.1 Environment Variables

**Location:** `apps/public-site/.env.production`

**REQUIRED Variables:**

```bash
# ═══════════════════════════════════════════════════════════════
# API CONFIGURATION
# ═══════════════════════════════════════════════════════════════
VITE_API_BASE_URL="https://api.elonmusksucks.net"
VITE_CLIENT_APP_URL="https://app.elonmusksucks.net"

# ═══════════════════════════════════════════════════════════════
# PUBLIC SITE CONFIGURATION
# ═══════════════════════════════════════════════════════════════
PORT="5173"
NODE_ENV="production"
```

**CRITICAL VALIDATIONS:**

- [ ] `VITE_API_BASE_URL` uses HTTPS and points to production API
- [ ] `VITE_CLIENT_APP_URL` uses HTTPS and points to production client app
- [ ] Both URLs have NO trailing slashes

### 3.2 Build & Deploy

```bash
# Build the public site (SSR + client bundles)
npm -w apps/public-site run build

# Verify build output
ls -la apps/public-site/dist/
# Should see:
# - dist/server/ (SSR bundle)
# - dist/client/ (client-side bundle)
```

- [ ] SSR bundle built successfully (`dist/server/`)
- [ ] Client bundle built successfully (`dist/client/`)
- [ ] No source maps in production build (`.map` files)
- [ ] Console statements removed from production build

### 3.3 Start Production Server

```bash
# Start SSR server
cd apps/public-site
NODE_ENV=production tsx server.ts

# OR with PM2 (recommended)
pm2 start server.ts --name "ems-public" --interpreter tsx --env production

# OR compile and run with node
npm run build
node dist/server/server.js
```

- [ ] Server starts without errors
- [ ] Listens on port 5173
- [ ] SSR rendering works (check HTML source, should have content)
- [ ] Static assets served correctly
- [ ] Theme system works (no flash on page load)

### 3.4 Security Verification

**Test these security features:**

```bash
# 1. Verify security headers
curl -I https://elonmusksucks.net
```

Expected headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
X-DNS-Prefetch-Control: off
```

- [ ] All Helmet security headers present

```bash
# 2. Verify no source maps exposed
curl -I https://elonmusksucks.net/assets/index-abc123.js.map
# Expected: 404 Not Found

# 3. Verify console statements removed
curl https://elonmusksucks.net/assets/index-abc123.js | grep -i "console\."
# Expected: No results (console statements stripped)

# 4. Verify rate limiting
for i in {1..120}; do curl -s -o /dev/null -w "%{http_code}\n" https://elonmusksucks.net/api/predictions; done
# Expected: First 100 requests return 200, subsequent return 429 (Too Many Requests)

# 5. Verify CORS restrictions
curl -H "Origin: https://malicious.com" https://elonmusksucks.net/api/predictions
# Expected: CORS error or no Access-Control-Allow-Origin header
```

- [ ] Security headers present
- [ ] No source maps exposed
- [ ] Console statements removed
- [ ] Rate limiting enforced (100 req/15min per IP)
- [ ] CORS configured correctly

### 3.5 SSR-Specific Verification

```bash
# 1. Verify SSR rendering (page should have full HTML, not empty root div)
curl https://elonmusksucks.net | grep -A 50 "<div id=\"root\">"
# Expected: HTML content inside root div (not empty)

# 2. Verify theme hydration (no flash)
# Open browser DevTools, disable JavaScript, reload page
# Expected: Page still renders with correct theme (dark by default)

# 3. Verify SEO meta tags
curl https://elonmusksucks.net | grep -i "<meta"
# Expected: Multiple meta tags (title, description, og:image, etc.)
```

- [ ] SSR rendering works (HTML in initial response)
- [ ] Theme applies before hydration (no flash)
- [ ] SEO meta tags present in HTML

---

## Application 4: Client App (SPA)

**Port:** 3000
**Type:** React Single-Page Application (Vite 7)
**Security Audit:** `docs/CLIENT_SECURITY_FIXES_IMPLEMENTED.md`

### 4.1 Environment Variables

**Location:** `apps/client/.env.production`

**REQUIRED Variables:**

```bash
# ═══════════════════════════════════════════════════════════════
# API CONFIGURATION
# ═══════════════════════════════════════════════════════════════
# IMPORTANT: In production, these MUST be full URLs (not empty strings)
VITE_API_BASE_URL="https://api.elonmusksucks.net"
VITE_SOCKET_URL="https://api.elonmusksucks.net"
VITE_PUBLIC_SITE_URL="https://elonmusksucks.net"

# ═══════════════════════════════════════════════════════════════
# FEATURE FLAGS (Optional)
# ═══════════════════════════════════════════════════════════════
VITE_FEATURE_PONG_BETA="false"
VITE_FEATURE_ENHANCED_CHAT="false"
VITE_FEATURE_ADVANCED_ANALYTICS="false"
VITE_FEATURE_EXPERIMENTAL_UI="false"
```

**CRITICAL VALIDATIONS:**

- [ ] `VITE_API_BASE_URL` is a full HTTPS URL (NOT empty string)
- [ ] `VITE_SOCKET_URL` is a full HTTPS URL (NOT empty string)
- [ ] `VITE_PUBLIC_SITE_URL` is a full HTTPS URL
- [ ] All URLs have NO trailing slashes
- [ ] All URLs use HTTPS (not HTTP or WS/WSS)

**⚠️ IMPORTANT:** In development, these can be empty strings (Vite proxy handles routing). In production, they MUST be full URLs or the app will fail to start.

### 4.2 Build & Deploy

```bash
# Build the client app
npm -w apps/client run build

# Verify build output
ls -la apps/client/dist/
# Should see:
# - index.html
# - assets/ directory with JS/CSS chunks
```

- [ ] Build completed successfully
- [ ] `apps/client/dist/` directory exists
- [ ] No `.map` files in `dist/assets/` (source maps disabled)
- [ ] Environment validation passes during build

### 4.3 Build Security Verification

**Before deploying, verify these security features in the production build:**

```bash
# 1. Verify no source maps
ls apps/client/dist/assets/*.map
# Expected: No such file or directory

# 2. Verify console statements removed
grep -r "console\." apps/client/dist/assets/
# Expected: No results (except possibly console.error)

# 3. Verify environment variables not exposed
grep -r "VITE_" apps/client/dist/assets/*.js
# Expected: Only actual values, no variable names like "process.env.VITE_"

# 4. Verify CSP meta tag present
grep "Content-Security-Policy" apps/client/dist/index.html
# Expected: Found (CSP meta tag in HTML)

# 5. Verify security headers meta tags
grep -E "X-Frame-Options|X-Content-Type-Options" apps/client/dist/index.html
# Expected: Both found
```

- [ ] No source maps in production build
- [ ] Console statements removed (except console.error)
- [ ] Environment variables properly embedded (no leaks)
- [ ] CSP meta tag present in index.html
- [ ] Security headers meta tags present

### 4.4 Deploy Static Assets

**Option 1: Serve via CDN (Recommended)**

```bash
# Upload to CDN (example with AWS S3 + CloudFront)
aws s3 sync apps/client/dist/ s3://elonmusksucks-client-production/
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Configure CloudFront with:
# - HTTPS only
# - Gzip/Brotli compression
# - Cache-Control headers
# - Custom error pages (404 -> /index.html for SPA routing)
```

**Option 2: Serve via Nginx**

```nginx
server {
    listen 443 ssl http2;
    server_name app.elonmusksucks.net;

    ssl_certificate /etc/letsencrypt/live/app.elonmusksucks.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.elonmusksucks.net/privkey.pem;

    root /var/www/elonmusksucks/apps/client/dist;
    index index.html;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback (all routes to index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable .map files
    location ~* \.map$ {
        return 404;
    }
}
```

- [ ] Static assets deployed to CDN or web server
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Gzip/Brotli compression enabled
- [ ] Cache headers configured for `/assets/`
- [ ] SPA fallback configured (404 → index.html)
- [ ] `.map` files blocked (return 404)

### 4.5 Application Startup Verification

**Open browser DevTools and navigate to `https://app.elonmusksucks.net`**

```javascript
// 1. Verify environment validation runs on startup
// Check console for validation message (should be only console output)
// Expected: "✅ Environment validation passed" or similar

// 2. Verify no console statements (except validation and errors)
// Expected: Minimal console output, no debug/info statements

// 3. Verify API connection
// Open Network tab, look for requests to api.elonmusksucks.net
// Expected: Successful requests (200 OK)

// 4. Verify Socket.IO connection
// Look for WebSocket connection in Network tab
// Expected: WebSocket connected to wss://api.elonmusksucks.net

// 5. Verify authentication flow
// Try logging in, check Network tab for /api/auth/login request
// Expected: 200 OK, refresh token cookie set (HTTP-only)
```

- [ ] Environment validation passes on startup
- [ ] No console statements visible (except errors)
- [ ] API requests work (connecting to production API)
- [ ] Socket.IO connects successfully
- [ ] Authentication works (login/register/logout)
- [ ] Refresh token stored in HTTP-only cookie
- [ ] Access token NOT visible in localStorage/sessionStorage

### 4.6 Security Verification

```bash
# 1. Verify CSP in browser DevTools
# Open DevTools → Network → select index.html → Headers
# Look for Content-Security-Policy in Response Headers
# Expected: Full CSP policy visible

# 2. Verify no access token in localStorage
# Open DevTools → Application → Local Storage
# Expected: Only theme preference and non-sensitive data (no tokens)

# 3. Verify refresh token in HTTP-only cookie
# Open DevTools → Application → Cookies → https://api.elonmusksucks.net
# Expected: refreshToken cookie with httpOnly flag checked

# 4. Verify Bearer token in API requests
# Open DevTools → Network → select any API request → Headers
# Look for Authorization header
# Expected: Authorization: Bearer <token>

# 5. Test XSS protection (CSP should block inline scripts)
# Try injecting: <img src=x onerror="alert('XSS')">
# Expected: CSP blocks execution, error in console
```

- [ ] CSP meta tag enforced
- [ ] No access tokens in localStorage
- [ ] Refresh token in HTTP-only cookie only
- [ ] Bearer tokens used in Authorization headers
- [ ] CSP blocks inline scripts (XSS protection)
- [ ] Theme persistence works (localStorage used safely)

---

## Post-Deployment Verification

### 1. Full Integration Testing

**Test the complete user journey:**

1. **Public Site → Client App Flow**
   - [ ] Navigate to `https://elonmusksucks.net`
   - [ ] Click "Sign Up" or "Log In" (redirects to client app)
   - [ ] Expected: Redirect to `https://app.elonmusksucks.net/login`

2. **User Registration**
   - [ ] Register new account on `https://app.elonmusksucks.net/register`
   - [ ] Expected: Account created, email verification sent (if enabled)
   - [ ] Check database: User record created with hashed password

3. **User Login**
   - [ ] Log in with new account credentials
   - [ ] Expected: Successful login, redirect to dashboard
   - [ ] Check browser: Refresh token cookie set (HTTP-only)
   - [ ] Check Network: Access token received in response

4. **Dashboard & Real-time Features**
   - [ ] Navigate to dashboard
   - [ ] Expected: No redundant API calls (check Network tab)
   - [ ] Check Socket.IO: WebSocket connected
   - [ ] Check Console: No hydration errors

5. **Betting Flow**
   - [ ] Place a single bet on a prediction
   - [ ] Expected: Balance decreases, bet recorded
   - [ ] Check Database: Bet record created, user balance updated
   - [ ] Check Real-time: Other users see updated odds

6. **Pong Game**
   - [ ] Navigate to `/pong`
   - [ ] Start a PVP game
   - [ ] Expected: Game loads, connects to `wss://pong.elonmusksucks.net`
   - [ ] Play game to completion
   - [ ] Expected: Payout processed, balance updated

7. **Timeline/Feed**
   - [ ] Navigate to `/timeline`
   - [ ] Expected: Articles load from database
   - [ ] Check: Feed worker is processing RSS feeds

8. **Leaderboard**
   - [ ] Navigate to `/leaderboard`
   - [ ] Expected: User rankings displayed
   - [ ] Check: Leaderboard updates in real-time

9. **Logout**
   - [ ] Log out
   - [ ] Expected: Redirect to public site or login page
   - [ ] Check: Refresh token cookie cleared
   - [ ] Check: Access token cleared from memory

### 2. Cross-Origin Testing

**Test CORS and cross-application communication:**

```bash
# 1. Client → API (should succeed)
curl -H "Origin: https://app.elonmusksucks.net" \
     -H "Authorization: Bearer <token>" \
     https://api.elonmusksucks.net/api/auth/me
# Expected: 200 OK

# 2. Public Site → API (should succeed)
curl -H "Origin: https://elonmusksucks.net" \
     https://api.elonmusksucks.net/api/predictions
# Expected: 200 OK

# 3. Malicious origin → API (should fail)
curl -H "Origin: https://malicious.com" \
     https://api.elonmusksucks.net/api/predictions
# Expected: CORS error

# 4. Client → Pong Server (should succeed)
# Connect via browser from https://app.elonmusksucks.net/pong
# Expected: WebSocket connection successful

# 5. Direct access to Pong Server from other origin (should fail)
# Try connecting from https://malicious.com
# Expected: CORS error
```

- [ ] Client app can communicate with API
- [ ] Public site can communicate with API
- [ ] Pong server accepts connections from client app
- [ ] CORS blocks unauthorized origins

### 3. Performance Testing

**Test load times and performance:**

```bash
# 1. Lighthouse CI (run from client app)
npm install -g @lhci/cli
lhci autorun --collect.url=https://app.elonmusksucks.net

# Expected scores:
# - Performance: 90+
# - Accessibility: 90+
# - Best Practices: 90+
# - SEO: 90+

# 2. Load testing (use artillery or k6)
# Test API endpoints under load
artillery quick --count 100 --num 10 https://api.elonmusksucks.net/health
# Expected: All requests succeed, avg response time <100ms

# 3. WebSocket load testing
# Test Socket.IO under load (multiple concurrent connections)
# Expected: Stable connections, no disconnections

# 4. Database query performance
# Monitor slow queries in PostgreSQL logs
# Expected: No queries >100ms under normal load
```

- [ ] Lighthouse scores meet targets (90+)
- [ ] API handles 100+ concurrent requests
- [ ] Socket.IO handles 100+ concurrent connections
- [ ] Database queries perform well (<100ms)

---

## Monitoring & Health Checks

### 1. Health Check Endpoints

**Test all health check endpoints:**

```bash
# Main Server
curl https://api.elonmusksucks.net/health
# Expected: {"status":"ok","timestamp":"2025-10-11T..."}

# Pong Server
curl https://pong.elonmusksucks.net/health
# Expected: {"status":"ok","timestamp":"2025-10-11T..."}

# Public Site
curl https://elonmusksucks.net/health
# Expected: {"status":"ok","timestamp":"2025-10-11T..."}

# Client App (served statically, no health endpoint)
curl https://app.elonmusksucks.net
# Expected: 200 OK, HTML content
```

- [ ] All health endpoints return 200 OK
- [ ] Response format is consistent

### 2. Uptime Monitoring

**Set up external monitoring (recommended services):**

- [ ] **UptimeRobot** or **Pingdom** configured for:
  - [ ] `https://api.elonmusksucks.net/health` (check every 5 minutes)
  - [ ] `https://pong.elonmusksucks.net/health` (check every 5 minutes)
  - [ ] `https://elonmusksucks.net` (check every 5 minutes)
  - [ ] `https://app.elonmusksucks.net` (check every 5 minutes)

- [ ] Alert notifications configured:
  - [ ] Email alerts for downtime
  - [ ] Slack/Discord webhook for critical alerts
  - [ ] SMS alerts (optional, for critical services)

### 3. Error Tracking

**Set up error tracking (recommended: Sentry):**

```bash
# Install Sentry SDK in each application
npm install @sentry/node --workspace=apps/server
npm install @sentry/node --workspace=apps/pong-server
npm install @sentry/react --workspace=apps/client

# Configure Sentry in each app (see Sentry docs)
```

- [ ] Sentry configured for main server
- [ ] Sentry configured for pong server
- [ ] Sentry configured for client app
- [ ] Error alerts configured (email/Slack)
- [ ] Source maps uploaded to Sentry (for better stack traces)

### 4. Log Aggregation

**Set up centralized logging:**

**Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)**
**Option 2: Loki + Grafana**
**Option 3: CloudWatch Logs (AWS)**

```bash
# Configure application logging to JSON format
# Example for main server (apps/server/src/server.ts)

import morgan from 'morgan';
import logger from './utils/logger'; // Winston or Pino

// Morgan JSON format
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));
```

- [ ] Centralized logging configured
- [ ] All applications sending logs to aggregator
- [ ] Log retention policy set (30-90 days recommended)
- [ ] Log search and filtering working
- [ ] Alerts configured for critical errors

### 5. Database Monitoring

**Monitor PostgreSQL performance:**

```bash
# 1. Enable pg_stat_statements extension
psql -d elonmusksucks -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# 2. Query slow queries
psql -d elonmusksucks -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# 3. Monitor connection pool
# Check Prisma connection pool metrics in application logs
```

- [ ] `pg_stat_statements` enabled
- [ ] Slow query monitoring configured
- [ ] Connection pool metrics monitored
- [ ] Database backup automated (daily recommended)
- [ ] Point-in-time recovery (PITR) configured

### 6. Redis Monitoring

**Monitor Redis performance:**

```bash
# Connect to Redis CLI
redis-cli -h <redis-host> -a <password>

# 1. Check memory usage
INFO memory

# 2. Check connected clients
INFO clients

# 3. Monitor commands in real-time
MONITOR

# 4. Check keyspace
INFO keyspace
```

- [ ] Redis memory usage monitored (<80% of max)
- [ ] Redis connection count monitored
- [ ] Redis persistence configured (RDB or AOF)
- [ ] Redis backup automated

### 7. BullMQ Queue Monitoring

**Monitor job processing:**

```bash
# Install Bull Board for UI
npm install @bull-board/api @bull-board/express --workspace=apps/server

# Add Bull Board to main server (apps/server/src/server.ts)
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(payoutQueue),
    new BullMQAdapter(pongPayoutQueue),
    new BullMQAdapter(leaderboardQueue),
    // ... other queues
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

- [ ] Bull Board UI accessible (behind authentication)
- [ ] All 6 queues visible in UI
- [ ] Job processing rates monitored
- [ ] Failed jobs monitored (set up alerts)
- [ ] Dead letter queue (DLQ) configured

---

## Rollback Procedures

### 1. Quick Rollback (PM2)

**If using PM2, rollback to previous version:**

```bash
# 1. List all PM2 processes
pm2 list

# 2. Stop all processes
pm2 stop all

# 3. Checkout previous git commit
git log --oneline -10  # Find previous commit hash
git checkout <previous-commit-hash>

# 4. Reinstall dependencies (if needed)
npm install

# 5. Rebuild all applications
npm run build

# 6. Restart all processes
pm2 restart all

# 7. Verify rollback
pm2 logs
```

**Estimated Time:** 5-10 minutes

### 2. Database Rollback

**If database migration caused issues:**

```bash
# 1. Rollback last migration
npm run prisma:migrate:rollback

# 2. Verify database state
npm run prisma:studio

# 3. Re-deploy application code (may need to revert to previous version)
```

**⚠️ WARNING:** Database rollbacks can cause data loss. Always test migrations in staging first.

### 3. Client App Rollback (CDN)

**If client app has issues:**

```bash
# 1. Re-upload previous build to CDN
aws s3 sync apps/client/dist-backup/ s3://elonmusksucks-client-production/

# 2. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# 3. Verify rollback
curl https://app.elonmusksucks.net
```

**Estimated Time:** 2-5 minutes

### 4. Public Site Rollback (SSR)

**If public site has issues:**

```bash
# 1. Stop current server
pm2 stop ems-public

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild
npm -w apps/public-site run build

# 4. Restart server
pm2 start ems-public

# 5. Verify rollback
curl https://elonmusksucks.net
```

**Estimated Time:** 3-5 minutes

### 5. Full System Rollback

**If entire system needs rollback:**

```bash
# 1. Stop all services
pm2 stop all

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Reinstall dependencies
npm install

# 4. Rollback database (if needed)
npm run prisma:migrate:rollback

# 5. Rebuild all applications
npm run build

# 6. Restart all services
pm2 restart all

# 7. Restart all workers
pm2 restart ems-worker-*

# 8. Verify all health checks
curl https://api.elonmusksucks.net/health
curl https://pong.elonmusksucks.net/health
curl https://elonmusksucks.net/health
curl https://app.elonmusksucks.net
```

**Estimated Time:** 10-15 minutes

---

## Emergency Procedures

### 1. Database Connection Issues

**Symptoms:** Applications can't connect to PostgreSQL

**Diagnosis:**
```bash
# 1. Check PostgreSQL status
sudo systemctl status postgresql

# 2. Test connection manually
psql -h <db-host> -U <db-user> -d elonmusksucks

# 3. Check connection limit
psql -c "SELECT count(*) FROM pg_stat_activity;"
psql -c "SHOW max_connections;"
```

**Resolution:**
```bash
# If connection limit reached
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

# If PostgreSQL is down
sudo systemctl restart postgresql

# If DATABASE_URL is wrong
nano .env  # Fix DATABASE_URL
pm2 restart all
```

### 2. Redis Connection Issues

**Symptoms:** Socket.IO disconnects, BullMQ jobs not processing

**Diagnosis:**
```bash
# 1. Check Redis status
redis-cli -h <redis-host> -a <password> PING
# Expected: PONG

# 2. Check memory usage
redis-cli -h <redis-host> -a <password> INFO memory

# 3. Check connected clients
redis-cli -h <redis-host> -a <password> INFO clients
```

**Resolution:**
```bash
# If Redis is down
sudo systemctl restart redis

# If Redis is out of memory
redis-cli -h <redis-host> -a <password> FLUSHDB  # ⚠️ CAUTION: Deletes all data

# If REDIS_URL is wrong
nano .env  # Fix REDIS_URL
pm2 restart all
```

### 3. Worker Process Stuck

**Symptoms:** Jobs not processing, queue backing up

**Diagnosis:**
```bash
# 1. Check worker status
pm2 list | grep worker

# 2. Check worker logs
pm2 logs ems-worker-payout --lines 100

# 3. Check Redis queues
redis-cli -h <redis-host> -a <password>
KEYS bull:*
```

**Resolution:**
```bash
# Restart specific worker
pm2 restart ems-worker-payout

# If worker keeps crashing, check for stuck jobs
redis-cli -h <redis-host> -a <password>
LLEN bull:payouts:active
# If > 0, jobs are stuck

# Clear stuck jobs (⚠️ CAUTION: May lose data)
redis-cli -h <redis-host> -a <password>
DEL bull:payouts:active
```

### 4. High Memory Usage

**Symptoms:** Applications crashing, OOM errors

**Diagnosis:**
```bash
# 1. Check memory usage
free -h
pm2 list

# 2. Identify culprit
pm2 show <app-name>

# 3. Check for memory leaks
pm2 monit
```

**Resolution:**
```bash
# Quick fix: Restart application
pm2 restart <app-name>

# Long-term fix: Investigate memory leak
# - Check for event listener leaks (Socket.IO)
# - Check for unclosed database connections
# - Check for growing in-memory caches
```

### 5. CORS Issues

**Symptoms:** Client app can't connect to API, CORS errors in browser console

**Diagnosis:**
```bash
# Check CORS configuration in main server
grep -n "cors" apps/server/src/server.ts

# Test CORS
curl -H "Origin: https://app.elonmusksucks.net" \
     -v https://api.elonmusksucks.net/health
```

**Resolution:**
```bash
# Fix CORS configuration in apps/server/src/server.ts
# Ensure CLIENT_APP_URL and BASE_URL_PUBLIC are in allowed origins

# Restart main server
pm2 restart ems-api
```

### 6. SSL Certificate Expired

**Symptoms:** HTTPS not working, browser shows security warning

**Diagnosis:**
```bash
# Check certificate expiration
openssl s_client -connect api.elonmusksucks.net:443 -servername api.elonmusksucks.net </dev/null 2>/dev/null | openssl x509 -noout -dates
```

**Resolution:**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx

# Verify renewal
curl -I https://api.elonmusksucks.net
```

### 7. Complete System Failure

**Symptoms:** All services down, can't access any application

**Emergency Contact:**
- [ ] Alert all team members immediately
- [ ] Check infrastructure provider status (AWS, DigitalOcean, etc.)
- [ ] Check DNS provider status
- [ ] Activate disaster recovery plan

**Recovery Steps:**
```bash
# 1. Check all services
sudo systemctl status postgresql redis nginx

# 2. Restart all services
sudo systemctl restart postgresql redis nginx

# 3. Restart all PM2 processes
pm2 restart all

# 4. Check logs for errors
pm2 logs --lines 100

# 5. Verify all health checks
curl https://api.elonmusksucks.net/health
curl https://pong.elonmusksucks.net/health
curl https://elonmusksucks.net/health
curl https://app.elonmusksucks.net

# 6. If still down, restore from backup
# (Follow disaster recovery plan)
```

---

## Final Pre-Launch Checklist

### Infrastructure ✅

- [ ] PostgreSQL database provisioned and accessible
- [ ] Redis instance provisioned and accessible
- [ ] Tigris S3 bucket created and configured
- [ ] SendGrid account configured
- [ ] All domain names configured with SSL certificates
- [ ] Reverse proxy (Nginx/Caddy) configured
- [ ] Firewall rules configured

### Application Deployments ✅

- [ ] Main Server (API) built and deployed
- [ ] Pong Server built and deployed
- [ ] Public Site (SSR) built and deployed
- [ ] Client App built and deployed
- [ ] All 6 BullMQ workers running

### Environment Variables ✅

- [ ] All required environment variables set in `.env`
- [ ] No hardcoded localhost references
- [ ] JWT secrets are production-ready (≥32 chars, random)
- [ ] All URLs use HTTPS
- [ ] `SKIP_EMAIL_FLOW` set to `"false"` (email verification enabled)

### Security ✅

- [ ] Source maps disabled in production
- [ ] Console statements removed from production builds
- [ ] CSP headers configured
- [ ] Security headers (Helmet) configured
- [ ] CORS restricted to known origins
- [ ] Rate limiting enabled
- [ ] Authentication enforced on all protected routes
- [ ] Refresh tokens in HTTP-only cookies
- [ ] Access tokens in memory only (not localStorage)

### Testing ✅

- [ ] All health checks return 200 OK
- [ ] User registration works
- [ ] User login works
- [ ] Betting flow works
- [ ] Pong game works
- [ ] Real-time events work (Socket.IO)
- [ ] Timeline/feed works
- [ ] Leaderboard works
- [ ] No CORS errors
- [ ] No console errors in browser

### Monitoring ✅

- [ ] Uptime monitoring configured
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation configured
- [ ] Database monitoring configured
- [ ] Redis monitoring configured
- [ ] BullMQ queue monitoring configured

### Documentation ✅

- [ ] Deployment procedures documented
- [ ] Rollback procedures documented
- [ ] Emergency procedures documented
- [ ] Team trained on deployment process
- [ ] On-call schedule established

---

## 🚀 Ready for Production

**If all checkboxes above are checked, you are ready to deploy to production!**

**Deployment Timeline:**
1. **Database & Infrastructure** (30 minutes)
2. **Main Server Deployment** (15 minutes)
3. **Pong Server Deployment** (10 minutes)
4. **Public Site Deployment** (10 minutes)
5. **Client App Deployment** (10 minutes)
6. **Testing & Verification** (30 minutes)

**Total Estimated Time:** ~2 hours

**Post-Deployment:**
- Monitor logs for 24 hours
- Watch error rates in Sentry
- Monitor health checks
- Be available for emergency fixes

**Congratulations on deploying elonmusksucks.net! 🎉**

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-11
**Maintained By:** Development Team
**Questions?** Review security audit documents:
- `docs/SECURITY_FIXES_IMPLEMENTED.md`
- `docs/PONG_SERVER_SECURITY_FIXES_IMPLEMENTED.md`
- `docs/PUBLIC_SITE_SECURITY_FIXES_IMPLEMENTED.md`
- `docs/CLIENT_SECURITY_FIXES_IMPLEMENTED.md`
