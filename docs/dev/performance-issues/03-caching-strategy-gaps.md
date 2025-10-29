# Caching Strategy Gaps

**Severity:** 🟡 MEDIUM - Incremental Improvements
**Impact:** 200-500ms additional latency on frequently accessed data
**Date Analyzed:** 2025-01-18
**Status:** DIAGNOSED - QUICK WINS AVAILABLE

---

## Executive Summary

Previous performance work (see `PERFORMANCE_IMPROVEMENTS.md`) successfully implemented Redis caching for **analytics** and **timeline** endpoints, achieving 85-97% latency reductions. However, several high-traffic endpoints remain **completely uncached**, resulting in redundant database queries for data that rarely changes.

**Key Gaps:**
1. **User stats/profile data** - Queried on every dashboard/profile load
2. **Prediction data** - Mostly static until resolved, but queried repeatedly
3. **Leaderboard rankings** - User-specific ranks queried individually
4. **Achievement progress** - Loaded on every profile view
5. **Active prediction counts** - Queried for dashboard widgets

**Opportunity:** 200-500ms latency reduction with <2 days of focused caching implementation

---

## Current Caching Implementation ✅

### What's Already Cached (GOOD)

**File:** `apps/server/src/utils/analyticsCache.ts`

| Endpoint | Cache TTL | Key Pattern | Status |
|----------|-----------|-------------|--------|
| `/api/analytics/platform-health` | 60s | `analytics:platform-health` | ✅ Cached |
| `/api/analytics/trends` | 300s | `analytics:trends:{days}` | ✅ Cached |
| `/api/analytics/cross-feature` | 300s | `analytics:cross-feature` | ✅ Cached |
| `/api/analytics/content` | 300s | `analytics:content` | ✅ Cached |
| `/api/timeline/articles` | 120s | `timeline:articles:{limit}:{cursor}` | ✅ Cached |
| `/api/timeline/search` | 180s | `timeline:search:{query}:{limit}` | ✅ Cached |
| `/api/timeline/trending` | 300s | `timeline:trending:{limit}` | ✅ Cached |
| `/api/leaderboard/all-time` | 120s | `leaderboard:all-time` | ✅ Cached (service-level) |

**Proven Results (from `PERFORMANCE_IMPROVEMENTS.md`):**
- Analytics dashboard: 15-23s → <500ms (97% faster)
- Timeline: 2-4s → <500ms (90% faster)
- Platform health: 3-5s → <200ms (95% faster)

**Cache Utility Pattern:**
```typescript
export async function withCache<T>(
  key: string,
  ttl: number,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const data = await fallback();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  } catch (error) {
    // Graceful degradation if Redis fails
    return fallback();
  }
}
```

---

## Gap #1: User Stats & Profile Data 🔴

**Endpoints:**
- `GET /api/users/:userId/stats`
- `GET /api/users/:userId/enhanced-stats`
- `GET /api/users/profile/:userId`

**Current State:** ❌ No caching
**Traffic:** HIGH (loaded on every dashboard/profile visit)
**Query Cost:** 5-10 database queries per request
**Current p99:** 1500-3000ms (enhanced stats)

### Problem

```typescript
// File: apps/server/src/controllers/user.controller.ts:338-366
export async function getUserStatsHandler(req, res, next) {
  const userId = Number(req.params.userId);

  // ❌ No caching - hits database every time
  const stats: UserStatsView = await userService.getUserStats(userId);

  res.json(stats);
}

// File: apps/server/src/controllers/user.controller.ts:376-403
export async function getEnhancedUserStatsHandler(req, res, next) {
  const userId = Number(req.params.userId);

  // ❌ No caching - 5-10 queries every time
  const enhancedStats = await enhancedUserStatsService.getEnhancedStats(userId);

  res.json(enhancedStats);
}
```

### Recommended Solution

**Cache TTL:** 30 seconds (balances freshness with performance)
**Invalidation:** On bet placement, achievement unlock, balance change

