// apps/achievement-server/src/handlers/achievementEventHandler.ts
import redis from '../config/redis';
import { getAchievementEngine } from '../services/achievements/achievementEngineFactory.service';
import { REDIS_CHANNELS } from '@ems/types';
import type { AchievementEvent } from '@ems/types';

// Comprehensive list of Redis channels that should trigger achievement evaluation
const ACHIEVEMENT_CHANNELS = [
  // Betting events
  REDIS_CHANNELS.BET_PLACED,
  REDIS_CHANNELS.BET_WON,
  REDIS_CHANNELS.BET_LOST,
  REDIS_CHANNELS.PARLAY_PLACED,
  REDIS_CHANNELS.PARLAY_WON,
  REDIS_CHANNELS.PARLAY_LOST,
  REDIS_CHANNELS.PAYOUT_COMPLETED,

  // Pong events
  REDIS_CHANNELS.PONG_MATCH_COMPLETED,
  REDIS_CHANNELS.PONG_MATCH_LOST,
  REDIS_CHANNELS.PONG_ELO_UPDATE,
  REDIS_CHANNELS.PONG_ELO_MILESTONE,

  // User events
  REDIS_CHANNELS.USER_FOLLOWED,
  REDIS_CHANNELS.USER_BALANCE_SNAPSHOT,
  REDIS_CHANNELS.USER_DAILY_LOGIN,

  // Prediction events
  REDIS_CHANNELS.PREDICTION_CREATED,
  REDIS_CHANNELS.PREDICTION_APPROVED,
  REDIS_CHANNELS.PREDICTION_VIEWED,
  REDIS_CHANNELS.PREDICTION_FIRST_CORRECT_BET,
  REDIS_CHANNELS.PREDICTION_RESOLVED_FAST,
  REDIS_CHANNELS.PREDICTION_VIRAL,

  // Chat events
  REDIS_CHANNELS.CHAT_MESSAGE_SENT,

  // Leaderboard events
  REDIS_CHANNELS.LEADERBOARD_RANK_UPDATE,
  REDIS_CHANNELS.LEADERBOARD_POSITION_REACHED,
  REDIS_CHANNELS.LEADERBOARD_COMEBACK_MAJOR,
  REDIS_CHANNELS.LEADERBOARD_COMEBACK_MODERATE,

  // Streak events (from StreakManager)
  REDIS_CHANNELS.STREAK_UPDATED,
  REDIS_CHANNELS.STREAK_BROKEN,
  REDIS_CHANNELS.STREAK_MILESTONE_REACHED,
  REDIS_CHANNELS.STREAK_RESET,

  // Financial events (from FinancialTracker)
  REDIS_CHANNELS.BALANCE_MILESTONE_REACHED,
  REDIS_CHANNELS.BANKRUPTCY_DETECTED,
  REDIS_CHANNELS.RAGS_TO_RICHES,
  REDIS_CHANNELS.MASSIVE_LOSS_DETECTED,
  REDIS_CHANNELS.MASSIVE_GAIN_DETECTED,
  REDIS_CHANNELS.COMEBACK_DETECTED,
  REDIS_CHANNELS.PROFIT_SNAPSHOT_DAILY,

  // Complex event correlation (from EventCorrelator)
  REDIS_CHANNELS.EVENT_SEQUENCE_COMPLETED,
  REDIS_CHANNELS.PATTERN_MATCHED,
  REDIS_CHANNELS.ACHIEVEMENT_STATISTICAL_ANOMALY,
  REDIS_CHANNELS.ACHIEVEMENT_PROBABILITY_DEFIER,
  REDIS_CHANNELS.ACHIEVEMENT_YOLO_ALL_IN,
  REDIS_CHANNELS.ACHIEVEMENT_GALAXY_BRAIN_PARLAY,
  REDIS_CHANNELS.ACHIEVEMENT_PONG_COMEBACK,

  // Social events
  REDIS_CHANNELS.EMOJI_USED,
  REDIS_CHANNELS.THREAD_PARTICIPATION,

  // Time-based activity events
  REDIS_CHANNELS.ACTIVITY_TIME_PATTERN,
  REDIS_CHANNELS.ACTIVITY_SPEED_BURST,
] as const;

export function setupAchievementRedisHandlers() {
  const sub = redis.duplicate();
  sub.on('error', (e) => console.error('[AchievementServer] Redis error', e));

  // Subscribe to all achievement-relevant channels
  sub.subscribe(...ACHIEVEMENT_CHANNELS, (err, count) => {
    if (err) {
      console.error('[AchievementServer] Subscribe error', err);
    } else {
      console.log(`[AchievementServer] ✅ Subscribed to ${count} achievement channels`);
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
        payload: payload.payload || payload, // Extract nested payload or fallback to entire payload
      };

      console.log(
        `[AchievementServer] 📥 Processing ${achievementEvent.key} for user ${achievementEvent.userId}`,
      );

      // Process through achievement engine
      const engine = getAchievementEngine();
      const result = await engine.handle(achievementEvent);

      if (result.achievementsUnlocked > 0) {
        console.log(
          `[AchievementServer] 🎉 ${result.achievementsUnlocked} achievement(s) unlocked for user ${achievementEvent.userId}`,
        );
      }

      if (result.errors.length > 0) {
        console.warn(
          `[AchievementServer] ⚠️ ${result.errors.length} errors processing ${channel}:`,
          result.errors,
        );
      }
    } catch (err) {
      console.error(`[AchievementServer] ❌ Error handling ${channel}:`, err);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[AchievementServer] Shutting down Redis subscriber...');
    sub.disconnect();
  });

  return sub;
}
