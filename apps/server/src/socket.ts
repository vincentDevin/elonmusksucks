// apps/server/src/socket.ts
import { type Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisClient from './lib/redis';

/**
 * Initializes Socket.IO on the given HTTP server.
 * Sets up Redis adapter for pub/sub and hooks various real-time events.
 */
export async function initSocket(httpServer: HTTPServer) {
  const io = new IOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // --- Redis adapter setup (duplicates auto-connect) ---
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[socket] Redis adapter attached');

  // --- Subscribe to event channels ---
  const eventSub = redisClient.duplicate();
  // no explicit connect(); subscribe will queue and auto-connect under the hood
  await eventSub.subscribe(
    'prediction:resolved',
    'bet:placed',
    'parlay:placed',
    'leaderboard:allTime',
    'leaderboard:daily',
  );
  eventSub.on('message', (channel, message) => {
    const payload = JSON.parse(message);
    switch (channel) {
      case 'prediction:resolved':
        io.emit('predictionResolved', payload);
        break;
      case 'bet:placed':
        io.emit('betPlaced', payload);
        break;
      case 'parlay:placed':
        io.emit('parlayPlaced', payload);
        break;
      case 'leaderboard:allTime':
        io.emit('leaderboardAllTime', payload);
        break;
      case 'leaderboard:daily':
        io.emit('leaderboardDaily', payload);
        break;
      default:
        break;
    }
  });

  // --- Connection & room handlers ---
  io.on('connection', (socket) => {
    console.log('[socket] client connected:', socket.id);

    socket.on('joinRoom', (room: string) => {
      socket.join(room);
      console.log(`[socket] ${socket.id} joined ${room}`);
    });

    socket.on('leaveRoom', (room: string) => {
      socket.leave(room);
      console.log(`[socket] ${socket.id} left ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('[socket] client disconnected:', socket.id);
    });
  });

  return io;
}