**Implementation:**
```typescript
// apps/server/src/services/enhancedUserStats.service.ts

import { withCache } from '../utils/analyticsCache';

export class EnhancedUserStatsService {
  async getEnhancedStats(userId: number): Promise<EnhancedUserStats> {
    const cacheKey = `user:stats:enhanced:${userId}`;

    return withCache(cacheKey, 30, async () => {
      // Existing implementation with 5-10 queries
      const [basicStats, categoryAccuracy, currentStreak, trends, ranking] = await Promise.all([
        this.getBasicStats(userId),
        this.calculateCategoryAccuracy(userId),
        this.calculateCurrentStreak(userId),
        this.calculateTrends(userId),
        this.getUserRanking(userId),
      ]);

      return {
        totalBets: basicStats.totalBets,
        winRate,
        profitLoss: Number(basicStats.profit),
        categoryAccuracy,
        currentStreak,
        bestCategory,
        // ... rest of stats
      };
    });
  }

  async invalidateUserStatsCache(userId: number): Promise<void> {
    await redis.del(`user:stats:enhanced:${userId}`);
    await redis.del(`user:stats:basic:${userId}`);
  }
}
```

**Invalidation Triggers:**
```typescript
// In betting.service.ts after bet placement
await enhancedUserStatsService.invalidateUserStatsCache(userId);

// In achievement unlock handler
await enhancedUserStatsService.invalidateUserStatsCache(userId);

// In payout worker after processing
await enhancedUserStatsService.invalidateUserStatsCache(userId);
```

**Expected Impact:**
- **First request:** 1500ms (cache miss, populate cache)
- **Subsequent requests:** <50ms (cache hit)
- **Cache hit rate:** 90%+ (users refresh dashboards frequently within 30s)
- **Average reduction:** 1000-1400ms per request

---

## Gap #2: Prediction Data 🟡

**Endpoints:**
- `GET /api/predictions` (list predictions)
- `GET /api/predictions/:id` (single prediction)

**Current State:** ❌ No caching
**Traffic:** HIGH (browsing, betting)
**Query Cost:** 3-5 database queries per prediction
**Current p99:** 800-1500ms

### Problem

Predictions are **mostly static** once created:
- Title, description, options don't change
- Only odds change (recalculated on bets)
- Only resolved status changes (once per prediction lifetime)

Yet we query the database for prediction data on **every page load**.

### Recommended Solution

**Cache TTL:**
- Active predictions: 60 seconds (odds change frequently)
- Resolved predictions: 3600 seconds (1 hour - data never changes)

**Cache Key Pattern:** `prediction:{id}` or `predictions:active:{limit}:{offset}`

**Implementation:**
```typescript
// apps/server/src/services/predictions.service.ts

export class PredictionService {
  async getPrediction(predictionId: number): Promise<PredictionView> {
    const prediction = await this.repo.findById(predictionId);

    // Determine cache TTL based on status
    const ttl = prediction.resolved ? 3600 : 60;
    const cacheKey = `prediction:${predictionId}`;

    return withCache(cacheKey, ttl, async () => {
      // Existing complex query with options, bets, etc.
      return this.enrichPredictionData(prediction);
    });
  }

  async getActivePredictions(limit: number, offset: number) {
    const cacheKey = `predictions:active:${limit}:${offset}`;

    return withCache(cacheKey, 60, async () => {
      return this.repo.findMany({
        where: { resolved: false },
        take: limit,
        skip: offset,
        include: {
          options: true,
          _count: { select: { bets: true } }
        }
      });
    });
  }

  async invalidatePredictionCache(predictionId: number): Promise<void> {
    // Invalidate single prediction
    await redis.del(`prediction:${predictionId}`);

    // Invalidate prediction lists (wildcard delete)
    const keys = await redis.keys('predictions:active:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

**Invalidation Triggers:**
```typescript
// When odds recalculate (after bet)
await predictionService.invalidatePredictionCache(predictionId);

// When prediction resolves
await predictionService.invalidatePredictionCache(predictionId);

