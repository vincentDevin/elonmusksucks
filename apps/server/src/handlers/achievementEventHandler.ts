// apps/server/src/handlers/achievementEventHandler.ts
import { Server as SocketServer } from 'socket.io';
import redis from '../lib/redis';
import { getAchievementEngine } from '../services/AchievementEngineFactory';
import type { AchievementEvent } from '@ems/types';

// Comprehensive list of Redis channels that should trigger achievement evaluation
const ACHIEVEMENT_CHANNELS = [
  // Betting events
  'bet:placed',
  'bet:resolved',
  'bet:won',
  'bet:lost',
  'parlay:placed',
  'parlay:won',
  'parlay:lost',
  'payout:completed',

  // Pong events
  'pong:match:recorded',
  'pong:match:completed',
  'pong:match:lost',
  'pong:elo:update',
  'pong:elo:milestone',
  'pong:win:pvp',
  'pong:win:ai',

  // User events
  'user:login',
  'user:follow',
  'user:balance:snapshot',
  'user:streak:update',

  // Prediction events
  'prediction:created',
  'prediction:approved',
  'prediction:bet:placed',
  'prediction:bet:settled',
  'prediction:market:created',
  'prediction:market:settled',
  'prediction:resolved',

  // Chat events
  'chat:message:sent',
  'chat:typing:start',
  'chat:typing:stop',

  // Leaderboard events
  'leaderboard:rank:update',
  'leaderboard:daily:close',
  'leaderboard:weekly:close',
] as const;

export function setupAchievementRedisHandlers(io: SocketServer) {
  const sub = redis.duplicate();
  sub.on('error', (e) => console.error('[AchievementEventHandler] Redis error', e));

  // Subscribe to all achievement-relevant channels
  sub.subscribe(...ACHIEVEMENT_CHANNELS, (err, count) => {
    if (err) {
      console.error('[AchievementEventHandler] Subscribe error', err);
    } else {
      console.log(`[AchievementEventHandler] ✅ Subscribed to ${count} achievement channels`);
    }
  });

  sub.on('message', async (channel, message) => {
    try {
      // Parse the event payload
      const payload = JSON.parse(message);

      // Convert Redis channel event to AchievementEvent format
      const achievementEvent: AchievementEvent = {
        key: channel as any, // Channel name matches AchievementEventKey
        userId: payload.userId,
        occurredAt: payload.occurredAt || new Date().toISOString(),
        idempotencyKey: payload.idempotencyKey || `${channel}:${payload.userId}:${Date.now()}`,
        payload: payload,
      };

      console.log(
        `[AchievementEventHandler] 📥 Processing ${achievementEvent.key} for user ${achievementEvent.userId}`,
      );

      // Process through achievement engine
      const engine = getAchievementEngine(io);
      const result = await engine.handle(achievementEvent);

      if (result.achievementsUnlocked > 0) {
        console.log(
          `[AchievementEventHandler] 🎉 ${result.achievementsUnlocked} achievement(s) unlocked for user ${achievementEvent.userId}`,
        );
      }

      if (result.errors.length > 0) {
        console.warn(
          `[AchievementEventHandler] ⚠️ ${result.errors.length} errors processing ${channel}:`,
          result.errors,
        );
      }
    } catch (err) {
      console.error(`[AchievementEventHandler] ❌ Error handling ${channel}:`, err);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[AchievementEventHandler] Shutting down Redis subscriber...');
    sub.disconnect();
  });

  return sub;
}
