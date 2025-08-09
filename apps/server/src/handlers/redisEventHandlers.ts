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
  | 'odds:update:enhanced'
  | 'leaderboard:allTime'
  | 'leaderboard:daily'
  | 'leaderboard:rankChange'
  | 'leaderboard:milestone'
  | 'stats:update'
  | 'stats:refresh'
  | 'ranking:change'
  | 'achievement:unlocked'
  | 'user:stats_update'
  | 'bet:status_change'
  | 'parlay:status_change'
  | 'admin:metrics:update'
  | 'moderation:userBan'
  | 'moderation:userUnban'
  | 'moderation:userMute'
  | 'moderation:userKick'
  | 'moderation:messageDelete'
  | 'moderation:postDelete'
  | 'user:activity';

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
      case 'odds:update:enhanced':
        io.emit('oddsUpdatedEnhanced', payload);
        break;
      case 'leaderboard:allTime':
        io.emit('leaderboardAllTime', payload);
        break;
      case 'leaderboard:daily':
        io.emit('leaderboardDaily', payload);
        break;
      case 'leaderboard:rankChange':
        io.emit('leaderboard:rankChange', payload);
        break;
      case 'leaderboard:milestone':
        io.emit('leaderboard:milestone', payload);
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
      default:
        console.warn('[socket] Unhandled Redis channel', channel);
    }
  });
}