// When new prediction created (invalidate lists only)
const keys = await redis.keys('predictions:active:*');
await redis.del(...keys);
```

**Expected Impact:**
- **Active predictions:** 800ms → <100ms (87% reduction)
- **Resolved predictions:** 800ms → <20ms (98% reduction)
- **Cache hit rate:** 70-80% (many users browsing same predictions)

---

## Gap #3: User-Specific Leaderboard Ranks 🟡

**Endpoints:**
- `GET /api/leaderboard/user-rank/:userId`
- Embedded in `/api/users/:userId/enhanced-stats`

**Current State:** ⚠️ Partially cached (service-level Map, not Redis)
**Traffic:** MEDIUM (profile views, dashboard widgets)
**Query Cost:** 2-3 database queries (all-time rank + daily rank)
**Current p99:** 500-1000ms

### Problem

**File:** `apps/server/src/services/leaderboard.service.ts`

The leaderboard service caches **full leaderboard** but not **individual user ranks**:

```typescript
// Full leaderboard cached
async getAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
  if (this.cache.allTime && Date.now() - this.cache.allTime.timestamp < this.CACHE_TTL) {
    return this.cache.allTime.data;
  }
  // ... fetch and cache
}

// ❌ User rank NOT cached
async getUserRank(userId: number, type: 'allTime' | 'daily'): Promise<UserRank> {
  // Queries database every time
  const rank = await this.repo.getUserRank(userId, type);
  return rank;
}
```

### Recommended Solution

**Cache TTL:** 120 seconds (same as full leaderboard)
**Cache Key Pattern:** `leaderboard:rank:{userId}:{type}`

**Implementation:**
```typescript
async getUserRank(userId: number, type: 'allTime' | 'daily'): Promise<UserRank> {
  const cacheKey = `leaderboard:rank:${userId}:${type}`;

  return withCache(cacheKey, 120, async () => {
    return this.repo.getUserRank(userId, type);
  });
}

async invalidateUserRankCache(userId: number): Promise<void> {
  await redis.del(`leaderboard:rank:${userId}:allTime`);
  await redis.del(`leaderboard:rank:${userId}:daily`);
}
```

**Invalidation Triggers:**
```typescript
// After bet resolves and affects user's profit
await leaderboardService.invalidateUserRankCache(userId);

// When leaderboard refresh job runs (every hour)
await leaderboardService.invalidateAllUserRanks(); // Wildcard delete
```

**Expected Impact:**
- **First request:** 500ms (cache miss)
- **Subsequent requests:** <20ms (cache hit)
- **Cache hit rate:** 85% (ranks change infrequently)
- **Average reduction:** 400-800ms per request

---

## Gap #4: Achievement Progress 🟡

**Endpoints:**
- `GET /api/users/:userId/achievements`
- `GET /api/users/:userId/achievements/recent`

**Current State:** ❌ No caching
**Traffic:** MEDIUM (profile views)
**Query Cost:** 2-3 database queries (77 achievements + user progress)
**Current p99:** 300-800ms

### Problem

**File:** `apps/server/src/services/achievements/adminAchievement.service.ts:495-537`

```typescript
async getUserAchievementProgress(userId: number) {
  // Query 1: Get all 77 achievements
  const allAchievements = await achievementRepository.findAllAchievements();

  // Query 2: Get user's progress for all achievements
  const userAchievements = await achievementRepository.findUserAchievements(userId);

  // Merge in memory
  const userAchievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));

  return allAchievements.map((achievement) => {
    const userAchievement = userAchievementMap.get(achievement.id);
    return {
      id: achievement.name,
      title: achievement.title,
      progress: userAchievement?.progress || 0,
      targetValue: achievement.targetValue,
      isCompleted: !!userAchievement?.completedAt,
    };
  });
}
```

**Issues:**
- Fetches ALL 77 achievements from DB (static data)
- Fetches user progress for 77 achievements
- No caching despite data changing infrequently

### Recommended Solution

**Two-level caching:**
1. **All achievements** - Cache globally (static data, 1 hour TTL)
2. **User progress** - Cache per user (30 second TTL)

**Implementation:**
```typescript
async getUserAchievementProgress(userId: number) {
  // Cache 1: All achievements (shared across users)
  const allAchievements = await withCache('achievements:all', 3600, async () => {
    return achievementRepository.findAllAchievements();
  });

  // Cache 2: User-specific progress
  const userProgressKey = `user:${userId}:achievements:progress`;
  const userAchievements = await withCache(userProgressKey, 30, async () => {
    return achievementRepository.findUserAchievements(userId);
  });

  // Merge (fast in-memory operation)
  const userAchievementMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));

  return allAchievements.map((achievement) => {
    const userAchievement = userAchievementMap.get(achievement.id);
    return {
      id: achievement.name,
      title: achievement.title,
      progress: userAchievement?.progress || 0,
      targetValue: achievement.targetValue,
      isCompleted: !!userAchievement?.completedAt,
    };
  });
}

