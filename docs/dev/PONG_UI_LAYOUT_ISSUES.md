# Pong PVP Lobby - UI Layout Issues & Current State

**Date:** 2025-10-29
**Status:** 🔴 Critical Layout Issues - Blocking Release
**Context:** Building on PONG_PVP_REFACTOR_PROGRESS.md

---

## 📋 Executive Summary

**What We've Accomplished:**
- ✅ Backend fully functional (from previous progress report)
- ✅ All client components created (Tasks 13-17)
- ✅ Socket event handlers implemented (Task 18)
- ✅ Routing wired up (Task 21)
- ✅ Elo rating system fully integrated
- ✅ Players see correct Elo ratings in lobby

**What's Broken:**
- 🔴 **Critical:** PongLobbyScreen layout completely broken
- 🔴 **Critical:** Two-column layout not working (still single column)
- 🔴 **Critical:** Canvas stretched to full viewport width
- 🔴 **Blocker:** Sidebar not appearing on right side

**Impact:** Cannot release to production until layout is fixed.

---

## ✅ Completed Work Since Last Progress Report

### Client Components (Tasks 13-17) - ALL COMPLETE

#### 1. GameRoomChat.tsx ✅
**Location:** `apps/client/src/components/pong/GameRoomChat.tsx`

**Features Implemented:**
- Real-time message display with auto-scroll
- User role badges (Player 1, Player 2, Spectator)
- System message styling (grayed out, italic)
- Message input with Enter-to-send
- Rate limiting feedback
- Timestamp display
- Compact design for sidebar/bottom panel

**Status:** Fully functional, no issues.

---

#### 2. WagerNegotiationPanel.tsx ✅
**Location:** `apps/client/src/components/pong/WagerNegotiationPanel.tsx`

**Features Implemented:**
- Current wager offer display (large, prominent)
- Accept / Propose / Reject buttons
- Wager amount input slider
- Round counter (X/5 rounds)
- 2-minute countdown timer
- Negotiation history timeline
- Acceptance status indicators (dual acceptance required)
- Balance validation warnings
- Disabled states for max rounds

**Status:** Fully functional, no issues.

---

#### 3. LobbyEloPreview.tsx ✅
**Location:** `apps/client/src/components/pong/LobbyEloPreview.tsx`

**Features Implemented:**
- Side-by-side player cards
- Current Elo + tier display
- Win/loss Elo predictions (+/- values)
- Risk level indicators (Even/Favored/Underdog)
- Color-coded risk levels (green/yellow/red)
- Economy analysis (Skill ±X, Economy ±Y)
- Real-time updates when wager changes
- Confidence levels (High/Medium/Low)
- Upset opportunity indicators

**Status:** Fully functional, displays correct Elo values after backend fixes.

---

#### 4. PongLobbyScreen.tsx ✅
**Location:** `apps/client/src/components/pong/PongLobbyScreen.tsx`

**Intended Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Header shows in PongHeader - managed by PongGame.tsx]     │
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│   Canvas (800x600)               │  Elo Impact Preview      │
│   - Paddle warmup                │  (Sidebar - 400px)       │
│   - Waiting overlay              │                          │
│                                  │  Wager Negotiation Panel │
│   Chat (below canvas)            │  - Current offer         │
│   - Height: 250px                │  - Accept/Reject buttons │
│   - Max width: 900px             │  - Counter input         │
│                                  │  - Round counter         │
│                                  │  - Timer                 │
│                                  │                          │
└──────────────────────────────────┴──────────────────────────┘
```

**Features Implemented:**
- Two-column grid layout attempt
- Canvas with aspect ratio preservation
- Waiting for opponent overlay
- Chat integration below canvas
- Elo preview integration in sidebar
- Wager negotiation panel in sidebar
- Mobile responsive stacked layout
- Disconnect banner support

**Status:** 🔴 **BROKEN - Layout not working**

---

#### 5. OpponentDisconnectBanner.tsx ✅
**Location:** `apps/client/src/components/pong/OpponentDisconnectBanner.tsx`

**Features Implemented:**
- Alert banner at top of screen
- "Opponent disconnected - waiting for reconnection..."
- Wait / Leave Lobby buttons
- Countdown timer (10 seconds grace period)
- Auto-hide on reconnection
- Slide-in animation

**Status:** Fully functional, no issues.

---

### Socket Integration (Task 18) - COMPLETE ✅

**Location:** `apps/client/src/hooks/usePongSocket.ts`

**Event Handlers Added:**
```typescript
// Wager negotiation events
socket.on('wager_proposed', ...)
socket.on('wager_accepted', ...)
socket.on('wager_rejected', ...)
socket.on('wager_locked', ...)
socket.on('negotiation_timeout', ...)
socket.on('match_cancelled', ...)

