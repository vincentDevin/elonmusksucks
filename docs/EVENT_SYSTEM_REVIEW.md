# EVENT_SYSTEM_REVIEW.md

> **Purpose:** Single living document mapping the current event system (React 19 + TS + Express + Socket.IO + Redis + Postgres/Prisma), identifying **actual behavior** vs **intended**, and listing **review-only** fixes. Updated in place with each pass.

## 0. TL;DR (kept current)
**Status:** React 19 client with Socket.IO + Redis pub/sub event bus. EventBusCore provides type-safe subscriptions with startTransition priority handling. 75+ Redis channels mapped. High REST↔Socket parity (8/10 domains). Critical gaps identified: room lifecycle, hydration watermark, and listener leak monitoring.

**Top 3 Critical Risks:** 
1. **Room leak on navigation:** No leave policy → listener accumulation (High likelihood, High impact)
2. **Pre-boot event races:** No hydration watermark → state corruption potential (Medium likelihood, High impact)  
3. **Pattern inconsistency:** Mixed EventBusCore/direct socket patterns → maintenance complexity (High likelihood, Medium impact)

**Top 3 Immediate Actions (Review-Only):** 
1. **Document system invariants** - EventBusCore-only rule, room lifecycle policy (1hr, no code)
2. **Add hydration watermark** - prevents pre-boot event races (3hr, medium risk)
3. **Implement room lifecycle management** - prevents listener leaks (2hr, low risk)

## 1. Architecture Snapshot (current state)

```
Redis Pub/Sub ⇄ Express Server ⇄ Socket.IO (port 5000) ⇄ EventBusCore ⇄ React Hooks ⇄ UI
                      ↓                                        ↓
              EventBus.publish()                        startTransition(priority)
                      ↓                                        ↓
            Redis Channels (75+)                     Type-safe subscriptions
```

**Key Components:**
- **Server:** `apps/server/src/socket.ts` - Main Socket.IO bootstrap with 75+ Redis channel subscriptions
- **Client:** `apps/client/src/contexts/EventBusCoreContext.tsx` - Type-safe event bus with React 19 optimizations
- **Types:** `packages/types/src/index.ts` - REDIS_CHANNELS constants + payload types
- **Auth:** Token-based socket auth via `socketAuthMiddleware.ts`
- **Rooms:** User-specific (`user:${id}`) + admin rooms + leaderboard periods

### System Invariants (MUST ENFORCE - Code Review Gate)

#### 1. **Bootstrap Once Pattern**
- **Rule:** Single initial REST snapshot → thereafter socket events only
- **Implementation:** Each context fetches initial data once, then relies on socket updates
- **Enforcement:** Hydration guards prevent multiple initial fetches
- **Example:** UserDataContext fetches stats/achievements once, then updates via achievement:unlocked events

#### 2. **Hydration Watermark**  
- **Rule:** Events before `bootWatermark.t0` are dropped (prevents race conditions)
- **Implementation:** EventBusCore checks event timestamps against boot watermark
- **Enforcement:** Server provides boot timestamp, client drops stale events
- **Example:** Events arriving during initial data fetch are discarded to prevent state corruption

#### 3. **EventBusCore Only (CRITICAL)**
- **Rule:** No direct `socket.on()` in feature components (centralized cleanup/dedupe)
- **Implementation:** All event subscriptions MUST use EventBusCore.subscribe()
- **Enforcement:** Code review MUST reject direct socket.on() usage in components
- **Violations:** PredictionContext, ChatContext (legacy patterns - needs migration)
- **Example:** ✅ `subscribe(REDIS_CHANNELS.BET_PLACED, handler)` ❌ `socket.on('bet:placed', handler)`

#### 4. **Normalized Stores**
- **Rule:** All list domains use `{ byId, allIds }` with idempotent upserts
- **Implementation:** Redux-style normalization for all array data
- **Enforcement:** State updates must be idempotent and handle duplicates
- **Example:** Predictions stored as `{ byId: { "1": prediction }, allIds: ["1", "2"] }`

#### 5. **Room Lifecycle (MEMORY LEAK PREVENTION)**
- **Rule:** Join only needed rooms per route, leave on unmount/navigation
- **Implementation:** useRoomLifecycle hook with automatic cleanup
- **Enforcement:** All components MUST clean up rooms in useEffect return
- **Current Issue:** No cleanup → listener accumulation → memory leaks
- **Example:** Dashboard joins `user:${id}`, leaves on unmount

#### 6. **Server-Side Authorization**
- **Rule:** Room access controlled server-side, not client filtering  
- **Implementation:** Server validates room membership before allowing joins
- **Enforcement:** Client never filters events by userId - server restricts broadcasts
- **Security:** Prevents client-side filtering bypasses
- **Example:** Server checks user permissions before allowing `admin:moderation` room access

### Architectural Contracts (VIOLATION = BUG)

#### Event Handler Contracts
```typescript
// ✅ CORRECT: EventBusCore pattern
const { subscribe } = useEventBusCore();
useEffect(() => {
  return subscribe(REDIS_CHANNELS.BET_PLACED, (payload) => {
    startTransition(() => handleBetPlaced(payload));
  });
}, [subscribe]);

// ❌ VIOLATION: Direct socket pattern  
useEffect(() => {
  socket.on('bet:placed', handleBetPlaced);
  return () => socket.off('bet:placed', handleBetPlaced);
}, []);
```

#### Room Management Contracts
```typescript
// ✅ CORRECT: Automatic lifecycle management
const Dashboard = () => {
  const { user } = useAuth();
  useRoomLifecycle([`user:${user.id}`, 'leaderboard:daily']);
  // Component automatically joins on mount, leaves on unmount
};

// ❌ VIOLATION: Manual join without cleanup
useEffect(() => {
  socket.emit('join', `user:${userId}`);
  // Missing cleanup → memory leak
}, [userId]);
```

