# System Architecture & Design Patterns

**Version:** 2.0 (Post-Refactor)
**Last Updated:** October 2025
**Status:** Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architectural Principles](#architectural-principles)
3. [Layered Architecture](#layered-architecture)
4. [Repository Layer](#repository-layer)
5. [Service Layer](#service-layer)
6. [Controller Layer](#controller-layer)
7. [Infrastructure Abstractions](#infrastructure-abstractions)
8. [Type System Organization](#type-system-organization)
9. [Real-Time & Event System](#real-time--event-system)
10. [Worker & Queue Patterns](#worker--queue-patterns)
11. [Dependency Injection](#dependency-injection)
12. [Data Flow Patterns](#data-flow-patterns)
13. [Content Unification](#content-unification)
14. [Testing Patterns](#testing-patterns)
15. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Overview

The **Elon Musk Sucks** platform follows a **strict layered architecture** with clear separation of concerns. This document defines the architectural patterns established during the major refactor (+19k/-10k initial commit, +4k/-3k completion).

### Core Architectural Tenets

1. **Interface-Driven Design**: All cross-layer dependencies use TypeScript interfaces
2. **Repository Pattern**: Data access exclusively through repository layer
3. **Service Orchestration**: Business logic in service layer, never in controllers
4. **Infrastructure Abstraction**: Redis, EventBus, and external services accessed via interfaces
5. **Type Safety**: Centralized type definitions in `@ems/types` package
6. **Dependency Injection**: Constructor-based DI with interface contracts

---

## Architectural Principles

### 1. Separation of Concerns

Each layer has a **single, well-defined responsibility**:

| Layer | Responsibility | Example |
|-------|---------------|---------|
| Controllers | HTTP request/response handling, validation | `timeline.controller.ts` |
| Services | Business logic, orchestration | `timeline.service.ts` |
| Repositories | Data access, query optimization | `ContentRepository.ts` |
| Infrastructure | External system integration | `RedisPool.ts`, `EventBus.ts` |

### 2. Dependency Rule

**Dependencies flow downward only**:

```
Controllers → Services → Repositories → Prisma/Database
     ↓           ↓            ↓
  Types ← ← ← ← Types ← ← ← Types
```

- Controllers depend on Services (via interfaces)
- Services depend on Repositories (via interfaces)
- Repositories depend on Prisma/Database
- **No layer depends on layers above it**

### 3. Interface-First Design

All major components define interfaces in `@ems/types`:

```typescript
// Interface definition (packages/types/src/...)
export interface IContentRepository {
  createContent(data: CreateContentData): Promise<PrismaContent>;
  getContentById(id: number): Promise<PrismaContent | null>;
  // ...
}

// Implementation (apps/server/src/repositories/...)
export class ContentRepository implements IContentRepository {
  constructor(private prisma: PrismaClient) {}
  // Implementation details...
}
```

### 4. No Direct Infrastructure Access

Services **never** directly use:
- `redisClient.publish()` → Use `IEventBus`
- `new IORedis()` → Use `IRedisPool`
- `prisma.*` → Use Repository interfaces

---

## Layered Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              HTTP Clients                        │
│         (Browser, Mobile App, SSR)               │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│          CONTROLLER LAYER                        │
│  • Request validation                            │
│  • Response formatting                           │
│  • Error handling                                │
│  • No business logic                             │
│                                                   │
│  Files: apps/server/src/controllers/*.ts         │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│           SERVICE LAYER                          │
│  • Business logic                                │
│  • Multi-repository orchestration                │
│  • Event publishing                              │
│  • Transaction coordination                      │
│                                                   │
│  Files: apps/server/src/services/*.ts            │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│         REPOSITORY LAYER                         │
│  • Data access logic                             │
│  • Query optimization                            │
│  • Database operations                           │
│  • Single-entity focus                           │
│                                                   │
│  Files: apps/server/src/repositories/*.ts        │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│        DATABASE (PostgreSQL)                     │
│        ORM (Prisma)                              │
└──────────────────────────────────────────────────┘
```

### Cross-Cutting Concerns

```
┌─────────────────────────────────────────────────┐
│      INFRASTRUCTURE ABSTRACTIONS                 │
│                                                   │
│  • IRedisPool (apps/server/src/lib/RedisPool)   │
│  • IEventBus (apps/server/src/lib/EventBus)     │
│  • IEventCoalescer, IBackpressureQueue          │
│                                                   │
│  Used by: Services, Workers, Handlers            │
└──────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            TYPE SYSTEM                           │
│                                                   │
│  • Centralized in @ems/types package             │
│  • Organized by layer (database/, api/, etc)     │
│  • Single barrel export (index.ts)               │
│                                                   │
│  Files: packages/types/src/**                    │
└──────────────────────────────────────────────────┘
```

---

## Repository Layer

### Purpose

The repository layer is the **exclusive interface to the database**. It encapsulates all Prisma operations and provides a clean, typed API for data access.

### Repository Pattern

```typescript
// 1. Define Interface (packages/types/src/repositories/interfaces/)
export interface IContentRepository {
  // CREATE
  createContent(data: CreateContentData): Promise<PrismaContent>;

  // READ
  getContentById(id: number): Promise<PrismaContent | null>;
  getPublicTimeline(options: TimelineOptions): Promise<{
    content: PrismaContent[];
    nextCursor?: number;
  }>;

  // UPDATE
  updateContent(id: number, authorId: number, body: string): Promise<PrismaContent | null>;
  incrementReactionCount(contentId: number): Promise<void>;

  // DELETE
  deleteContent(id: number, deletedBy: number): Promise<boolean>;

  // VALIDATION
  isContentOwner(contentId: number, userId: number): Promise<boolean>;
}

// 2. Implement Repository (apps/server/src/repositories/)
export class ContentRepository implements IContentRepository {
  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  async createContent(data: CreateContentData): Promise<PrismaContent> {
    // Calculate thread depth for replies
    let threadDepth = 0;
    if (data.parentId) {
      const parent = await this.prisma.content.findUnique({
        where: { id: data.parentId },
        select: { threadDepth: true },
      });
      threadDepth = parent ? parent.threadDepth + 1 : 0;
    }

    const content = await this.prisma.content.create({
      data: {
        authorId: data.authorId,
        type: data.type,
        body: data.body,
        threadDepth,
        // ...
      },
    });

    // Update parent reply count if this is a reply
    if (data.parentId) {
      await this.incrementReplyCount(data.parentId);
    }

    return content as PrismaContent;
  }

  // ... other methods
}
```

### Repository Naming Convention

| Repository | Responsibility | Key Entities |
|-----------|----------------|-------------|
| `ContentRepository` | Posts, comments (unified) | `Content` |
| `TimelineRepository` | Articles, feeds, timeline queries | `Article`, `Feed` |
| `UserRepository` | User CRUD, profiles, stats | `User`, `UserStats` |
| `PredictionRepository` | Predictions, options, bets | `Prediction`, `PredictionOption` |
| `ReactionRepository` | Reactions (polymorphic) | `ArticleReaction`, `ContentReaction` |
| `PongRepository` | Pong games, matches, ELO | `PongGame`, `PongMatch` |
| `AchievementRepository` | Achievement tracking | `Achievement`, `UserAchievement` |

### Repository Responsibilities

✅ **Repositories SHOULD:**
- Encapsulate all Prisma queries
- Handle query optimization and indexing strategies
- Manage denormalized counts (e.g., `repliesCount`, `reactionsCount`)
- Perform single-entity or closely-related-entity operations
- Return Prisma types (`PrismaContent`, `PrismaUser`, etc.)

❌ **Repositories SHOULD NOT:**
- Contain business logic
- Publish events (that's for services)
- Call other repositories
- Access Redis, Socket.IO, or external APIs
- Perform multi-entity orchestration

### Repository Interface Location

All repository interfaces live in:
```
apps/server/src/repositories/interfaces/I<EntityName>Repository.ts
```

Example:
- `IContentRepository.ts`
- `IUserRepository.ts`
- `IPredictionRepository.ts`

---

## Service Layer

### Purpose

The service layer contains **business logic** and orchestrates operations across multiple repositories. Services are the **only layer** that publishes events.

### Service Pattern

```typescript
// apps/server/src/services/timeline.service.ts
import { TimelineRepository } from '../repositories/TimelineRepository';
import type { ITimelineRepository } from '../repositories/interfaces/ITimelineRepository';
import { ContentRepository } from '../repositories/ContentRepository';
import type { IContentRepository } from '../repositories/interfaces/IContentRepository';
import { ReactionRepository } from '../repositories/ReactionRepository';
import type { IReactionRepository } from '../repositories/interfaces/IReactionRepository';
import { eventBus } from '../lib/EventBus';
import { REDIS_CHANNELS } from '@ems/types';

export class TimelineService {
  private timelineRepo: ITimelineRepository;
  private contentRepo: IContentRepository;
  private reactionRepo: IReactionRepository;

  constructor() {
    this.timelineRepo = new TimelineRepository(prisma);
    this.contentRepo = new ContentRepository(prisma);
    this.reactionRepo = new ReactionRepository(prisma);
  }

  /**
   * Get unified timeline (articles + posts)
   * Orchestrates multiple repositories and enriches data
   */
  async getUnifiedTimeline(params: {
    cursor?: Date;
    limit: number;
    viewerId?: number;
  }) {
    // 1. Fetch from multiple repositories
    const [articles, posts] = await Promise.all([
      this.timelineRepo.getApprovedArticles({ limit: params.limit }),
      this.contentRepo.getPublicTimeline({ limit: params.limit, viewerId: params.viewerId }),
    ]);

    // 2. Business logic: merge and sort by timestamp
    const merged = this.mergeBySortKey([...articles, ...posts], 'createdAt');

    // 3. Enrich with additional data
    const enriched = await this.enrichTimelineItems(merged);

    // 4. Publish event (services only!)
    await eventBus.publish(REDIS_CHANNELS.TIMELINE_VIEWED, {
      userId: params.viewerId,
      itemCount: enriched.length,
      timestamp: new Date().toISOString(),
    });

    return enriched;
  }

  /**
   * Create article comment
   * Coordinates content creation + event publishing
   */
  async createArticleComment(articleId: number, userId: number, content: string) {
    // 1. Create via repository
    const comment = await this.contentRepo.createContent({
      authorId: userId,
      type: 'COMMENT',
      body: content,
      articleId,
    });

    // 2. Publish event
    await eventBus.publish(REDIS_CHANNELS.COMMENT_CREATED, {
      commentId: comment.id,
      articleId,
      userId,
      body: content,
      timestamp: comment.createdAt.toISOString(),
    });

    // 3. Return enriched data
    return this.contentRepo.getContentWithDetails(comment.id);
  }

  // Private helper methods
  private mergeBySortKey(items: any[], key: string) { /* ... */ }
  private async enrichTimelineItems(items: any[]) { /* ... */ }
}
```

### Service Responsibilities

✅ **Services SHOULD:**
- Orchestrate multiple repositories
- Implement business rules and invariants
- Publish events to EventBus
- Coordinate transactions across repositories
- Enrich data with computed properties
- Handle pagination, filtering, sorting logic

❌ **Services SHOULD NOT:**
- Directly call `prisma.*` (use repositories)
- Handle HTTP requests/responses (that's for controllers)
- Directly call `redisClient.publish()` (use `IEventBus`)
- Contain presentation logic

---

## Controller Layer

### Purpose

Controllers handle **HTTP request/response** flow. They validate input, delegate to services, and format responses.

### Controller Pattern

```typescript
// apps/server/src/controllers/timeline.controller.ts
import type { Request, Response } from 'express';
import { TimelineService } from '../services/timeline.service';
import type { TimelineResponse } from '@ems/types';

const timelineService = new TimelineService();

/**
 * GET /api/timeline
 * Get unified timeline (articles + posts)
 */
export async function getTimeline(req: Request, res: Response) {
  try {
    // 1. Extract and validate request parameters
    const { limit = '30', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 30, 100);
    const viewerId = (req as any).user?.id; // From auth middleware

    // 2. Delegate to service layer
    const result = await timelineService.getUnifiedTimeline({
      cursor: cursor ? new Date(cursor as string) : undefined,
      limit: pageLimit,
      viewerId,
    });

    // 3. Format response
    const payload: TimelineResponse = {
      items: result.items,
      pagination: {
        cursor: result.nextCursor,
        hasMore: result.hasMore,
        total: result.total,
      },
    };

    // 4. Send HTTP response
    res.json(payload);
  } catch (error) {
    console.error('[timeline] Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
}

/**
 * POST /api/timeline/articles/:articleId/comments
 * Add comment to article
 */
export async function addArticleComment(req: Request, res: Response) {
  try {
    // 1. Validate input
    const articleId = parseInt(req.params.articleId);
    const { content } = req.body;
    const userId = (req as any).user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content required' });
    }

    // 2. Delegate to service
    const comment = await timelineService.createArticleComment(articleId, userId, content);

    // 3. Format and send response
    res.status(201).json(comment);
  } catch (error) {
    console.error('[timeline] Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
}
```

### Controller Responsibilities

✅ **Controllers SHOULD:**
- Extract and validate request parameters
- Invoke service methods
- Format response DTOs
- Handle HTTP status codes
- Catch and log errors
- Apply middleware (auth, rate limiting)

❌ **Controllers SHOULD NOT:**
- Contain business logic
- Directly call repositories
- Publish events
- Access `prisma.*`, `redisClient.*`, `io.emit()`
- Perform data transformations (delegate to services)

---

## Infrastructure Abstractions

### Purpose

Infrastructure abstractions decouple services from external dependencies (Redis, EventBus, queues). This enables:
- **Testability**: Easy mocking for unit tests
- **Flexibility**: Swap implementations without changing service code
- **Type Safety**: Strong contracts via TypeScript interfaces

---

### IRedisPool

**Purpose**: Connection-pooled Redis operations

**Interface Location**: `packages/types/src/services/IRedisPool.ts`

**Implementation**: `apps/server/src/lib/RedisPool.ts`

```typescript
// Interface (packages/types/src/services/IRedisPool.ts)
export interface IRedisPool {
  // Key-Value Operations
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<boolean>;

  // Numeric Operations
  incr(key: string, amount?: number): Promise<number>;
  decr(key: string, amount?: number): Promise<number>;

  // Set Operations
  sadd(key: string, member: string): Promise<number>;
  srem(key: string, member: string): Promise<number>;
  sismember(key: string, member: string): Promise<boolean>;
  smembers(key: string): Promise<string[]>;

  // Sorted Set Operations
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrank(key: string, member: string): Promise<number | null>;

  // Hash Operations
  hset(key: string, field: string, value: string): Promise<void>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;

  // Connection Management
  getConnection(): Promise<IORedis>;
  releaseConnection(connection: IORedis): Promise<void>;
  destroy(): Promise<void>;

  // Metrics
  getStats(): { active: number; idle: number; total: number };
}

// Implementation (apps/server/src/lib/RedisPool.ts)
export class RedisPool implements IRedisPool {
  private connections: IORedis[] = [];
  private availableConnections: IORedis[] = [];
  private config: RedisPoolConfig;

  constructor(redisOptions: RedisOptions, config: Partial<RedisPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 10,
      minConnections: config.minConnections || 2,
      acquireTimeoutMs: config.acquireTimeoutMs || 5000,
      idleTimeoutMs: config.idleTimeoutMs || 30000,
    };
    this.initializePool();
  }

  async get(key: string): Promise<string | null> {
    const conn = await this.getConnection();
    try {
      return await conn.get(key);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  // ... other methods follow the same pattern
}
```

**Usage in Services**:
```typescript
export class SomeService {
  constructor(private redisPool: IRedisPool = new RedisPool(redisOptions)) {}

  async cacheUserData(userId: number, data: string) {
    await this.redisPool.set(`user:${userId}`, data, 3600);
  }
}
```

---

### IEventBus

**Purpose**: Abstracted pub/sub event system

**Interface Location**: `packages/types/src/services/IEventBus.ts`

**Implementation**: `apps/server/src/lib/EventBus.ts`

```typescript
// Interface (packages/types/src/services/IEventBus.ts)
export interface IEventBus {
  publish<T>(channel: RedisChannel, payload: T): Promise<void>;
  subscribe(channel: RedisChannel, handler: (buffer: Buffer) => void): Promise<void>;
  unsubscribe(channel: RedisChannel): Promise<void>;
  publishBatch<T>(events: Array<{ channel: RedisChannel; payload: T }>): Promise<void>;
}

// Implementation (apps/server/src/lib/EventBus.ts)
export class EventBus implements IEventBus {
  private redisPool?: IRedisPool;
  private subscribers: Map<string, Set<(buffer: Buffer) => void>> = new Map();
  private subscriberClient: IORedis;

  constructor(usePooling = true) {
    if (usePooling) {
      this.redisPool = new RedisPool(options, {
        maxConnections: 8,
        minConnections: 2,
      });
    }
  }

  async publish<T>(channel: RedisChannel, payload: T): Promise<void> {
    if (this.redisPool) {
      const connection = await this.redisPool.getConnection();
      try {
        await connection.publish(channel, JSON.stringify(payload));
      } finally {
        await this.redisPool.releaseConnection(connection);
      }
    } else {
      await redisClient.publish(channel, JSON.stringify(payload));
    }
  }

  // ... other methods
}

// Singleton instance
export const eventBus = new EventBus();
```

**Usage in Services**:
```typescript
import { eventBus } from '../lib/EventBus';
import { REDIS_CHANNELS } from '@ems/types';

export class BettingService {
  async placeBet(userId: number, predictionId: number, amount: number) {
    const bet = await this.bettingRepo.createBet({ userId, predictionId, amount });

    // Publish event via abstraction
    await eventBus.publish(REDIS_CHANNELS.BET_PLACED, {
      betId: bet.id,
      userId,
      predictionId,
      amount,
      timestamp: bet.createdAt.toISOString(),
    });

    return bet;
  }
}
```

---

## Type System Organization

### Purpose

The `@ems/types` package provides a **single source of truth** for all TypeScript types across the platform.

### Package Structure

```
packages/types/src/
├── index.ts                    # Barrel export (single entry point)
├── prisma.ts                   # Prisma-derived types
├── shared/                     # Shared utilities
│   ├── index.ts
│   ├── branded-types.ts        # Type-safe IDs
│   ├── constants.ts            # Platform constants
│   ├── enums.ts                # Shared enums
│   ├── errors.ts               # Error types
│   └── pagination.ts           # Pagination types
├── database/                   # Database layer types
│   ├── user.ts                 # DbUser, DbUserStats, etc.
│   ├── prediction.ts           # DbPrediction, DbBet, etc.
│   ├── content.ts              # DbContent, DbComment, etc.
│   ├── timeline.ts             # DbArticle, DbFeed, etc.
│   ├── pong.ts                 # DbPongGame, DbPongMatch, etc.
│   └── ...
├── api/                        # API layer types
│   ├── requests/               # Request DTOs
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── prediction.ts
│   │   └── ...
│   ├── responses/              # Response DTOs
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── timeline.ts
│   │   └── ...
│   └── socket/                 # Socket.IO types
│       ├── events.ts           # Event names, channels
│       ├── payloads.ts         # Event payloads
│       └── acks.ts             # Acknowledgment types
├── services/                   # Service layer interfaces
│   ├── IEventBus.ts
│   ├── IRedisPool.ts
│   ├── IBackpressureQueue.ts
│   └── ...
├── workers/                    # Worker/queue types
│   ├── jobs.ts                 # Job data types
│   └── queues.ts               # Queue names
├── domain/                     # Domain/business types
│   ├── achievements.ts
│   ├── analytics.ts
│   ├── leaderboard.ts
│   └── ...
└── config/                     # Configuration types
    ├── features.ts
    ├── security.ts
    ├── monitoring.ts
    └── ...
```

### Barrel Export Pattern

**Single entry point** for all imports:

```typescript
// packages/types/src/index.ts
export * from './prisma.js';
export * from './shared/index.js';
export * from './database/user.js';
export * from './database/prediction.js';
// ... all other exports
export * from './api/requests/index.js';
export * from './api/responses/index.js';
export * from './services/index.js';
```

**Usage**:
```typescript
// ✅ Good: Import from barrel
import type {
  PrismaUser,
  IContentRepository,
  CreatePostRequest,
  TimelineResponse,
  REDIS_CHANNELS,
} from '@ems/types';

// ❌ Bad: Deep imports
import type { PrismaUser } from '@ems/types/database/user';
```

### Type Naming Conventions

| Prefix | Purpose | Example |
|--------|---------|---------|
| `Prisma*` | Direct Prisma types | `PrismaUser`, `PrismaContent` |
| `Db*` | Database-enriched types | `DbUserWithStats`, `DbContentWithDetails` |
| `I*` | Interfaces | `IContentRepository`, `IEventBus` |
| `*Request` | API request DTOs | `CreatePostRequest`, `LoginRequest` |
| `*Response` | API response DTOs | `TimelineResponse`, `UserProfileResponse` |
| `*Payload` | Event payloads | `BetPlacedPayload`, `CommentCreatedPayload` |
| `*JobData` | Worker job data | `RefreshJobData`, `PayoutJobData` |

---

## Real-Time & Event System

### Event Architecture

The platform uses **Redis Pub/Sub** for real-time events, abstracted via `IEventBus`.

### Event Flow

```
Service Layer          EventBus            Redis           Socket.IO Handler
    │                     │                  │                     │
    │──publish(event)────>│                  │                     │
    │                     │──PUBLISH────────>│                     │
    │                     │                  │──message──────────>│
    │                     │                  │                     │
    │                     │                  │          ┌──────────▼─────────┐
    │                     │                  │          │ Parse & Validate   │
    │                     │                  │          │ Emit to Socket.IO  │
    │                     │                  │          └──────────┬─────────┘
    │                     │                  │                     │
    │                     │                  │                io.to(room).emit()
    │                     │                  │                     │
    │                     │                  │                     ▼
    │                     │                  │              Connected Clients
```

### Redis Channels

Defined in `packages/types/src/api/socket/events.ts`:

```typescript
export const REDIS_CHANNELS = {
  // Betting Events
  BET_PLACED: 'bet:placed',
  PARLAY_STARTED: 'parlay:started',
  PREDICTION_RESOLVED: 'prediction:resolved',

  // Timeline Events
  COMMENT_CREATED: 'comment:created',
  POST_CREATED: 'post:created',
  ARTICLE_REACTION: 'article:reaction',

  // Leaderboard Events
  LEADERBOARD_ALL_TIME: 'leaderboard:all-time',
  LEADERBOARD_DAILY: 'leaderboard:daily',
  LEADERBOARD_RANK_UPDATE: 'leaderboard:rank:update',

  // Achievement Events
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',

  // Activity Events
  ACTIVITY_STREAM: 'activity:stream',
} as const;

export type RedisChannel = typeof REDIS_CHANNELS[keyof typeof REDIS_CHANNELS];
```

### Event Payloads

```typescript
// packages/types/src/api/socket/payloads.ts
export interface BetPlacedPayload {
  betId: number;
  userId: number;
  predictionId: number;
  optionId: number;
  amount: number;
  odds: number;
  timestamp: string;
}

export interface CommentCreatedPayload {
  commentId: number;
  articleId: number;
  userId: number;
  body: string;
  timestamp: string;
}
```

### Publishing Events (Service Layer Only!)

```typescript
// ✅ Good: Service publishes events
export class PostService {
  async createPost(userId: number, body: string) {
    const post = await this.contentRepo.createContent({ authorId: userId, body, type: 'POST' });

    // Publish event via EventBus abstraction
    await eventBus.publish(REDIS_CHANNELS.POST_CREATED, {
      postId: post.id,
      userId,
      body,
      timestamp: post.createdAt.toISOString(),
    });

    return post;
  }
}

// ❌ Bad: Controller publishes events
export async function createPost(req: Request, res: Response) {
  const post = await postService.createPost(req.user.id, req.body.content);

  // DON'T DO THIS!
  await eventBus.publish(REDIS_CHANNELS.POST_CREATED, { /* ... */ });

  res.json(post);
}
```

---

## Worker & Queue Patterns

### Worker Architecture

Workers use **BullMQ** for job processing with Redis as the backing store.

### Worker Structure

```typescript
// apps/server/src/workers/leaderboard.worker.ts
import { Worker, Queue } from 'bullmq';
import type { RefreshJobData } from '@ems/types';
import redisClient from '../lib/redis';
import { eventBus } from '../lib/EventBus';
import { LeaderboardRepository } from '../repositories/LeaderboardRepository';

const repo = new LeaderboardRepository();
const queue = new Queue('leaderboard-refresh', { connection: redisClient });

/**
 * Leaderboard refresh worker
 * Processes scheduled and manual leaderboard updates
 */
const refreshWorker = new Worker(
  'leaderboard-refresh',
  async (job: Job<RefreshJobData>) => {
    const { type, limit, force } = job.data;

    console.log('[leaderboard] Processing refresh job:', { type, limit, force });

    const startTime = Date.now();

    // 1. Get previous rankings for comparison
    const previousTopAllTime = await repo.getTopAllTime(100);
    const previousRankings = new Map(
      previousTopAllTime.map((entry, index) => [entry.userId, index + 1])
    );

    // 2. Refresh materialized view (or clear caches)
    await repo.refreshMaterializedView();

    // 3. Fetch updated data
    const topAllTime = await repo.getTopAllTime(50);
    const topDaily = await repo.getTopDaily(50);

    // 4. Detect ranking changes and trigger achievements
    const currentTopAllTime = await repo.getTopAllTime(100);
    for (let i = 0; i < currentTopAllTime.length; i++) {
      const entry = currentTopAllTime[i];
      const currentRank = i + 1;
      const previousRank = previousRankings.get(entry.userId) || 999;

      if (previousRank !== currentRank) {
        await eventBus.publish('leaderboard:rank:update', {
          userId: entry.userId,
          rank: currentRank,
          previousRank,
          rankChange: previousRank - currentRank,
          // ... other fields
        });
      }
    }

    // 5. Publish updated leaderboards
    await Promise.all([
      eventBus.publish(REDIS_CHANNELS.LEADERBOARD_ALL_TIME, topAllTime),
      eventBus.publish(REDIS_CHANNELS.LEADERBOARD_DAILY, topDaily),
    ]);

    const duration = Date.now() - startTime;
    console.log(`[leaderboard] Refresh completed in ${duration}ms`);
  },
  {
    connection: redisClient,
    concurrency: 1, // Only one refresh at a time
  }
);

// Event handlers
refreshWorker.on('completed', (job) => {
  console.log(`[leaderboard] Job ${job.id} completed`);
});

refreshWorker.on('failed', (job, err) => {
  console.error(`[leaderboard] Job ${job?.id} failed:`, err);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[leaderboard] Shutting down worker...');
  await refreshWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

### Job Data Types

Defined in `packages/types/src/workers/jobs.ts`:

```typescript
export interface RefreshJobData {
  type: 'scheduled' | 'manual' | 'event-driven';
  limit?: number;
  force?: boolean;
}

export interface PayoutJobData {
  betId: number;
  userId: number;
  amount: number;
  predictionId: number;
  resolutionId: string;
}

export interface IncrementalUpdateData {
  userId: number;
  metrics: string[];
  trigger: string;
}
```

### Queue Names

Defined in `packages/types/src/workers/queues.ts`:

```typescript
export const QUEUE_NAMES = {
  PAYOUTS: 'payouts',
  LEADERBOARD_REFRESH: 'leaderboard-refresh',
  LEADERBOARD_EVENTS: 'leaderboard-events',
  FEED_FETCH: 'feed-fetch',
  ARTICLE_PROCESSING: 'article-processing',
} as const;
```

---

## Dependency Injection

### Constructor-Based Injection

All major components use **constructor-based dependency injection** with interface contracts.

### Service DI Pattern

```typescript
// Service with repository dependencies
export class TimelineService {
  private timelineRepo: ITimelineRepository;
  private contentRepo: IContentRepository;
  private userService: UserService;

  constructor(
    timelineRepo?: ITimelineRepository,
    contentRepo?: IContentRepository,
    userService?: UserService
  ) {
    // Default to concrete implementations
    this.timelineRepo = timelineRepo || new TimelineRepository(prisma);
    this.contentRepo = contentRepo || new ContentRepository(prisma);
    this.userService = userService || new UserService();
  }

  // Service methods...
}
```

### Repository DI Pattern

```typescript
export class ContentRepository implements IContentRepository {
  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  // Repository methods...
}
```

### Testing with DI

```typescript
// Mock repository for testing
class MockContentRepository implements IContentRepository {
  async createContent(data: CreateContentData): Promise<PrismaContent> {
    return {
      id: 1,
      authorId: data.authorId,
      type: data.type,
      body: data.body,
      createdAt: new Date(),
      // ...
    } as PrismaContent;
  }
  // ... other mocked methods
}

// Test with injected mock
describe('TimelineService', () => {
  it('creates article comment', async () => {
    const mockContentRepo = new MockContentRepository();
    const service = new TimelineService(undefined, mockContentRepo);

    const comment = await service.createArticleComment(1, 1, 'Test comment');

    expect(comment.body).toBe('Test comment');
  });
});
```

---

## Data Flow Patterns

### Read Flow (Timeline Example)

```
1. HTTP Request
   GET /api/timeline?limit=30
   │
   ▼
2. Controller (timeline.controller.ts)
   • Validate params
   • Extract user ID from auth
   │
   ▼
3. Service (timeline.service.ts)
   • Orchestrate data fetching
   • Call multiple repositories in parallel
   │
   ├──▶ TimelineRepository.getApprovedArticles()
   │    └──▶ Prisma query for articles
   │
   └──▶ ContentRepository.getPublicTimeline()
        └──▶ Prisma query for posts
   │
   ▼
4. Service (continued)
   • Merge articles + posts
   • Sort by timestamp
   • Enrich with avatar URLs
   │
   ▼
5. Controller (continued)
   • Format as TimelineResponse DTO
   • Send HTTP 200 + JSON
```

### Write Flow (Create Post Example)

```
1. HTTP Request
   POST /api/posts
   Body: { content: "Hello world" }
   │
   ▼
2. Controller (post.controller.ts)
   • Validate input
   • Extract user ID from auth
   │
   ▼
3. Service (post.service.ts)
   • Business logic validation
   • Call repository
   │
   ▼
4. Repository (ContentRepository)
   • Prisma transaction:
     - Create content record
     - Update denormalized counts
   • Return created entity
   │
   ▼
5. Service (continued)
   • Publish event to EventBus
   │
   ▼
6. EventBus
   • Redis PUBLISH post:created
   │
   ▼
7. Socket.IO Handler (listening to Redis)
   • Parse event
   • io.to(room).emit('post:created', payload)
   │
   ▼
8. Connected Clients
   • Receive real-time update
   • Update UI without refresh
   │
   ▼
9. Controller (continued)
   • Return created post as JSON
   • HTTP 201 Created
```

---

## Content Unification

### Problem Statement

Previously, the system had **separate models** for:
- **Posts** (user-created content)
- **Comments** on articles
- **Comments** on predictions

This led to code duplication, inconsistent APIs, and complex queries.

### Solution: Unified Content Model

A single `Content` table with **polymorphic relationships**:

```prisma
model Content {
  id             Int              @id @default(autoincrement())
  authorId       Int
  type           ContentType      // POST | COMMENT
  body           String
  contentType    PostContentType  // TEXT | MEDIA | LINK | POLL
  visibility     PostVisibility   // PUBLIC | FOLLOWERS | PRIVATE

  // Polymorphic parent (what is this attached to?)
  articleId      Int?
  predictionId   Int?

  // Threading (reply to another content)
  parentId       Int?
  parent         Content?  @relation("ContentReplies", fields: [parentId], references: [id])
  children       Content[] @relation("ContentReplies")
  threadDepth    Int       @default(0)

  // Denormalized counts
  reactionsCount Int       @default(0)
  repliesCount   Int       @default(0)
  viewsCount     Int       @default(0)

  // Relations
  author         User      @relation(fields: [authorId], references: [id])
  article        Article?  @relation(fields: [articleId], references: [id])
  prediction     Prediction? @relation(fields: [predictionId], references: [id])
  reactions      ContentReaction[]
  mentions       ContentMention[]
  hashtags       ContentHashtag[]

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  isDeleted      Boolean   @default(false)
}
```

### Repository Interface

`IContentRepository` provides a unified API for all content types:

```typescript
export interface IContentRepository {
  // Create any type of content
  createContent(data: {
    authorId: number;
    type: 'POST' | 'COMMENT';
    body: string;
    articleId?: number;       // Comment on article
    predictionId?: number;    // Comment on prediction
    parentId?: number;        // Reply to another content
  }): Promise<PrismaContent>;

  // Get top-level posts
  getPublicTimeline(options: TimelineOptions): Promise<{ content: PrismaContent[] }>;

  // Get comments for article
  getArticleComments(articleId: number, options: PaginationOptions): Promise<{ comments: PrismaContent[] }>;

  // Get comments for prediction
  getPredictionComments(predictionId: number, options: PaginationOptions): Promise<{ comments: PrismaContent[] }>;

  // Get replies to any content
  getReplies(parentId: number, options: PaginationOptions): Promise<{ replies: PrismaContent[] }>;
}
```

### Benefits

✅ **Single Source of Truth**: One content model, one repository
✅ **Consistent API**: Same methods for posts, comments, replies
✅ **Reduced Duplication**: No separate `PostRepository`, `CommentRepository`
✅ **Polymorphic Reactions**: Single reaction system for all content
✅ **Threading Support**: Built-in reply chains with `threadDepth`

---

## Testing Patterns

### Repository Tests

```typescript
// apps/server/src/repositories/__tests__/ContentRepository.test.ts
import { ContentRepository } from '../ContentRepository';
import type { PrismaClient } from '@prisma/client';

describe('ContentRepository', () => {
  let repo: ContentRepository;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      content: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    repo = new ContentRepository(mockPrisma);
  });

  describe('createContent', () => {
    it('creates top-level post', async () => {
      const mockPost = {
        id: 1,
        authorId: 1,
        type: 'POST',
        body: 'Test post',
        threadDepth: 0,
        createdAt: new Date(),
      };

      mockPrisma.content.create.mockResolvedValue(mockPost as any);

      const result = await repo.createContent({
        authorId: 1,
        type: 'POST',
        body: 'Test post',
      });

      expect(result).toEqual(mockPost);
      expect(mockPrisma.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: 1,
          type: 'POST',
          body: 'Test post',
          threadDepth: 0,
        }),
      });
    });

    it('increments threadDepth for replies', async () => {
      const mockParent = { id: 1, threadDepth: 0 };
      const mockReply = { id: 2, threadDepth: 1, parentId: 1 };

      mockPrisma.content.findUnique.mockResolvedValue(mockParent as any);
      mockPrisma.content.create.mockResolvedValue(mockReply as any);

      await repo.createContent({
        authorId: 1,
        type: 'COMMENT',
        body: 'Reply',
        parentId: 1,
      });

      expect(mockPrisma.content.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ threadDepth: 1 }),
      });
    });
  });
});
```

### Service Tests with Mocks

```typescript
// apps/server/src/services/__tests__/timeline.service.test.ts
import { TimelineService } from '../timeline.service';
import type { IContentRepository } from '../../repositories/interfaces/IContentRepository';
import { MockEventBus } from '../../lib/EventBus';

describe('TimelineService', () => {
  let service: TimelineService;
  let mockContentRepo: jest.Mocked<IContentRepository>;
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    mockContentRepo = {
      createContent: jest.fn(),
      getContentWithDetails: jest.fn(),
    } as any;

    mockEventBus = new MockEventBus();

    service = new TimelineService(undefined, mockContentRepo);
  });

  describe('createArticleComment', () => {
    it('creates comment and publishes event', async () => {
      const mockComment = {
        id: 1,
        authorId: 1,
        body: 'Test comment',
        articleId: 1,
        createdAt: new Date(),
      };

      mockContentRepo.createContent.mockResolvedValue(mockComment as any);
      mockContentRepo.getContentWithDetails.mockResolvedValue(mockComment as any);

      const result = await service.createArticleComment(1, 1, 'Test comment');

      expect(mockContentRepo.createContent).toHaveBeenCalledWith({
        authorId: 1,
        type: 'COMMENT',
        body: 'Test comment',
        articleId: 1,
      });

      expect(result).toEqual(mockComment);
    });
  });
});
```

---

## Anti-Patterns to Avoid

### ❌ Direct Prisma in Services

```typescript
// ❌ BAD
export class TimelineService {
  async getArticles() {
    // Services should NEVER use prisma directly
    return await prisma.article.findMany({ where: { status: 'APPROVED' } });
  }
}

// ✅ GOOD
export class TimelineService {
  constructor(private repo: ITimelineRepository) {}

  async getArticles() {
    return this.repo.getApprovedArticles({ limit: 50 });
  }
}
```

### ❌ Business Logic in Controllers

```typescript
// ❌ BAD
export async function createPost(req: Request, res: Response) {
  const { content } = req.body;

  // Controllers should NOT contain business logic
  if (content.includes('spam')) {
    return res.status(400).json({ error: 'Spam detected' });
  }

  const post = await prisma.content.create({ /* ... */ });
  res.json(post);
}

// ✅ GOOD
export async function createPost(req: Request, res: Response) {
  const { content } = req.body;
  const userId = req.user.id;

  // Delegate business logic to service
  const post = await postService.createPost(userId, content);
  res.json(post);
}
```

### ❌ Event Publishing in Controllers

```typescript
// ❌ BAD
export async function placeBet(req: Request, res: Response) {
  const bet = await bettingService.placeBet(/* ... */);

  // Controllers should NOT publish events
  await eventBus.publish(REDIS_CHANNELS.BET_PLACED, { /* ... */ });

  res.json(bet);
}

// ✅ GOOD
export class BettingService {
  async placeBet(userId: number, predictionId: number, amount: number) {
    const bet = await this.bettingRepo.createBet({ /* ... */ });

    // Services publish events
    await eventBus.publish(REDIS_CHANNELS.BET_PLACED, {
      betId: bet.id,
      userId,
      predictionId,
      amount,
    });

    return bet;
  }
}
```

### ❌ Direct Redis Access in Services

```typescript
// ❌ BAD
export class LeaderboardService {
  async updateRankings() {
    // Services should NOT use redisClient directly
    await redisClient.publish('leaderboard:update', JSON.stringify(data));
  }
}

// ✅ GOOD
export class LeaderboardService {
  constructor(private eventBus: IEventBus) {}

  async updateRankings() {
    await this.eventBus.publish(REDIS_CHANNELS.LEADERBOARD_UPDATE, data);
  }
}
```

### ❌ Deep Type Imports

```typescript
// ❌ BAD
import type { PrismaUser } from '@ems/types/database/user';
import type { IContentRepository } from '@ems/types/repositories/interfaces/IContentRepository';

// ✅ GOOD
import type { PrismaUser, IContentRepository } from '@ems/types';
```

### ❌ Repository Calling Other Repositories

```typescript
// ❌ BAD
export class ContentRepository {
  async createContent(data: CreateContentData) {
    const content = await this.prisma.content.create({ data });

    // Repositories should NOT call other repositories
    const user = await userRepository.getUserById(data.authorId);

    return { ...content, author: user };
  }
}

// ✅ GOOD
export class ContentService {
  constructor(
    private contentRepo: IContentRepository,
    private userRepo: IUserRepository
  ) {}

  async createContentWithAuthor(data: CreateContentData) {
    const content = await this.contentRepo.createContent(data);
    const author = await this.userRepo.getUserById(data.authorId);

    return { ...content, author };
  }
}
```

---

## Summary

This refactored architecture establishes clear boundaries and responsibilities across the entire platform:

- **Controllers** handle HTTP only
- **Services** contain business logic and orchestrate repositories
- **Repositories** encapsulate all database access
- **Infrastructure** abstractions (IEventBus, IRedisPool) decouple external dependencies
- **Types** are centralized in `@ems/types` package
- **Events** are published by services and consumed by Socket.IO handlers
- **Workers** process async jobs with typed job data

By following these patterns, the codebase remains maintainable, testable, and scalable as the platform grows.

---

**Document Version:** 2.0
**Refactor Commits:**
- Initial: `dc74503` (+19604/-10134, 153 files)
- Completion: `5576dd1` (+3996/-2578, 128 files)
