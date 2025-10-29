# IP Banning System

## Overview

The **ems-public** app now includes an automated IP banning system that protects against drive-by attacks, malicious payloads, and abusive behavior. The system uses **Redis** to track violations across multiple server instances and automatically bans IPs that exceed thresholds.

---

## Features

### 1. **Automatic Pattern Detection**

The system detects and blocks:

- **SQL Injection Attempts**: `SELECT`, `UNION`, `DROP TABLE`, etc.
- **XSS Attacks**: `<script>`, `javascript:`, `onerror=`, etc.
- **Path Traversal**: `../`, `..%2f`
- **Common Exploit Paths**: `/wp-admin`, `/phpmyadmin`, `.php`, `.env`, `.git`, etc.
- **Malicious User Agents**: `nikto`, `sqlmap`, `nmap`, etc.

### 2. **Violation Tracking**

Three types of violations are tracked:

| Violation Type | Threshold | Window | Ban Duration |
|----------------|-----------|--------|--------------|
| **404 Spam** | 10 unique 404s | 5 minutes | 1 hour |
| **Rate Limit** | 3 violations | 10 minutes | 30 minutes |
| **Malicious** | 1 request | Instant | 24 hours |

### 3. **Redis-Backed Persistence**

- Violations and bans are stored in Redis
- Shared across all ems-public instances (supports horizontal scaling)
- TTL-based automatic expiration

---

## How It Works

### Request Flow

```
Incoming Request
    ↓
1. IP Ban Check (middleware) → If banned: 403 Forbidden
    ↓
2. Malicious Pattern Check → If malicious: Track + Ban + 403
    ↓
3. Normal Request Processing
    ↓
4. Response Monitoring:
   - If 404: Track 404 violation
   - If 429 (rate limit): Track rate limit violation
    ↓
5. Auto-ban if thresholds exceeded
```

### Ban Triggers

#### 1. 404 Spam (10+ unique paths in 5 minutes)
```
User requests:
/wp-admin
/wp-login.php
/phpmyadmin
/.env
/.git/config
... (10 different 404s)

→ Automatic 1-hour ban
```

#### 2. Rate Limit Violations (3 hits in 10 minutes)
```
User exceeds rate limit 3 times:
- 1st: 429 response
- 2nd: 429 response
- 3rd: 429 response + 30-minute ban
```

#### 3. Malicious Requests (Instant ban)
```
Any request matching:
- SQL injection patterns
- XSS payloads
- Path traversal
- /wp-admin, .php, .env, etc.

→ Immediate 24-hour ban
```

---

## Redis Keys

The system uses the following Redis key structure:

```
ip_ban:{ip}                    # Ban status and metadata
ip_violations:not_found:{ip}   # 404 violation counter
ip_violations:rate_limit:{ip}  # Rate limit violation counter
ip_violations:malicious:{ip}   # Malicious request counter
ip_404_paths:{ip}              # Set of unique 404 paths (for threshold)
```

All keys use **TTL-based expiration** to clean up automatically.

---

## Logging

All bans and violations are logged with `[IP_BAN]` prefix:

```bash
# Malicious request detected
[IP_BAN] 🚨 Malicious request detected from 1.2.3.4: { path: '/wp-admin', userAgent: 'nikto' }

# IP banned
[IP_BAN] ⛔ Banned IP: 1.2.3.4 { reason: 'Malicious request detected: /wp-admin', duration: '86400s (1440min)' }

# Banned IP blocked
[IP_BAN] Blocked banned IP: 1.2.3.4 { path: '/', reason: 'Malicious request', expiresIn: 82340 }
```

These logs are visible in:
- Terminal during `npm run dev`
- Grafana dashboard (production)
- `fly logs --app ems-public` (production)

---

## Configuration

### Ban Thresholds

Edit `apps/public-site/src/middleware/ipBanning.ts`:

```typescript
const BAN_CONFIG = {
  // 404 spam detection
  NOT_FOUND_THRESHOLD: 10,           // Number of unique 404s
  NOT_FOUND_WINDOW: 5 * 60,          // 5 minutes
  NOT_FOUND_BAN_DURATION: 60 * 60,   // 1 hour ban

  // Rate limit violations
  RATE_LIMIT_THRESHOLD: 3,           // Number of rate limit hits
  RATE_LIMIT_WINDOW: 10 * 60,        // 10 minutes
  RATE_LIMIT_BAN_DURATION: 30 * 60,  // 30 minute ban

  // Malicious patterns (instant ban)
  MALICIOUS_PATTERNS: [
    /\/wp-admin/i,
    /\.php$/i,
    /\.env$/i,
    // ... add more patterns
  ],
};
```

### Environment Variables

Required in `.env`:

```bash
REDIS_URL=redis://localhost:6379  # Development
REDIS_URL=redis://[YOUR_FLY_REDIS_URL]  # Production
```

---

## Testing Locally

### 1. Start Redis

```bash
redis-server
```

### 2. Start ems-public

```bash
npm run dev
# or
npm -w apps/public-site run dev
```