#### Hydration Guard Contracts  
```typescript
// ✅ CORRECT: Hydration guard prevents refetches
const [isHydrated, setIsHydrated] = useState(false);
useEffect(() => {
  if (isHydrated || !user?.id) return; // Guard clause
  fetchInitialData().then(() => setIsHydrated(true));
}, [user?.id, isHydrated]);

// ❌ VIOLATION: Refetches on every mount
useEffect(() => {
  if (user?.id) fetchInitialData(); // No guard
}, [user?.id]);
```

### Enforcement Checklist (Code Review Gate)

#### Pre-Commit Hooks (Automated)
- [ ] `grep -r "socket\.on" apps/client/src/components` → Must return 0 results
- [ ] `grep -r "socket\.emit.*join" apps/client/src` → Must have matching cleanup
- [ ] All event handlers use EventBusCore.subscribe()
- [ ] All contexts have hydration guards

#### Manual Review Checklist  
- [ ] Event subscriptions use EventBusCore only
- [ ] Room joins have corresponding leaves in useEffect cleanup
- [ ] New contexts implement hydration guards
- [ ] Event handlers wrapped in startTransition for non-critical updates
- [ ] No client-side event filtering by userId
- [ ] State updates are idempotent and handle duplicates

## 2. Event Catalog (source of truth)

| Event Name | Payload Type (@ems/types) | Emitted By | Consumed By | UI Impact | Notes |
|------------|---------------------------|------------|-------------|----------|-------|
| **PREDICTION_CREATE** | `prediction:create` | Server (Redis) | PredictionContext | Add to predictions list | Socket listener + REST fetch |
| **PREDICTION_RESOLVE** | `prediction:resolve` | Server (Redis) | PredictionContext | Update prediction status | Socket listener |
| **BET_PLACE** | `bet:place` | Server (Redis) | useBettingEvents, PredictionContext | Alert + metrics update | Optimistic UI updates |
| **BET_WON** | `bet:won` | Server (Redis) | useBettingEvents | Win alert + balance | User balance refresh |
| **BET_LOST** | `bet:lost` | Server (Redis) | useBettingEvents | Loss alert | Metrics update |
| **BET_STATUS_CHANGE** | `bet:status_change` | Server (Redis) | useBettingEvents | Status notification | Various status types |
| **PARLAY_PLACE** | `parlay:place` | Server (Redis) | PredictionContext | Add parlay to UI | Optimistic updates |
| **LEADERBOARD_ALL_TIME** | `leaderboard:allTime` | Server (Redis) | useLeaderboardEvents | Update leaderboard data | Live rankings |
| **LEADERBOARD_DAILY** | `leaderboard:daily` | Server (Redis) | useLeaderboardEvents | Daily rankings | Live updates |
| **LEADERBOARD_RANK_UPDATE** | `leaderboard:rankChange` | Server (Redis) | useLeaderboardEvents | Rank change alerts | Celebration levels |
| **ACHIEVEMENT_UNLOCKED** | `achievement:unlocked` | Server (Redis) | Achievement hooks | Achievement popup | Badge updates |
| **PONG_ELO_UPDATE** | `pong:elo:update` | Server (Redis) | usePongEvents | ELO rating change | Live ELO updates |
| **CHAT_MESSAGE** | `chat:message` | Server (Redis) | Chat hooks | New message | Real-time chat |
| **ODDS_UPDATE_ENHANCED** | `odds:update:enhanced` | Server (Redis) | PredictionContext | Live odds changes | Market excitement |

**Total Channels:** 75+ Redis channels defined in REDIS_CHANNELS constant

## 3. REST ↔ Socket Parity

### Domain-by-Domain Analysis

| Domain | REST Snapshot | Socket Events | Data Consistency | Field Drift | Notes |
|--------|---------------|---------------|------------------|-------------|-------|
| **Authentication** | `AuthUserView` | Balance updates only | ✅ Consistent | ✅ None | Socket only updates balance, not user profile |
| **Predictions** | `PredictionView` | `prediction:create`, `prediction:resolve` | ✅ Consistent | ✅ None | Both use same fields: id, title, status, category |
| **Betting** | `UserBetView` | `bet:place`, `bet:won`, `bet:lost` | ✅ Consistent | ✅ None | Amount fields consistent (BigInt→string) |
| **Parlays** | `UserParlayView` | `parlay:place`, `parlay:won`, `parlay:lost` | ✅ Consistent | ✅ None | Legs structure matches across REST/Socket |
| **Leaderboard** | `LeaderboardEntryView` | `leaderboard:allTime`, `leaderboard:daily` | ✅ Consistent | ✅ None | Balance formatting consistent (BigInt→string) |
| **User Stats** | `UserStatsView` | `user:stats_update` | ❌ **Missing** | ❌ **No socket events** | AchievementContext has no live updates |
| **Achievements** | `UserAchievementProgressView` | `achievement:unlocked` | ⚠️ **Partial** | ❌ **Different shapes** | Socket: simple unlock, REST: progress tracking |
| **Pong** | `UserPongStatsView` | `pong:elo:update`, `pong:match:completed` | ✅ Consistent | ✅ None | ELO updates maintain data consistency |
| **Activity** | `UnifiedActivityEvent` | `UNIFIED_ACTIVITY_UPDATE` | ✅ Consistent | ✅ None | Same interface for REST and socket |
| **Chat** | `ChatMessage` | `chat:message` | ✅ Consistent | ✅ None | Direct interface alignment |

