// apps/server/src/workers/achievementEventHandler.ts
import { Server as SocketServer } from 'socket.io';
import redis from '../lib/redis';
import { getAchievementEngine } from '../services/AchievementEngineFactory';

const CHANNELS = [
  'pong:match:completed',
  'pong:match:lost',
  'pong:elo:milestone',
  'prediction:bet:placed',
  'prediction:bet:settled',
  'prediction:market:created',
  'prediction:market:settled',
] as const;

export function setupAchievementRedisHandlers(io: SocketServer) {
  const sub = redis.duplicate();
  sub.on('error', (e) => console.error('[AchievementSub] Redis error', e));
  sub.subscribe(...CHANNELS, (err, count) => {
    if (err) console.error('[AchievementSub] Subscribe error', err);
    else console.log(`[AchievementSub] Subscribed to ${count} channels`);
  });

  sub.on('message', async (channel, message) => {
    try {
      const data = JSON.parse(message);
      const userId = data.userId ?? data.winnerId ?? data.playerId;
      const occurredAt = data.occurredAt ?? new Date().toISOString();
      const idempotencyKey = `${channel}-${data.matchId ?? data.betId ?? data.marketId ?? occurredAt}-${userId}`;
      const engine = getAchievementEngine(io);
      await engine.handle({
        key: channel as any,
        userId,
        occurredAt,
        idempotencyKey,
        payload: data,
      });
    } catch (err) {
      console.error(`[AchievementSub] Error handling ${channel}:`, err);
    }
  });

  return sub;
}
