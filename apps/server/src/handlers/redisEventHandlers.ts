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
  | 'activity:newsflash'
  | 'activity:newsflash:normalized'
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
      case 'activity:newsflash':
        io.emit('activityNewsflash', payload);
        break;
      case 'activity:newsflash:normalized':
        io.emit('activityNewsflash:normalized', payload);
        break;
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