### Critical Parity Issues

#### 1. User Stats (Major Issue)
- **REST:** `UserStatsView` with 12+ fields (totalBets, winRate, profit, etc.)
- **Socket:** ❌ No equivalent events for stats updates
- **Impact:** AchievementContext + UserDataContext must refetch manually
- **Root Cause:** Stats calculation happens in background jobs, no real-time events

#### 2. Achievement Progress (Moderate Issue)  
- **REST:** `UserAchievementProgressView` with progress tracking (currentValue, targetValue, progress %)
- **Socket:** `achievement:unlocked` only - simple notification without progress
- **Impact:** Achievement progress not updated live, only completion notifications
- **Root Cause:** Different granularity between progress tracking and event notifications

#### 3. Profile Data (Design Choice)
- **REST:** Complete `PublicUserProfile` with bio, avatar, location, followers
- **Socket:** ❌ No profile update events
- **Impact:** Profile pages must refetch on navigation (not redundant)
- **Root Cause:** Profile changes are infrequent, not suited for real-time events

### BigInt Serialization Consistency
✅ **All domains consistently serialize BigInt → string:**
- Balance: `muskBucks: string`
- Bet amounts: `amount: string`, `payout: string`
- Leaderboard: `balance: string`, `profitAll: string`
- Ensures JSON serialization compatibility across REST and Socket

### Event Naming Patterns
✅ **Consistent event naming across channels:**
- **Action Pattern:** `{domain}:{action}` (bet:place, prediction:create)
- **Status Pattern:** `{domain}:{status}` (bet:won, parlay:lost)
- **Update Pattern:** `{domain}:{field}:update` (pong:elo:update, user:stats_update)

### Missing Socket Coverage
| REST Endpoint | Socket Alternative | Coverage Status | Reason |
|---------------|-------------------|-----------------|---------|
| `/api/users/{id}/stats` | ❌ None | **Missing** | Stats are batch-calculated |
| `/api/users/{id}/achievements` | `achievement:unlocked` only | **Partial** | Progress vs completion |
| `/api/users/profile/{id}` | ❌ None | **Intentional** | Infrequent updates |
| `/api/leaderboard/pong/{metric}` | ❌ None | **Intentional** | Different data source |
| `/api/shame-wall` | ❌ None | **Intentional** | Admin-only feature |

### Data Shape Compatibility
✅ **High compatibility between REST snapshots and socket events:**
- **Type System:** Shared `@ems/types` ensures consistency  
- **Serialization:** Consistent BigInt→string conversion
- **Timestamps:** ISO string format across all interfaces
- **User References:** Consistent userId + userName + avatarUrl pattern

## 4. Client Boot & Navigation Behavior

### Initial Hydration Flow
1. **main.tsx:** Theme applied immediately from localStorage to prevent flash
2. **App.tsx:** Provider hierarchy - AuthProvider → SocketProvider → EventBusCore → Domain Contexts
3. **AuthContext:** `useEffect` on mount attempts `refreshApi()` → `meApi()` for user data
4. **Router:** Lazy-loaded routes with `<Suspense>` fallbacks, no data preloading

### First-Load Data Paths
| Component | Data Source | Trigger | Pattern | Hydration Guard |
|-----------|-------------|---------|---------|-----------------|
| **AuthContext** | `refreshApi()` + `meApi()` | useEffect mount | REST API | ❌ None |
| **PredictionContext** | `getPredictions()` | useEffect mount | REST API | ❌ None |
| **UserDataContext** | Multiple `/api/users/${id}/*` | useEffect mount | 3x Parallel REST | ❌ None |
| **Dashboard** | UserDataProvider wrapping | Component mount | Context refresh | ❌ None |
| **Profile** | `useUserProfile(userId)` | Route param change | Hook refetch | ❌ None |
| **Leaderboard** | `useLeaderboard(period)` | Tab/param change | Hook refetch + cache | ❌ None |

### Navigation-Triggered Behavior
- **Route Changes:** All lazy-loaded components trigger fresh data fetches via hooks
- **No Router-Level Loaders:** React Router not using data loading APIs
- **Param Changes:** Profile page refetches on `userId` param change
- **Tab Changes:** Leaderboard fetches different APIs on tab switch (betting/pong/shame)
- **Authentication Failure:** Full redirect to public site (`window.location.href`)

## 5. Contexts, Hooks, and Listener Lifecycle

### EventBusCore Context (`apps/client/src/contexts/EventBusCoreContext.tsx:70-274`)
- **Pattern:** React 19 optimized with startTransition priority handling
- **Registration:** Type-safe subscribe() with automatic priority detection  
- **Cleanup:** Proper useEffect cleanup, ref-based handler storage
- **Priority:** High (immediate), Normal (startTransition), Low (startTransition)
- **Idempotency:** Single socket listener per event, multiple handlers

### Betting Events Hook (`apps/client/src/hooks/useBettingEvents.ts:48-313`)
- **Subscriptions:** BET_PLACE, BET_WON, BET_LOST, BET_STATUS_CHANGE via EventBusCore
- **State:** Alert queue (max 10), metrics tracking, auto-dismiss timers
- **User Filter:** Events filtered by `payload.userId === user.id`
- **Cleanup:** useEffect dependency on user + subscribe function

### Leaderboard Events Hook (`apps/client/src/hooks/useLeaderboardEvents.ts:64-353`)
- **Subscriptions:** 8 leaderboard-related channels via EventBusCore
- **State:** Rank updates, leaderboard data, user ranking stats
- **Celebration Logic:** Rank change → celebration level (low/medium/high)
- **Data Updates:** Live leaderboard arrays updated on broadcasts

