# Pong Spectator Mode Bug Investigation

**Date Started:** 2025-10-26
**Status:** 🔴 UNRESOLVED
**Priority:** HIGH

---

## 🐛 Problem Statement

After spectating a pong match and returning to the lobby, users are unable to successfully play a new match. The game gets stuck on the "GO!" countdown overlay and the player cannot interact with the game properly.

---

## 🔍 Symptoms Observed

### Primary Issues
1. **Canvas Stuck on "GO!" Overlay**
   - After spectating → returning to lobby → creating AI match
   - Game countdown completes (3, 2, 1, GO!)
   - Overlay remains showing "GO!" indefinitely
   - Ball is not visible
   - Paddles do not respond to input
   - AI scores repeatedly (user loses 0-5)
   - User never sent back to lobby after match ends

2. **Player Count Issues (FIXED ✅)**
   - Initially: Player count showed 0 or 20 instead of 21 after spectating
   - Root cause: StatisticsManager tracked player IDs but didn't account for multiple sockets per user
   - Solution: Changed to track `Map<playerId, Set<socketId>>` to support both main and spectator sockets

3. **Double Header Rendering (FIXED ✅)**
   - Both PongGame and PongSpectator were rendering PongHeader
   - Solution: Removed PongHeader from PongSpectator component

4. **Player Names Not Showing for Spectators (FIXED ✅)**
   - Spectator saw "Player 1 vs Player 2" instead of real names
   - Solution: Server now sends player names in `spectator_joined` event

5. **Wrong End-Game Overlay for Spectators (FIXED ✅)**
   - Spectator saw "You Lost" instead of winner's name
   - Solution: PongCanvas checks `isSpectating` flag to show winner name

---

## 🏗️ Architecture Overview

### Current Socket Architecture

**Two Separate Sockets:**
1. **Main Player Socket** (`usePongSocket` hook)
   - Created in AuthContext, provided via SocketContext
   - Persists across navigation and component lifecycles
   - Used for playing matches, lobby updates, stats
   - Single connection per user for entire session

2. **Spectator Socket** (`usePongSpectator` hook)
   - Created fresh when user clicks "Spectate" on a match
   - Created with `forceNew: true` to ensure separate connection
   - Uses same JWT token as main socket (authenticates as same user)
   - Disconnects when returning to lobby
   - Should NOT interfere with main socket

### Expected Flow

```
User Journey:
1. User connected via main socket ✅
2. User clicks "Spectate" on active match ✅
3. Spectator socket created, authenticates, joins game room ✅
4. User watches match with real-time updates ✅
5. Match ends → Auto-return to lobby after 3s ✅
6. Spectator socket disconnects ✅
7. Main socket still connected, user in lobby ✅
8. User creates new AI/PVP match ❌ BREAKS HERE
9. Match should work normally ❌ STUCK ON "GO!"
```

### Critical Server Components

**StatisticsManager** (`apps/pong-server/src/server.ts:308-382`)
- Tracks `playerSockets: Map<playerId, Set<socketId>>`
- `addConnectedPlayer(playerId, socketId)` - adds socket to player's set
- `removeConnectedPlayer(playerId, socketId)` - removes socket, deletes player if no sockets remain
- Used for `playersOnline` stat

**Authentication Flow** (`apps/pong-server/src/server.ts:1870-1873`)
- Every socket (main or spectator) calls `auth` event with JWT
- Server adds player to StatisticsManager on successful auth
- Server removes player on `disconnect` event

### Critical Client Components

**usePongSocket Hook** (`apps/client/src/hooks/usePongSocket.ts`)
- Manages main player socket connection
- Handles game state updates, lobby updates, match creation
- Critical cleanup effect on line 598-608 (depends on `[user?.id]`)
- **Known Issue:** Effect fires twice during transition, logs show:
  ```
  🏓 Cleaning up socket on unmount
  🏓 Cleaning up socket on unmount
  ```

**usePongSpectator Hook** (`apps/client/src/hooks/usePongSpectator.ts`)
- Creates separate socket with `forceNew: true`
- Authenticates with same user token
- Receives spectator-specific events
- Disconnects completely on `leaveSpectating()`

**PongGame Component** (`apps/client/src/components/pong/PongGame.tsx`)
- Orchestrates lobby, playing, and spectating modes
- `handleBackToLobby()` - manages transition back to lobby
- Passes game state to PongCanvas for rendering

**PongCanvas Component** (`apps/client/src/components/pong/PongCanvas.tsx`)
- Renders game visuals (paddles, ball, overlays)
- Shows "GO!" overlay when `gameState.status === 'countdown'`
- Should transition to active gameplay when receiving `game_state` events

---

## 🔧 Attempted Fixes

### Fix #1: Update StatisticsManager to Support Multiple Sockets
**Files Modified:**
- `apps/pong-server/src/server.ts:308-343`

