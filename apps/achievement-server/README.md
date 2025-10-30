# Achievement Server - Event-Driven Microservice

**Dedicated microservice for achievement processing** that subscribes to 75+ Redis event channels and processes achievement unlocks asynchronously, decoupled from the main API server.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Event-Driven Processing](#event-driven-processing)
- [Achievement Engine](#achievement-engine)
- [Repositories](#repositories)
- [Infrastructure](#infrastructure)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **achievement-server** is a standalone microservice that monitors Redis pub/sub channels for user activity events and processes achievement unlocks in real-time.

**Key Features:**

- **Event-driven architecture** - Subscribes to 75+ Redis channels
- **Async processing** - Non-blocking achievement checks
- **Decoupled from API** - Isolated crashes don't affect main server
- **77 achievements** across 8 categories
- **Performance optimized** - Event coalescing, connection pooling
- **Prometheus metrics** - Monitor processing times & unlock rates

**Why a Dedicated Server?**

- **Isolation** - Achievement processing crashes don't affect API
- **Scalability** - Can scale independently based on event load
- **Performance** - Offload CPU-intensive achievement checks from API server
- **Maintainability** - Easier to update achievement logic without API downtime

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Main API Server (Port 5000)                       │
├──────────────────────────────────────────────────────────────────────┤
│  Business Logic (Services)                                            │
│  ├─ User places bet                                                   │
│  ├─ User wins match                                                   │
│  ├─ User unlocks achievement                                          │
│  └─ Publish events to Redis                                           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ Redis Pub/Sub (75+ channels)
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Redis Server                                    │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Channels:                                                        │ │
│  │  - bet:placed, bet:won, bet:lost                                 │ │
│  │  - parlay:placed, parlay:won                                     │ │
│  │  - pong:match:ended, pong:elo:updated                            │ │
│  │  - balance:updated, transaction:created                          │ │
│  │  - leaderboard:rank:changed                                      │ │
│  │  - post:created, reaction:added                                  │ │
│  │  - ... (75+ total channels)                                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ Subscribe to all event channels
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                Achievement Server (Port 5002)                         │
├──────────────────────────────────────────────────────────────────────┤
│  Redis Subscriber (EventBus)                                          │
│  ├─ Subscribes to 75+ channels                                       │
│  ├─ Event coalescing (batch processing)                              │
│  └─ Connection pooling (reuse connections)                           │
├──────────────────────────────────────────────────────────────────────┤
│  Achievement Engine                                                   │
│  ├─ Map events to achievement triggers                               │
│  ├─ Fetch user stats from database                                   │
│  ├─ Check achievement conditions                                     │
│  ├─ Unlock achievements (if conditions met)                          │
│  └─ Update progress (incremental achievements)                       │
├──────────────────────────────────────────────────────────────────────┤
│  Repositories                                                         │
│  ├─ AchievementRepository (achievement data)                         │
│  ├─ StatsRepository (user statistics)                                │
│  └─ ActivityRepository (activity logging)                            │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ Database queries (Prisma)
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                           │
│  ├─ UserAchievement table (unlocked achievements)                    │
│  ├─ User table (user stats, balance)                                 │
│  ├─ Bet table (betting history)                                      │
│  ├─ PongMatch table (pong history)                                   │
│  └─ ... (other tables)                                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Runtime

- **Node.js ≥24.0.0** - Strict requirement
- **TypeScript 5.8.3** - Type safety

### Database & ORM

- **Prisma Client 6.10.1** - Type-safe database access
- **PostgreSQL 16** - Primary database

### Event System

- **IORedis 5.6.1** - Redis client with pub/sub
- **Redis 7+** - Event pub/sub broker

### Monitoring

- **prom-client 15.1.3** - Prometheus metrics

### Development Tools

- **dotenv 16.5.0** - Environment variables
- **nodemon 3.1.10** - Hot reload
- **ts-node 10.9.2** - TypeScript execution

---

## Directory Structure

```
apps/achievement-server/
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment variable validation
│   │   └── redis.ts            # Redis client configuration
│   │
│   ├── handlers/
│   │   └── achievementEventHandler.ts  # Redis event subscriber
│   │
│   ├── services/
│   │   └── achievements/
│   │       └── achievementEngine.service.ts  # Achievement processing logic
│   │
│   ├── repositories/
│   │   ├── AchievementRepository.ts    # Achievement data access
│   │   ├── StatsRepository.ts          # User stats queries
│   │   ├── ActivityRepository.ts       # Activity logging
│   │   └── interfaces/                 # Repository interfaces
│   │       ├── IAchievementRepository.ts
│   │       ├── IStatsRepository.ts
│   │       └── IActivityRepository.ts
│   │
│   ├── lib/
│   │   ├── EventBus.ts                 # Redis pub/sub wrapper
│   │   ├── EventCoalescer.ts           # Batch event processing
│   │   ├── RedisPool.ts                # Redis connection pool
│   │   └── prometheusMetrics.ts        # Metrics collection
│   │
│   ├── utils/
│   │   └── bigintSerializer.ts         # BigInt JSON serialization
│   │
│   ├── db.ts                   # Prisma client singleton
│   └── index.ts                # Main entry point
│
├── dist/                       # Compiled TypeScript (gitignored)
│
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── Dockerfile                  # Production Docker build
└── fly.toml                    # Fly.io deployment config
```

---

## Event-Driven Processing

### Redis Event Subscription

**Achievement server subscribes to 75+ event channels:**

```typescript
// handlers/achievementEventHandler.ts
import { EventBus } from '../lib/EventBus';
import { achievementEngine } from '../services/achievements/achievementEngine.service';
import { REDIS_CHANNELS } from '@ems/types';

export function setupAchievementRedisHandlers() {
  const eventBus = new EventBus();

  // Betting events
  eventBus.subscribe(REDIS_CHANNELS.BET_PLACED, async (payload) => {
    await achievementEngine.processBetPlaced(payload);
  });

  eventBus.subscribe(REDIS_CHANNELS.BET_WON, async (payload) => {
    await achievementEngine.processBetWon(payload);
  });

  eventBus.subscribe(REDIS_CHANNELS.BET_LOST, async (payload) => {
    await achievementEngine.processBetLost(payload);
  });

  // Parlay events
  eventBus.subscribe(REDIS_CHANNELS.PARLAY_PLACED, async (payload) => {
    await achievementEngine.processParlayPlaced(payload);
  });

  eventBus.subscribe(REDIS_CHANNELS.PARLAY_WON, async (payload) => {
    await achievementEngine.processParlayWon(payload);
  });

  // Pong events
  eventBus.subscribe(REDIS_CHANNELS.PONG_MATCH_ENDED, async (payload) => {
    await achievementEngine.processPongMatchEnded(payload);
  });

  eventBus.subscribe(REDIS_CHANNELS.PONG_ELO_UPDATED, async (payload) => {
    await achievementEngine.processPongEloUpdated(payload);
  });

  // Financial events
  eventBus.subscribe(REDIS_CHANNELS.BALANCE_UPDATED, async (payload) => {
    await achievementEngine.processBalanceUpdated(payload);
  });

  // Leaderboard events
  eventBus.subscribe(REDIS_CHANNELS.LEADERBOARD_RANK_CHANGED, async (payload) => {
    await achievementEngine.processLeaderboardRankChanged(payload);
  });

  // Social events
  eventBus.subscribe(REDIS_CHANNELS.POST_CREATED, async (payload) => {
    await achievementEngine.processPostCreated(payload);
  });

  // ... 65+ more event subscriptions

  return eventBus;
}
```

---

### Event Flow

```
1. User action (e.g., places bet) in API server
   ↓
2. API server publishes event to Redis
   redisPublish(REDIS_CHANNELS.BET_PLACED, { userId, amount, ... })
   ↓
3. Achievement server receives event
   EventBus.subscribe(REDIS_CHANNELS.BET_PLACED, handler)
   ↓
4. Achievement engine processes event
   achievementEngine.processBetPlaced(payload)
   ↓
5. Check user stats (fetch from database)
   const stats = await statsRepository.getUserBettingStats(userId)
   ↓
6. Check achievement conditions
   if (stats.totalBetsPlaced >= 10) {
     unlockAchievement(userId, 'FIRST_10_BETS')
   }
   ↓
7. Update database (if achievement unlocked)
   await achievementRepository.unlockAchievement(userId, achievementId)
   ↓
8. Publish achievement unlock event
   redisPublish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, { userId, achievementId })
   ↓
9. Client receives achievement notification (via main server)
```

---

## Achievement Engine

### Achievement Processing

**Central achievement engine that maps events to achievement triggers:**

```typescript
// services/achievements/achievementEngine.service.ts
export class AchievementEngine {
  constructor(
    private achievementRepo: AchievementRepository,
    private statsRepo: StatsRepository,
    private activityRepo: ActivityRepository,
  ) {}

  async processBetPlaced(payload: BetPlacedEvent) {
    const { userId, amount, predictionId } = payload;

    // Fetch user betting stats
    const stats = await this.statsRepo.getUserBettingStats(userId);

    // Check betting count achievements
    await this.checkBettingCountAchievements(userId, stats);

    // Check betting amount achievements
    await this.checkBettingAmountAchievements(userId, stats, amount);

    // Check streak achievements
    await this.checkStreakAchievements(userId, stats);
  }

  async processBetWon(payload: BetWonEvent) {
    const { userId, winnings, odds } = payload;

    // Fetch user betting stats
    const stats = await this.statsRepo.getUserBettingStats(userId);

    // Check win count achievements
    await this.checkWinCountAchievements(userId, stats);

    // Check profit achievements
    await this.checkProfitAchievements(userId, stats);

    // Check win streak achievements
    await this.checkWinStreakAchievements(userId, stats);

    // Check underdog achievements (high odds wins)
    if (odds >= 5.0) {
      await this.unlockAchievement(userId, 'UNDERDOG_VICTORY');
    }
  }

  private async checkBettingCountAchievements(userId: number, stats: UserBettingStats) {
    const milestones = [
      { count: 1, achievementId: 'FIRST_BET' },
      { count: 10, achievementId: 'FIRST_10_BETS' },
      { count: 50, achievementId: 'VETERAN_BETTOR' },
      { count: 100, achievementId: 'CENTURY_BETTOR' },
      { count: 500, achievementId: 'BETTING_LEGEND' },
    ];

    for (const milestone of milestones) {
      if (stats.totalBetsPlaced >= milestone.count) {
        await this.unlockAchievement(userId, milestone.achievementId);
      }
    }
  }

  private async unlockAchievement(userId: number, achievementId: string) {
    // Check if already unlocked
    const isUnlocked = await this.achievementRepo.isAchievementUnlocked(userId, achievementId);
    if (isUnlocked) return;

    // Unlock achievement
    await this.achievementRepo.unlockAchievement(userId, achievementId);

    // Log activity
    await this.activityRepo.logAchievementUnlock(userId, achievementId);

    // Publish event (main server will notify user)
    await redisPublish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, {
      userId,
      achievementId,
      timestamp: new Date(),
    });

    console.log(`[AchievementEngine] Unlocked achievement ${achievementId} for user ${userId}`);
  }
}
```

---

### 77 Achievements (8 Categories)

#### **1. Betting Achievements (15)**

- `FIRST_BET` - Place first bet
- `FIRST_10_BETS` - Place 10 bets
- `VETERAN_BETTOR` - Place 50 bets
- `CENTURY_BETTOR` - Place 100 bets
- `BETTING_LEGEND` - Place 500 bets
- `HIGH_ROLLER` - Place bet ≥1000 MuskBucks
- `WHALE` - Place bet ≥10000 MuskBucks
- `UNDERDOG_VICTORY` - Win bet with odds ≥5.0
- `PERFECT_PREDICTION` - Win bet with odds ≥10.0
- `STREAK_3` - Win 3 bets in a row
- `STREAK_5` - Win 5 bets in a row
- `STREAK_10` - Win 10 bets in a row
- `PROFIT_1000` - Earn 1000 MuskBucks profit
- `PROFIT_10000` - Earn 10000 MuskBucks profit
- `PROFIT_100000` - Earn 100000 MuskBucks profit

#### **2. Parlay Achievements (8)**

- `FIRST_PARLAY` - Place first parlay
- `PARLAY_MASTER` - Place 10 parlays
- `PARLAY_LEGEND` - Place 50 parlays
- `PARLAY_3_LEGS` - Win 3-leg parlay
- `PARLAY_5_LEGS` - Win 5-leg parlay
- `PARLAY_10_LEGS` - Win 10-leg parlay
- `PARLAY_BONUS_10X` - Win parlay with ≥10x bonus
- `PARLAY_BONUS_50X` - Win parlay with ≥50x bonus

#### **3. Pong Achievements (12)**

- `PONG_FIRST_WIN` - Win first Pong match
- `PONG_10_WINS` - Win 10 Pong matches
- `PONG_100_WINS` - Win 100 Pong matches
- `PONG_PERFECT_GAME` - Win 11-0
- `PONG_AI_EASY` - Beat Easy AI
- `PONG_AI_MEDIUM` - Beat Medium AI
- `PONG_AI_HARD` - Beat Hard AI
- `PONG_AI_IMPOSSIBLE` - Beat Impossible AI
- `PONG_ELO_1500` - Reach 1500 ELO
- `PONG_ELO_2000` - Reach 2000 ELO
- `PONG_STREAK_5` - Win 5 Pong matches in a row
- `PONG_STREAK_10` - Win 10 Pong matches in a row

#### **4. Financial Achievements (10)**

- `BALANCE_1000` - Reach 1000 MuskBucks balance
- `BALANCE_10000` - Reach 10000 MuskBucks balance
- `BALANCE_100000` - Reach 100000 MuskBucks balance
- `RAGS_TO_RICHES` - Go from <100 to >10000 balance
- `BROKE` - Balance drops to 0
- `COMEBACK` - Win after balance drops to <10
- `VOLUME_10000` - Total betting volume ≥10000 MuskBucks
- `VOLUME_100000` - Total betting volume ≥100000 MuskBucks
- `DAILY_PROFIT_1000` - Earn 1000 MuskBucks in one day
- `WEEKLY_PROFIT_5000` - Earn 5000 MuskBucks in one week

#### **5. Leaderboard Achievements (8)**

- `LEADERBOARD_TOP_10` - Reach top 10 on daily leaderboard
- `LEADERBOARD_TOP_5` - Reach top 5 on daily leaderboard
- `LEADERBOARD_TOP_1` - Reach #1 on daily leaderboard
- `WEEKLY_TOP_10` - Reach top 10 on weekly leaderboard
- `WEEKLY_TOP_1` - Reach #1 on weekly leaderboard
- `ALL_TIME_TOP_10` - Reach top 10 on all-time leaderboard
- `ALL_TIME_TOP_1` - Reach #1 on all-time leaderboard
- `PONG_LEADERBOARD_TOP_10` - Reach top 10 on Pong ELO leaderboard

#### **6. Social Achievements (10)**

- `FIRST_POST` - Create first post
- `SOCIAL_BUTTERFLY` - Create 10 posts
- `INFLUENCER` - Create 50 posts
- `FIRST_REACTION` - Add first reaction
- `REACTOR` - Add 50 reactions
- `FIRST_FOLLOW` - Follow first user
- `NETWORKER` - Follow 10 users
- `POPULAR` - Get 10 followers
- `CELEBRITY` - Get 100 followers
- `MEGASTAR` - Get 1000 followers

#### **7. Timeline Achievements (7)**

- `TIMELINE_READER` - Read 10 articles
- `TIMELINE_ADDICT` - Read 100 articles
- `FIRST_BOOKMARK` - Bookmark first article
- `BOOKWORM` - Bookmark 50 articles
- `TIMELINE_SHARER` - Share 10 articles
- `EARLY_BIRD` - Read article within 1 hour of publish
- `NIGHT_OWL` - Read article between 12am-6am

#### **8. Special Achievements (7)**

- `ACCOUNT_VERIFIED` - Verify email address
- `PROFILE_COMPLETE` - Complete profile setup
- `AVATAR_UPLOADED` - Upload custom avatar
- `EARLY_ADOPTER` - Join during beta (first 100 users)
- `LOYALTY` - Login 7 days in a row
- `DEDICATION` - Login 30 days in a row
- `OBSESSED` - Login 100 days in a row

---

## Repositories

### **AchievementRepository**

Achievement data access.

**Methods:**

```typescript
isAchievementUnlocked(userId: number, achievementId: string): Promise<boolean>
unlockAchievement(userId: number, achievementId: string): Promise<void>
getUserAchievements(userId: number): Promise<UserAchievement[]>
updateAchievementProgress(userId: number, achievementId: string, progress: number): Promise<void>
```

---

### **StatsRepository**

User statistics queries.

**Methods:**

```typescript
getUserBettingStats(userId: number): Promise<UserBettingStats>
getUserPongStats(userId: number): Promise<UserPongStats>
getUserSocialStats(userId: number): Promise<UserSocialStats>
getUserFinancialStats(userId: number): Promise<UserFinancialStats>
```

---

### **ActivityRepository**

Activity logging.

**Methods:**

```typescript
logAchievementUnlock(userId: number, achievementId: string): Promise<void>
getUserActivityLog(userId: number, limit: number): Promise<Activity[]>
```

---

## Infrastructure

### EventBus (Redis Pub/Sub)

**Wrapper around IORedis for clean pub/sub:**

```typescript
// lib/EventBus.ts
import Redis from 'ioredis';

export class EventBus {
  private subscriber: Redis;
  private subscriptions: Map<string, Function[]> = new Map();

  constructor() {
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  subscribe(channel: string, handler: Function) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
      this.subscriber.subscribe(channel);
    }

    this.subscriptions.get(channel)!.push(handler);
  }

  private async handleMessage(channel: string, message: string) {
    const handlers = this.subscriptions.get(channel) || [];
    const payload = JSON.parse(message);

    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error handling ${channel}:`, error);
      }
    }
  }

  disconnect() {
    this.subscriber.disconnect();
  }
}
```

---

### EventCoalescer (Batch Processing)

**Batch events for efficient processing:**

```typescript
// lib/EventCoalescer.ts
export class EventCoalescer {
  private queue: Map<string, any[]> = new Map();
  private flushInterval: NodeJS.Timeout;