### PredictionContext (`apps/client/src/contexts/PredictionContext.tsx:55-451`)
- **Pattern:** Mixed - useOptimistic for UI + direct socket listeners
- **Initial Fetch:** REST API call via getPredictions()
- **Live Updates:** Direct socket.on() for prediction events (legacy pattern)
- **Optimistic:** React 19 useOptimistic for bets/parlays with rollback
- **Error Handling:** startTransition-wrapped rollbacks

### UserDataContext (`apps/client/src/contexts/UserDataContext.tsx:21-85`)
- **Pattern:** useEffect-driven parallel API calls
- **Initial Fetch:** 3x parallel REST calls (stats, achievements, activities)
- **Refetch:** On user.id change → complete data reload
- **Hydration:** ❌ No guard → refetches on every mount

### useUserProfile Hook (`apps/client/src/hooks/useUserProfile.ts:28-226`)
- **Pattern:** useEffect-driven parallel API calls 
- **Initial Fetch:** 4x parallel REST calls (profile, feed, activity, stats)
- **Refetch:** On userId param change → complete data reload
- **Error Handling:** Individual API call error isolation
- **Hydration:** ❌ No guard → refetches on navigation to same user

### useLeaderboard Hook (`apps/client/src/hooks/useLeaderboard.ts:59-394`)
- **Pattern:** Mixed - REST fetch + socket updates + caching
- **Initial Fetch:** REST API with cache check
- **Live Updates:** Socket listeners + debounced updates (500ms)
- **Navigation:** Refetches on period/metric changes
- **Hydration:** ✅ Basic cache check provides some guard

### ActivityContext (`apps/client/src/contexts/ActivityContext.tsx:141-426`)
- **Pattern:** Hybrid - EventBusCore + sessionStorage + global state persistence
- **Initial Fetch:** REST API with visibility guard + cached fallback
- **Live Updates:** `UNIFIED_ACTIVITY_RESPONSE` + `UNIFIED_ACTIVITY_UPDATE` via EventBusCore
- **Caching:** sessionStorage with 5min expiry + global state across unmounts
- **Hydration:** ✅ Strong guard via `globalHasRequestedInitialData` + cache

### AchievementContext (`apps/client/src/contexts/AchievementContext.tsx:44-124`)
- **Pattern:** REST-only with useEffect dependency
- **Initial Fetch:** Single API call `/api/users/${id}/achievements`
- **Live Updates:** ❌ None - relies on manual refresh
- **Refetch:** On user.id change → complete data reload
- **Hydration:** ❌ No guard → refetches on every mount

### ChatContext (`apps/client/src/contexts/ChatContext.tsx:56-242`)
- **Pattern:** Mixed - direct socket listeners + EventBusCore
- **Initial Fetch:** `socket.emit('chat:history')` on connection
- **Live Updates:** `CHAT_MESSAGE` via EventBusCore + direct listeners for history/errors
- **Typing:** Real-time typing indicators with auto-timeout
- **Hydration:** ✅ History requested only on socket connection

### ParlayContext (`apps/client/src/contexts/ParlayContext.tsx:85-137`)
- **Pattern:** localStorage-persisted reducer + socket listener for clear
- **Initial State:** Restored from localStorage with useState initializer
- **Live Updates:** Direct `parlayPlaced` listener to clear builder on user's parlay
- **Persistence:** All state changes saved to localStorage
- **Optimistic:** Basic pending flag but no complex rollback

### Event Hooks Pattern Summary
| Hook | Pattern | EventBusCore Usage | Direct Socket | Hydration Guard | Live Updates |
|------|---------|-------------------|---------------|-----------------|--------------|
| **useBettingEvents** | EventBusCore only | ✅ 4 channels | ❌ None | ❌ None | ✅ Real-time alerts |
| **useLeaderboardEvents** | EventBusCore only | ✅ 8 channels | ❌ None | ❌ None | ✅ Real-time ranks |
| **usePongEvents** | EventBusCore only | ✅ 6 channels | ❌ None | ❌ None | ✅ Real-time gaming |
| **useTimelineEvents** | EventBusCore only | ✅ 4+ channels | ❌ None | ❌ None | ✅ Real-time content |
| **usePongSocket** | Direct socket only | ❌ None | ✅ Dedicated server | ✅ Connection mgmt | ✅ Gaming protocol |

### Optimistic Update Patterns
1. **React 19 useOptimistic (Modern):**
   - **AuthContext:** Balance updates with `optimisticUpdateUser` + `startTransition`
   - **PredictionContext:** Bet/parlay placement with rollback on error
   - **Pattern:** `startTransition(() => optimisticUpdate({ type, payload }))` + revert on error

2. **Basic Optimistic (Legacy):**
   - **ParlayContext:** Simple pending flag without complex state management
   - **ActivityContext:** Immediate UI updates with cache merge strategy

3. **Error Recovery:**
   - **PredictionContext:** `startTransition` wrapped rollbacks with type-safe revert actions
   - **AuthContext:** Server refresh as fallback for optimistic updates
   - **Pattern:** Try optimistic → catch error → revert → show user error

