# Backend Server Audit & Cleanup Plan

## Executive Summary

This document provides a comprehensive audit of the backend server architecture, identifying issues with parallel systems, naming conventions, file organization, and event handling. Multiple redundant systems exist for activity tracking, stats management, and event publishing that need consolidation.

## Current File Structure Analysis

### Directory Overview
```
apps/server/src/
├── controllers/       # HTTP request handlers
├── errors/           # Error classes
├── handlers/         # Socket.IO event handlers (15 files)
├── lib/             # Core libraries (Redis, Prisma client)
├── middleware/      # Express middleware (10 files)
├── models/          # Domain models (2 files)
├── repositories/    # Data access layer (31 files)
├── routes/          # HTTP route definitions
├── services/        # Business logic layer (40 files)
├── utils/           # Utility functions
├── view/            # View models/DTOs
└── workers/         # Background job processors (6 files)
```

### File Count Summary
- **Services**: 40 files
- **Repositories**: 31 files (16 interfaces + 15 implementations)
- **Handlers**: 15 files
- **Workers**: 6 files
- **Total TS files**: 166 files

## Major Issues Identified

### 1. Parallel Event/Activity Systems 🔥 **CRITICAL**

#### Issue: Multiple Event Bus Systems
- **`eventBus.service.ts`**: Redis-based event bus with DI interface
- **`enhancedUserStats.service.ts`**: Direct Redis publishing (`stats:update`, `stats:refresh`, `ranking:change`)
- **`unifiedActivity.service.ts`**: Own Redis publishing system (`unified:activity:global`)
- **Various services**: Direct `redisClient.publish()` calls scattered throughout

#### Issue: Overlapping Activity Systems
- **`unifiedActivity.service.ts`** (392 lines): Comprehensive activity system with Redis pub/sub
- **`activityStream.service.ts`** (375 lines): Alternative activity system with database focus
- **`ActivityRecorder`** class: Static methods for activity recording (duplicates unifiedActivity helpers)

Both systems have similar functionality:
- Activity creation with types (bet_placed, prediction_created, etc.)
- Database storage
- Redis publishing
- User context tracking

#### Issue: Event Type Inconsistencies 🔥 **CRITICAL**
Based on `packages/types/src/index.ts` analysis, there are **multiple overlapping event type systems**:

**1. Conflicting Activity Event Types**:
- `ActivityEventType` constants (`bet_placed`, `prediction_created`, etc.) 
- `UnifiedActivityEvent.type` union (includes `ActivityEventType` + extras like `live_bet`, `big_bet_alert`)
- `ActivityEventData.type` (generic string)
- `ActivityStreamEntry.type` (generic string)

**2. Socket Event Name Conflicts**:
- `SocketEvents` constants (`BetPlace`, `BetPlaced`, `StatsUpdate`)
- `StatsSocketEvents` constants (overlapping with `SocketEvents`)
- `AdminSocketEvents` constants 
- `TimelineSocketEvents` constants
- `SocketEvent` enum (different naming than constants)

**3. Redis Channel Inconsistencies**:
- `REDIS_CHANNELS` constants in types (`PREDICTION_CREATE`, `BET_PLACE`)
- Hardcoded channel names in handlers (`'stats:update'`, `'unified:activity:global'`)
- Mixed event bus usage vs direct Redis publishing

**Event System Architecture Issues**:
```typescript
// Types define these channels:
REDIS_CHANNELS.STATS_UPDATE = 'stats:update'
REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED = 'achievement:unlocked'

// But services publish to different channels:
redisClient.publish('unified:activity:global', ...)      // unifiedActivity.service.ts
redisClient.publish('stats:refresh', ...)                // enhancedUserStats.service.ts  
redisClient.publish('pong:match:completed', ...)         // pongStats.service.ts
redisClient.publish('user:activity:log', ...)            // multiple services

// And handlers listen to channels not in types:
'pong:elo:update', 'pong:tier:change', 'user:activity'   // redisEventHandlers.ts
```

**Event Publishing Fragmentation Found**:
- **21+ direct Redis publish calls** across services (bypassing event bus)
- **13+ undefined channels** used in handlers but missing from `REDIS_CHANNELS`
- **3 parallel activity event types** (`ActivityEventType`, `UnifiedActivityEvent.type`, `ActivityEventData.type`)
- **4+ socket event constant objects** with overlapping purposes
- **Mixed patterns**: Some services use `eventBus.publish()`, others use direct `redisClient.publish()`

### 2. Stats System Fragmentation 🔥 **CRITICAL**