**Changes:**
- Changed from `Set<playerId>` to `Map<playerId, Set<socketId>>`
- Updated `addConnectedPlayer()` to take `socketId` parameter
- Updated `removeConnectedPlayer()` to only remove specific socket
- Player only removed from count when all sockets disconnected

**Result:** ✅ Fixed player count showing 0 after spectating
**Side Effects:** None

---

### Fix #2: Remove Duplicate PongHeader from Spectator
**Files Modified:**
- `apps/client/src/components/pong/PongSpectator.tsx`

**Changes:**
- Removed PongHeader import and rendering
- Simplified loading states to centered divs

**Result:** ✅ Fixed double header rendering
**Side Effects:** None

---

### Fix #3: Send Player Names in spectator_joined Event
**Files Modified:**
- `apps/pong-server/src/server.ts:2293-2317`
- `packages/types/src/api/socket/payloads.ts:249-257`
- `apps/client/src/hooks/usePongSpectator.ts:113-172`

**Changes:**
- Server sends `player1: {id, name}` and `player2: {id, name}` in `spectator_joined`
- Client stores player names from this event
- Client preserves names in subsequent `game_state` updates

**Result:** ✅ Fixed player names showing for spectators
**Side Effects:** None

---

### Fix #4: Expose Spectator Game State to PongHeader
**Files Modified:**
- `apps/client/src/components/pong/PongSpectator.tsx:53-94`
- `apps/client/src/components/pong/PongGame.tsx:42, 230, 246`

**Changes:**
- PongSpectator calls `onGameStateChange(canvasGameState)` to expose state to parent
- PongGame stores spectator state in `spectatorGameState` variable
- PongGame uses `displayGame = spectatingGameId ? spectatorGameState : currentGame`
- PongHeader receives correct game state for both modes

**Result:** ✅ Fixed scores and names updating in header while spectating
**Side Effects:** None

---

### Fix #5: Show Winner Name for Spectators in End-Game Overlay
**Files Modified:**
- `apps/client/src/components/pong/PongCanvas.tsx:970-1000`

**Changes:**
- Added `isSpectating` check in game-ended overlay
- Spectators see `{winner.name} Wins! 🎉` instead of "You Win/Lost"
- Added null/undefined checks for `gameState.winner`

**Result:** ✅ Fixed spectator end-game display
**Side Effects:** None

---

### Fix #6: Skip leaveMatch() When Returning from Spectating
**Files Modified:**
- `apps/client/src/components/pong/PongGame.tsx:202-228`

**Changes:**
- Check if `wasSpectating` before calling `leaveMatch()`
- Only call `leaveMatch()` if user was actually playing (not spectating)
- Prevents trying to leave a match on main socket that was never joined

**Result:** ❓ Partially effective - prevents incorrect leaveMatch call
**Side Effects:** Revealed the "GO!" stuck issue

---

### Fix #7: Add Key Props to Force Component Remount (REVERTED)
**Files Modified:**
- `apps/client/src/components/pong/PongGame.tsx`

**Changes:**
- Added `key={spectator-${spectatingGameId}}` to PongSpectator
- Added `key={player-${currentGame.gameId}}` to PongCanvas
- Intended to force fresh mount when switching modes

**Result:** ❌ Made issue worse - caused double socket cleanup
**Reverted:** Yes - removed key props in subsequent fix

---

### Fix #8: Stabilize handleBackToLobby with useCallback
**Files Modified:**
- `apps/client/src/components/pong/PongGame.tsx:202-228`

**Changes:**
- Wrapped `handleBackToLobby` in `useCallback`
- Added `setTimeout(100ms)` before calling `joinLobby()`
- Added dependency array with all referenced values

**Result:** ❓ Unclear - didn't solve core issue
**Side Effects:** May have added unnecessary delay

---

### Fix #9: Change usePongSocket Cleanup Dependency
**Files Modified:**
- `apps/client/src/hooks/usePongSocket.ts:597-608`

**Changes:**
- Changed cleanup effect from `[user]` to `[user?.id]`
- Intent: Prevent cleanup when user object reference changes but ID stays same
- Should prevent socket remount on unrelated state updates (balance, etc.)

**Result:** ❌ Did not solve the "GO!" stuck issue
**Side Effects:** Unknown if cleanup still fires twice

---

## 📊 Debug Logs Analysis

### Last Test Attempt Console Logs

