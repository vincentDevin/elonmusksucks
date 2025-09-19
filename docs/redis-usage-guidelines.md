# Redis Usage Guidelines and Best Practices

## Overview

This document outlines best practices for Redis usage in the Elon Musk Sucks application, optimized for **Fly.io deployment with Upstash Redis** managed service.

## Production Architecture

### Managed Redis (Upstash)
- **Provider**: Upstash Redis on Fly.io
- **Security**: Managed by Upstash (TLS, authentication, ACL)
- **Scaling**: Automatic scaling handled by provider
- **Backup**: Automated backups by provider
- **Monitoring**: Built-in Upstash metrics + custom health monitoring

### Connection Configuration

```typescript
// Environment variables for production
REDIS_URL=rediss://username:password@fly-redis.upstash.io:6380
REDIS_PASSWORD=your_upstash_password
REDIS_USERNAME=your_upstash_username
```

## Redis Usage Patterns

### 1. BullMQ Job Management

#### ✅ Optimized Configuration
```typescript
// All queues now use centralized retention policies
import { getQueueConfig } from '../lib/bullmqConfig';

const queue = new Queue(QUEUE_NAMES.PAYOUTS, getQueueConfig('PAYOUTS'));
```

#### 📋 Current Retention Policies
- **Completed jobs**: Keep 10 most recent
- **Failed jobs**: Keep 5 for debugging
- **Job attempts**: 3 with exponential backoff
- **Auto-cleanup**: Runs every 6 hours

### 2. Event Bus with Connection Pooling

#### ✅ Optimized for Managed Redis
```typescript
// EventBus now uses connection pooling by default
const eventBus = new EventBus(); // pooling=true by default

// Pool configuration optimized for Upstash:
// - Max connections: 8 (within Upstash limits)
// - Keep-alive: 30 seconds
// - Lazy connection: Connect on first use
```

### 3. Cache TTL Management

#### ✅ Intelligent TTL Policies
```typescript
import { CACHE_TTL, CACHE_KEYS } from '../lib/cacheTTL';

// Profile image caching with intelligent TTL
const ttl = getProfileImageTTL(signatureExpirySeconds);
await redis.setex(CACHE_KEYS.PROFILE_IMAGE_URL(userId), ttl, url);

// Daily login tracking with midnight expiry
const ttl = getTTLUntilMidnight();
await redis.setex(CACHE_KEYS.DAILY_LOGIN(userId, date), ttl, '1');
```

#### 📊 TTL Configuration
- **Profile images**: 1 hour (matches S3 signatures)
- **Activity lists**: 7 days with automatic trimming
- **Chat presence**: 1 hour with heartbeat renewal
- **User sessions**: 30 days
- **Leaderboards**: 15 minutes

### 4. Memory Optimization

#### ✅ Implemented Optimizations
- **Activity list size limit**: 100 entries max with TTL
- **BullMQ job retention**: Automatic cleanup every 6 hours  
- **Profile image cache**: TTL-based expiration
- **Chat presence**: TTL with heartbeat renewal

#### 📈 Memory Impact
- **Before optimization**: 2.49MB, 152 keys
- **After cleanup**: 2.51MB, 92 keys (62 jobs cleaned)
- **Ongoing maintenance**: Automated retention policies

## Development vs Production

### Local Development
```bash
# Start local Redis
redis-server

# No authentication required
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Production (Fly.io + Upstash)
```bash
# Upstash Redis with TLS
REDIS_URL=rediss://username:password@fly-redis.upstash.io:6380
REDIS_USERNAME=your_username
REDIS_PASSWORD=your_password
```

## Monitoring and Health Checks

### Health Monitoring System
```typescript
import { redisHealthMonitor } from '../lib/redisHealthMonitor';

// Start monitoring (1-minute intervals)
redisHealthMonitor.startMonitoring(60000);

// Check current health
const status = await redisHealthMonitor.getHealthStatus();
// Returns: 'healthy' | 'degraded' | 'unhealthy'
```

### Key Metrics Tracked
- **Connection health**: Response time, connectivity
- **Memory usage**: Used memory, fragmentation ratio
- **Cache performance**: Hit/miss ratio, keyspace stats
- **Connection pooling**: Active/idle connections
- **Command performance**: Ops/second, slow queries

### Health Thresholds
- **Max response time**: 1 second
- **Min cache hit ratio**: 80%
- **Max memory fragmentation**: 2.0x
- **Connection pool**: 8 max connections

## Usage Patterns by Service

### UnifiedActivityService
```typescript
// ✅ Optimized with TTL and size limits
await redis.lpush(ACTIVITY_LIST, json);
await redis.ltrim(ACTIVITY_LIST, 0, 99); // Keep 100 max
await redis.expire(ACTIVITY_LIST, 7 * 24 * 60 * 60); // 7 days
```

### UserService
```typescript
// ✅ Profile image caching with intelligent TTL
const cacheTTL = getProfileImageTTL(signatureExpiry);
await redis.setex(cacheKey, cacheTTL, url);