// Chat events
socket.on('game_chat_message', ...)

// Disconnect/reconnect events
socket.on('player_disconnected', ...)
socket.on('player_reconnected', ...)
```

**State Management Added:**
```typescript
const [wagerNegotiation, setWagerNegotiation] = useState<WagerNegotiation | null>(null);
const [chatMessages, setChatMessages] = useState<GameChatMessage[]>([]);
const [opponentDisconnected, setOpponentDisconnected] = useState(false);
const [negotiationTimeRemaining, setNegotiationTimeRemaining] = useState<number | null>(null);
const [authenticatedPlayer, setAuthenticatedPlayer] = useState<Player | null>(null);
```

**Methods Added:**
```typescript
proposeWager(gameId: string, amount: number)
acceptWager(gameId: string)
rejectWager(gameId: string)
sendChatMessage(gameId: string, message: string)
```

**Status:** Fully functional, all events working correctly.

---

### Routing Integration (Task 21) - COMPLETE ✅

**Location:** `apps/client/src/components/pong/PongGame.tsx`

**Implemented Logic:**
```typescript
// Show PongLobbyScreen when in lobby phases
if (currentGame && (
  currentGame.status === 'waiting_for_opponent' ||
  currentGame.status === 'lobby_negotiation'
)) {
  return <PongLobbyScreen ... />;
}

// Show PongCanvas when in active game phases
if (currentGame && (
  currentGame.status === 'waiting_for_ready' ||
  currentGame.status === 'countdown' ||
  currentGame.status === 'active'
)) {
  return <PongCanvas ... />;
}

// Show lobby list when no game
return <PongGamesList ... />;
```

**Status:** Routing works correctly, components show at right times.

---

## 🎯 Elo Rating System Integration - COMPLETE ✅

### Problem Identified
- Backend was not returning player Elo ratings correctly
- Pong server wasn't including Elo in player objects
- Client was using main auth user (no Elo) instead of pong authenticated player

### Backend Fixes

#### 1. Main Server Repository Fix ✅
**Location:** `apps/server/src/repositories/PongRepository.ts`

**Issue:** Query was looking for non-existent `pongElo` field directly on User model

**Fix:** Query pongStats relation instead:
```typescript
async findUserForAuth(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      muskBucks: true,
      pongStats: {
        select: {
          eloRating: true  // ✅ Query from relation
        }
      }
    },
  });
}
```

---

#### 2. Main Server Controller Fix ✅
**Location:** `apps/server/src/controllers/pong.controller.ts`

**Issue:** Controller accessing non-existent `user.pongElo` field

**Fix:** Access from pongStats relation with fallback:
```typescript
res.json({
  id: user.id,
  name: user.name,
  muskBucks: Number(user.muskBucks),
  pongElo: user.pongStats?.eloRating || 1200, // ✅ Use relation
});
```

---

#### 3. AI Player Elo Fix ✅
**Location:** `apps/pong-server/src/server.ts` (lines 49-55, 116-124)

**Issue:** AI player objects missing `elo` field

**Fix:** Added AI_PLAYER_ELOS constant and included elo based on difficulty:
```typescript
const AI_PLAYER_ELOS = {
  EASY: 800,
  MEDIUM: 1200,
  HARD: 1600,
  IMPOSSIBLE: 2200,
} as const;

// AI player creation
return {
  id: aiPlayerId,
  name: aiPlayerName,
  paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
  score: 0,
  ping: 0,
  lastInputTime: Date.now(),
  elo: AI_PLAYER_ELOS[difficulty], // ✅ Based on difficulty
};
```

---

#### 4. Real Player Elo Inclusion ✅
**Location:** `apps/pong-server/src/server.ts` (lines 162-170)

**Issue:** Player objects created from API data but elo field not included

**Fix:** Include pongElo from API response:
```typescript
return {
  id: userData.id,
  name: userData.name,
  paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
  score: 0,
  ping: 0,
  lastInputTime: Date.now(),
  elo: userData.pongElo, // ✅ From API response
};
```

---

### Type System Updates

#### 1. Player Type Fix ✅
**Location:** `packages/types/src/database/pong.ts`

**Added elo field:**
```typescript
export interface Player {
  id: number;
  name: string;
  paddleY: number;
  score: number;
  ping: number;
  lastInputTime: number;
  elo: number; // ✅ Added
}
```

---

#### 2. Spectator Event Type Fix ✅
**Location:** `packages/types/src/api/socket/payloads.ts`

**Issue:** Missing fields in spectator_joined event type

**Fix:** Added chatMessages and negotiationStartedAt:
```typescript
spectator_joined: {
  gameId: string;
  spectatorCount: number;
  player1: { id: number; name: string } | null;
  player2: { id: number; name: string } | null;
  wager: number;
  pot: number;
  status: import('../../shared/enums').GameStatus;
  chatHistory?: import('../../database/pong').GameChatMessage[];
  chatMessages?: import('../../database/pong').GameChatMessage[]; // ✅ Added alias
  wagerNegotiation?: import('../../database/pong').WagerNegotiation | null;
  currentWagerOffer?: number;
  negotiationStartedAt?: number | null; // ✅ Added
};
```

---

### Client-Side Fixes

#### Client Authenticated Player Storage ✅
**Location:** `apps/client/src/hooks/usePongSocket.ts`

**Issue:** Client was using `user` from AuthContext to create player object, but that doesn't include pongElo

**Fix:** Store authenticated player from pong server's auth_result event:
```typescript
// 1. Added ref to store authenticated player
const authenticatedPlayerRef = useRef<Player | null>(null);

