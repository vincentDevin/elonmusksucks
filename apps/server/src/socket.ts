// apps/server/src/socket.ts
// -----------------------------------------------------------------------------
// Main Socket.IO server bootstrap with Redis adapter + event subscriptions.
// Updated to use **present‑tense** Redis channels and drops unused
// RoomHandlers for now.
// -----------------------------------------------------------------------------

import { type Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisClient from './lib/redis';
import { socketAuthMiddleware } from './middleware/socketAuthMiddleware';
import { registerChatHandlers } from './handlers/chatHandlers';
import { registerBetHandlers } from './handlers/betSocketHandlers';
import { registerRedisEventHandlers } from './handlers/redisEventHandlers';
import { registerRedisChatHandlers } from './handlers/redisChatEventHandlers';
import { registerModerationHandlers } from './handlers/moderationHandlers';
import { registerStatisticsRedisHandlers } from './handlers/statisticsSocketHandlers';
import { setupUnifiedActivityHandlers } from './handlers/unifiedActivityHandlers';
import { registerTimelineHandlers } from './handlers/timelineHandlers';
import { registerPongHandlers, registerPongRedisHandlers } from './handlers/pongSocketHandlers';
// import { registerRoomHandlers } from './handlers/roomHandlers'; // future rooms

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function getAllowedOrigins(): string[] {
  const env = process.env.CLIENT_URL;
  const dev = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  return env && !dev.includes(env) ? [env, ...dev] : dev;
}

export async function initSocket(httpServer: HTTPServer) {
  const io = new IOServer(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

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
    'prediction:create',
    'prediction:resolve',
    'bet:place',
    'parlay:place',
    'leaderboard:allTime',
    'leaderboard:daily',
    // Stats and ranking events
    'stats:update',
    'stats:refresh',
    'ranking:change',
    'achievement:unlocked',
    'user:stats_update',
    // Bet and parlay status events
    'bet:status_change',
    'parlay:status_change',
    // Admin metrics events
    'admin:metrics:update',
    // NOTE: Removed 'activity:newsflash' - now handled by unified activity system
    // Moderation events
    'moderation:userBan',
    'moderation:userUnban',
    'moderation:userMute',
    'moderation:userKick',
    'moderation:messageDelete',
    'moderation:postDelete',
    'user:activity',
    // Timeline events
    'feed:article:new',
    'admin:moderation:bulk',
    'admin:retagging:bulk',
    'admin:feed:refresh',
    'timeline:articles:new',
    // Pong events
    'pong:elo:update',
    'pong:tier:change',
    'pong:stats:update',
    'pong:leaderboard:update',
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

  // ── Timeline event handlers ───────────────────────────────────────────────
  registerTimelineHandlers(io);

  // ── Chat event subscriptions ──────────────────────────────────────────────
  const chatSub = redisClient.duplicate();
  redisClients.push(chatSub);
  registerRedisChatHandlers(io, chatSub);

  // ── Auth middleware must run before per‑socket handlers ───────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);
    try {
      const user = (socket as any).user;

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

      // registerRoomHandlers(io, socket); // Uncomment when multi‑room is live
      registerChatHandlers(socket);
      registerBetHandlers(socket);
      registerModerationHandlers(socket);
      registerPongHandlers(socket);
      setupUnifiedActivityHandlers(socket);
    } catch (err) {
      console.error('[socket] handler error:', err);
    }
  });

  io.on('error', (err) => console.error('[socket.io] SERVER ERROR:', err));

  // ── CRITICAL: Redis client cleanup on server shutdown ────────────────────
  const gracefulShutdown = async (signal: string) => {
    console.log(`[socket] Received ${signal}, cleaning up Redis connections...`);

    try {
      // Close Socket.IO server first
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
