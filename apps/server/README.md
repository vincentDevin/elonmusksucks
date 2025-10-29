# Server App - Express 5 + Prisma Backend

**Enterprise-grade Node.js backend** with strict layered architecture, real-time Socket.IO events, BullMQ background jobs, and comprehensive business logic for the elonmusksucks.net prediction market platform.

## Table of Contents

- [Overview](#overview)
- [Layered Architecture](#layered-architecture)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Controllers (16)](#controllers-16)
- [Services (32+)](#services-32)
- [Repositories (22)](#repositories-22)
- [Socket.IO Handlers (11)](#socketio-handlers-11)
- [Middleware (10)](#middleware-10)
- [BullMQ Workers (6)](#bullmq-workers-6)
- [Real-time Event System](#real-time-event-system)
- [Authentication & Security](#authentication--security)
- [Infrastructure Services](#infrastructure-services)
- [Development](#development)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [API Patterns](#api-patterns)
- [Performance & Monitoring](#performance--monitoring)

---

## Overview

The **server app** is the unified backend serving both the client SPA and public-site SSR apps. It provides:

- **REST API** for CRUD operations
- **Socket.IO** real-time events with Redis pub/sub
- **JWT authentication** with access/refresh token rotation
- **BullMQ workers** for async background processing
- **Prisma ORM** for type-safe database operations
- **Redis caching** for performance optimization
- **Tigris S3** for file storage (avatars, images)
- **SendGrid** for transactional emails

**Key Features:**
- Strict layered architecture (Routes → Controllers → Services → Repositories)
- 75+ Redis channels for real-time updates
- 6 background workers for async processing
- Comprehensive admin dashboard API
- Advanced prediction market engine with dynamic odds
- Pong game leaderboard & ELO rating system
- Timeline & RSS feed ingestion
- Achievement system with 77 achievements

---

## Layered Architecture

### Architectural Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      HTTP/WebSocket                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
     ┌────▼─────┐              ┌────────▼────────┐
     │  Routes  │              │  Socket.IO      │
     │          │              │  Handlers       │
     └────┬─────┘              └────────┬────────┘
          │                             │
          │   ┌─────────────────────────┘
          │   │
     ┌────▼───▼────┐
     │ Controllers │  ← Request/Response handling
     │             │  ← Input validation
     │             │  ← Error handling
     └────┬────────┘
          │
     ┌────▼────────┐
     │  Services   │  ← Business logic
     │             │  ← Orchestration
     │             │  ← Transaction management
     └────┬────────┘
          │
     ┌────▼──────────┐
     │ Repositories  │  ← Data access layer
     │               │  ← Prisma operations only
     └────┬──────────┘
          │
     ┌────▼───────────┐
     │  Prisma ORM    │  ← Type-safe queries
     └────┬───────────┘
          │
     ┌────▼────────────┐
     │  PostgreSQL DB  │
     └─────────────────┘

     Infrastructure Services (Injected)
     ┌──────────┬──────────┬───────────┬─────────────┐
     │  Redis   │ BullMQ   │ Tigris S3 │  SendGrid   │
     │  Pub/Sub │ Workers  │  Storage  │   Email     │
     └──────────┴──────────┴───────────┴─────────────┘
```

---

### Layer Responsibilities

#### **1. Routes** (`src/routes/`)
**Purpose:** Define API endpoints and apply middleware.

**Responsibilities:**
- Map HTTP methods to controller actions
- Apply route-specific middleware (auth, rate limiting)
- **NO business logic, NO Prisma, NO Socket.IO**

**Example:**
```typescript
// routes/predictions.routes.ts
import { Router } from 'express';
import * as predictionController from '../controllers/predictions.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/predictions', predictionController.getAllPredictions);
router.get('/predictions/:id', predictionController.getPredictionById);

// Protected routes
router.post('/predictions', authenticate, predictionController.createPrediction);
router.post('/predictions/:id/bet', authenticate, predictionController.placeBet);

export default router;
```

---

#### **2. Controllers** (`src/controllers/`)
**Purpose:** Handle HTTP request/response cycle.

**Responsibilities:**
- Extract and validate request data
- Call appropriate service methods
- Format responses with proper HTTP status codes
- Handle errors gracefully
- **NO business logic, NO Prisma, NO direct Socket.IO**

**Example:**
```typescript
// controllers/predictions.controller.ts
import { Request, Response } from 'express';
import * as predictionService from '../services/predictions.service';
import { redisPublish } from '../config/redis';
import { REDIS_CHANNELS } from '@ems/types';

export async function createPrediction(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const data = req.body;

    // Delegate to service layer
    const prediction = await predictionService.createPrediction(userId, data);

    // Emit event via Redis pub/sub (infrastructure injected)
    await redisPublish(REDIS_CHANNELS.PREDICTION_CREATED, {
      predictionId: prediction.id,
      userId,
      prediction
    });

    res.status(201).json({ success: true, prediction });
  } catch (error) {
    console.error('Error creating prediction:', error);
    res.status(500).json({ success: false, error: 'Failed to create prediction' });
  }
}
```

---

#### **3. Services** (`src/services/`)
**Purpose:** Implement business logic and orchestration.

**Responsibilities:**
- **Core business logic** (odds calculation, bet validation, etc.)
- **Orchestration** between multiple repositories
- **Transaction management** (Prisma transactions)
- **Business rule enforcement** (balance checks, prediction state validation)
- **NO Prisma direct access** - Use repositories only
- **NO Socket.IO/Redis direct access** - Infrastructure injected by controllers

**Example:**
```typescript
// services/predictions.service.ts
import * as predictionRepository from '../repositories/PredictionRepository';
import * as userRepository from '../repositories/UserRepository';
import * as bettingRepository from '../repositories/BettingRepository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function placeBet(
  userId: number,
  predictionId: number,
  optionId: number,
  amount: number
) {
  // Business logic: Validate prediction state
  const prediction = await predictionRepository.findById(predictionId);
  if (!prediction || prediction.status !== 'OPEN') {
    throw new Error('Prediction is not open for betting');
  }

  // Business logic: Validate user balance
  const user = await userRepository.findById(userId);
  if (user.balance < amount) {
    throw new Error('Insufficient balance');
  }

  // Transaction management: Atomic bet placement + balance deduction
  return await prisma.$transaction(async (tx) => {
    const bet = await bettingRepository.createBet(
      { userId, predictionId, optionId, amount },
      tx
    );

    await userRepository.updateBalance(
      userId,
      { decrement: amount },
      tx
    );

    return bet;
  });
}
```

---

#### **4. Repositories** (`src/repositories/`)
**Purpose:** Data access layer - Prisma operations only.

**Responsibilities:**
- **Prisma CRUD operations** (create, read, update, delete)
- **Query optimization** (select, include, orderBy)
- **Transaction support** (accept Prisma transaction client)
- **NO business logic** - Pure data access

**Example:**
```typescript
// repositories/PredictionRepository.ts
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function findById(id: number) {
  return await prisma.prediction.findUnique({
    where: { id },
    include: {
      options: true,
      category: true,
      user: { select: { id: true, username: true } }
    }
  });
}

export async function createBet(
  data: { userId: number; predictionId: number; optionId: number; amount: number },
  tx?: Prisma.TransactionClient
) {
  const client = tx || prisma;

  return await client.bet.create({
    data: {
      userId: data.userId,
      optionId: data.optionId,
      amount: data.amount,
      status: 'PENDING'
    }
  });
}

export async function findAllOpen(limit: number = 50) {
  return await prisma.prediction.findMany({
    where: { status: 'OPEN' },
    include: { options: true },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}
```

---

#### **5. Socket.IO Handlers** (`src/handlers/`)
**Purpose:** Handle real-time Socket.IO events.

**Responsibilities:**
- Listen to client events
- Validate event data
- **Delegate to services** (same as controllers)
- Emit responses or broadcast to rooms
- **NO business logic, NO Prisma**

**Example:**
```typescript
// handlers/betSocketHandlers.ts
import { Socket } from 'socket.io';
import * as bettingService from '../services/betting.service';
import { redisPublish } from '../config/redis';
import { REDIS_CHANNELS } from '@ems/types';

export function registerBetHandlers(socket: Socket) {
  socket.on('bet:place', async (data, callback) => {
    try {
      const userId = socket.data.user.id;

      // Delegate to service
      const bet = await bettingService.placeBet(
        userId,
        data.predictionId,
        data.optionId,
        data.amount
      );

      // Publish to Redis (will broadcast to all clients)
      await redisPublish(REDIS_CHANNELS.BET_PLACED, {
        bet,
        userId,
        predictionId: data.predictionId
      });

      callback({ success: true, bet });
    } catch (error) {
      console.error('Error placing bet:', error);
      callback({ success: false, error: error.message });
    }
  });
}
```

---

### Architectural Rules

#### ✅ **DO:**
- Keep layers strictly separated
- Use repositories for all Prisma operations
- Inject infrastructure (Redis, Socket.IO) at controller/handler level
- Use Prisma transactions for multi-step operations
- Return typed data from repositories
- Handle errors at controller level

#### ❌ **DON'T:**
- Use Prisma in routes, controllers, or services
- Access Socket.IO directly in services
- Put business logic in repositories
- Mix concerns across layers
- Skip error handling

---

## Technology Stack

### Core Runtime
- **Node.js ≥24.0.0** - Strict requirement
- **Express 5.1.0** - Web framework
- **TypeScript 5.8.3** - Type safety

### Database & ORM
- **PostgreSQL 16** - Primary database
- **Prisma 6.10.1** - Type-safe ORM
- **@prisma/client 6.10.1** - Generated Prisma client

### Real-time & Caching
- **Socket.IO 4.8.1** - WebSocket server
- **@socket.io/redis-adapter 8.3.0** - Multi-instance Socket.IO sync
- **IORedis 5.6.1** - Redis client
- **Redis** - Pub/sub + caching

### Background Jobs
- **BullMQ 5.56.4** - Redis-based job queue

### Authentication & Security
- **jsonwebtoken 9.0.2** - JWT tokens
- **bcrypt 6.0.0** - Password hashing
- **helmet 7.2.0** - Security headers
- **cors 2.8.5** - CORS configuration
- **express-rate-limit 7.5.1** - Rate limiting

### File Storage & Processing
- **@aws-sdk/client-s3 3.844.0** - S3-compatible API
- **@tigrisdata/core 1.3.0** - Tigris object storage
- **multer 2.0.1** - File upload middleware
- **sharp 0.34.3** - Image processing (resize, crop)

### Email
- **@sendgrid/mail 8.1.5** - Transactional emails

### Content Processing
- **rss-parser 3.13.0** - RSS/Atom feed parsing
- **xml2js 0.6.2** - XML parsing
- **open-graph-scraper 6.8.2** - Open Graph metadata extraction
- **isomorphic-dompurify 2.28.0** - HTML sanitization

### Performance & Monitoring
- **compression 1.8.1** - gzip compression
- **prom-client 15.1.3** - Prometheus metrics

### Development Tools
- **nodemon 3.1.10** - Auto-restart dev server
- **ts-node 10.9.2** - TypeScript execution
- **dotenv 16.5.0** - Environment variables
- **dotenv-cli 8.0.0** - Env var loading in scripts

---

## Directory Structure

```
apps/server/
├── src/
│   ├── config/                    # Configuration modules
│   │   ├── env.ts                 # Environment variable validation
│   │   ├── redis.ts               # Redis client & pub/sub utilities
│   │   ├── prisma.ts              # Prisma client singleton
│   │   └── bullmq.ts              # BullMQ queue configuration
│   │
│   ├── controllers/               # HTTP request handlers (16)
│   │   ├── auth.controller.ts            # Login, register, JWT refresh
│   │   ├── predictions.controller.ts     # Prediction CRUD, betting
│   │   ├── user.controller.ts            # User profiles, stats
│   │   ├── admin.controller.ts           # Admin operations
│   │   ├── leaderboard.controller.ts     # Rankings & leaderboards
│   │   ├── timeline.controller.ts        # Articles & RSS feeds
│   │   ├── post.controller.ts            # Social posts
│   │   ├── pong.controller.ts            # Pong game endpoints
│   │   ├── feeds.controller.ts           # RSS feed management
│   │   ├── market.controller.ts          # Market analytics
│   │   ├── moderation.controller.ts      # Content moderation
│   │   ├── payout.controller.ts          # Payout operations
│   │   ├── dashboardAnalytics.controller.ts  # Analytics dashboard
│   │   ├── monitoring.controller.ts      # System monitoring
│   │   ├── shameWall.controller.ts       # Shame wall (banned users)
│   │   ├── opml.controller.ts            # OPML import/export
│   │   └── unified-content.controller.ts # Unified content system
│   │
│   ├── services/                  # Business logic (32+)
│   │   ├── auth.service.ts               # Authentication logic
│   │   ├── predictions.service.ts        # Prediction market logic
│   │   ├── betting.service.ts            # Betting logic & odds calc
│   │   ├── user.service.ts               # User management
│   │   ├── admin.service.ts              # Admin operations
│   │   ├── leaderboard.service.ts        # Leaderboard calculations
│   │   ├── timeline.service.ts           # Timeline & article logic
│   │   ├── post.service.ts               # Social post logic
│   │   ├── payout.service.ts             # Payout processing
│   │   ├── market.service.ts             # Market analytics
│   │   ├── moderation.service.ts         # Moderation logic
│   │   ├── feed.service.ts               # RSS feed fetching
│   │   ├── email.service.ts              # Email sending
│   │   ├── imageProcessing.service.ts    # Image optimization
│   │   ├── pongElo.service.ts            # ELO rating calculations
│   │   ├── pongStats.service.ts          # Pong statistics
│   │   ├── pongPayoutQueue.service.ts    # Pong payout queue
│   │   ├── category.service.ts           # Category management
│   │   ├── reaction.service.ts           # Post reactions
│   │   ├── message.service.ts            # Chat messages
│   │   ├── opml.service.ts               # OPML parsing
│   │   ├── dashboardAnalytics.service.ts # Dashboard analytics
│   │   ├── eventSystemMetrics.service.ts # Event system metrics
│   │   ├── activeUserCache.service.ts    # Active user tracking
│   │   ├── shameWall.service.ts          # Shame wall logic
│   │   ├── unified-content.service.ts    # Unified content
│   │   ├── unifiedActivity.service.ts    # Activity stream
│   │   ├── enhancedUserStats.service.ts  # User statistics
│   │   ├── pureElo.service.ts            # Pure ELO algorithm
│   │   ├── StreakManager.service.ts      # Streak tracking
│   │   ├── FinancialTracker.service.ts   # Financial tracking
│   │   ├── EventCorrelator.service.ts    # Event correlation
│   │   └── achievements/                 # Achievement system
│   │       └── *.ts                      # 77 achievements
│   │
│   ├── repositories/              # Data access layer (22)
│   │   ├── AuthRepository.ts             # Auth data operations
│   │   ├── PredictionRepository.ts       # Prediction data operations
│   │   ├── BettingRepository.ts          # Betting data operations
│   │   ├── UserRepository.ts             # User data operations
│   │   ├── AdminRepository.ts            # Admin data operations
│   │   ├── LeaderboardRepository.ts      # Leaderboard data operations
│   │   ├── TimelineRepository.ts         # Timeline data operations
│   │   ├── ContentRepository.ts          # Content data operations
│   │   ├── PongRepository.ts             # Pong data operations
│   │   ├── FeedRepository.ts             # Feed data operations
│   │   ├── MarketRepository.ts           # Market data operations
│   │   ├── ModerationRepository.ts       # Moderation data operations
│   │   ├── PayoutRepository.ts           # Payout data operations
│   │   ├── CategoryRepository.ts         # Category data operations
│   │   ├── TagRepository.ts              # Tag data operations
│   │   ├── ReactionRepository.ts         # Reaction data operations
│   │   ├── MessageRepository.ts          # Message data operations
│   │   ├── ActivityRepository.ts         # Activity data operations
│   │   ├── AnalyticsRepository.ts        # Analytics data operations
│   │   ├── StatsRepository.ts            # Stats data operations
│   │   ├── AchievementRepository.ts      # Achievement data operations
│   │   ├── UnifiedContentRepository.ts   # Unified content data ops
│   │   └── interfaces/                   # Repository interfaces
│   │
│   ├── handlers/                  # Socket.IO event handlers (11)
│   │   ├── betSocketHandlers.ts          # Betting events
│   │   ├── chatHandlers.ts               # Chat events
│   │   ├── roomHandlers.ts               # Room join/leave
│   │   ├── pongSocketHandlers.ts         # Pong game events
│   │   ├── postHandlers.ts               # Post events
│   │   ├── timelineHandlers.ts           # Timeline events
│   │   ├── moderationHandlers.ts         # Moderation events
│   │   ├── statisticsSocketHandlers.ts   # Statistics events
│   │   ├── unifiedActivityHandlers.ts    # Activity events
│   │   ├── redisEventHandlers.ts         # Redis → Socket.IO relay
│   │   └── postRedisEventHandlers.ts     # Post Redis events
│   │
│   ├── middleware/                # Express middleware (10)
│   │   ├── auth.middleware.ts            # JWT authentication
│   │   ├── socketAuthMiddleware.ts       # Socket.IO authentication
│   │   ├── errorHandler.ts               # Global error handling
│   │   ├── rateLimitMiddleware.ts        # Rate limiting (general)
│   │   ├── rateLimiter.ts                # Rate limiter factory
│   │   ├── payloadSizeGuard.ts           # Request size limits
│   │   ├── fileValidation.middleware.ts  # File upload validation
│   │   ├── timeout.middleware.ts         # Request timeout
│   │   ├── prometheusMiddleware.ts       # Prometheus metrics
│   │   └── betaCohort.ts                 # Beta feature gating
│   │
│   ├── workers/                   # BullMQ background workers (6)
│   │   ├── payout.worker.ts              # Bet payout processing
│   │   ├── pong-payout.worker.ts         # Pong payout processing
│   │   ├── leaderboard.worker.ts         # Leaderboard recalculation
│   │   ├── leaderboard-snapshot.worker.ts # Daily leaderboard snapshots
│   │   ├── feed.worker.ts                # RSS feed fetching
│   │   └── article.worker.ts             # Article processing
│   │
│   ├── routes/                    # Route definitions
│   │   ├── auth.routes.ts                # Auth endpoints
│   │   ├── predictions.routes.ts         # Prediction endpoints
│   │   ├── user.routes.ts                # User endpoints
│   │   ├── admin.routes.ts               # Admin endpoints
│   │   ├── leaderboard.routes.ts         # Leaderboard endpoints
│   │   ├── timeline.routes.ts            # Timeline endpoints
│   │   ├── post.routes.ts                # Post endpoints
│   │   ├── pong.routes.ts                # Pong endpoints
│   │   ├── market.routes.ts              # Market endpoints
│   │   ├── moderation.routes.ts          # Moderation endpoints
│   │   ├── payout.routes.ts              # Payout endpoints
│   │   ├── activity.routes.ts            # Activity endpoints
│   │   ├── dashboardAnalytics.routes.ts  # Analytics endpoints
│   │   ├── monitoring.routes.ts          # Monitoring endpoints
│   │   ├── shameWall.routes.ts           # Shame wall endpoints
│   │   ├── prometheus.routes.ts          # Prometheus metrics
│   │   └── *.routes.ts                   # More route files
│   │
│   ├── errors/                    # Custom error classes
│   │   └── *.ts                   # AppError, ValidationError, etc.
│   │
│   ├── lib/                       # Utility libraries
│   │   └── *.ts                   # Shared utilities
│   │
│   ├── utils/                     # Helper functions
│   │   └── *.ts                   # Various utilities
│   │
│   ├── scripts/                   # Utility scripts
│   │   └── *.ts                   # Database scripts, etc.
│   │
│   ├── templates/                 # Email templates
│   │   └── *.html                 # SendGrid email templates
│   │
│   ├── view/                      # SSR views (public-site)
│   │   └── *.tsx                  # React SSR components
│   │
│   ├── socket.ts                  # Socket.IO initialization
│   └── index.ts                   # Application entry point
│
├── dist/                          # Compiled TypeScript (gitignored)
│
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── Dockerfile                     # Production Docker build
├── Dockerfile.local               # Local Docker build
└── fly.toml                       # Fly.io deployment config
```

---

## Controllers (16)

### **1. auth.controller.ts**
Authentication endpoints.

**Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

---

### **2. predictions.controller.ts**
Prediction market operations.

**Endpoints:**
- `GET /api/predictions` - List all predictions
- `GET /api/predictions/:id` - Get prediction details
- `POST /api/predictions` - Create prediction (ADMIN)
- `PUT /api/predictions/:id` - Update prediction (ADMIN)
- `POST /api/predictions/:id/bet` - Place single bet
- `POST /api/predictions/parlay` - Place parlay bet
- `POST /api/predictions/:id/resolve` - Resolve prediction (ADMIN)
- `GET /api/predictions/:id/bets` - Get all bets for prediction

---

### **3. user.controller.ts**
User profile and statistics.

**Endpoints:**
- `GET /api/users/me` - Current user profile
- `GET /api/users/:id` - User profile by ID
- `PUT /api/users/me` - Update profile
- `POST /api/users/me/avatar` - Upload avatar
- `GET /api/users/:id/stats` - User statistics
- `GET /api/users/:id/bets` - User bet history
- `GET /api/users/:id/achievements` - User achievements
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

---

### **4. admin.controller.ts**
Admin operations.

**Endpoints:**
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - User details
- `PUT /api/admin/users/:id/ban` - Ban user
- `PUT /api/admin/users/:id/unban` - Unban user
- `PUT /api/admin/users/:id/role` - Change user role
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/transactions` - All transactions
- `GET /api/admin/moderation-queue` - Content moderation queue

---

### **5. leaderboard.controller.ts**
Leaderboard rankings.

**Endpoints:**
- `GET /api/leaderboard/daily` - Daily leaderboard
- `GET /api/leaderboard/weekly` - Weekly leaderboard
- `GET /api/leaderboard/all-time` - All-time leaderboard
- `GET /api/leaderboard/pong` - Pong ELO leaderboard

---

### **6. timeline.controller.ts**
Timeline & RSS articles.

**Endpoints:**
- `GET /api/timeline/articles` - Get articles
- `GET /api/timeline/articles/:id` - Article details
- `POST /api/timeline/articles/:id/bookmark` - Bookmark article
- `DELETE /api/timeline/articles/:id/bookmark` - Remove bookmark
- `GET /api/timeline/trending` - Trending articles

---

### **7. post.controller.ts**
Social posts.

**Endpoints:**
- `GET /api/posts` - List posts (feed)
- `GET /api/posts/:id` - Post details
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/react` - Add reaction
- `DELETE /api/posts/:id/react` - Remove reaction
- `POST /api/posts/:id/comments` - Add comment

---

### **8. pong.controller.ts**
Pong game endpoints.

**Endpoints:**
- `GET /api/pong/stats` - User Pong stats
- `GET /api/pong/matches` - Match history
- `GET /api/pong/leaderboard` - Pong ELO leaderboard

---

### **9. feeds.controller.ts**
RSS feed management.

**Endpoints:**
- `GET /api/feeds` - List feeds (ADMIN)
- `POST /api/feeds` - Add feed (ADMIN)
- `PUT /api/feeds/:id` - Update feed (ADMIN)
- `DELETE /api/feeds/:id` - Delete feed (ADMIN)
- `POST /api/feeds/:id/fetch` - Manually fetch feed (ADMIN)

---

### **10. market.controller.ts**
Market analytics.

**Endpoints:**
- `GET /api/market/overview` - Market overview
- `GET /api/market/volume` - Trading volume
- `GET /api/market/trending` - Trending predictions

---

### **11. moderation.controller.ts**
Content moderation.

**Endpoints:**
- `GET /api/moderation/queue` - Moderation queue (ADMIN)
- `POST /api/moderation/articles/:id/approve` - Approve article (ADMIN)
- `POST /api/moderation/articles/:id/reject` - Reject article (ADMIN)
- `POST /api/moderation/articles/bulk` - Bulk moderation (ADMIN)

---

### **12. payout.controller.ts**
Payout operations.

**Endpoints:**
- `GET /api/payouts` - List payouts (ADMIN)
- `POST /api/payouts/process` - Process pending payouts (ADMIN)

---

### **13. dashboardAnalytics.controller.ts**
Analytics dashboard.

**Endpoints:**
- `GET /api/analytics/overview` - Dashboard overview (ADMIN)
- `GET /api/analytics/users` - User analytics (ADMIN)
- `GET /api/analytics/revenue` - Revenue analytics (ADMIN)

---

### **14. monitoring.controller.ts**
System monitoring.

**Endpoints:**
- `GET /api/monitoring/health` - Health check
- `GET /api/monitoring/metrics` - System metrics (ADMIN)
- `GET /api/monitoring/database` - Database stats (ADMIN)

---

### **15. shameWall.controller.ts**
Shame wall (banned users).

**Endpoints:**
- `GET /api/shame-wall` - List banned users

---

### **16. opml.controller.ts**
OPML import/export.

**Endpoints:**
- `GET /api/opml/export` - Export feeds as OPML (ADMIN)
- `POST /api/opml/import` - Import OPML feed list (ADMIN)

---

## Services (32+)

### Core Business Services

#### **1. auth.service.ts**
Authentication business logic.

**Responsibilities:**
- User registration with email verification
- Login with bcrypt password verification
- JWT access token generation (15min expiry)
- JWT refresh token generation (7day expiry)
- Token rotation on refresh
- Refresh token storage in Redis

**Key Methods:**
```typescript
register(email, password, username): Promise<User>
login(email, password): Promise<{ accessToken, refreshToken, user }>
refreshAccessToken(refreshToken): Promise<{ accessToken }>
verifyEmail(token): Promise<void>
forgotPassword(email): Promise<void>
resetPassword(token, newPassword): Promise<void>
```

---

#### **2. predictions.service.ts**
Prediction market business logic.

**Responsibilities:**
- Prediction CRUD operations
- Prediction state validation (OPEN, CLOSED, RESOLVED)
- Odds calculation (6-factor dynamic odds)
- Bet placement validation
- Parlay bet validation
- Prediction resolution
- Payout calculation

**Key Methods:**
```typescript
createPrediction(userId, data): Promise<Prediction>
placeBet(userId, predictionId, optionId, amount): Promise<Bet>
placeParlay(userId, bets, totalAmount): Promise<Parlay>
resolvePrediction(predictionId, winningOptionId): Promise<void>
calculateOdds(predictionId): Promise<number[]>
```

**Odds Calculation Algorithm (6 factors):**
1. Total bet volume
2. Option-specific volume
3. Number of bettors
4. Market maturity
5. Prediction category multiplier
6. House edge (3%)

---

#### **3. betting.service.ts**
Betting business logic.

**Responsibilities:**
- Bet validation (balance, minimum bet)
- Parlay validation (minimum 2 predictions)
- Parlay multiplier calculation
- Bet status tracking
- Transaction recording

---

#### **4. user.service.ts**
User management business logic.

**Responsibilities:**
- User profile updates
- Avatar upload & processing
- User statistics calculation
- Follow/unfollow logic
- User balance management

---

#### **5. leaderboard.service.ts**
Leaderboard calculation business logic.

**Responsibilities:**
- Daily/weekly/all-time leaderboard calculation
- ROI calculation
- Win rate calculation
- Streak tracking
- Pong ELO ranking

**Leaderboard Metrics:**
- Total profit
- ROI (return on investment)
- Win rate
- Streak (consecutive wins)
- Total bets placed
- Pong ELO rating

---

#### **6. payout.service.ts**
Payout processing business logic.

**Responsibilities:**
- Bet payout calculation (amount * odds)
- Parlay payout calculation (amount * combined odds)
- Balance updates
- Transaction creation
- Payout job queueing (BullMQ)

**Payout Formula:**
- Single bet: `amount * odds`
- Parlay: `amount * (odds1 * odds2 * ... * bonus)`

---

#### **7. feed.service.ts**
RSS feed fetching business logic.

**Responsibilities:**
- RSS/Atom feed parsing
- Article deduplication (by URL)
- Article content extraction
- Article tagging (Tesla, SpaceX, Legal, etc.)
- Feed scheduling (every 15 minutes via BullMQ)

---

#### **8. email.service.ts**
Email sending business logic.

**Responsibilities:**
- Email verification emails
- Password reset emails
- Achievement unlock notifications
- SendGrid integration

---

#### **9. imageProcessing.service.ts**
Image processing business logic.

**Responsibilities:**
- Avatar resizing (200x200)
- Image compression (JPEG quality 80%)
- Image format conversion
- Tigris S3 upload

---

#### **10. pongElo.service.ts**
Pong ELO rating business logic.

**Responsibilities:**
- ELO rating calculation (K-factor: 32)
- Match outcome recording
- ELO history tracking

**ELO Formula:**
```
newRating = oldRating + K * (actualScore - expectedScore)
expectedScore = 1 / (1 + 10^((opponentRating - playerRating) / 400))
```

---

### Infrastructure Services

#### **11. activeUserCache.service.ts**
Active user tracking.

**Redis Cache:**
- Track online users (Socket.IO connections)
- 5-minute expiry per user
- Used for "Active Users" count

---

#### **12. eventSystemMetrics.service.ts**
Event system monitoring.

**Metrics:**
- Event emit count (per channel)
- Event processing time
- Socket.IO connection count
- Redis pub/sub latency

---

#### **13. StreakManager.service.ts**
Streak tracking service.

**Responsibilities:**
- Track consecutive wins/losses
- Reset streaks on opposite outcome
- Streak achievement unlocks

---

#### **14. FinancialTracker.service.ts**
Financial analytics service.

**Responsibilities:**
- Revenue tracking
- Volume tracking
- Profit/loss calculations

---

## Repositories (22)

All repositories follow the same pattern:

```typescript
// repositories/ExampleRepository.ts
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function findById(id: number) {
  return await prisma.example.findUnique({ where: { id } });
}

export async function create(data: any, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  return await client.example.create({ data });
}

export async function update(id: number, data: any, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  return await client.example.update({ where: { id }, data });
}

export async function deleteById(id: number, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  return await client.example.delete({ where: { id } });
}
```

**Key Repositories:**
1. **AuthRepository** - User authentication data
2. **PredictionRepository** - Prediction data
3. **BettingRepository** - Bet & parlay data
4. **UserRepository** - User profile data
5. **AdminRepository** - Admin operations
6. **LeaderboardRepository** - Ranking data
7. **TimelineRepository** - Article data
8. **ContentRepository** - Content data
9. **PongRepository** - Pong match data
10. **FeedRepository** - RSS feed data
11. **MarketRepository** - Market analytics data
12. **ModerationRepository** - Moderation queue data
13. **PayoutRepository** - Payout data
14. **CategoryRepository** - Category data
15. **TagRepository** - Tag data
16. **ReactionRepository** - Reaction data
17. **MessageRepository** - Chat message data
18. **ActivityRepository** - Activity stream data
19. **AnalyticsRepository** - Analytics data
20. **StatsRepository** - Statistics data
21. **AchievementRepository** - Achievement data
22. **UnifiedContentRepository** - Unified content data

---

## Socket.IO Handlers (11)

### Real-time Event Handlers

#### **1. betSocketHandlers.ts**
Betting events.

**Events:**
- `bet:place` - Place single bet
- `parlay:place` - Place parlay bet

---

#### **2. chatHandlers.ts**
Chat events.

**Events:**
- `chat:send` - Send chat message
- `chat:typing` - User typing indicator

---

#### **3. roomHandlers.ts**
Room management.

**Events:**
- `join-room` - Join Socket.IO room
- `leave-room` - Leave Socket.IO room

---

#### **4. pongSocketHandlers.ts**
Pong game events.

**Events:**
- `pong:create-match` - Create match
- `pong:join-match` - Join match
- `pong:spectate` - Spectate match
- `pong:leave-spectate` - Stop spectating

---

#### **5. postHandlers.ts**
Post events.

**Events:**
- `post:create` - Create post
- `post:react` - React to post

---

#### **6. timelineHandlers.ts**
Timeline events.

**Events:**
- `timeline:fetch` - Fetch articles

---

#### **7. moderationHandlers.ts**
Moderation events.

**Events:**
- `moderation:action` - Moderation action (ADMIN)

---

#### **8. statisticsSocketHandlers.ts**
Statistics events.

**Events:**
- `stats:request` - Request statistics

---

#### **9. unifiedActivityHandlers.ts**
Activity stream events.

**Events:**
- `activity:fetch` - Fetch activity stream

---

#### **10. redisEventHandlers.ts**
Redis → Socket.IO relay.

**Purpose:**
Listens to Redis pub/sub channels and broadcasts to Socket.IO rooms.

**Pattern:**
```typescript
// Listen to Redis
redisSubscribe(REDIS_CHANNELS.BET_PLACED, (payload) => {
  // Broadcast to Socket.IO room
  io.to(`prediction:${payload.predictionId}`).emit('bet:placed', payload);
});
```

---

#### **11. postRedisEventHandlers.ts**
Post Redis events relay.

**Purpose:**
Relay post-specific Redis events to Socket.IO.

---

## Middleware (10)

### **1. auth.middleware.ts**
JWT authentication middleware.

**Usage:**
```typescript
router.post('/predictions', authenticate, predictionController.create);
```

**Logic:**
1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify JWT signature & expiry
3. Attach `req.user` with user data
4. Return 401 if invalid/expired

---

### **2. socketAuthMiddleware.ts**
Socket.IO authentication middleware.

**Logic:**
1. Extract JWT from `socket.handshake.auth.token`
2. Verify JWT
3. Attach `socket.data.user` with user data
4. Disconnect if invalid

---

### **3. errorHandler.ts**
Global error handling middleware.

**Logic:**
- Catch all errors
- Log errors
- Return JSON error response
- Hide stack traces in production

---

### **4. rateLimitMiddleware.ts**
Rate limiting middleware.

**Limits:**
- Auth endpoints: 5 requests / 15 minutes
- General endpoints: 100 requests / 15 minutes
- Admin endpoints: 200 requests / 15 minutes

---

### **5. payloadSizeGuard.ts**
Request payload size limit.

**Limits:**
- JSON: 10MB
- File upload: 5MB

---

### **6. fileValidation.middleware.ts**
File upload validation.

**Validation:**
- File type: JPEG, PNG only
- File size: Max 5MB
- Dimensions: Min 100x100, Max 2000x2000

---

### **7. timeout.middleware.ts**
Request timeout middleware.

**Timeout:** 30 seconds

---

### **8. prometheusMiddleware.ts**
Prometheus metrics collection.

**Metrics:**
- HTTP request count
- HTTP request duration
- HTTP response size

---

### **9. betaCohort.ts**
Beta feature gating.

**Logic:**
- Check user's beta flag
- Allow/deny access to beta features

---

### **10. rateLimiter.ts**
Rate limiter factory.

**Usage:**
```typescript
const limiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});

router.use('/api/', limiter);
```

---

## BullMQ Workers (6)

### **1. payout.worker.ts**
Process bet payouts when predictions are resolved.

**Trigger:** Prediction resolved (via admin)

**Job Data:**
```typescript
{
  predictionId: number;
  winningOptionId: number;
}
```

**Logic:**
1. Fetch all winning bets for prediction
2. Calculate payout (amount * odds)
3. Update user balances (transaction)
4. Create transaction records
5. Update bet status to 'WON' or 'LOST'
6. Emit `balance:updated` event

**Scheduling:** On-demand (when prediction resolved)

---

### **2. pong-payout.worker.ts**
Process Pong game payouts.

**Trigger:** Pong match ends

**Job Data:**
```typescript
{
  matchId: number;
  winnerId: number;
  loserId: number;
  wagerAmount: number;
}
```

**Logic:**
1. Transfer wager from loser to winner
2. Update user balances (transaction)
3. Create transaction records
4. Emit `balance:updated` event

**Scheduling:** On-demand (when match ends)

---

### **3. leaderboard.worker.ts**
Recalculate leaderboards.

**Job Data:** None (recalculates all leaderboards)

**Logic:**
1. Calculate daily leaderboard (last 24h)
2. Calculate weekly leaderboard (last 7d)
3. Calculate all-time leaderboard
4. Update leaderboard cache in Redis
5. Emit `leaderboard:*:updated` events

**Scheduling:** Every 5 minutes

---

### **4. leaderboard-snapshot.worker.ts**
Take daily leaderboard snapshots.

**Job Data:** None

**Logic:**
1. Snapshot current daily leaderboard
2. Store in `LeaderboardSnapshot` table
3. Reset daily leaderboard counters

**Scheduling:** Every day at midnight UTC

---

### **5. feed.worker.ts**
Fetch RSS/Atom feeds.

**Job Data:**
```typescript
{
  feedId: number;
  feedUrl: string;
}
```

**Logic:**
1. Fetch feed via HTTP
2. Parse RSS/Atom XML
3. Extract articles (title, URL, content, pubDate)
4. Queue articles for processing (article.worker.ts)

**Scheduling:** Every 15 minutes (all feeds)

---

### **6. article.worker.ts**
Process fetched articles.

**Job Data:**
```typescript
{
  feedId: number;
  article: {
    title: string;
    url: string;
    content: string;
    pubDate: Date;
  };
}
```

**Logic:**
1. Check for duplicates (by URL)
2. Extract Open Graph metadata
3. Sanitize HTML content
4. Auto-tag article (Tesla, SpaceX, Legal, etc.)
5. Save to database (moderation queue)
6. Emit `article:new` event

**Scheduling:** On-demand (triggered by feed.worker.ts)

---

## Real-time Event System

### Architecture

```
┌─────────────┐
│   Service   │ (Business logic)
└──────┬──────┘
       │
       │ emit event
       ▼
┌──────────────────┐
│  Redis Pub/Sub   │
└──────┬───────────┘
       │
       │ broadcast to all instances
       ▼
┌───────────────────────────────────────────────┐
│        Socket.IO Server (All Instances)       │
└───────────────────────┬───────────────────────┘
                        │
                        │ emit to rooms
                        ▼
            ┌───────────────────────┐
            │   Socket.IO Clients   │
            │  (Client App Browsers) │
            └───────────────────────┘
```

### Redis Channels (75+)

**Categories:**
- Betting: `bet:placed`, `bet:won`, `bet:lost`, `parlay:*`
- Predictions: `prediction:created`, `prediction:updated`, `prediction:resolved`
- Financial: `balance:updated`, `transaction:created`
- Pong: `pong:match:*`, `pong:elo:updated`
- Leaderboard: `leaderboard:daily:updated`, `leaderboard:weekly:updated`
- Social: `post:created`, `reaction:added`, `follow:new`
- Chat: `chat:message`, `chat:typing`
- Timeline: `article:new`, `article:trending`
- Achievements: `achievement:unlocked`
- Admin: `user:banned`, `content:moderated`

### Publishing Events

**Pattern:**
```typescript
// services/predictions.service.ts
import { redisPublish } from '../config/redis';
import { REDIS_CHANNELS } from '@ems/types';

export async function resolvePrediction(predictionId: number, winningOptionId: number) {
  // Business logic
  const prediction = await predictionRepository.update(predictionId, {
    status: 'RESOLVED',
    winningOptionId
  });

  // Publish event to Redis
  await redisPublish(REDIS_CHANNELS.PREDICTION_RESOLVED, {
    predictionId,
    winningOptionId,
    prediction
  });

  // Queue payout job
  await payoutQueue.add('process-payouts', { predictionId, winningOptionId });

  return prediction;
}
```

### Subscribing to Events (Server-side)

**Pattern:**
```typescript
// handlers/redisEventHandlers.ts
import { redisSubscribe } from '../config/redis';
import { REDIS_CHANNELS } from '@ems/types';
import { io } from '../socket';

// Subscribe to Redis channel
redisSubscribe(REDIS_CHANNELS.PREDICTION_RESOLVED, (payload) => {
  // Broadcast to all clients in the prediction room
  io.to(`prediction:${payload.predictionId}`).emit('prediction:resolved', payload);

  // Broadcast to global room
  io.to('global').emit('prediction:resolved', payload);
});
```

---

## Authentication & Security

### JWT Authentication

**Access Token:**
- Expiry: 15 minutes
- Payload: `{ userId, email, role }`
- Stored: Client-side (memory only, no localStorage)

**Refresh Token:**
- Expiry: 7 days
- Payload: `{ userId, tokenId }`
- Stored: Server-side (Redis), client-side (httpOnly cookie)

**Token Refresh Flow:**
```
Client sends refresh token
  ↓
Server validates refresh token
  ↓
Server checks token in Redis
  ↓
Server generates new access token
  ↓
Server rotates refresh token (optional)
  ↓
Server returns new access token
```

### Password Security

**Hashing:**
- Algorithm: bcrypt
- Salt rounds: 12 (configurable via `BCRYPT_SALT_ROUNDS`)

**Password Requirements:**
- Minimum 8 characters
- Must contain uppercase, lowercase, number

### CORS

**Allowed Origins:**
- `CLIENT_APP_URL` (client SPA)
- `BASE_URL_CLIENT` (client production URL)
- `BASE_URL_PUBLIC` (public-site production URL)
- Localhost (development only)

### Rate Limiting

**Limits:**
- Auth endpoints: 5 requests / 15 minutes (prevent brute force)
- General endpoints: 100 requests / 15 minutes
- Admin endpoints: 200 requests / 15 minutes

### Security Headers (Helmet)

**Headers:**
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)

---

## Infrastructure Services

### Redis

**Usage:**
- Pub/sub for real-time events (75+ channels)
- Refresh token storage (7-day TTL)
- Active user cache (5-minute TTL)
- Leaderboard cache (5-minute TTL)
- Session storage

**Configuration:**
```typescript
// config/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
});

// Pub/sub clients (separate connections)
export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();
```

---

### BullMQ

**Queue Configuration:**
```typescript
// config/bullmq.ts
import { Queue } from 'bullmq';
import { redis } from './redis';

export const payoutQueue = new Queue('payouts', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 1000
  }
});
```

---

### Tigris S3

**Storage:**
- Bucket: `elonmusksucks-uploads`
- Region: `auto` (global)
- Files: User avatars, images

**Upload Pattern:**
```typescript
// services/imageProcessing.service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: process.env.TIGRIS_S3_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY!
  }
});

export async function uploadAvatar(buffer: Buffer, userId: number) {
  const key = `avatars/${userId}-${Date.now()}.jpg`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.TIGRIS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg'
  }));

  return `https://${process.env.TIGRIS_S3_BUCKET}.fly.storage.tigris.dev/${key}`;
}
```

---

### SendGrid

**Email Templates:**
- Email verification
- Password reset
- Achievement unlocked

**Sending Pattern:**
```typescript
// services/email.service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendVerificationEmail(email: string, token: string) {
  await sgMail.send({
    to: email,
    from: process.env.FROM_EMAIL!,
    subject: 'Verify your email',
    html: `<p>Click <a href="${process.env.CLIENT_APP_URL}/verify?token=${token}">here</a> to verify your email.</p>`
  });
}
```

---

## Development

### Prerequisites

- **Node.js ≥24.0.0** (strict requirement)
- **PostgreSQL 16**
- **Redis 7+**
- **npm 10+**

### Environment Variables

Create `.env` in repository root:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/elonmusksucks

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (32+ characters)
ACCESS_TOKEN_SECRET=your_secure_access_token_secret_here
REFRESH_TOKEN_SECRET=your_secure_refresh_token_secret_here

# Application URLs
BASE_URL_CLIENT=http://localhost:3000
BASE_URL_SERVER=http://localhost:5000
BASE_URL_PUBLIC=http://localhost:5173
CLIENT_APP_URL=http://localhost:3000

# Tigris S3
TIGRIS_S3_ENDPOINT=https://fly.storage.tigris.dev
TIGRIS_ACCESS_KEY_ID=tid_your_key
TIGRIS_SECRET_ACCESS_KEY=tsec_your_secret
TIGRIS_S3_BUCKET=your_bucket

# SendGrid
SENDGRID_API_KEY=SG.your_key
FROM_EMAIL=noreply@elonmusksucks.net

# Optional
BCRYPT_SALT_ROUNDS=12
NODE_ENV=development
PORT=5000
SKIP_EMAIL_FLOW=true
```