## 6. Redundant Refetch Report
| Route | Data | When Refetched | Why | Socket Alternative? | Owner | Proof Metric |
|-------|------|----------------|-----|-------------------|-------|--------------|
| **Dashboard → Profile** | User stats, achievements | Navigation to Profile | useUserProfile hook has no hydration guard | ✅ Achievement events exist | FE | Profile navigation = 0 API calls (after hydration guard) |
| **Profile → Dashboard** | User data | Navigation back to Dashboard | UserDataContext refetches on mount | ✅ Live balance updates via socket | FE | Dashboard return = 0 API calls |
| **Leaderboard tab switch** | Pong/Shame data | Tab change within page | Each tab fetches different APIs | ❌ No socket events for pong/shame | N/A | ✅ Appropriate - different data sources |
| **Profile param change** | All profile data | Route `/profile/123` → `/profile/456` | useUserProfile refetches all 4 APIs | ❌ No socket events for profile data | N/A | ✅ Appropriate - different user data |
| **Auth refresh** | User data + predictions | Page reload | AuthContext + PredictionContext both refetch | ✅ User balance + prediction events exist | FE | Page refresh = 2 API calls (down from 5+) |
| **Dashboard mount** | User stats | Every dashboard visit | UserDataContext has no cache/guard | ✅ Stats update events exist | FE | Dashboard mount #2+ = 0 API calls |

## 7. Risk Registry

| Risk | Likelihood | Impact | Current State | Mitigation | Owner |
|------|------------|---------|---------------|------------|-------|
| **Room leak on navigation** | High | High | ❌ No leave policy | Add room cleanup on unmount | FE |
| **Pre-boot event races** | Medium | High | ❌ No hydration watermark | Add bootstrap watermark | FE |
| **Mixed socket patterns** | High | Medium | ❌ Direct + EventBusCore mixed | EventBusCore-only rule | FE |
| **Client-side auth filtering** | Low | High | ⚠️ `userId === user.id` checks | Server-side room restrictions | BE |
| **Listener count growth** | Medium | Medium | ❌ No budgets/monitoring | Add dev-mode assertions | FE |
| **Event burst re-render churn** | Medium | Medium | ⚠️ 500ms debounce client-side | Server-side event coalescing | BE |
| **Navigation refetch storms** | High | Low | ❌ No hydration guards | Add isHydrated flags | FE |

## 8. Known Issues & Hypotheses

### Critical Issues (Violate Invariants)
1. **Room Lifecycle Violation:** No documented leave policy → potential listener leaks
2. **Hydration Race Conditions:** No watermark → events can overwrite snapshots
3. **Pattern Inconsistency:** PredictionContext bypasses EventBusCore → different error handling
4. **Client-Side Filtering:** Several hooks filter by `userId` → security concern if server broadcasts broadly

### Performance Issues  
5. **Missing Hydration Guards:** UserDataContext + AchievementContext refetch on every mount
6. **No Event Batching:** Server emits individual events → client re-render churn
7. **Unbounded Listener Growth:** No monitoring of subscription counts

### Design Appropriateness (Not Issues)
8. **User Stats No Socket Coverage:** Background batch calculation → justified manual refetches
9. **Achievement Progress vs Events:** Different granularity (progress tracking vs notifications) → intentional
10. **Profile Data Manual Fetch:** Infrequent updates → appropriate REST-only pattern

## 9. Recommendations (Review-Only)

### No-Code Policy Changes (Immediate - Documentation Only)

#### 9.1 Adopt System Invariants 
**Issue:** Missing architectural contracts lead to pattern drift  
**Action:** Document and enforce invariants in code review
- **Bootstrap Once:** Single REST snapshot → socket events only
- **EventBusCore Only:** Ban direct `socket.on()` in components
- **Room Lifecycle:** Mandatory join/leave on mount/unmount
- **Hydration Watermark:** Drop pre-boot events
**Risk:** None - policy documentation  
**Effort:** 1 hour documentation

#### 9.2 Rooms & Authorization Policy
**Issue:** Unclear room access patterns, potential security gaps
**Action:** Document room join/leave contracts
```typescript
// REVIEW-ONLY EXAMPLE - Room policy
interface RoomPolicy {
  // Join only rooms needed for current route
  userRooms: [`user:${userId}`, `notifications:${userId}`];
  globalRooms: ['leaderboard:daily'] // if on leaderboard page
  adminRooms: ['moderation'] // if admin role
  
  // Server-side authorization required
  // Client never filters by userId - server restricts room membership
}
```
**Risk:** None - clarifies existing behavior  
**Effort:** 2 hours policy documentation

### Future Code Changes

### Priority 1: Critical Race Condition Fixes

#### 1.1 Add Hydration Watermark (Prevents Pre-Boot Event Races)
**Issue:** Events arriving before initial snapshot can create state inconsistency  
**Impact:** High - prevents data corruption

```tsx
// REVIEW-ONLY EXAMPLE - AppBootstrap.tsx
const AppBootstrap = () => {
  const [bootWatermark, setBootWatermark] = useState<string | null>(null);
  
  useEffect(() => {
    const initializeApp = async () => {
      // Get server timestamp for this boot cycle
      const { t0 } = await fetch('/api/bootstrap-meta').then(r => r.json());
      setBootWatermark(t0);
      
      // Configure EventBus to drop stale events
      eventBusCore.setWatermark(t0);
    };
    initializeApp();
  }, []);
};

// EventBusCore modification
const handleEvent = (channel: string, payload: any) => {
  // Drop events older than boot watermark
  if (watermark && payload.timestamp && payload.timestamp < watermark) {
    console.warn(`[EventBusCore] Dropping pre-boot event: ${channel}`);
    return;
  }
  // ... existing handler logic
};
```
**Risk:** Medium - Changes event processing flow  
**Effort:** 3 hours (client + server endpoint)

#### 1.2 Add Room Lifecycle Management
**Issue:** No leave policy → listener leaks on navigation

