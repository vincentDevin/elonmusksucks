# Pre-Launch Security Checklist - ems-public

## 🚨 CRITICAL ITEMS (Must Fix Before Launch)

### 1. ⚠️ **IP Banning System NOT Deployed**
- **Status**: ❌ NOT DEPLOYED
- **Issue**: We built the IP banning middleware but never deployed ems-public
- **Action Required**:
  ```bash
  # Build and deploy ems-public with IP banning
  docker buildx build --platform linux/amd64 -t registry.fly.io/ems-public:latest -f apps/public-site/Dockerfile . --load
  docker push registry.fly.io/ems-public:latest
  fly deploy --app ems-public --image registry.fly.io/ems-public:latest
  ```

### 2. ⚠️ **Maintenance Mode Still Enabled**
- **Status**: ❌ ENABLED
- **Location**: `apps/public-site/fly.toml:13`
- **Current**: `VITE_MAINTENANCE_MODE = 'true'`
- **Action Required**: Change to `'false'` or remove entirely before deployment

---

## 🔒 SECURITY REVIEW

### Environment & Secrets

#### ✅ Redis Security
- ✅ Internal network only (`ems-redis.internal`)
- ✅ Password authentication enabled
- ✅ protected-mode enabled
- ✅ Dangerous commands disabled (FLUSHDB, FLUSHALL, CONFIG)

#### ✅ Database Security
- ✅ Using managed Postgres (Fly.io)
- ✅ Connection through pgbouncer
- ✅ Separate DIRECT_URL for migrations

#### ⚠️ Secrets Exposure Check
**Action Required**: Verify no secrets in code
```bash
# Search for potential secret leaks
rg -i "password|secret|key" apps/public-site/src --type ts | grep -v "password:"
```

---

### Network Security

#### ✅ HTTPS Configuration
- ✅ `force_https = true` in fly.toml
- ✅ HSTS header with 1-year max-age
- ✅ HTTP → HTTPS redirect in server.ts

#### ✅ CORS Configuration (apps/public-site/server.ts)
**Current Settings** (verify these are correct):
```typescript
allowedOrigins = [
  env.CLIENT_APP_URL  // Should be: https://app.elonmusksucks.net
]
```
- ✅ Whitelist-based (not wildcard `*`)
- ✅ Credentials enabled for same-origin
- ⚠️ **ACTION**: Verify `ALLOWED_ORIGINS` env var is set correctly

#### ✅ Security Headers (nginx.conf)
- ✅ `Strict-Transport-Security: max-age=31536000`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ⚠️ Missing: `Content-Security-Policy` (currently in Express, not nginx)

---

### Rate Limiting

#### ✅ Application-Level (Express)
- ✅ General: 60 req/min per IP
- ✅ API Proxy: 30 req/min per IP
- ✅ Skipped in development

#### ⚠️ nginx Rate Limiting (nginx.conf:48-49)
**Issue**: `limit_req_zone` directive is INSIDE location block (invalid)
- **Current**: Lines 48-49 in `/api/` location
- **Should Be**: At `http` or `server` level
- **Impact**: nginx rate limiting NOT working
- **Action**: Move to server block or remove (Express already has it)

---

### IP Banning System

#### ✅ Configuration (apps/public-site/src/middleware/ipBanning.ts)
- ✅ 404 spam: 10 unique paths in 5min → 1hr ban
- ✅ Rate limit: 3 violations in 10min → 30min ban
- ✅ Malicious: Instant 24hr ban
- ✅ Patterns: `/wp-admin`, `.php`, `.env`, SQL injection, XSS
- ✅ Redis-backed (shared across instances)

#### ❌ Deployment Status
- ❌ **NOT DEPLOYED** - middleware exists but ems-public not rebuilt/deployed

---

### Input Validation & XSS Prevention

#### ✅ Server-Side
- ✅ Body size limit: 100kb
- ✅ XSS-safe serialization in `serializeForHTML()`
- ✅ Helmet CSP headers configured

#### ⚠️ API Proxy Security
**Review Required**:
- ✅ Header filtering (allowlist approach)
- ✅ Response size limit (5MB)
- ✅ 10s timeout
- ⚠️ No request body validation (proxies directly)

---

### Authentication & Authorization

#### ✅ Public Site (No Auth Required)
- ✅ No authentication needed (public marketing site)
- ✅ No sensitive data exposed
- ✅ API proxy requires auth tokens (validated by ems-api)

#### ⚠️ API Proxy
**Concern**: ems-public proxies `/api/*` to ems-api
- ✅ Auth tokens forwarded correctly
- ✅ ems-api validates all auth
- ⚠️ **QUESTION**: Should `/api/` proxy be removed? (ems-client can call ems-api directly)