```javascript
// Successful spectating flow
🏓 Joining lobby...
🏓 Lobby updated: 0 available matches
🏓 Active games updated: 10 games
🏓 Stats updated: { playersOnline: 21, activeGames: 10, availableMatches: 0 }

// User creates AI match after returning from spectating
🏓 Creating match: { wager: 14810, type: "ai", aiDifficulty: "IMPOSSIBLE" }
🏓 User 5 joined match: game-1761515320974-laqe09chb7 as player 0

// ⚠️ PROBLEM: Socket cleanup fires TWICE
🏓 Cleaning up socket on unmount usePongSocket.ts:600:15
🏓 Active games updated: 1 games
🏓 Cleaning up socket on unmount usePongSocket.ts:600:15

🏓 Stats updated: { playersOnline: 1, activeGames: 1, availableMatches: 0 }
🏓 Setting ready state: true
🏓 Ready states updated: [true, true]
🏓 Active games updated: 1 games

// Countdown works
🏓 Countdown: 3
🏓 Countdown: 2
🏓 Countdown: 1
🏓 Countdown: 0 GO!

// Stats update (but NO game_state events logged)
🏓 Stats updated: { playersOnline: 1, activeGames: 1, availableMatches: 0 }
🏓 Score update: [0, 1] scorer: 1
🏓 Score update: [0, 2] scorer: 1
// ... user loses 0-5
```

### Key Observations from Logs

1. **Double Cleanup:**
   - Socket cleanup fires TWICE immediately after joining match
   - Happens between "User 5 joined match" and "Stats updated"
   - This suggests `usePongSocket` is unmounting and remounting

2. **Missing game_state Events:**
   - Countdown events received ✅
   - Score update events received ✅
   - `game_state` events NOT logged ❌
   - Without `game_state` events, status never transitions from 'countdown' to 'active'

3. **Status Stuck on 'countdown':**
   - PongCanvas shows "GO!" overlay when `status === 'countdown'`
   - `game_state` event handler sets `status: 'active'` (line 355)
   - If `game_state` events not received, status never changes

---

## 🤔 Root Cause Hypothesis

### Theory #1: usePongSocket Effect Chain Causes Remount
**Evidence:**
- Double cleanup logs immediately after creating match
- Cleanup effect depends on `[user?.id]`
- If `user` object reference changes during spectator transition, effect fires

**Why This Causes Stuck State:**
1. User returns from spectating, `setSpectatorGameState(null)` triggers re-render
2. Re-render causes `user` object reference to change (context re-evaluation)
3. `usePongSocket` cleanup effect fires (sees `user?.id` as "new" even if same value)
4. Socket event listeners are removed and re-added
5. New match creation happens during this transition
6. Event handlers for `game_state` are not properly registered
7. Canvas never receives status transition to 'active'

**Gaps in Theory:**
- Why would `user?.id` change if we're checking the primitive ID value?
- Why do score events still work but not game_state events?

---

### Theory #2: Spectator Socket Interferes with Main Socket State
**Evidence:**
- Both sockets authenticate as same user with same JWT
- Server adds both sockets to same player's socket set
- When spectator disconnects, server might be doing something unexpected

**Why This Causes Stuck State:**
1. Spectator socket disconnects properly ✅
2. Server removes spectator socketId from player's set ✅
3. Main socket still in player's set ✅
4. BUT: Some server-side state might be corrupted during this transition
5. When new match created, server doesn't properly track main socket's game state
6. Server sends `game_state` to wrong room or wrong socket ID
7. Client never receives `game_state` events

**Gaps in Theory:**
- Why do countdown and score events still work?
- These events should have same targeting logic as game_state

---

### Theory #3: PongGame State Management Race Condition
**Evidence:**
- Multiple state updates in quick succession (setSpectatingGameId, setSpectatorGameState, joinLobby)
- React batches state updates but timing might be off
- PongCanvas might be rendering before `currentGame` is properly set

**Why This Causes Stuck State:**
1. `handleBackToLobby` sets multiple states synchronously
2. React batches these into single render
3. During this render, PongCanvas might get stale game state
4. User creates new match
5. `currentGame` updates but PongCanvas internal state is corrupted
6. Canvas shows "GO!" but never processes status change

**Gaps in Theory:**
- PongCanvas is supposed to be purely driven by props
- Shouldn't have internal state that gets corrupted

---

### Theory #4: Socket.IO Room Membership Issue
**Evidence:**
- Spectator joins `game:${gameId}` room for spectating
- Main socket joins `game:${gameId}` room when playing
- Socket.IO might not properly remove spectator from old room

**Why This Causes Stuck State:**
1. Spectator socket joins `game:${oldGameId}` ✅
2. Spectator socket disconnects ✅
3. Main socket creates new match, joins `game:${newGameId}` ✅
4. BUT: Server might be sending `game_state` to old room or wrong socket
5. Main socket not receiving events properly
6. Canvas never updates

**Gaps in Theory:**
- Spectator socket disconnects completely (different socket ID)
- Should not affect main socket's room memberships

---

## 🎯 Recommended Next Steps