```tsx
// REVIEW-ONLY EXAMPLE - useRoomLifecycle.ts
const useRoomLifecycle = (rooms: string[]) => {
  const socket = useSocket();
  
  useEffect(() => {
    // Join rooms needed for this component/route
    rooms.forEach(room => socket.emit('join', room));
    
    return () => {
      // Leave rooms on unmount/navigation
      rooms.forEach(room => socket.emit('leave', room));
    };
  }, [socket, ...rooms]);
};

// Usage in Dashboard
const Dashboard = () => {
  const { user } = useAuth();
  useRoomLifecycle([`user:${user.id}`, 'leaderboard:daily']);
  // ... component logic
};
```
**Risk:** Low - Additive cleanup behavior  
**Effort:** 2 hours

### Priority 2: Navigation Refetch Fixes

#### 2.1 Add Hydration Guard to UserDataContext
**Issue:** UserDataContext refetches 3 APIs on every Dashboard mount  
**Impact:** High - affects most common navigation pattern

```tsx
// REVIEW-ONLY EXAMPLE - UserDataContext.tsx
const UserDataContext = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    if (isHydrated || !user?.id) return; // Skip if already hydrated
    
    fetchUserData();
    setIsHydrated(true);
  }, [user?.id, isHydrated]);
  
  // Clear hydration flag on user change
  useEffect(() => {
    setIsHydrated(false);
  }, [user?.id]);
};
```
**Risk:** Low - Simple boolean guard  
**Effort:** 30 minutes

#### 1.2 Add Hydration Guard to AchievementContext  
**Issue:** AchievementContext refetches on every mount despite missing socket events

```tsx
// REVIEW-ONLY EXAMPLE - AchievementContext.tsx
const AchievementProvider = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    if (!user?.id || isHydrated) return;
    
    fetchAchievements();
    setIsHydrated(true);
  }, [user?.id, isHydrated]);
};
```
**Risk:** Low - Matches ActivityContext pattern  
**Effort:** 30 minutes

### Priority 2: Consistency & Performance Improvements

#### 2.1 Migrate PredictionContext to EventBusCore
**Issue:** PredictionContext uses legacy direct socket listeners while other contexts use EventBusCore

```tsx
// REVIEW-ONLY EXAMPLE - PredictionContext.tsx
// BEFORE: Direct socket listeners
socket.on('predictionCreated', handlePredictionCreated);

// AFTER: EventBusCore pattern  
const { subscribe } = useEventBusCore();
useEffect(() => {
  const unsubscribe = subscribe(REDIS_CHANNELS.PREDICTION_CREATE, (payload) => {
    startTransition(() => {
      handlePredictionCreated(payload);
    });
  });
  return unsubscribe;
}, [subscribe]);
```
**Risk:** Medium - Changes error handling patterns  
**Effort:** 2 hours

#### 2.2 Add Achievement Event Subscription to AchievementContext
**Issue:** AchievementContext doesn't subscribe to `achievement:unlocked` events  

```tsx
// REVIEW-ONLY EXAMPLE - AchievementContext.tsx
const AchievementProvider = ({ children }) => {
  // Add EventBusCore subscription
  const { subscribe } = useEventBusCore();
  
  useEffect(() => {
    const unsubscribe = subscribe(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, (payload) => {
      if (payload.userId === user?.id) {
        // Update achievements state with new unlock
        setAchievements(prev => prev.map(achievement => 
          achievement.id === payload.achievementId 
            ? { ...achievement, isCompleted: true, completedAt: payload.timestamp }
            : achievement
        ));
      }
    });
    return unsubscribe;
  }, [subscribe, user?.id]);
};
```
**Risk:** Low - Additive change only  
**Effort:** 1 hour

### Priority 3: Server-Side Event Optimizations

#### 3.1 Add Server-Side Event Batching/Coalescing  
**Issue:** Burst events cause re-render churn, client-side debouncing is insufficient  
**Impact:** Medium - improves performance during high activity periods

```typescript
// REVIEW-ONLY EXAMPLE - Server event coalescing
class EventCoalescer {
  private batches = new Map<string, { events: any[], timer: NodeJS.Timeout }>();
  private readonly BATCH_WINDOW_MS = 300;
  
  addEvent(channel: string, payload: any, userId?: number) {
    const key = userId ? `${channel}:${userId}` : channel;
    
    if (!this.batches.has(key)) {
      this.batches.set(key, { events: [], timer: setTimeout(() => {
        this.flush(key);
      }, this.BATCH_WINDOW_MS)});
    }
    
    this.batches.get(key)!.events.push(payload);
  }
  
  private flush(key: string) {
    const batch = this.batches.get(key);
    if (!batch) return;
    
    // Combine strategy: last-write-wins per entity + aggregated counters
    const coalesced = this.coalesceBatch(batch.events);
    this.emit(key.split(':')[0] + ':batch', coalesced);
    
    this.batches.delete(key);
  }
}

// Apply to high-frequency domains:
// leaderboard:*, activity:*, odds:update:*
```
**Risk:** Medium - Changes event timing, requires client batch handlers  
**Effort:** 6 hours (server coalescing + client batch handlers)

#### 3.2 Add Listener Count Monitoring  
**Issue:** No visibility into subscription growth, potential memory leaks

```typescript
// REVIEW-ONLY EXAMPLE - Dev-mode listener monitoring
const EventBusCore = () => {
  const listenerCounts = useRef(new Map<string, number>());
  
  const subscribe = (channel: string, handler: Function) => {
    if (process.env.NODE_ENV === 'development') {
      const count = listenerCounts.current.get(channel) || 0;
      listenerCounts.current.set(channel, count + 1);
      
      // Assert reasonable limits
      if (count > 10) {
        console.warn(`[EventBusCore] High listener count for ${channel}: ${count}`);
      }
    }
    
    // ... existing subscribe logic
    
    return () => {
      // ... cleanup logic
      if (process.env.NODE_ENV === 'development') {
        const count = listenerCounts.current.get(channel) || 0;
        listenerCounts.current.set(channel, Math.max(0, count - 1));
      }
    };
  };
};
```
**Risk:** Low - Dev-mode only monitoring  
**Effort:** 1 hour

