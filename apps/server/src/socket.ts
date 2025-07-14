// apps/server/src/socket.ts
import { type Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisClient from './lib/redis';
import { socketAuthMiddleware } from './middleware/socketAuthMiddleware';
import { registerRoomHandlers } from './handlers/roomHandlers';
import { registerChatHandlers } from './handlers/chatHandlers';
import { registerRedisEventHandlers } from './handlers/redisEventHandlers';
import { registerRedisChatHandlers } from './handlers/redisChatEventHandlers';

// Utility to make allowed origins robust for both dev and prod
function getAllowedOrigins(): string[] {
  const envOrigin = process.env.CLIENT_URL;
  // Default to both localhost and 127.0.0.1 for developer convenience
  const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (envOrigin && !devOrigins.includes(envOrigin)) {
    return [envOrigin, ...devOrigins];
  }
  return devOrigins;
}

export async function initSocket(httpServer: HTTPServer) {
  const allowedOrigins = getAllowedOrigins();
  console.log('[socket] Allowed origins for CORS:', allowedOrigins);

  const io = new IOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // --- Redis adapter setup ---
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[socket] Redis adapter attached');

  // --- Redis event subscription/handler ---
  const eventSub = redisClient.duplicate();
  await eventSub.subscribe(
    'prediction:resolved',
    'bet:placed',
    'parlay:placed',
    'leaderboard:allTime',
    'leaderboard:daily',
  );
  registerRedisEventHandlers(io, eventSub);

  // --- Chat Redis subscription ---
  const chatEventSub = redisClient.duplicate();
  await registerRedisChatHandlers(io, chatEventSub);

  // --- Auth middleware BEFORE connection handlers ---
  io.use(socketAuthMiddleware);

  // --- Socket.IO connection ---
  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);

    try {
      registerRoomHandlers(io, socket);
      registerChatHandlers(socket);
    } catch (err) {
      console.error('[socket] handler error:', err);
    }

    socket.on('disconnect', () => {
      console.log('[socket] client disconnected:', socket.id);
    });
  });

  // Top-level error handler for the socket server (optional, but nice)
  io.on('error', (err) => {
    console.error('[socket.io] SERVER ERROR:', err);
  });

  return io;
}
