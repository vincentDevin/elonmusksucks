# Redis Internal Network Migration Guide

## Overview

This guide covers migrating **ems-redis** from a publicly accessible service to Fly.io's internal 6PN (IPv6 Private Network), significantly improving security by isolating Redis from the public internet.

---

## What Changed

### Before (Public Redis)
```
Internet → ems-redis.fly.dev:6379 → Redis
         ❌ Exposed to public internet
         ❌ protected-mode disabled
         ❌ Vulnerable to attacks
```

### After (Internal Redis)
```
Internet ✗ ems-redis.internal:6379
         ✅ Only accessible within Fly.io organization
         ✅ protected-mode enabled
         ✅ Network-level isolation
```

---

## Files Modified

1. **fly-redis/fly.toml**
   - Added `[experimental] private_network = true`
   - Removed public `[[services.ports]]` block
   - Redis now accessible only via `.internal` hostname

2. **fly-redis/redis.conf**
   - Changed `bind 0.0.0.0` → `bind fly-local-6pn ::`
   - Changed `protected-mode no` → `protected-mode yes`
   - Added security comments

---

## Deployment Steps

### Step 1: Rebuild and Deploy ems-redis

```bash
# From project root
cd fly-redis

# Build for linux/amd64
docker buildx build --platform linux/amd64 \
  -t registry.fly.io/ems-redis:latest \
  -f Dockerfile . \
  --load

# Push to Fly registry
docker push registry.fly.io/ems-redis:latest

# Deploy to production
fly deploy --app ems-redis --image registry.fly.io/ems-redis:latest
```

### Step 2: Update REDIS_URL Secrets

Update all apps that connect to Redis to use the `.internal` hostname:

```bash
# Update ems-api (main server + workers)
fly secrets set REDIS_URL="redis://ems-redis.internal:6379" --app ems-api

# Update ems-public (IP banning system)
fly secrets set REDIS_URL="redis://ems-redis.internal:6379" --app ems-public
```

### Step 3: Restart Apps to Pick Up New Connection

```bash
# Restart ems-api (all instances + workers)
fly apps restart ems-api

# Restart ems-public
fly apps restart ems-public
```

---

## Verification

### 1. Check Redis is Internal-Only

Try to connect from your local machine (should fail):

```bash
# This should FAIL (timeout or connection refused)
redis-cli -h ems-redis.fly.dev -p 6379 ping
```

Expected: Connection timeout or refusal (good!)

### 2. Check Internal Connectivity

SSH into ems-api and test internal connection:

```bash
# SSH into ems-api instance
fly ssh console --app ems-api

# Inside the container, test Redis connection
redis-cli -h ems-redis.internal -p 6379 ping
# Expected output: PONG
```

### 3. Check App Logs

Monitor logs for Redis connection errors:

```bash
# ems-api logs
fly logs --app ems-api | grep -i redis

# ems-public logs
fly logs --app ems-public | grep -i redis
```

Look for successful connections:
```
[REDIS] Connected to redis://ems-redis.internal:6379
[IP_BAN] Redis connected for IP banning service
```

### 4. Test Application Functionality

- **Betting**: Place a bet (tests BullMQ workers + Redis pub/sub)
- **IP Banning**: Trigger a 404 on ems-public (tests ems-public Redis connection)
- **Leaderboard**: Check leaderboard updates (tests cache + pub/sub)
- **Pong**: Start a pong game (tests game state in Redis)

---

## Connection String Format

### Old (Public)
```bash
# ❌ Don't use these anymore
REDIS_URL=redis://ems-redis.fly.dev:6379
REDIS_URL=redis://[public-ip]:6379
```

### New (Internal)
```bash
# ✅ Use this
REDIS_URL=redis://ems-redis.internal:6379
```