### Priority 4: Architecture Improvements

#### 4.1 Standardize Activity Caching Pattern
**Issue:** ActivityContext has best caching pattern, other contexts could benefit

```tsx
// REVIEW-ONLY EXAMPLE - Apply ActivityContext pattern to other contexts
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'ems_user_data';

const storeUserData = (data) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  sessionStorage.setItem(`${STORAGE_KEY}_timestamp`, Date.now().toString());
};

const getCachedUserData = () => {
  const timestamp = sessionStorage.getItem(`${STORAGE_KEY}_timestamp`);
  if (!timestamp || Date.now() - parseInt(timestamp) > CACHE_EXPIRY_MS) {
    return null;
  }
  return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
};
```
**Risk:** Low - Optional performance enhancement  
**Effort:** 1 hour per context

#### 3.2 Add User Stats Socket Events (Server-Side)
**Issue:** User stats have no socket coverage, requiring manual refetches

```tsx
// REVIEW-ONLY EXAMPLE - Server-side event emission needed
// In stats calculation service:
await eventBus.publish(REDIS_CHANNELS.USER_STATS_UPDATE, {
  userId: user.id,
  stats: {
    totalBets: updatedStats.totalBets,
    winRate: updatedStats.winRate,
    profit: updatedStats.profit.toString(),
    // ... other stats
  },
  timestamp: new Date().toISOString()
});
```
**Risk:** Medium - Requires server-side changes  
**Effort:** 4 hours (server + client)

### Priority 4: Developer Experience

#### 4.1 Add Refetch Reason Logging
**Issue:** Difficult to verify which refetches are necessary vs redundant

```tsx
// REVIEW-ONLY EXAMPLE - Add debug logging
const useUserProfile = (userId) => {
  const fetchProfile = useCallback(async (reason = 'unknown') => {
    console.log(`[useUserProfile] Fetching profile for user ${userId}, reason: ${reason}`);
    // ... existing fetch logic
  }, [userId]);
  
  useEffect(() => {
    fetchProfile('userId_changed');
  }, [fetchProfile]);
};
```
**Risk:** None - Debug only  
**Effort:** 15 minutes per hook

## 9. Verification Plan

### Manual Testing Scenarios

#### Scenario 1: Dashboard Navigation Refetch Test
**Goal:** Verify hydration guards prevent unnecessary refetches

**Steps:**
1. Open browser dev tools Network tab
2. Login and navigate to Dashboard
3. Record API calls for initial load
4. Navigate to Profile page (different user)
5. Navigate back to Dashboard  
6. **Expected:** No API calls on return to Dashboard
7. **Current:** 3 API calls (UserDataContext refetch)

#### Scenario 2: Achievement Update Test  
**Goal:** Verify achievement events update context state

**Steps:**
1. Open AchievementContext with event subscription
2. Trigger achievement unlock via betting
3. **Expected:** Achievement list updates without refetch
4. **Current:** No updates until manual refresh

#### Scenario 3: Cross-Context Coordination Test
**Goal:** Verify optimistic updates coordinate properly

**Steps:**
1. Monitor AuthContext balance + PredictionContext bets
2. Place bet with optimistic update
3. **Expected:** Both contexts update consistently
4. **Current:** Potential state inconsistency

### Automated Verification Scripts

#### Script 1: Navigation Refetch Counter
```bash
# REVIEW-ONLY EXAMPLE - Test script
#!/bin/bash
# Monitor network requests during navigation
node scripts/test-navigation-refetch.js

# Expected output:
# Dashboard load: 3 API calls ✓
# Profile navigation: 4 API calls ✓  
# Dashboard return: 0 API calls ✅ (with hydration guards)
```

#### Script 2: Socket Event Coverage Audit
```bash
# REVIEW-ONLY EXAMPLE - Audit script
#!/bin/bash
# Check which contexts subscribe to which events
grep -r "useSocketEvent\|socket.on" apps/client/src/contexts/
grep -r "subscribe.*REDIS_CHANNELS" apps/client/src/hooks/

# Generate coverage report:
# EventBusCore events: 15/20 contexts subscribed ✓
# Direct socket events: 3 contexts (migration needed) ⚠️
```

#### Script 3: Refetch Reason Instrumentation
```typescript
// REVIEW-ONLY EXAMPLE - Instrumentation utility
class RefetchTracker {
  private events: Array<{ context: string; reason: string; timestamp: number }> = [];
  
  trackRefetch(context: string, reason: string) {
    this.events.push({ context, reason, timestamp: Date.now() });
    console.log(`[RefetchTracker] ${context}: ${reason}`);
  }
  
  getReport() {
    // Group by reason, count occurrences
    // Flag suspicious patterns (same context refetching repeatedly)
  }
}
```

### Success Metrics

#### Before/After Comparison
| Metric | Current | Target | Measurement |
|--------|---------|---------|-------------|
| **Dashboard mount API calls** | 3 | 0 (after first) | Network tab count |
| **Achievement refetches** | Manual only | Live updates | Event subscription |
| **Navigation refetch ratio** | ~80% redundant | ~20% redundant | Script analysis |
| **Context pattern consistency** | Mixed | EventBusCore unified | Code audit |

#### Performance Indicators
- **Network requests reduced:** 60%+ decrease in redundant API calls
- **User experience improved:** Faster navigation, live updates
- **Developer experience:** Consistent patterns, easier debugging
- **Maintainability:** Single event bus, unified error handling

