// apps/server/src/handlers/redisEventHandlers.ts
import { Server } from 'socket.io';

type RedisChannel =
  | 'prediction:created'
  | 'prediction:resolved'
  | 'bet:placed'
  | 'parlay:placed'
  | 'leaderboard:allTime'
  | 'leaderboard:daily';

export function registerRedisEventHandlers(io: Server, eventSub: any) {
  eventSub.on('message', (channel: RedisChannel, message: string) => {
    let payload: any;
    try {
      payload = JSON.parse(message);
    } catch (e) {
      console.error(`[socket] Failed to parse message for channel "${channel}":`, message);
      return;
    }
    // Debug log every event and payload
    console.log(`[socket] Redis event: ${channel}`, payload);

    switch (channel) {
      case 'prediction:created':
        io.emit('predictionCreated', payload);
        break;
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
        console.warn(`[socket] Unknown Redis event: ${channel}`);
        break;
    }
  });
}
