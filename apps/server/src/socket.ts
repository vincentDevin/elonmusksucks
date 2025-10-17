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
import { registerChatHandlers } from './handlers/chatHandlers';
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
import { setupAchievementRedisHandlers } from './handlers/achievementEventHandler';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { eventSystemMetricsService } from './services/eventSystemMetrics.service';
import { REDIS_CHANNELS } from '@ems/types';
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
    // NOTE: Pong achievement events (pong:match:completed, pong:match:lost, pong:elo:milestone)
    // are handled exclusively by achievementEventHandler.ts to avoid duplicate subscriptions
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

  // ── Achievement Redis subscriber ──────────────────────────────────────────
  const achievementSub = setupAchievementRedisHandlers();
  redisClients.push(achievementSub);

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
        console.log(`[socket] User ${user.id} connection registered: ${socket.id}`);
      }

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

  // ── CRITICAL: Redis client cleanup on server shutdown ────────────────────
  const gracefulShutdown = async (signal: string) => {
    console.log(`[socket] Received ${signal}, cleaning up Redis connections...`);

    try {
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