async invalidateUserAchievementCache(userId: number): Promise<void> {
  await redis.del(`user:${userId}:achievements:progress`);
}
```

**Invalidation Triggers:**
```typescript
// After achievement unlock
await adminAchievementService.invalidateUserAchievementCache(userId);

// After achievement progress update (in achievement engine)
await adminAchievementService.invalidateUserAchievementCache(userId);
```

**Expected Impact:**
- **First request:** 300-800ms (cache miss)
- **Subsequent requests:** <50ms (cache hit)
- **Cache hit rate:** 80% (users view achievements multiple times per session)
- **Average reduction:** 250-750ms per request

---

## Gap #5: Active Prediction Counts 🟢

**Endpoint:** Dashboard widget counts
**Current State:** ❌ No caching
**Traffic:** HIGH (every dashboard load)
**Query Cost:** 1 COUNT query
**Current p99:** 100-300ms

### Problem

Dashboard shows "Active Predictions: 42" - requires COUNT query every load.

### Recommended Solution

**Cache TTL:** 60 seconds (counts don't need to be real-time)

**Implementation:**
```typescript
async getActivePredictionCount(): Promise<number> {
  return withCache('predictions:count:active', 60, async () => {
    return prisma.prediction.count({
      where: { resolved: false }
    });
  });
}
```

**Invalidation Triggers:**
```typescript
// When new prediction created
await redis.del('predictions:count:active');