### Local Development
```bash
# ✅ Keep localhost for local dev
REDIS_URL=redis://localhost:6379
# or
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Security Benefits

### Network Isolation
- ✅ **No public IP exposure** - Redis is not accessible from the internet
- ✅ **Fly.io 6PN only** - Only apps in your Fly.io organization can connect
- ✅ **Encrypted transport** - Fly.io 6PN provides WireGuard encryption

### Redis Configuration
- ✅ **protected-mode enabled** - Redis enforces connection restrictions
- ✅ **Bind to internal interface** - `fly-local-6pn` prevents external binds
- ✅ **Dangerous commands disabled** - `FLUSHDB`, `FLUSHALL`, `CONFIG` are blocked

### Attack Surface Reduction
- ❌ **Before**: Redis exposed to 100% of internet traffic
- ✅ **After**: Redis accessible only to your apps in Fly.io org

---

## Troubleshooting

### Issue: Apps can't connect to Redis

**Symptoms:**
```
Error: connect ETIMEDOUT
Error: Redis connection refused
```

**Solutions:**
1. Verify REDIS_URL uses `.internal` hostname:
   ```bash
   fly secrets list --app ems-api | grep REDIS_URL
   ```

2. Ensure ems-redis is deployed and running:
   ```bash
   fly status --app ems-redis
   ```

3. Check apps are in the same Fly.io organization:
   ```bash
   fly orgs list
   fly apps list
   ```

### Issue: "NOAUTH Authentication required"

**Cause**: Redis is configured for password auth but REDIS_URL doesn't include password

**Solution**:
Since we're using network-only security (no password), verify `redis.conf` has:
```
protected-mode yes
# NO requirepass directive
```

### Issue: Connection works locally but not in production

**Cause**: Local Redis uses different config than production

**Solution**:
- Local dev: Use `redis://localhost:6379` (via .env)
- Production: Use `redis://ems-redis.internal:6379` (via Fly secrets)

---

## Rollback Plan

If you need to rollback to public Redis:

### 1. Revert fly-redis/fly.toml

```toml
# Remove [experimental] section
# Add back public ports:
[[services]]
  internal_port = 6379
  protocol = 'tcp'

  [[services.ports]]
    port = 6379
```

### 2. Revert fly-redis/redis.conf

```conf
bind 0.0.0.0
protected-mode no
```

### 3. Redeploy Redis

```bash
fly deploy --app ems-redis --image registry.fly.io/ems-redis:latest
```

### 4. Update Connection Strings

```bash
fly secrets set REDIS_URL="redis://ems-redis.fly.dev:6379" --app ems-api
fly secrets set REDIS_URL="redis://ems-redis.fly.dev:6379" --app ems-public
```

---

## Additional Security Considerations

### Future Enhancements

1. **Add Password Authentication** (optional, defense-in-depth):
   ```conf
   # In redis.conf
   requirepass your-secure-password-here
   ```

   ```bash
   # Update connection strings
   REDIS_URL="redis://:your-secure-password-here@ems-redis.internal:6379"
   ```

2. **Enable TLS/SSL** (advanced):
   - Requires Redis 6+ with TLS support
   - Use `rediss://` protocol
   - More complex but adds encryption layer

3. **Redis ACL** (granular permissions):
   ```conf
   # Different users for different apps
   user ems-api on >password ~* &* +@all
   user ems-public on >password ~ip_* +@read +@write
   ```

### Monitoring

Set up alerts for:
- Redis connection failures
- Redis memory usage (maxmemory)
- Slow queries (slowlog)

---

## Summary

✅ **Redis is now internal-only** - Not accessible from public internet
✅ **protected-mode enabled** - Additional security layer
✅ **Network isolated** - Only your Fly.io apps can connect
✅ **Zero downtime migration** - Update secrets → restart apps

### Next Steps After Migration

1. Monitor logs for 24 hours to ensure no connection issues
2. Test all Redis-dependent features (betting, IP banning, leaderboard, pong)
3. Consider adding password auth for defense-in-depth
4. Document REDIS_URL in `.env.example` update

---

## Related Documentation

- [Fly.io Private Networking](https://fly.io/docs/reference/privatenetwork/)
- [Redis Security Best Practices](https://redis.io/docs/management/security/)
- [docs/IP_BANNING.md](./IP_BANNING.md) - ems-public uses Redis