#### Parallel Stats Services
- **`enhancedUserStats.service.ts`**: Full-featured stats with achievements, trends, rankings
- **`bettingStats.service.ts`**: Basic betting stats (22 lines, redundant wrapper)
- **`socialStats.service.ts`**: Social stats (16 lines, redundant wrapper)
- **`pongStats.service.ts`**: Pong-specific stats (35KB, comprehensive)

#### Stats Repository Duplication
- **`StatsRepository.ts`**: General stats queries
- **Multiple repositories**: Each has stats-related methods
- **User stats scattered** across UserRepository, BettingRepository, etc.

### 3. Naming Convention Inconsistencies 🟡 **MEDIUM**

#### Service File Naming
**Inconsistent patterns identified:**
```
✅ Good (PascalCase + .service.ts):
- activityStream.service.ts
- enhancedUserStats.service.ts
- eventBus.service.ts

❌ Inconsistent (missing .service.ts):
- AchievementEngine.ts
- AchievementEngineFactory.ts
- RuleComplexityTracker.ts
- FinancialTracker.service.ts (mixed pattern)

🔄 Mixed patterns:
- Some use camelCase + .service.ts
- Some use PascalCase with no suffix
- Some use PascalCase + .service.ts
```

#### Repository Interface Organization
**Current scattered approach:**
```
repositories/
├── IActivityRepository.ts
├── IAdminRepository.ts
├── IAuthRepository.ts
... (16 interface files mixed with implementations)
├── ActivityRepository.ts
├── AdminRepository.ts
└── AuthRepository.ts
```

### 4. Handler System Redundancy 🔥 **HIGH**

#### Redis Event Handler Overlap
- **`redisEventHandlers.ts`**: Main Redis→Socket fan-out (208 lines)
- **`unifiedActivityHandlers.ts`**: Unified activity Redis handlers (311 lines)
- **`achievementEventHandler.ts`**: Achievement-specific Redis events
- **`*RedisEventHandlers.ts`**: Multiple specialized Redis handlers

#### Socket Handler Patterns
Multiple handlers for similar domains:
- `betSocketHandlers.ts` + `betting.service.ts`
- `chatHandlers.ts` + `message.service.ts`
- `postHandlers.ts` + `post.service.ts`

### 5. Achievement System Architecture Issues 🟡 **MEDIUM**

#### Achievement Service Explosion
- **`AchievementEngine.ts`**: Core achievement engine
- **`AchievementEngineFactory.ts`**: Factory pattern
- **`AchievementSimulationService.ts`**: Testing/simulation (29KB)
- **`AchievementSocketEmitter.ts`**: Socket emission wrapper
- **`adminAchievement.service.ts`**: Admin achievement management
- **`RuleEvaluator.ts`**: Achievement rule evaluation
- **`RuleValidationService.ts`**: Rule validation (29KB)
- **`RuleSimulationService.ts`**: Rule simulation (12KB)
- **`RuleComplexityTracker.ts`**: Rule complexity analysis

**Total**: 9 achievement-related services (100KB+ combined)

### 6. Worker Organization Issues 🟡 **MEDIUM**

#### Worker Naming Inconsistencies
```
workers/
├── article.worker.ts
├── feed.worker.ts
├── leaderboard-snapshot.worker.ts  # Kebab-case
├── leaderboard.worker.ts           # Dot notation
├── payout.worker.ts
└── pong-payout.worker.ts           # Mixed pattern
```

### 7. Repository Layer Issues 🟡 **MEDIUM**

#### Missing Interface Implementations
Some repositories have interfaces, others don't:
```
✅ Has Interface:
- IUserRepository → UserRepository
- IAdminRepository → AdminRepository

❌ No Interface:
- AchievementRepository (new, comprehensive)
- StatsRepository
- ReactionRepository
```

## Cleanup Plan

### Phase 1: Event System Unification 🔥 **CRITICAL** (Priority 1)

#### 1.1 Consolidate Event Publishing
**Target**: Single event bus system for all Redis publishing

**Actions**:
1. **Audit all direct `redisClient.publish()` calls**:
   ```bash
   rg -n "redisClient\.publish|redis\.publish" apps/server/src
   ```
   **Found 21+ direct Redis publish calls across multiple services**