// 2. Store player data on auth success
newSocket.on('auth_result', (data: ServerEvents['auth_result']) => {
  if (data.success && data.player) {
    console.log(`✅ User ${user.id} authenticated as ${data.player.name} (Elo: ${data.player.elo})`);
    setIsAuthenticated(true);
    authenticatedPlayerRef.current = data.player; // ✅ Store with Elo
    setConnectionError(null);
  }
});

// 3. Use authenticated player when creating match
newSocket.on('match_joined', (data: ServerEvents['match_joined']) => {
  const authPlayer = authenticatedPlayerRef.current;
  if (!authPlayer) {
    console.error('❌ No authenticated player data available');
    return;
  }

  const userPlayer: Player = {
    ...authPlayer, // ✅ Use pong server player data (includes elo)
    paddleY: initialPaddleY,
    score: 0,
    ping: 0,
    lastInputTime: Date.now(),
  };
  // ... rest of match_joined handler
});
```

**Result:** Both players now see correct Elo ratings (their own and opponent's)

---

## 🔴 CRITICAL ISSUE: PongLobbyScreen Layout Broken

### Expected Behavior

**Desktop (lg breakpoint and above):**
```
┌─────────────────────────────────────────────────────────────┐
│                    CONTAINER WITH MARGINS                    │
│  ┌────────────────────────────────┬────────────────────┐   │
│  │                                │                    │   │
│  │  Canvas (max-width: 900px)     │  Sidebar (400px)   │   │
│  │  - Aspect ratio 800:600        │  ┌──────────────┐  │   │
│  │  - Paddle warmup               │  │ Elo Preview  │  │   │
│  │                                │  └──────────────┘  │   │
│  │                                │  ┌──────────────┐  │   │
│  │  Chat (max-width: 900px)       │  │ Negotiation  │  │   │
│  │  - Height: 250px               │  │ Panel        │  │   │
│  │                                │  └──────────────┘  │   │
│  └────────────────────────────────┴────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Mobile (below lg breakpoint):**
```
┌─────────────────────┐
│  Canvas             │
│  (full width)       │
│                     │
├─────────────────────┤
│  Negotiation Panel  │
├─────────────────────┤
│  Elo Preview        │
├─────────────────────┤
│  Chat               │
└─────────────────────┘
```

---

### Actual Behavior

**What's happening:**
- Canvas is stretching to full viewport width (way too wide)
- Sidebar is not appearing on the right
- Everything is stacked vertically in a single column
- No two-column grid is visible

**Screenshot evidence:** User provided screenshot showing single-column layout with massive canvas

---

### Current Code (What We Tried)

#### Attempt 1: Full-width two-column
**Location:** `apps/client/src/components/pong/PongLobbyScreen.tsx` (lines 66-142)

```typescript
<div className="w-full">
  <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 max-w-[1600px] mx-auto px-4">
    {/* Left column */}
    <div className="space-y-6 min-w-0">
      <div className="bg-surface rounded-lg border border-border overflow-hidden relative w-full max-w-[900px]"
           style={{ aspectRatio: '800/600' }}>
        <PongCanvas ... />
      </div>
      <GameRoomChat className="h-[250px] max-w-[900px]" ... />
    </div>

    {/* Right column - sidebar */}
    <div className="space-y-4">
      <LobbyEloPreview ... />
      <WagerNegotiationPanel ... />
    </div>
  </div>
</div>
```

**Issues with this approach:**
- Grid columns not working (still showing as single column)
- Canvas max-width not constraining properly
- Sidebar not appearing on right side