  constructor(flushIntervalMs: number = 1000) {
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  add(eventType: string, payload: any) {
    if (!this.queue.has(eventType)) {
      this.queue.set(eventType, []);
    }
    this.queue.get(eventType)!.push(payload);
  }

  private async flush() {
    for (const [eventType, payloads] of this.queue.entries()) {
      if (payloads.length > 0) {
        await this.processBatch(eventType, payloads);
        this.queue.set(eventType, []); // Clear queue
      }
    }
  }

  private async processBatch(eventType: string, payloads: any[]) {
    console.log(`Processing batch of ${payloads.length} ${eventType} events`);
    // Batch processing logic
  }
}
```

---

## Development

### Prerequisites

- **Node.js ≥24.0.0**
- **PostgreSQL 16**
- **Redis 7+**

### Environment Variables

Create `.env` in repository root:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/elonmusksucks

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Port
PORT=5002

# Optional
NODE_ENV=development
```

### Development Commands

```bash
# Install dependencies (run from repository root)
npm install

# Generate Prisma client
npm -w apps/achievement-server run prisma:generate

# Start dev server (port 5002) with hot reload
npm -w apps/achievement-server run dev

# Build for production
npm -w apps/achievement-server run build

# Start production server
npm -w apps/achievement-server run start
```

### Development Workflow

1. **Start PostgreSQL & Redis**
2. **Start API server** (publishes events)
3. **Start achievement server** (processes events)
4. **Trigger events** (place bets, win matches, etc.)
5. **Check logs** for achievement unlocks

---

## Build & Deployment

### Production Build

```bash
npm -w apps/achievement-server run build
# Output: apps/achievement-server/dist/
```

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5002
CMD ["node", "dist/index.js"]
```

### Fly.io Deployment

```toml
app = "elonmusksucks-achievement"
primary_region = "sjc"

[env]
  PORT = "5002"
  NODE_ENV = "production"
```

---

## Monitoring

### Health Check

**Endpoint:** `GET /health`

**Response:**

```json
{
  "status": "healthy",
  "uptime": 3600000,
  "timestamp": "2025-01-15T12:00:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### Prometheus Metrics

**Endpoint:** `GET /metrics`

**Metrics:**

- `achievement_unlocks_total` - Total achievements unlocked
- `achievement_processing_duration_seconds` - Event processing time
- `achievement_queue_size` - Event queue size

---

## Troubleshooting

### Issue: Events not processing

**Solution:**

1. Check Redis connection: `redis-cli ping`
2. Check API server is publishing events
3. Check achievement server logs for errors

---

### Issue: Duplicate achievement unlocks

**Solution:**

1. Check database constraints (unique index on userId + achievementId)
2. Check achievement unlock logic has `isAchievementUnlocked` check

---

## Additional Resources

- [Main Project README](../../README.md)
- [Server App README](../server/README.md)
- [Client App README](../client/README.md)

---

## License

See [LICENSE](../../LICENSE) in repository root.