### Investigation Phase
1. **Add Comprehensive Logging:**
   - Log every socket event received in usePongSocket
   - Log socket.id at every critical transition
   - Log room memberships on server side
   - Log game_state event targeting on server side

2. **Test Simplified Scenario:**
   - Start fresh session (no spectating)
   - Create AI match → works ✅
   - Return to lobby, create another AI match → works ✅
   - Spectate a match, return to lobby → check if main socket corrupted
   - Create AI match → breaks ❌

3. **Verify Server-Side State:**
   - Add server logs showing which socket ID is associated with which game
   - Check if game_state events are being emitted
   - Verify room membership after spectator disconnects

### Potential Solutions

#### Solution A: Completely Separate Socket Contexts
**Approach:**
- Create entirely separate context for spectator socket
- Ensure spectator hook never touches main socket state
- Add guards to prevent any shared state mutations

**Risk:** High complexity, might not fix underlying issue

---

#### Solution B: Reload Component After Spectating
**Approach:**
- Force hard reset of PongGame component after returning from spectating
- Use `window.location.reload()` or navigate away and back
- Nuclear option but guaranteed to clear all state

**Risk:** Poor UX, feels janky

---

#### Solution C: Redesign Socket Architecture
**Approach:**
- Single socket for both playing and spectating
- Server handles "spectator mode" as a flag on existing connection
- Emit different events: `player_game_state` vs `spectator_game_state`
- Client switches between rendering modes without switching sockets

**Risk:** Major refactor, but cleaner long-term

---

#### Solution D: Debug Socket Event Registration
**Approach:**
- Add logging to verify socket.on() handlers are registered
- Check if double cleanup is causing handlers to be removed
- Ensure game_state handler exists when match starts
- Possibly move handler registration to different lifecycle

**Risk:** Might reveal the real bug is somewhere else

---

#### Solution E: Delay Match Creation After Spectating
**Approach:**
- Add artificial 1-2 second delay before allowing new match creation
- Give time for all cleanup to complete
- Show "Reconnecting..." spinner
- Wait for socket to stabilize

**Risk:** Bandaid solution, doesn't fix root cause

---

## 📝 Open Questions

1. Why do countdown and score events work but not game_state events?
2. Why does the cleanup effect fire twice even with `[user?.id]` dependency?
3. Is the spectator socket disconnect properly cleaning up server-side state?
4. Does the server know which socket ID to send game_state events to after spectating?
5. Is there a better way to share JWT auth between two sockets?
6. Should spectator and player use same socket with different "modes"?
7. Is React batching state updates incorrectly during transition?
8. Are we hitting a Socket.IO bug with multiple sockets per user?

---

## 🧪 Reproduction Steps

1. Start dev server: `npm run dev`
2. Login to client app
3. Open pong lobby
4. Run PVP load test: `node scripts/load-tests/tests/pong-pvp-load.cjs`
5. Click "Spectate" on any active match
6. Watch match until it ends (auto-return to lobby after 3s)
7. Verify player count shows correctly (21 players)
8. Click "Play AI" and create match with any difficulty
9. Wait for countdown (3, 2, 1, GO!)
10. **BUG:** Canvas stuck on "GO!", ball not visible, paddle not responding
11. User loses 0-5, never returned to lobby

---

## 🔗 Related Files

### Client Files
- `apps/client/src/components/pong/PongGame.tsx` - Main orchestration
- `apps/client/src/components/pong/PongCanvas.tsx` - Game rendering
- `apps/client/src/components/pong/PongSpectator.tsx` - Spectator view
- `apps/client/src/hooks/usePongSocket.ts` - Main player socket
- `apps/client/src/hooks/usePongSpectator.ts` - Spectator socket

### Server Files
- `apps/pong-server/src/server.ts` - Socket.IO server, StatisticsManager

### Type Files
- `packages/types/src/api/socket/payloads.ts` - Event type definitions

---

## 📚 Commit History for This Bug

All fixes attempted in session on 2025-10-26:
1. StatisticsManager multi-socket support
2. Remove duplicate PongHeader
3. Send player names in spectator_joined
4. Expose spectator state to header
5. Show winner name for spectators
6. Skip leaveMatch when spectating
7. Add key props (reverted)
8. Stabilize handleBackToLobby
9. Change cleanup dependency to user?.id

---

## 💡 Final Thoughts

This bug is deeper than initially thought. The symptoms (stuck on "GO!") suggest a fundamental issue with how the socket connection state is managed when transitioning between spectating and playing modes. The double cleanup log is the smoking gun - something is causing `usePongSocket` to remount when it shouldn't.

The spectator architecture might need a complete redesign. Having two separate sockets for the same user is causing unexpected interactions, even though they should be isolated. Consider consolidating to a single socket with different "modes" or implement more robust state isolation between the two sockets.

---

**Last Updated:** 2025-10-26 21:58 PST