---

#### Attempt 2: Container-level conditional layout
**Location:** `apps/client/src/components/pong/PongGame.tsx` (lines 277-303)

```typescript
// Determine if we're in lobby negotiation
const isInLobbyNegotiation = currentGame && (
  currentGame.status === 'waiting_for_opponent' ||
  currentGame.status === 'lobby_negotiation'
);

return (
  <div className="min-h-screen bg-background">
    {/* Header always in container */}
    <div className="container mx-auto px-4 py-6">
      <PongHeader ... />
    </div>

    {/* Main content - conditional container */}
    <div className={isInLobbyNegotiation ? '' : 'container mx-auto px-4 pb-32'}>
      {/* ... content ... */}
    </div>
  </div>
);
```

**Issues with this approach:**
- Lobby negotiation gets no container (full viewport width)
- PongLobbyScreen tries to manage its own layout but fails
- Two-column grid still not working

---

### Why It's Not Working

**Analysis of the problem:**

1. **CSS Grid Not Applying:**
   - `hidden lg:grid` should hide on mobile, show grid on desktop
   - Grid columns `lg:grid-cols-[minmax(0,1fr)_400px]` should create two columns
   - **Hypothesis:** Breakpoint not triggering, or grid display overridden

2. **Container Width Issues:**
   - When parent has no container, child max-width constraints don't work as expected
   - Canvas trying to be max 900px but stretching to full width anyway
   - **Hypothesis:** Flexbox/Grid parent overriding max-width

3. **Missing PageContainer Pattern:**
   - Other pages use `PageContainer` component for consistent margins
   - Lobby negotiation removed container entirely for "full-width" design
   - **Hypothesis:** Need hybrid approach - container margins but custom internal layout

---

### What We Need

**Requirements for proper layout:**

1. **Main Pong Lobby (game list):**
   - ✅ Already working
   - Uses standard `PageContainer` component
   - Container margins applied correctly

2. **Lobby Negotiation Screen:**
   - Need two-column layout on desktop
   - Left column: Canvas + Chat (with PageContainer-style left margin)
   - Right column: Elo Preview + Negotiation Panel (400px sidebar with PageContainer-style right margin)
   - Should maintain responsive container margins (not full viewport)
   - Should use CSS Grid for desktop, stack for mobile

3. **Active Game (PongCanvas):**
   - ✅ Already working
   - Uses standard `PageContainer` component
   - Centered canvas with proper margins

---

## 🎯 Root Cause Analysis

### The Core Problem

**PongLobbyScreen is trying to be both:**
1. A full-width container (removed from PageContainer)
2. A constrained two-column layout (with max-width and margins)

**This creates a conflict:**
- Parent (PongGame) gives it full viewport width
- Child tries to add margins via max-w-[1600px] mx-auto px-4
- Grid columns don't respect constraints properly
- Canvas stretches beyond intended max-width

### What's Different About This Screen

**Normal screens:**
```
Pong.tsx → PageContainer → PongGame → PongGamesList
                         ↓
                    Container margins applied
```

**Lobby negotiation (current broken approach):**
```
Pong.tsx → PongGame (no container) → PongLobbyScreen (tries to add own container)
                                   ↓
                              Conflicts and breaks
```

**What we actually need:**
```
Pong.tsx → PongGame → PongLobbyScreen with two-column grid inside PageContainer margins
```

---

## 📊 Status Summary

| Component | Status | Issues |
|-----------|--------|--------|
| GameRoomChat | ✅ Working | None |
| WagerNegotiationPanel | ✅ Working | None |
| LobbyEloPreview | ✅ Working | None |
| OpponentDisconnectBanner | ✅ Working | None |
| usePongSocket | ✅ Working | None |
| Elo Backend | ✅ Working | None |
| Elo Client | ✅ Working | None |
| **PongLobbyScreen Layout** | 🔴 **BROKEN** | **Two-column grid not working** |
| **PongGame Container Logic** | 🔴 **BROKEN** | **Conditional container causing issues** |

---

## 🚧 Blocking Issues

### Critical Blockers (Must Fix Before Release)

1. **Two-Column Layout Not Working**
   - Priority: P0 (Critical)
   - Impact: Users cannot see Elo preview and negotiation panel
   - Reproducible: 100%
   - Browsers: All

2. **Canvas Stretching to Full Width**
   - Priority: P0 (Critical)
   - Impact: Game canvas unplayable size, poor UX
   - Reproducible: 100%
   - Browsers: All

3. **Sidebar Not Appearing**
   - Priority: P0 (Critical)
   - Impact: Core feature (wager negotiation) hidden
   - Reproducible: 100%
   - Browsers: All