// ✅ Daily login tracking with midnight expiry
const ttl = getTTLUntilMidnight();
await redis.setex(loginKey, ttl, '1');
```

### ChatHandlers
```typescript
// ✅ Presence data with TTL to prevent stale entries
await redis.sadd(ONLINE_USERS_SET, userId);
await redis.expire(ONLINE_USERS_SET, CACHE_TTL.CHAT_PRESENCE);
```

### LeaderboardService  
```typescript
// ✅ Uses centralized BullMQ configuration
const refreshQueue = new Queue(QUEUE_NAMES.LEADERBOARD_REFRESH, 
  getQueueConfig('LEADERBOARD_REFRESH'));
```

## Troubleshooting

### Common Issues

#### High Memory Usage
- Check activity list growth: `redis.llen('unified:activity:recent')`
- Monitor BullMQ jobs: Run cleanup script if needed
- Check cache hit ratios: Low ratios indicate cache misses

#### Connection Issues
- Verify Upstash credentials in environment
- Check connection pool stats: `eventBus.getPoolStats()`
- Monitor health alerts: `redis:health:alert` events

#### Performance Issues
- Monitor response times in health metrics
- Check slow log: `redis.slowlog('get', 10)`
- Review connection pool utilization

### Cleanup Scripts
```bash
# Clean stale BullMQ jobs
npx tsx src/scripts/cleanup-redis.ts

# Check Redis health
npx tsx -e "
import { redisHealthMonitor } from './src/lib/redisHealthMonitor.js';
const metrics = await redisHealthMonitor.collectMetrics();
console.log(JSON.stringify(metrics, null, 2));
process.exit(0);
"
```

## Security (Managed Environment)

### Upstash Security Features
- **TLS encryption**: All connections encrypted
- **Authentication**: Username/password required
- **Network isolation**: VPC/private networking
- **Access control**: IP whitelisting available
- **Audit logging**: Connection and command logging

### Application-Level Security
- **Credential management**: Use environment variables only
- **Connection validation**: Health monitoring system
- **Input sanitization**: Validate all Redis keys and values
- **Error handling**: Don't expose Redis errors to clients

## Performance Optimization

### Connection Pooling
- **Pool size**: 8 connections (within Upstash limits)
- **Keep-alive**: 30 seconds for managed Redis latency
- **Lazy connections**: Connect on first command
- **Health checks**: Automatic connection validation

### Caching Strategy
- **Write-through**: Cache updates synchronously with DB
- **TTL-based expiry**: Automatic cleanup prevents memory leaks
- **Hit ratio monitoring**: Target >80% cache hit ratio
- **Key naming**: Consistent patterns for easy management

### Memory Management
- **List trimming**: Activity lists limited to 100 entries
- **Job retention**: BullMQ jobs cleaned automatically
- **TTL policies**: All temporary data has expiration
- **Fragmentation monitoring**: Alert if >2.0x fragmentation

## Migration Checklist

### Local to Production Migration
- [ ] Update Redis connection URL to Upstash
- [ ] Add authentication credentials
- [ ] Enable connection pooling (default enabled)
- [ ] Start health monitoring
- [ ] Verify TTL policies are working
- [ ] Test BullMQ job retention
- [ ] Monitor memory usage and performance
- [ ] Set up alerting for health issues

### Emergency Procedures
- **Connection failure**: Health monitor will alert, automatic retry logic
- **Memory issues**: Cleanup scripts available, automatic job retention
- **Performance degradation**: Monitoring system provides detailed metrics
- **Data loss**: Managed backups by Upstash, critical data in PostgreSQL

## Future Enhancements

### Potential Improvements
- **Redis Streams**: For more complex event sourcing
- **Lua scripts**: For atomic multi-key operations
- **Cluster support**: If scaling beyond single instance
- **Advanced monitoring**: Integration with APM tools
- **Caching optimization**: More sophisticated cache warming strategies