### Development Commands

```bash
# Install dependencies (run from repository root)
npm install

# Generate Prisma client
npm -w apps/server run prisma:generate

# Run database migrations
npm -w apps/server run prisma:migrate:dev

# Seed database
npm -w apps/server run seed:dev

# Start dev server (port 5000) with hot reload
npm -w apps/server run dev

# Start all workers (6 workers)
npm -w apps/server run worker

# Type checking
npm -w apps/server run tsc -- --noEmit
```

### Development Workflow

1. **Start PostgreSQL & Redis:**
   ```bash
   # PostgreSQL
   psql -U postgres -d elonmusksucks

   # Redis
   redis-server
   ```

2. **Run migrations & seed:**
   ```bash
   npm -w apps/server run prisma:migrate:dev
   npm -w apps/server run seed:dev
   ```

3. **Start dev server:**
   ```bash
   npm -w apps/server run dev
   ```

4. **Start workers (separate terminal):**
   ```bash
   npm -w apps/server run worker
   ```

5. **Open browser:** http://localhost:5000/health

### Hot Reload

**Nodemon** watches `src/**/*.ts` and auto-restarts on changes.

---

## Testing

### Test Setup

**Framework:** Vitest (planned)

**Current State:** Tests are being added incrementally.

### Running Tests

