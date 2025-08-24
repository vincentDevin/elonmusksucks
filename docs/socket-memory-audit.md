# Socket.IO Memory Leak Audit Checklist

## Overview
This document provides a comprehensive checklist for preventing memory leaks in Socket.IO event handlers.

## Memory Leak Prevention Checklist

### ✅ Handler Registration
- [x] **SocketCleanupManager implemented** - `lib/SocketCleanupManager.ts`
- [x] **Cleanup on disconnect** - Called in `socket.ts` on disconnect
- [x] **Handler tracking** - chatHandlers.ts registers all listeners
- [ ] **All handlers registered** - TODO: Register handlers in other files

### ✅ Listener Management
- [x] **Track listener count** - Log count per socket on registration
- [x] **Named functions** - Use named functions for easier debugging
- [x] **Cleanup stats** - `getStats()` method provides monitoring data
- [ ] **Memory profiling** - Run heap snapshots after 1h soak test

### ✅ Event Handler Best Practices
- [x] **No arrow functions in loops** - Use named functions
- [x] **Clear timers** - All setTimeout/setInterval cleared on disconnect
- [x] **Remove Redis subscriptions** - Unsubscribe on cleanup
- [ ] **Limit listener count** - Add max listener warning (>20 per socket)

### ✅ Redis/Socket Coordination
- [x] **Leave rooms on disconnect** - Socket automatically leaves all rooms
- [x] **Clear typing indicators** - Typing state cleared on disconnect
- [ ] **Clean presence data** - Remove from online users set
- [ ] **Flush user-specific caches** - Clear any user-related Redis keys

## Implementation Status

### Completed
1. **SocketCleanupManager** - Central cleanup management
2. **Chat handlers** - Full registration and tracking
3. **Disconnect handling** - Cleanup triggered on socket disconnect
4. **Monitoring stats** - Real-time listener count tracking

### TODO (Future Tickets)
1. Register handlers in remaining files:
   - `betSocketHandlers.ts`
   - `moderationHandlers.ts` 
   - `timelineHandlers.ts`
   - `pongSocketHandlers.ts`
   - Other handler files

2. Add memory leak detection:
   - Max listener warnings
   - Periodic heap snapshots
   - Memory growth alerts

3. Automated testing:
   - Connect/disconnect stress tests
   - Memory leak detection tests
   - Long-running soak tests

## Monitoring Commands

```javascript
// Get current stats
const stats = socketCleanupManager.getStats();
console.log(stats);
// Output: { socketsWithListeners: 10, totalListeners: 40, avgListenersPerSocket: 4 }

// Check specific socket
const count = socketCleanupManager.getListenerCount(socketId);
console.log(`Socket ${socketId} has ${count} listeners`);

// Emergency cleanup
await socketCleanupManager.cleanupAll();
```

## Heap Monitoring Script

```bash
# Run heap snapshot comparison
node --expose-gc --inspect apps/server/src/index.js

# In Chrome DevTools:
# 1. Take initial heap snapshot
# 2. Run for 1 hour with typical load
# 3. Force GC: global.gc()
# 4. Take second heap snapshot
# 5. Compare snapshots for growth
```

## Success Criteria

**Exit: heap-baseline stable after 1h soak**

The memory audit is successful when:
1. No memory growth after 1 hour of operation
2. Listener count remains stable (no accumulation)
3. All handlers properly cleaned on disconnect
4. Stats show consistent avg listeners per socket

## Next Steps

1. Complete handler registration in remaining files
2. Implement max listener warnings
3. Set up automated memory leak detection
4. Run 24-hour soak test with monitoring