// When prediction resolved
await redis.del('predictions:count:active');
```

**Expected Impact:**
- **First request:** 100-300ms
- **Subsequent requests:** <10ms
- **Cache hit rate:** 95%
- **Average reduction:** 90-285ms

---

## Cache Invalidation Strategy

### Centralized Invalidation Utility

**File:** `apps/server/src/utils/cacheInvalidation.ts`

```typescript
export class CacheInvalidation {
  // Pattern-based invalidation
  static async invalidatePattern(pattern: string): Promise<number> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  }

  // User-related invalidation
  static async invalidateUser(userId: number): Promise<void> {
    await Promise.all([
      redis.del(`user:stats:enhanced:${userId}`),
      redis.del(`user:stats:basic:${userId}`),
      redis.del(`user:${userId}:achievements:progress`),
      redis.del(`leaderboard:rank:${userId}:allTime`),
      redis.del(`leaderboard:rank:${userId}:daily`),
    ]);
  }

  // Prediction-related invalidation
  static async invalidatePrediction(predictionId: number): Promise<void> {
    await Promise.all([
      redis.del(`prediction:${predictionId}`),
      this.invalidatePattern('predictions:active:*'),
      redis.del('predictions:count:active'),
    ]);
  }

  // Achievement-related invalidation
  static async invalidateAchievements(): Promise<void> {
    await Promise.all([
      redis.del('achievements:all'),
      this.invalidatePattern('user:*:achievements:progress'),
    ]);
  }
}
```

### Automatic Invalidation Hooks

**Bet Placement:**
```typescript
// After bet placed successfully
await CacheInvalidation.invalidateUser(userId);
await CacheInvalidation.invalidatePrediction(predictionId);
```

**Prediction Resolution:**
```typescript
// After prediction resolved
await CacheInvalidation.invalidatePrediction(predictionId);
await CacheInvalidation.invalidatePattern('leaderboard:*'); // Ranks may change
```

**Achievement Unlock:**
```typescript
// After achievement unlocked
await CacheInvalidation.invalidateUser(userId);
```

---

## Cache Memory Management

### Redis Memory Configuration

**Current Setup:** Unknown
**Recommended:**
```bash
# In production .env or Redis config
REDIS_MAXMEMORY=512mb
REDIS_MAXMEMORY_POLICY=allkeys-lru  # Evict least recently used keys when full
```

### Cache Size Estimation

| Cache Type | Avg Size | TTL | Est. Keys | Total Memory |
|------------|----------|-----|-----------|--------------|
| User stats | 2KB | 30s | 500 active | 1MB |
| Predictions | 5KB | 60s | 100 active | 500KB |
| Achievements (global) | 50KB | 1hr | 1 key | 50KB |
| Achievement progress | 10KB | 30s | 500 active | 5MB |
| Leaderboard ranks | 500B | 2min | 1000 active | 500KB |
| Analytics (existing) | 20KB | 5min | 10 keys | 200KB |
| **TOTAL** | | | ~2100 keys | **~7.25MB** |

**Conclusion:** Cache memory usage is negligible (<10MB), well within acceptable limits.

---

## Implementation Checklist

### Phase 1: User Stats Caching (P0 - Highest Impact)
- [ ] Add caching to `getEnhancedStats()`
- [ ] Add caching to `getUserStats()`
- [ ] Implement `invalidateUserStatsCache()` utility
- [ ] Add invalidation hooks in betting, payout, achievement flows
- [ ] Load test to verify p99 < 300ms

### Phase 2: Prediction Caching (P1)
- [ ] Add caching to `getPrediction()`
- [ ] Add caching to `getActivePredictions()`
- [ ] Implement `invalidatePredictionCache()` utility
- [ ] Add invalidation hooks on odds recalculation
- [ ] Load test to verify p99 < 300ms

### Phase 3: Achievement Progress Caching (P1)
- [ ] Cache all achievements globally
- [ ] Cache user progress individually
- [ ] Implement `invalidateUserAchievementCache()` utility
- [ ] Add invalidation hooks in achievement engine
- [ ] Load test to verify p99 < 200ms

### Phase 4: Leaderboard Rank Caching (P2)
- [ ] Add caching to `getUserRank()`
- [ ] Implement `invalidateUserRankCache()` utility
- [ ] Add invalidation hooks in leaderboard refresh job
- [ ] Load test to verify p99 < 100ms

### Phase 5: Count Caching (P2)
- [ ] Cache active prediction count
- [ ] Cache active user count
- [ ] Add invalidation hooks
- [ ] Load test to verify p99 < 50ms

---

## Monitoring & Validation

### Cache Hit Rate Tracking

**Add to Prometheus metrics:**
```typescript
// apps/server/src/lib/cacheMetrics.ts
import { Counter, Gauge } from 'prom-client';

export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_key_prefix']
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_key_prefix']
});

export const cacheSize = new Gauge({
  name: 'cache_keys_count',
  help: 'Number of keys in cache'
});

// In withCache utility
if (cached) {
  cacheHits.inc({ cache_key_prefix: key.split(':')[0] });
  return JSON.parse(cached);
}

cacheMisses.inc({ cache_key_prefix: key.split(':')[0] });
```

### Cache Effectiveness Validation

**Target Metrics:**
- Overall cache hit rate: >80%
- User stats hit rate: >90%
- Prediction hit rate: >70%
- Achievement hit rate: >80%

**Monitoring:**
```bash
# Check Redis cache size
redis-cli INFO memory

# Check cache hit rates (Grafana dashboard)
# - cache_hits_total / (cache_hits_total + cache_misses_total)
```

---

## Success Criteria

- [ ] User stats endpoint: p99 < 300ms (down from 1500-3000ms)
- [ ] Prediction endpoints: p99 < 300ms (down from 800-1500ms)
- [ ] Achievement progress: p99 < 200ms (down from 300-800ms)
- [ ] Overall cache hit rate: >80%
- [ ] No cache-related errors in production
- [ ] Redis memory usage: <50MB for all caches

---

## Next Steps

1. [ ] Implement Phase 1 (User Stats Caching) - 4 hours
2. [ ] Load test to validate improvement - 1 hour
3. [ ] Implement Phase 2 (Prediction Caching) - 3 hours
4. [ ] Implement Phase 3 (Achievement Caching) - 3 hours
5. [ ] Monitor cache hit rates in production - 48 hours
6. [ ] Document final performance metrics
7. [ ] Add cache monitoring to Grafana dashboards