2. **Consolidate Event Type Definitions**:
   - **Remove conflicting event constants**: Merge `SocketEvents`, `StatsSocketEvents`, `AdminSocketEvents` into single system
   - **Standardize Redis channel naming**: All channels must be defined in `REDIS_CHANNELS` 
   - **Unify activity event types**: Choose `ActivityEventType` constants, remove string unions
   - **Create single source of truth**: Extend `REDIS_CHANNELS` with missing channels:
     ```typescript
     // Add missing channels to REDIS_CHANNELS:
     UNIFIED_ACTIVITY_GLOBAL: 'unified:activity:global',
     PONG_ELO_UPDATE: 'pong:elo:update',
     PONG_MATCH_COMPLETED: 'pong:match:completed',
     USER_ACTIVITY_LOG: 'user:activity:log',
     STATS_REFRESH: 'stats:refresh',
     ```

3. **Migrate to `eventBus.service.ts` pattern**:
   - Update all services to use injected `IEventBus` interface
   - Remove direct Redis client usage from:
     - `enhancedUserStats.service.ts`
     - `unifiedActivity.service.ts`
     - `pongStats.service.ts`
     - `user.service.ts`
     - Workers: `leaderboard.worker.ts`, `payout.worker.ts`
   
4. **Handler Channel Standardization**:
   - Update `redisEventHandlers.ts` to use `REDIS_CHANNELS` constants only
   - Remove hardcoded channel strings
   - Update `ExtendedRedisChannel` type to use official channels

#### 1.2 Activity System Consolidation
**Decision**: Keep `unifiedActivity.service.ts`, remove `activityStream.service.ts`

**Actions**:
1. **Audit dependencies**: Find all imports of `activityStream.service.ts`
2. **Migration path**: Replace ActivityRecorder static methods with unifiedActivity methods
3. **Remove redundant code**: Delete ActivityRecorder class
4. **Update imports**: Point to unifiedActivity service

**Files to remove**:
- `activityStream.service.ts` (375 lines)
- ActivityRecorder class methods

### Phase 2: Stats System Consolidation 🔥 **CRITICAL** (Priority 2)

#### 2.1 Merge Redundant Stats Services
**Target**: Single comprehensive stats service

**Actions**:
1. **Merge functionality**:
   - `bettingStats.service.ts` → merge into `enhancedUserStats.service.ts`
   - `socialStats.service.ts` → merge into `enhancedUserStats.service.ts`
   - Keep `pongStats.service.ts` as domain-specific service

2. **Files to remove**:
   - `bettingStats.service.ts` (22 lines)
   - `socialStats.service.ts` (16 lines)

#### 2.2 Repository Stats Consolidation
**Target**: Centralized stats repository with clear boundaries

**Actions**:
1. **Evaluate `StatsRepository.ts`** vs scattered stats methods
2. **Create consistent interface**: `IStatsRepository`
3. **Move stats methods** from UserRepository/BettingRepository to StatsRepository where appropriate

### Phase 3: File Organization & Naming 🟡 **MEDIUM** (Priority 3)

#### 3.1 Repository Interface Organization
**Target**: Clean separation of interfaces and implementations

**Proposed structure**:
```
repositories/
├── interfaces/           # NEW FOLDER
│   ├── IActivityRepository.ts
│   ├── IAdminRepository.ts
│   ├── IAuthRepository.ts
│   ├── IBettingRepository.ts
│   └── ... (all I*.ts files)
├── ActivityRepository.ts
├── AdminRepository.ts
├── AuthRepository.ts
└── ... (all implementation files)
```

**Actions**:
1. Create `repositories/interfaces/` folder
2. Move all `I*.ts` files to interfaces folder
3. Update imports across codebase
4. Create missing interfaces for repositories without them

#### 3.2 Service Naming Standardization
**Target**: Consistent `camelCase.service.ts` pattern

**Actions**:
1. **Rename files to follow pattern**:
   ```
   AchievementEngine.ts → achievementEngine.service.ts
   FinancialTracker.service.ts → financialTracker.service.ts
   RuleComplexityTracker.ts → ruleComplexityTracker.service.ts
   ```

2. **Update imports** across codebase

#### 3.3 Worker Naming Standardization
**Target**: Consistent `kebab-case.worker.ts` pattern

**Actions**:
1. **Rename workers**:
   ```
   leaderboard.worker.ts → leaderboard-daily.worker.ts
   payout.worker.ts → bet-payout.worker.ts
   ```

### Phase 4: Handler System Optimization 🟡 **MEDIUM** (Priority 4)

#### 4.1 Redis Handler Consolidation
**Target**: Single Redis event routing system

**Actions**:
1. **Merge handlers**:
   - Keep `redisEventHandlers.ts` as main router
   - Integrate `achievementEventHandler.ts` patterns
   - Remove duplicate Redis subscribers