---

## 💡 Proposed Solutions (Not Implemented)

### Option A: Restore PageContainer, Custom Grid Inside

**Approach:**
```typescript
// Pong.tsx
return <PageContainer><PongGame /></PageContainer>;

// PongGame.tsx
// Always use container, PongLobbyScreen handles its own internal layout

// PongLobbyScreen.tsx
return (
  <div className="grid lg:grid-cols-[1fr_400px] gap-6">
    <div className="space-y-6">
      <Canvas max-w-none />
      <Chat />
    </div>
    <div className="space-y-4">
      <EloPreview />
      <Negotiation />
    </div>
  </div>
);
```

**Pros:**
- Consistent with rest of application
- PageContainer margins applied properly
- Two-column grid is simpler

**Cons:**
- Canvas might be constrained by container max-width
- Might need to adjust container size

---

### Option B: Full-Width Container, Asymmetric Padding

**Approach:**
```typescript
// PongLobbyScreen.tsx
<div className="grid lg:grid-cols-[1fr_400px]">
  <div className="pl-[container-left-padding]">
    <Canvas />
    <Chat />
  </div>
  <div className="pr-[container-right-padding]">
    <EloPreview />
    <Negotiation />
  </div>
</div>
```

**Pros:**
- Full viewport width for canvas
- Sidebar on right edge

**Cons:**
- Complex padding calculations
- Breaks responsive design patterns
- Harder to maintain

---

### Option C: Nested Containers

**Approach:**
```typescript
// PongGame.tsx
{isInLobbyNegotiation ? (
  <div className="w-full">
    <div className="container mx-auto px-4">
      <PongLobbyScreen />
    </div>
  </div>
) : (
  <PageContainer>
    {/* other screens */}
  </PageContainer>
)}
```

**Pros:**
- Explicit container control
- Easier to debug

**Cons:**
- Still has same grid layout issues
- Doesn't fix root cause

---

## 🔍 Debug Information

### Current Tailwind Breakpoints
```
sm: 640px
md: 768px
lg: 1024px   ← Our target for two-column
xl: 1280px
2xl: 1536px
```

### Container Max-Width by Breakpoint
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### User's Viewport (from screenshot)
- Appears to be > 1024px (desktop size)
- Two-column grid should be active
- But is showing single column instead

---

## 📝 Next Steps (Recommended)

### Immediate Actions Needed

1. **Review CSS Grid Application**
   - Check if `hidden lg:grid` is actually applying
   - Use browser DevTools to inspect computed styles
   - Verify grid-template-columns is set

2. **Test Simplified Layout First**
   - Strip down to minimal grid example
   - Add complexity incrementally
   - Identify exact breaking point

3. **Choose and Implement Solution**
   - Decide between Option A, B, or C above
   - Implement with proper testing
   - Verify responsive behavior

4. **Verify All Breakpoints**
   - Test on mobile (< 1024px)
   - Test on desktop (>= 1024px)
   - Test on ultrawide (>= 1536px)

---

## 🎯 Success Criteria

**Layout will be considered fixed when:**

1. ✅ Desktop (>= 1024px) shows two-column grid
2. ✅ Left column contains Canvas + Chat
3. ✅ Right column is exactly 400px sidebar
4. ✅ Canvas constrained to reasonable max-width (800-900px)
5. ✅ Sidebar contains Elo Preview above Negotiation Panel
6. ✅ Proper container margins maintained
7. ✅ Mobile (< 1024px) stacks vertically
8. ✅ No horizontal scrolling on any viewport size
9. ✅ All components remain functional
10. ✅ Responsive at all standard breakpoints

---

## 📎 Related Files

**Files that need fixing:**
- `apps/client/src/components/pong/PongLobbyScreen.tsx` (primary issue)
- `apps/client/src/components/pong/PongGame.tsx` (container logic)
- `apps/client/src/pages/Pong.tsx` (page wrapper)

**Files that are working correctly:**
- `apps/client/src/components/pong/GameRoomChat.tsx`
- `apps/client/src/components/pong/WagerNegotiationPanel.tsx`
- `apps/client/src/components/pong/LobbyEloPreview.tsx`
- `apps/client/src/components/pong/OpponentDisconnectBanner.tsx`
- `apps/client/src/hooks/usePongSocket.ts`
- `apps/server/src/repositories/PongRepository.ts`
- `apps/server/src/controllers/pong.controller.ts`
- `apps/pong-server/src/server.ts`

---

**Document Status:** 🔴 Active Issue
**Last Updated:** 2025-10-29
**Author:** Claude
**Reviewers Needed:** UI/UX Team, Frontend Lead