```bash
# Run all tests
npm -w apps/server test

# Run specific test file
npm -w apps/server test -- path/to/test.spec.ts

# Coverage report
npm -w apps/server test -- --coverage
```

---

## Build & Deployment

### Production Build

```bash
# Build TypeScript to JavaScript
npm -w apps/server run build

# Output: apps/server/dist/
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Docker Deployment

**Multi-stage build** (`Dockerfile`):

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### Fly.io Deployment

**Configuration** (`fly.toml`):

```toml
app = "elonmusksucks-server"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "5000"
  NODE_ENV = "production"

[[services]]
  internal_port = 5000
  protocol = "tcp"

  [services.concurrency]
    type = "connections"
    hard_limit = 1000
    soft_limit = 800

  [[services.ports]]
    handlers = ["http"]
    port = 80
    force_https = true

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.http_checks]]
    interval = 10000
    timeout = 2000
    grace_period = "5s"
    method = "get"
    path = "/health"
```

**Deploy:**

```bash
cd apps/server
fly deploy
```

---

## API Patterns

### Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Pagination

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Filtering

**Query Parameters:**
- `status` (OPEN, CLOSED, RESOLVED)
- `category` (POLITICS, TECHNOLOGY, etc.)
- `sortBy` (createdAt, volume, etc.)
- `order` (asc, desc)

---

## Performance & Monitoring

### Prometheus Metrics

**Endpoint:** `GET /metrics`

**Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `http_response_size_bytes` - Response size histogram
- `socket_connections_total` - Total Socket.IO connections
- `redis_operations_total` - Redis operation count

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Logging

**Development:** Console logs with colors

**Production:** JSON logs for structured logging

**Pattern:**
```typescript
console.log('[service] Action completed', { userId, predictionId });
console.error('[service] Error occurred', { error: error.message });
```

---

## Troubleshooting

### Issue: Prisma client not found

**Solution:**
```bash
npm -w apps/server run prisma:generate
```

---

### Issue: Redis connection failed

**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Check `REDIS_URL` environment variable
3. Restart Redis: `redis-server`

---

### Issue: Database migration failed

**Solution:**
```bash
# Reset database and apply all migrations
npm -w apps/server run prisma:migrate:dev
```

---

### Issue: Socket.IO not connecting

**Solution:**
1. Check server is running on port 5000
2. Check Redis adapter is configured
3. Check CORS origins include client URL
4. Enable debug: `DEBUG=socket.io:* npm -w apps/server run dev`

---

## Additional Resources

- [Express Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Main Project README](../../README.md)
- [System Architecture Docs](../../docs/SYSTEM_ARCHITECTURE.md)
- [Design Patterns Docs](../../docs/DESIGN_PATTERNS.md)

---

## License

See [LICENSE](../../LICENSE) in repository root.