---

### Error Handling & Information Disclosure

#### ✅ Production Error Handling
- ✅ Generic errors in production
- ✅ Detailed errors only in development
- ✅ No stack traces leaked
- ✅ Proper logging (not exposed to users)

---

### Dependencies & CVEs

#### ⚠️ npm Audit
**Action Required**: Run security audit
```bash
npm audit --workspace=apps/public-site
npm audit fix --workspace=apps/public-site
```

---

## 📋 PRE-LAUNCH CHECKLIST

### Must Do Before Launch

- [ ] **Deploy ems-public with IP banning**
  ```bash
  cd /Users/devin/Desktop/new-personal-site/elonmusksucks
  docker buildx build --platform linux/amd64 -t registry.fly.io/ems-public:latest -f apps/public-site/Dockerfile . --load
  docker push registry.fly.io/ems-public:latest
  fly deploy --app ems-public --image registry.fly.io/ems-public:latest
  ```

- [ ] **Disable Maintenance Mode**
  - Edit `apps/public-site/fly.toml:13`
  - Change `VITE_MAINTENANCE_MODE = 'true'` → `'false'`
  - Or remove the line entirely

- [ ] **Verify Production Secrets**
  ```bash
  fly secrets list --app ems-public
  # Should see:
  # - REDIS_URL=redis://:PASSWORD@ems-redis.internal:6379
  # - API_BASE_URL=https://api.elonmusksucks.net
  # - CLIENT_APP_URL=https://app.elonmusksucks.net
  ```

- [ ] **Fix nginx Rate Limiting** (Optional - Express already has it)
  - Remove lines 48-49 from nginx.conf
  - OR move to server block

- [ ] **Run npm Audit**
  ```bash
  npm audit --workspace=apps/public-site
  ```

### Should Do (Recommended)

- [ ] **Add CSP Header to nginx** (currently only in Express)
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;
  ```

- [ ] **Set up Cloudflare** (as discussed - hybrid protection)
  - DDoS protection
  - Bot detection
  - Geographic filtering
  - Rate limiting at edge

- [ ] **Monitor Logs After Launch**
  ```bash
  fly logs --app ems-public | grep -E "IP_BAN|403|404"
  ```

- [ ] **Test IP Banning**
  - Trigger 404 spam (10 unique paths)
  - Verify ban works
  - Check Redis for ban keys

### Nice to Have

- [ ] **Web Application Firewall (WAF)**
  - Cloudflare WAF (when set up)
  - OWASP ModSecurity rules

- [ ] **Monitoring & Alerts**
  - Set up alerts for:
    - High ban rates
    - Unusual traffic patterns
    - 500 errors

- [ ] **Penetration Testing**
  - Run OWASP ZAP or Burp Suite
  - Test for common vulnerabilities
  - Verify security headers

---

## 🚀 DEPLOYMENT ORDER

1. **First**: Deploy ems-public with IP banning (WITH maintenance mode still on)
2. **Test**: Verify IP banning works, check logs
3. **Then**: Disable maintenance mode
4. **Deploy Again**: Final deployment with maintenance mode off
5. **Monitor**: Watch logs for 1 hour after launch

---

## 🔥 EMERGENCY ROLLBACK

If something goes wrong:

### Re-enable Maintenance Mode
```bash
fly secrets set VITE_MAINTENANCE_MODE="true" --app ems-public
```

### Rollback to Previous Image
```bash
fly releases --app ems-public
fly releases rollback <version> --app ems-public
```

### Check What's Wrong
```bash
fly logs --app ems-public
fly status --app ems-public
```

---

## 📊 POST-LAUNCH MONITORING (First 24 Hours)

### Watch These Logs
```bash
# IP bans
fly logs --app ems-public | grep IP_BAN

# 403 Forbidden (banned IPs)
fly logs --app ems-public | grep " 403 "

# 404s (potential attacks)
fly logs --app ems-public | grep " 404 "

# Redis errors
fly logs --app ems-public | grep -i redis
```

### Metrics to Track
- Request rate
- 403/404 rate
- Ban rate (IPs/hour)
- Response times
- Error rate

---

## ✅ FINAL SIGN-OFF

Before flipping the switch, confirm:

- [ ] IP banning deployed and tested
- [ ] Maintenance mode disabled
- [ ] All secrets verified in production
- [ ] nginx rate limit fixed or removed
- [ ] npm audit clean (or vulnerabilities accepted)
- [ ] Monitoring in place
- [ ] Rollback plan understood

**Sign-off**: _____________________ Date: _________
