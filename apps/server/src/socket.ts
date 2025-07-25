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
import { registerActivityTickerHandlers } from './handlers/activityTickerHandlers';
import { registerRedisEventHandlers } from './handlers/redisEventHandlers';
import { registerRedisChatHandlers } from './handlers/redisChatEventHandlers';
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

  // ── Domain event subscriptions ────────────────────────────────────────────
  const eventSub = redisClient.duplicate();
  await eventSub.subscribe(
    'prediction:create',
    'prediction:resolve',
    'bet:place',
    'parlay:place',
    'leaderboard:allTime',
    'leaderboard:daily',
    'activity:newsflash',
  );
  registerRedisEventHandlers(io, eventSub);

  // ── Chat event subscriptions ──────────────────────────────────────────────
  const chatSub = redisClient.duplicate();
  await registerRedisChatHandlers(io, chatSub);

  // ── Auth middleware must run before per‑socket handlers ───────────────────
  io.use(socketAuthMiddleware);

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);
    try {
      // registerRoomHandlers(io, socket); // Uncomment when multi‑room is live
      registerChatHandlers(socket);
      registerBetHandlers(socket);
      registerActivityTickerHandlers(socket);
    } catch (err) {
      console.error('[socket] handler error:', err);
    }
  });

  io.on('error', (err) => console.error('[socket.io] SERVER ERROR:', err));

  return io;
}