### Automated Leak Detection Tests
**Critical Addition:** Prevent regression of listener/memory leaks

```typescript
// REVIEW-ONLY EXAMPLE - Leak detection test
describe('Event System Leak Detection', () => {
  it('should not leak listeners on navigation cycles', async () => {
    const initialCounts = getListenerCounts();
    
    // Mount/unmount each major route 10x
    for (let i = 0; i < 10; i++) {
      render(<Dashboard />);
      await waitFor(() => screen.getByText('Dashboard'));
      cleanup();
      
      render(<Profile userId={123} />);
      await waitFor(() => screen.getByText('Profile'));
      cleanup();
    }
    
    const finalCounts = getListenerCounts();
    
    // Assert listener counts returned to baseline
    expect(finalCounts.socketListeners).toBeLessThanOrEqual(initialCounts.socketListeners + 2);
    expect(finalCounts.eventBusSubscriptions).toBeLessThanOrEqual(initialCounts.eventBusSubscriptions + 2);
  });
  
  it('should not make redundant API calls after hydration', async () => {
    const networkSpy = jest.spyOn(api, 'get');
    
    // First Dashboard mount - should fetch
    render(<Dashboard />);
    const initialCalls = networkSpy.mock.calls.length;
    cleanup();
    
    // Second Dashboard mount - should NOT fetch (hydrated)
    render(<Dashboard />);
    const subsequentCalls = networkSpy.mock.calls.length;
    
    expect(subsequentCalls).toBe(initialCalls); // No additional calls
  });
});
```

### Refetch Reason Instrumentation (Global)
```typescript
// REVIEW-ONLY EXAMPLE - Global refetch tracker
class RefetchTracker {
  private static instance: RefetchTracker;
  private events: Array<{ context: string; reason: string; timestamp: number; route: string }> = [];
  
  trackRefetch(context: string, reason: string, route?: string) {
    if (process.env.NODE_ENV === 'development') {
      this.events.push({ 
        context, 
        reason, 
        timestamp: Date.now(),
        route: route || window.location.pathname
      });
      console.log(`[RefetchTracker] ${context}: ${reason} on ${route}`);
    }
  }
  
  getReport() {
    const grouped = this.events.reduce((acc, event) => {
      const key = `${event.context}:${event.reason}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Flag suspicious patterns
    const suspicious = Object.entries(grouped)
      .filter(([key, count]) => count > 5)
      .map(([key, count]) => `${key} occurred ${count} times`);
      
    return { grouped, suspicious };
  }
}

// Usage in every data hook:
const useUserProfile = (userId) => {
  const fetchProfile = useCallback(async (reason = 'unknown') => {
    RefetchTracker.getInstance().trackRefetch('useUserProfile', reason);
    // ... existing logic
  }, [userId]);
};
```

### Tightened Next-Steps Order (Minimal Risk → Largest Payoff)
1. **Adopt invariants/policies in doc** (no code): EventBusCore-only, room join/leave, watermark policy *(1 hour)*
2. **Add hydration guards** + refetch instrumentation *(2 hours)*  
3. **Add room lifecycle management** *(2 hours)*
4. **Migrate PredictionContext to EventBusCore** *(2 hours - proves pattern)*
5. **Add listener count monitoring** *(1 hour - prevents future leaks)*
6. **Server-side event batching** for leaderboard/activity *(6 hours)*
7. **Hydration watermark implementation** *(3 hours - prevents races)*

### Success Metrics (Updated)
| Metric | Current | Target | Measurement | Verification |
|--------|---------|---------|-------------|--------------|
| **Dashboard mount API calls** | 3 | 0 (after first) | Network tab count | Automated test |
| **Navigation listener leaks** | Unknown | 0 net growth | Dev-mode monitoring | Leak detection test |
| **Event-driven updates** | 60% manual refresh | 90% live updates | Feature coverage | Manual scenarios |
| **Pattern consistency** | Mixed (3 patterns) | EventBusCore unified | Code audit | Grep analysis |
| **Room membership accuracy** | Unclear | 100% appropriate | Server logs | Room audit script |

## 11. Change Log (what changed in this document)
- Initial document creation with skeleton structure
- **Pass 1 (Index & Contracts):** Added architecture diagram, 15 core event mappings, context/hook lifecycle patterns, identified React 19 optimizations vs legacy patterns
- **Pass 2 (Hydration & Navigation):** Mapped initial hydration flow, first-load data paths, navigation behaviors, redundant refetch analysis, context lifecycle patterns, identified 6 refetch scenarios with 4 problematic
- **Pass 3 (Contexts & Lifecycle):** Complete audit of remaining 5 contexts, documented 3 optimistic update patterns (React 19 useOptimistic, basic optimistic, error recovery), mapped event hook usage patterns (EventBusCore vs direct socket), identified ActivityContext as best hydration example
- **Pass 4 (REST ↔ Socket Parity):** Domain-by-domain parity analysis across 10 domains, identified 2 critical gaps (user stats, achievement progress), confirmed high data shape compatibility with shared @ems/types, documented intentional vs missing socket coverage
- **Pass 5 (Recommendations & Verification):** Prioritized 7 review-only recommendations across 4 priority levels, created comprehensive verification plan with manual testing scenarios + automated scripts, documented success metrics with 60%+ redundant API call reduction target
- **Pass 5+ (Comprehensive Revision):** Added system invariants, risk registry with likelihood/impact assessment, hydration watermark implementation, room lifecycle management, server-side event batching, automated leak detection tests, refetch instrumentation, split recommendations into no-code policy vs future code changes, updated TL;DR to focus on critical architectural risks