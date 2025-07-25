// apps/server/src/handlers/redisEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket fan‑out for core domain events (present‑tense only).
// -----------------------------------------------------------------------------

import { Server } from 'socket.io';

export type RedisChannel =
  | 'prediction:create'
  | 'prediction:resolve'
  | 'bet:place'
  | 'parlay:place'
  | 'leaderboard:allTime'
  | 'leaderboard:daily'
  | 'activity:newsflash'
  | 'activity:newsflash:normalized';

export function registerRedisEventHandlers(io: Server, eventSub: any) {
  eventSub.on('message', (channel: RedisChannel, message: string) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message);
    } catch {
      console.error(`[socket] Failed to parse payload for ${channel}`);
      return;
    }

    switch (channel) {
      case 'prediction:create':
        io.emit('predictionCreated', payload);
        break;
      case 'prediction:resolve':
        io.emit('predictionResolved', payload);
        break;
      case 'bet:place':
        io.emit('betPlaced', payload);
        break;
      case 'parlay:place':
        io.emit('parlayPlaced', payload);
        break;
      case 'leaderboard:allTime':
        io.emit('leaderboardAllTime', payload);
        break;
      case 'leaderboard:daily':
        io.emit('leaderboardDaily', payload);
        break;
      case 'activity:newsflash':
        io.emit('activityNewsflash', payload);
        break;
      case 'activity:newsflash:normalized':
        io.emit('activityNewsflash:normalized', payload);
        break;
      default:
        console.warn('[socket] Unhandled Redis channel', channel);
    }
  });
}