2. **Standardize event naming**: Use `@ems/types` constants

### Phase 5: Achievement System Cleanup 🟡 **LOW** (Priority 5)

#### 5.1 Achievement Service Organization
**Target**: Organized achievement subsystem

**Proposed structure**:
```
services/
├── achievements/         # NEW SUBFOLDER
│   ├── achievementEngine.service.ts
│   ├── achievementSimulation.service.ts
│   ├── ruleEvaluator.service.ts
│   ├── ruleValidation.service.ts
│   └── ruleComplexity.service.ts
├── ... (other services)
```

**Actions**:
1. Create `services/achievements/` subfolder
2. Move all achievement-related services
3. Update imports and barrel exports

### Phase 6: Missing Implementations 🟡 **LOW** (Priority 6)

#### 6.1 Complete Repository Interfaces
**Actions**:
1. Create missing interfaces:
   - `IAchievementRepository`
   - `IStatsRepository`
   - `IReactionRepository`

2. Implement interface patterns consistently

## Implementation Strategy

### Execution Order

#### **Phase 0: Pre-cleanup - Event Type Audit** (Days 1-2) 🚨 **EMERGENCY**
Before any cleanup, we need to map the event chaos:

1. **Map all event publishing locations**:
   ```bash
   # Find all direct Redis publishes
   rg -n "redisClient\.publish|redis\.publish" apps/server/src
   
   # Find all eventBus.publish calls  
   rg -n "eventBus\.publish" apps/server/src
   
   # Map handler subscriptions
   rg -n "subscribe|on.*message" apps/server/src/handlers
   ```

2. **Create event mapping document**:
   - Document every channel name used
   - Map publishers → channels → handlers  
   - Identify orphaned events (published but not handled)
   - Identify missing events (handled but not in REDIS_CHANNELS)

3. **Type consolidation preparation**:
   - List all socket event constants that overlap
   - Map activity event type conflicts
   - Prepare migration plan for each service

#### **Phase 1: Event System Unification** (Week 1) 🔥 **CRITICAL**
1. **Week 1**: Phase 1 (Event system unification) - Critical fixes first
2. **Week 2**: Phase 2 (Stats consolidation) - Resolve parallel systems
3. **Week 3**: Phase 3 (File organization) - Developer experience improvements
4. **Week 4**: Phase 4-6 (Handler optimization, achievement cleanup) - Polish

### Risk Mitigation
1. **Incremental changes**: Make small, testable changes
2. **Feature flags**: Use flags for system transitions
3. **Integration tests**: Verify event publishing/receiving still works
4. **Database backups**: Before major repository changes

### Testing Strategy
1. **Event flow tests**: Ensure all events still publish correctly
2. **Stats calculation tests**: Verify stats remain accurate
3. **Integration tests**: End-to-end activity creation → storage → broadcast

## Expected Benefits

### Developer Experience
- **Reduced confusion**: Clear single-responsibility services
- **Faster onboarding**: Consistent naming and organization
- **Better debugging**: Single event system to trace

### Performance
- **Reduced Redis connections**: Single event bus
- **Fewer database queries**: Consolidated stats services
- **Memory optimization**: Remove duplicate service instances

### Maintenance
- **Single source of truth**: One activity system, one event bus
- **Easier testing**: Clear service boundaries
- **Better monitoring**: Centralized event tracking

## Files Scheduled for Removal

### Immediate Removal (Phase 1-2)
```
services/
├── activityStream.service.ts         # 375 lines - replaced by unifiedActivity
├── bettingStats.service.ts           # 22 lines - merged into enhancedUserStats
└── socialStats.service.ts            # 16 lines - merged into enhancedUserStats
```

### Reorganization (Phase 3-5)
- Move achievement services to subfolder
- Move repository interfaces to subfolder
- Rename services for consistency

**Total Lines Reduced**: ~413 lines of redundant code
**Total Files Reduced**: 3 service files

## Success Metrics

### Code Quality
- [ ] Single event bus system (no direct Redis publishing)
- [ ] Single activity tracking system
- [ ] Consistent naming conventions (100% compliance)
- [ ] All repositories have interfaces

### Performance
- [ ] Reduced Redis connection count
- [ ] Faster stats calculation (consolidated queries)
- [ ] Reduced memory usage (fewer service instances)

### Developer Experience
- [ ] Clear file organization
- [ ] Consistent patterns across all services
- [ ] Easy to find relevant code
- [ ] Single place to add new events/activities

---

**Document Version**: 1.0  
**Audit Date**: September 2025  
**Next Review**: After Phase 1 completion