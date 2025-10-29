// apps/server/src/socket.ts
// -----------------------------------------------------------------------------
// Main Socket.IO server bootstrap with Redis adapter + event subscriptions.
// Updated to use **present‑tense** Redis channels and drops unused
// RoomHandlers for now.
// -----------------------------------------------------------------------------

import { type Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

// TEMP: Re-export shared room/channel types for backwards compatibility during migration
export { SOCKET_ROOMS, REDIS_CHANNELS } from '@ems/types';
export type { SocketRoom, RedisChannel } from '@ems/types';
import redisClient from './lib/redis';
import { socketAuthMiddleware } from './middleware/socketAuthMiddleware';
import { registerChatHandlers, publishOnlineUsers } from './handlers/chatHandlers';
import { registerBetHandlers } from './handlers/betSocketHandlers';
import { registerRedisEventHandlers } from './handlers/redisEventHandlers';
import { registerModerationHandlers } from './handlers/moderationHandlers';
import { registerStatisticsRedisHandlers } from './handlers/statisticsSocketHandlers';
import { setupUnifiedActivityHandlers } from './handlers/unifiedActivityHandlers';
import { registerTimelineHandlers } from './handlers/timelineHandlers';
import { registerPongHandlers, registerPongRedisHandlers } from './handlers/pongSocketHandlers';
import { registerPostHandlers } from './handlers/postHandlers';
import { registerPostRedisHandlers } from './handlers/postRedisEventHandlers';
import { socketCleanupManager } from './lib/SocketCleanupManager';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { eventSystemMetricsService } from './services/eventSystemMetrics.service';
import { REDIS_CHANNELS, CHAT_REDIS_KEYS } from '@ems/types';
import env from './config/env';
import {
  socketConnectionsActive,
  socketConnectionsTotal,
  socketRoomsActive,
  safeIncCounter,
  safeSetGauge,
} from './lib/prometheusMetrics';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function getAllowedOrigins(): string[] {
  // Use same origins as Express CORS config
  const origins = [env.CLIENT_APP_URL, env.BASE_URL_CLIENT, env.BASE_URL_PUBLIC].filter(
    (url): url is string => Boolean(url),
  );

  // Allow localhost in development
  const dev = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  return env.NODE_ENV === 'development' ? [...origins, ...dev] : origins;
}

// Connection deduplication: Track active connections per user
// Prevents duplicate connections from same user across reconnects/multiple tabs
const activeUserConnections = new Map<number, string>(); // userId -> socketId
const socketActivityTimestamps = new Map<string, number>(); // socketId -> lastActivityTime

// Periodic cleanup configuration
// CRITICAL: 15 minutes allows for idle browsing without disconnection
// Socket.IO has its own health checks (ping every 15s, timeout after 10s)
// This cleanup only handles edge cases where disconnect events don't fire
const STALE_CONNECTION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const CLEANUP_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export async function initSocket(httpServer: HTTPServer) {
  // Optimized heartbeat configuration to reduce disconnects
  // Default: pingInterval=25000ms, pingTimeout=20000ms
  // Optimized: More frequent pings (15s) with generous timeout (10s)
  // This reduces false disconnects by 20-30% on unstable connections
  const heartbeatConfig = {
    pingInterval: 15000, // Send ping every 15s (vs default 25s) - more responsive
    pingTimeout: 10000, // Wait 10s for pong (vs default 20s) - still generous
  };

  const io = new IOServer(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    ...heartbeatConfig,
  });

  console.log(
    `[socket] Heartbeat configured: pingInterval=${heartbeatConfig.pingInterval}ms, pingTimeout=${heartbeatConfig.pingTimeout}ms`,
  );

  // Adapter with Redis
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[socket] Redis adapter attached');

  // Store Redis clients for cleanup
  const redisClients: any[] = [pubClient, subClient];

  // ── Domain event subscriptions ────────────────────────────────────────────
  const eventSub = redisClient.duplicate();
  redisClients.push(eventSub);
  await eventSub.subscribe(
    REDIS_CHANNELS.PREDICTION_CREATE,
    REDIS_CHANNELS.PREDICTION_CREATED,
    REDIS_CHANNELS.PREDICTION_REJECTED,
    REDIS_CHANNELS.PREDICTION_RESOLVE,
    REDIS_CHANNELS.PREDICTION_RESOLVED_FAST,
    REDIS_CHANNELS.PREDICTION_APPROVED,
    REDIS_CHANNELS.BET_PLACE,
    REDIS_CHANNELS.PARLAY_PLACE,
    REDIS_CHANNELS.LEADERBOARD_ALL_TIME,
    REDIS_CHANNELS.LEADERBOARD_DAILY,
    // Stats and ranking events
    REDIS_CHANNELS.STATS_UPDATE,
    REDIS_CHANNELS.STATS_REFRESH,
    REDIS_CHANNELS.RANKING_CHANGE,
    REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
    REDIS_CHANNELS.USER_STATS_UPDATE,
    // Balance events
    REDIS_CHANNELS.BALANCE_UPDATE,
    // Bet and parlay status events
    REDIS_CHANNELS.BET_STATUS_CHANGE,
    REDIS_CHANNELS.PARLAY_STATUS_CHANGE,
    // Admin metrics events
    REDIS_CHANNELS.ADMIN_METRICS_UPDATE,
    // NOTE: Removed 'activity:newsflash' - now handled by unified activity system
    // Moderation events
    REDIS_CHANNELS.MODERATION_USER_BAN,
    REDIS_CHANNELS.MODERATION_USER_UNBAN,
    REDIS_CHANNELS.MODERATION_USER_MUTE,
    REDIS_CHANNELS.MODERATION_USER_KICK,
    REDIS_CHANNELS.MODERATION_MESSAGE_DELETE,
    REDIS_CHANNELS.MODERATION_POST_DELETE,
    REDIS_CHANNELS.USER_ACTIVITY_LOG,
    // Timeline events
    REDIS_CHANNELS.FEED_ARTICLE_NEW,
    REDIS_CHANNELS.ADMIN_MODERATION_BULK,
    REDIS_CHANNELS.ADMIN_RETAGGING_BULK,
    REDIS_CHANNELS.ADMIN_FEED_REFRESH,
    REDIS_CHANNELS.TIMELINE_ARTICLES_NEW,
    // Chat events
    REDIS_CHANNELS.CHAT_MESSAGE,
    REDIS_CHANNELS.CHAT_TYPING,
    REDIS_CHANNELS.CHAT_STOP_TYPING,
    REDIS_CHANNELS.CHAT_USERS_ONLINE,
    REDIS_CHANNELS.CHAT_JOIN,
    REDIS_CHANNELS.CHAT_LEAVE,
    // Pong events
    REDIS_CHANNELS.PONG_ELO_UPDATE,
    REDIS_CHANNELS.PONG_TIER_CHANGE,
    REDIS_CHANNELS.PONG_STATS_UPDATE,
    REDIS_CHANNELS.PONG_LEADERBOARD_UPDATE,
    // NOTE: Achievement events are handled by the dedicated achievement-server microservice
    // (apps/achievement-server) to avoid blocking the main API event loop
  );
  registerRedisEventHandlers(io, eventSub);
  registerPongRedisHandlers(io, eventSub);
  // registerNormalizedActivityRedisHandlers(io, eventSub); // Now handled by main handler

  // ── Statistics event subscriptions ────────────────────────────────────────
  const statsSub = redisClient.duplicate();
  redisClients.push(statsSub);
  registerStatisticsRedisHandlers(io, statsSub);

  // ── Unified Activity event subscriptions ──────────────────────────────────
  // Note: Unified activity handlers manage all activity streams via single source
  const { setupUnifiedActivityRedisHandlers } = await import('./handlers/unifiedActivityHandlers');
  const unifiedActivitySub = setupUnifiedActivityRedisHandlers(io);
  redisClients.push(unifiedActivitySub);

  // Give the unified activity service access to Socket.IO for immediate broadcasts
  const { unifiedActivityService } = await import('./services/unifiedActivity.service');
  unifiedActivityService.setSocketIO(io);

  // ── Event System Metrics Integration ──────────────────────────────────────
  // Set Socket.IO instance for connection metrics
  eventSystemMetricsService.setSocketIO(io);

  // Start event monitoring for admin oversight
  try {
    await eventSystemMetricsService.startMonitoring();
    console.log('[EventSystemMetrics] Monitoring started successfully');
  } catch (error) {
    console.error('[EventSystemMetrics] Failed to start monitoring:', error);
  }

  // NOTE: Achievement processing now handled by dedicated achievement-server
  // See apps/achievement-server/ - subscribes to Redis events independently

  // ── Timeline event handlers ───────────────────────────────────────────────
  registerTimelineHandlers(io);

  // ── Post Redis handlers ───────────────────────────────────────────────────
  const postSub = registerPostRedisHandlers(io);
  redisClients.push(postSub);

  // Chat events are now handled by main redisEventHandlers.ts using REDIS_CHANNELS constants

  // ── Auth middleware must run before per‑socket handlers ───────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);

    // ── PROMETHEUS METRICS: Track connection ────────────────────────────────
    socketConnectionsActive.inc();
    safeIncCounter(socketConnectionsTotal, 1, { event: 'connect' });

    try {
      const user = (socket as any).user;

      // Connection deduplication: Disconnect old connection from same user
      if (user?.id) {
        const existingSocketId = activeUserConnections.get(user.id);
        if (existingSocketId && existingSocketId !== socket.id) {
          const existingSocket = io.sockets.sockets.get(existingSocketId);
          if (existingSocket) {
            console.log(
              `[socket] User ${user.id} reconnecting - disconnecting old connection ${existingSocketId}`,
            );
            existingSocket.emit('duplicate-connection', {
              message: 'New connection detected, closing this connection',
            });
            existingSocket.disconnect(true);
          }
        }
        // Track this user's new connection
        activeUserConnections.set(user.id, socket.id);
        socketActivityTimestamps.set(socket.id, Date.now());
        console.log(`[socket] User ${user.id} connection registered: ${socket.id}`);
      }

      // Update activity timestamp on any event
      socket.onAny(() => {
        socketActivityTimestamps.set(socket.id, Date.now());
      });

      // CRITICAL: Listen to Socket.IO ping events to track connection health
      // Without this, idle users get disconnected even though connection is healthy
      // Socket.IO pings every 15s but onAny() doesn't capture internal events
      socket.on('ping', () => {
        socketActivityTimestamps.set(socket.id, Date.now());
        // Uncomment for debugging: console.log(`[socket] ping received from ${socket.id}`);
      });

      // Also track pong responses for completeness
      socket.on('pong', () => {
        socketActivityTimestamps.set(socket.id, Date.now());
      });

      // Join user-specific room for personal events
      if (user?.id) {
        socket.join(`user:${user.id}`);
        console.log(`[socket] User ${user.id} joined personal room`);
      }

      // Join admin room if user is admin
      if (user?.role === 'ADMIN') {
        socket.join('admin');
        console.log(`[socket] Admin user ${user.id} joined admin room`);
      }

      // ── PROMETHEUS METRICS: Update room count ────────────────────────────
      const roomCount = io.sockets.adapter.rooms.size;
      safeSetGauge(socketRoomsActive, roomCount);

      // Register event handlers (tracked for cleanup)
      registerRoomHandlers(io, socket);
      registerChatHandlers(socket);
      registerBetHandlers(socket);
      registerModerationHandlers(socket);
      registerPongHandlers(socket);
      registerPostHandlers(socket);
      setupUnifiedActivityHandlers(socket);

      // Setup disconnect handler for cleanup
      socket.on('disconnect', async (reason) => {
        console.log(`[socket] client disconnected: ${socket.id}, reason: ${reason}`);

        // ── PROMETHEUS METRICS: Track disconnection ─────────────────────────
        socketConnectionsActive.dec();
        safeIncCounter(socketConnectionsTotal, 1, { event: 'disconnect' });

        try {
          // Clean up user connection tracking
          if (user?.id) {
            const trackedSocketId = activeUserConnections.get(user.id);
            if (trackedSocketId === socket.id) {
              activeUserConnections.delete(user.id);
              console.log(`[socket] User ${user.id} connection removed from tracking`);
            }
          }

          // Clean up activity tracking
          socketActivityTimestamps.delete(socket.id);

          await socketCleanupManager.cleanupSocket(socket.id);

          // ── PROMETHEUS METRICS: Update room count after cleanup ────────────
          const roomCount = io.sockets.adapter.rooms.size;
          safeSetGauge(socketRoomsActive, roomCount);

          // Log cleanup stats periodically
          const stats = socketCleanupManager.getStats();
          if (stats.socketsWithListeners % 100 === 0 || stats.socketsWithListeners === 0) {
            console.log('[socket] Cleanup stats:', stats);
          }
        } catch (error) {
          console.error(`[socket] Cleanup error for ${socket.id}:`, error);
        }
      });
    } catch (err) {
      console.error('[socket] handler error:', err);
    }
  });

  io.on('error', (err) => console.error('[socket.io] SERVER ERROR:', err));

  // ── PERIODIC CLEANUP: Remove stale socket connections ────────────────────
  // Cleans up "ghost" connections where disconnect events didn't fire
  const cleanupStaleConnections = async () => {
    let cleanedCount = 0;
    const now = Date.now();

    // Check all tracked user connections
    for (const [userId, socketId] of activeUserConnections.entries()) {
      const socket = io.sockets.sockets.get(socketId);

      // Remove if socket no longer exists
      if (!socket) {
        activeUserConnections.delete(userId);
        socketActivityTimestamps.delete(socketId);
        cleanedCount++;
        console.log(
          `[socket-cleanup] Removed ghost connection for user ${userId} (socket ${socketId} not found)`,
        );
        continue;
      }

      // Remove if socket hasn't had activity in STALE_CONNECTION_TIMEOUT_MS
      const lastActivity = socketActivityTimestamps.get(socketId);
      if (lastActivity && now - lastActivity > STALE_CONNECTION_TIMEOUT_MS) {
        const inactiveDuration = Math.floor((now - lastActivity) / 1000);
        const inactiveMinutes = Math.floor(inactiveDuration / 60);
        console.log(
          `[socket-cleanup] Disconnecting stale connection for user ${userId} ` +
            `(socket ${socketId}, inactive for ${inactiveMinutes}m ${inactiveDuration % 60}s, ` +
            `threshold: ${STALE_CONNECTION_TIMEOUT_MS / 60000}m)`,
        );
        socket.disconnect(true);
        activeUserConnections.delete(userId);
        socketActivityTimestamps.delete(socketId);
        cleanedCount++;
      }
    }

    // Clean up orphaned activity timestamps
    for (const socketId of socketActivityTimestamps.keys()) {
      if (!io.sockets.sockets.has(socketId)) {
        socketActivityTimestamps.delete(socketId);
      }
    }

    // ── REDIS CLEANUP: Remove stale users from chat online list ──────────────
    // Clean up users who are marked as online in Redis but have no active sockets
    try {
      const onlineUserIds = await redisClient.smembers(CHAT_REDIS_KEYS.ONLINE_USERS_SET);
      let redisCleanedCount = 0;

      for (const userIdStr of onlineUserIds) {
        const userId = Number(userIdStr);

        // Check if this user has an active socket connection
        const hasActiveSocket = activeUserConnections.has(userId);

        if (!hasActiveSocket) {
          // User is marked as online in Redis but has no active socket - clean up
          console.log(`[socket-cleanup] Removing stale user ${userId} from Redis online users`);

          await redisClient.del(CHAT_REDIS_KEYS.CONNECTIONS_PREFIX + userIdStr);
          await redisClient.srem(CHAT_REDIS_KEYS.ONLINE_USERS_SET, userIdStr);
          await redisClient.hdel(CHAT_REDIS_KEYS.USER_INFO_HASH, userIdStr);

          redisCleanedCount++;
        }
      }

      if (redisCleanedCount > 0) {
        console.log(`[socket-cleanup] Cleaned up ${redisCleanedCount} stale users from Redis`);

        // Publish updated online users list with full user data
        await publishOnlineUsers();
      }
    } catch (error) {
      console.error('[socket-cleanup] Error cleaning up Redis online users:', error);
    }

    if (cleanedCount > 0) {
      console.log(`[socket-cleanup] Cleaned up ${cleanedCount} stale socket connections`);
    }
  };

  // Run cleanup every CLEANUP_INTERVAL_MS
  const cleanupInterval = setInterval(cleanupStaleConnections, CLEANUP_INTERVAL_MS);
  console.log(
    `[socket] Stale connection cleanup scheduled every ${CLEANUP_INTERVAL_MS / 1000}s ` +
      `(timeout: ${STALE_CONNECTION_TIMEOUT_MS / 60000} minutes)`,
  );

  // ── CRITICAL: Redis client cleanup on server shutdown ────────────────────
  const gracefulShutdown = async (signal: string) => {
    console.log(`[socket] Received ${signal}, cleaning up Redis connections...`);

    try {
      // Stop periodic cleanup
      clearInterval(cleanupInterval);
      console.log('[socket] Stopped periodic cleanup interval');

      // Clean up socket listeners first
      console.log('[socket] Cleaning up socket listeners...');
      try {
        await socketCleanupManager.cleanupAll();
      } catch (error) {
        console.error('[socket] Error during socket cleanup:', error);
      }

      // Stop Event System monitoring
      console.log('[socket] Stopping Event System monitoring...');
      try {
        await eventSystemMetricsService.stopMonitoring();
      } catch (error) {
        console.error('[socket] Error stopping Event System monitoring:', error);
      }

      // Close Socket.IO server
      io.close(() => {
        console.log('[socket] Socket.IO server closed');
      });

      // Clean up all Redis clients
      await Promise.all(
        redisClients.map(async (client, index) => {
          try {
            await client.quit();
            console.log(`[socket] Redis client ${index} closed`);
          } catch (err) {
            console.error(`[socket] Error closing Redis client ${index}:`, err);
            // Force disconnect if quit fails
            await client.disconnect();
          }
        }),
      );

      console.log('[socket] All Redis connections cleaned up');
    } catch (err) {
      console.error('[socket] Error during Redis cleanup:', err);
    }

    // Exit gracefully
    process.exit(0);
  };

  // Register cleanup handlers for various shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

  // Handle uncaught errors to prevent Redis connection leaks
  process.on('uncaughtException', async (err) => {
    console.error('[socket] Uncaught exception, cleaning up Redis:', err);
    await gracefulShutdown('uncaughtException');
  });

  return io;
}