### 3. Test Malicious Pattern Detection

```bash
# Should get instant 24-hour ban
curl http://localhost:5173/wp-admin
curl http://localhost:5173/.env
curl http://localhost:5173/test.php
```

### 4. Test 404 Spam Detection

```bash
# Create 10 unique 404s (triggers 1-hour ban on 10th request)
for i in {1..10}; do
  curl http://localhost:5173/fake-path-$i
done

# Next request should be blocked
curl http://localhost:5173/
```

### 5. Check Banned Status

```bash
# In Redis CLI
redis-cli

# List all bans
KEYS ip_ban:*

# Check specific IP ban
GET ip_ban:127.0.0.1

# Check violations
GET ip_violations:not_found:127.0.0.1
SMEMBERS ip_404_paths:127.0.0.1
```

---

## Production Deployment

### Build & Deploy

The IP banning system is included in the standard deployment:

```bash
# Build
docker buildx build --platform linux/amd64 \
  -t registry.fly.io/ems-public:latest \
  -f apps/public-site/Dockerfile . \
  --load

# Push
docker push registry.fly.io/ems-public:latest

# Deploy
fly deploy --app ems-public --image registry.fly.io/ems-public:latest
```

### Monitoring

**View logs in Grafana:**
- Filter by `[IP_BAN]` to see all bans
- Look for `🚨 Malicious request detected` for attack attempts
- Look for `⛔ Banned IP` for executed bans

**View logs via Fly CLI:**
```bash
fly logs --app ems-public | grep IP_BAN
```

### Manually Ban an IP

If you need to manually ban an IP, use Redis CLI:

```bash
# SSH into Fly instance
fly ssh console --app ems-public

# Connect to Redis
redis-cli -u $REDIS_URL

# Ban IP for 24 hours (86400 seconds)
SETEX ip_ban:1.2.3.4 86400 '{"reason":"Manual ban - spam attack","bannedAt":"2025-01-24T05:30:00.000Z","duration":86400}'
```

### Unban an IP

```bash
# Delete the ban key
redis-cli -u $REDIS_URL
DEL ip_ban:1.2.3.4
```

---

## Scaling Considerations

✅ **Multi-Instance Support**: Redis ensures bans are shared across all ems-public instances

✅ **Performance**:
- Ban checks are Redis GET operations (sub-millisecond)
- Violations tracked asynchronously (don't block responses)
- TTL-based cleanup (no manual cleanup needed)

✅ **Graceful Failures**:
- Redis errors don't block requests (fail-open)
- Logs all errors for debugging
- Continues functioning with degraded protection

---

## Best Practices

### Cloudflare Integration (Recommended)

For best protection, add Cloudflare in front of ems-public:

1. **Cloudflare** filters most attacks (DDoS, bots, geo-blocking)
2. **Application-level banning** catches anything that gets through
3. **Logs** show attack patterns for analysis

### Monitoring Alerts

Set up alerts in Grafana for:
- High ban rates (potential attack)
- Specific malicious patterns
- Redis connection failures

### Regular Review

Weekly review of:
- Top banned IPs
- Most common attack vectors
- False positive bans (adjust thresholds if needed)

---

## Troubleshooting

### Ban Not Working

1. **Check Redis connection**:
   ```bash
   redis-cli -u $REDIS_URL ping
   # Should return PONG
   ```

2. **Check logs for errors**:
   ```bash
   fly logs --app ems-public | grep "IP_BAN.*error"
   ```

3. **Verify ban exists in Redis**:
   ```bash
   redis-cli -u $REDIS_URL GET ip_ban:1.2.3.4
   ```

### False Positives

If legitimate users are being banned:

1. Check the ban reason in logs
2. Adjust thresholds in `BAN_CONFIG`
3. Add whitelist for known IPs (feature not yet implemented)

### Performance Issues

If Redis is slow:

1. Check Redis memory usage
2. Ensure TTLs are working (keys expire)
3. Consider Redis cluster for high traffic

---

## Future Enhancements

Potential improvements:

- [ ] IP whitelist for trusted sources
- [ ] Geographic blocking via Cloudflare
- [ ] Admin dashboard for ban management
- [ ] Export ban data for threat intelligence
- [ ] Webhook notifications for critical bans
- [ ] Machine learning for pattern detection

---

## Files Changed

- **Created**: `apps/public-site/src/middleware/ipBanning.ts` (410 lines)
- **Modified**: `apps/public-site/server.ts` (integrated middleware)
- **Modified**: `apps/public-site/src/config/env.ts` (added REDIS_URL)
- **Modified**: `apps/public-site/package.json` (added ioredis dependency)

---

## Summary

The IP banning system provides automated protection against common attack patterns while maintaining performance and scalability. Combined with Cloudflare, it creates a robust defense against malicious traffic targeting ems-public.

**Key Benefits:**
- ✅ Zero configuration - works out of the box
- ✅ Automatic detection and banning
- ✅ Redis-backed for multi-instance support
- ✅ Detailed logging for monitoring
- ✅ Fail-safe design (doesn't block on errors)
