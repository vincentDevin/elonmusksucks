// apps/server/src/handlers/redisEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket fan‑out for core domain events (present‑tense only).
// -----------------------------------------------------------------------------

import { Server } from 'socket.io';
import { SOCKET_ROOMS, REDIS_CHANNELS } from '@ems/types';
import type { RedisChannel, AchievementEvent } from '@ems/types';
import { getAchievementEngine } from '../services/AchievementEngineFactory';

// TEMP: Additional channels not yet moved to shared types
type ExtendedRedisChannel =
  | RedisChannel
  | 'bet:status_change'
  | 'parlay:status_change'
  | 'admin:metrics:update'
  | 'moderation:userBan'
  | 'moderation:userUnban'
  | 'moderation:userMute'
  | 'moderation:userKick'
  | 'moderation:messageDelete'
  | 'moderation:postDelete'
  | 'user:activity'
  | 'feed:article:new'
  | 'admin:moderation:bulk'
  | 'admin:retagging:bulk'
  | 'admin:feed:refresh'
  | 'timeline:articles:new'
  | 'pong:elo:update'
  | 'pong:tier:change'
  | 'pong:stats:update'
  | 'pong:match:completed'
  | 'pong:match:lost'
  | 'pong:elo:milestone';

export function registerRedisEventHandlers(io: Server, eventSub: any) {
  eventSub.on('message', async (channel: ExtendedRedisChannel, message: string) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message);
    } catch {
      console.error(`[socket] Failed to parse payload for ${channel}`);
      return;
    }

    switch (channel) {
      case REDIS_CHANNELS.PREDICTION_CREATE:
        io.to(SOCKET_ROOMS.PREDICTIONS).emit('predictionCreated', payload);
        break;
      case REDIS_CHANNELS.PREDICTION_RESOLVE:
        io.to(SOCKET_ROOMS.PREDICTIONS).emit('predictionResolved', payload);
        break;
      case REDIS_CHANNELS.BET_PLACE:
        io.to(SOCKET_ROOMS.BETTING).emit('betPlaced', payload);
        break;
      case REDIS_CHANNELS.PARLAY_PLACE:
        io.to(SOCKET_ROOMS.BETTING).emit('parlayPlaced', payload);
        break;
      case REDIS_CHANNELS.ODDS_UPDATE_ENHANCED:
        io.to(SOCKET_ROOMS.PREDICTIONS).emit('oddsUpdatedEnhanced', payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_ALL_TIME:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit('leaderboardAllTime', payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_DAILY:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit('leaderboardDaily', payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit('leaderboard:rankChange', payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_MILESTONE:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit('leaderboard:milestone', payload);
        break;

      // Stats and achievements events
      case 'stats:update':
        // Emit to specific user room if userId is in payload
        const statsPayload = payload as any;
        if (statsPayload.userId) {
          io.to(`user:${statsPayload.userId}`).emit('stats:update', payload);
        } else {
          io.emit('stats:update', payload);
        }
        break;
      case 'stats:refresh':
        const refreshPayload = payload as any;
        if (refreshPayload.userId) {
          io.to(`user:${refreshPayload.userId}`).emit('stats:refresh', payload);
        }
        break;
      case 'ranking:change':
        const rankingPayload = payload as any;
        if (rankingPayload.userId) {
          io.to(`user:${rankingPayload.userId}`).emit('ranking:change', payload);
        }
        io.emit('ranking:change', payload); // Also broadcast globally for leaderboard updates
        break;
      case 'achievement:unlocked':
        const achievementPayload = payload as any;
        if (achievementPayload.userId) {
          io.to(`user:${achievementPayload.userId}`).emit('achievement:unlocked', payload);
        }
        io.emit('achievement:unlocked', payload); // Also broadcast globally for activity feed
        break;
      case 'user:stats_update':
        const userStatsPayload = payload as any;
        if (userStatsPayload.userId) {
          io.to(`user:${userStatsPayload.userId}`).emit('user:stats_update', payload);
        }
        break;

      // Bet and parlay status events
      case 'bet:status_change':
        const betStatusPayload = payload as any;
        if (betStatusPayload.userId) {
          io.to(`user:${betStatusPayload.userId}`).emit('bet:status_change', payload);
        }
        break;
      case 'parlay:status_change':
        const parlayStatusPayload = payload as any;
        if (parlayStatusPayload.userId) {
          io.to(`user:${parlayStatusPayload.userId}`).emit('parlay:status_change', payload);
        }
        break;

      // Admin metrics event for real-time dashboard updates
      case 'admin:metrics:update':
        // Broadcast to admin room only
        io.to('admin').emit('admin:metrics:update', payload);
        break;

      // NOTE: 'activity:newsflash' removed - handled by unified activity system
      case 'moderation:userBan':
        io.emit('moderationUserBan', payload);
        // Emit to admin room specifically
        io.to('admin').emit('adminModerationUserBan', payload);
        break;
      case 'moderation:userUnban':
        io.emit('moderationUserUnban', payload);
        io.to('admin').emit('adminModerationUserUnban', payload);
        break;
      case 'moderation:userMute':
        io.emit('moderationUserMute', payload);
        io.to('admin').emit('adminModerationUserMute', payload);
        break;
      case 'moderation:userKick':
        io.emit('moderationUserKick', payload);
        io.to('admin').emit('adminModerationUserKick', payload);
        break;
      case 'moderation:messageDelete':
        io.emit('moderationMessageDelete', payload);
        io.to('admin').emit('adminModerationMessageDelete', payload);
        break;
      case 'moderation:postDelete':
        io.emit('moderationPostDelete', payload);
        io.to('admin').emit('adminModerationPostDelete', payload);
        break;
      case 'user:activity':
        io.emit('userActivity', payload);
        io.to('admin').emit('adminUserActivity', payload);
        break;

      // Timeline events
      case 'feed:article:new':
        // Notify admins of new articles for moderation
        io.to('admin').emit('timeline:article:new', payload);
        break;
      case 'admin:moderation:bulk':
        // Real-time admin updates for bulk moderation
        io.to('admin').emit('timeline:moderation:bulk', payload);
        break;
      case 'admin:retagging:bulk':
        // Real-time admin updates for bulk retagging
        io.to('admin').emit('timeline:retagging:bulk', payload);
        break;
      case 'admin:feed:refresh':
        // Notify admin room of feed refresh requests
        io.to('admin').emit('timeline:feed:refresh', payload);
        break;
      case 'timeline:articles:new':
        // Notify public timeline of newly approved articles
        io.emit('timeline:articles:approved', payload);
        break;

      // Pong events
      case 'pong:elo:update':
        // Emit to everyone (for leaderboards/spectators)
        io.emit('pong:elo:update', payload);
        break;
      case 'pong:tier:change':
        // Emit to everyone (for leaderboards/spectators)
        io.emit('pong:tier:change', payload);
        break;
      case 'pong:stats:update':
        const pongStatsPayload = payload as any;
        if (pongStatsPayload.userId) {
          io.to(`user:${pongStatsPayload.userId}`).emit('pong:stats:update', payload);
        }
        break;

      // Pong achievement events - process through AchievementEngine
      case 'pong:match:completed':
      case 'pong:match:lost':
      case 'pong:elo:milestone':
        try {
          const achievementPayload = payload as any;
          if (achievementPayload.userId && achievementPayload.key) {
            // Convert Redis payload to AchievementEvent format
            const achievementEvent: AchievementEvent = {
              key: achievementPayload.key,
              userId: achievementPayload.userId,
              idempotencyKey:
                achievementPayload.idempotencyKey ||
                `${achievementPayload.key}:${achievementPayload.userId}:${achievementPayload.matchId || Date.now()}`,
              occurredAt: achievementPayload.occurredAt || new Date().toISOString(),
              payload: achievementPayload,
            };

            // Process through achievement engine
            const engine = getAchievementEngine(io);
            await engine.handle(achievementEvent);

            console.log(`[achievement] Processed ${channel} for user ${achievementPayload.userId}`);
          }
        } catch (error) {
          console.error(`[achievement] Failed to process ${channel}:`, error);
        }
        break;

      default:
        console.warn('[socket] Unhandled Redis channel', channel);
    }
  });
}
