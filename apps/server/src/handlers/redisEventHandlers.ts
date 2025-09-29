// apps/server/src/handlers/redisEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket fan‑out for core domain events (present‑tense only).
// -----------------------------------------------------------------------------

import { Server } from 'socket.io';
import { SOCKET_ROOMS, REDIS_CHANNELS } from '@ems/types';
import type { RedisChannel } from '@ems/types';

// All channels now available in REDIS_CHANNELS

export function registerRedisEventHandlers(io: Server, eventSub: any) {
  eventSub.on('message', async (channel: RedisChannel, message: string) => {
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
      case REDIS_CHANNELS.STATS_UPDATE:
        // Emit to specific user room if userId is in payload
        const statsPayload = payload as any;
        if (statsPayload.userId) {
          io.to(`user:${statsPayload.userId}`).emit('stats:update', payload);
        } else {
          io.emit('stats:update', payload);
        }
        break;
      case REDIS_CHANNELS.STATS_REFRESH:
        const refreshPayload = payload as any;
        if (refreshPayload.userId) {
          io.to(`user:${refreshPayload.userId}`).emit('stats:refresh', payload);
        }
        break;
      case REDIS_CHANNELS.RANKING_CHANGE:
        const rankingPayload = payload as any;
        if (rankingPayload.userId) {
          io.to(`user:${rankingPayload.userId}`).emit('ranking:change', payload);
        }
        io.emit('ranking:change', payload); // Also broadcast globally for leaderboard updates
        break;
      case REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED:
        const achievementPayload = payload as any;
        if (achievementPayload.userId) {
          io.to(`user:${achievementPayload.userId}`).emit('achievement:unlocked', payload);
        }
        io.emit('achievement:unlocked', payload); // Also broadcast globally for activity feed
        break;
      case REDIS_CHANNELS.USER_STATS_UPDATE:
        const userStatsPayload = payload as any;
        if (userStatsPayload.userId) {
          io.to(`user:${userStatsPayload.userId}`).emit('user:stats_update', payload);
        }
        break;

      // Bet and parlay status events
      case REDIS_CHANNELS.BET_STATUS_CHANGE:
        const betStatusPayload = payload as any;
        if (betStatusPayload.userId) {
          io.to(`user:${betStatusPayload.userId}`).emit('bet:status_change', payload);
        }
        break;
      case REDIS_CHANNELS.PARLAY_STATUS_CHANGE:
        const parlayStatusPayload = payload as any;
        if (parlayStatusPayload.userId) {
          io.to(`user:${parlayStatusPayload.userId}`).emit('parlay:status_change', payload);
        }
        break;

      // Admin metrics event for real-time dashboard updates
      case REDIS_CHANNELS.ADMIN_METRICS_UPDATE:
        // Broadcast to admin room only
        io.to('admin').emit('admin:metrics:update', payload);
        break;

      // NOTE: 'activity:newsflash' removed - handled by unified activity system
      case REDIS_CHANNELS.MODERATION_USER_BAN:
        io.emit('moderationUserBan', payload);
        // Emit to admin room specifically
        io.to('admin').emit('adminModerationUserBan', payload);
        break;
      case REDIS_CHANNELS.MODERATION_USER_MUTE:
        io.emit('moderationUserMute', payload);
        io.to('admin').emit('adminModerationUserMute', payload);
        break;
      case REDIS_CHANNELS.MODERATION_MESSAGE_DELETE:
        io.emit('moderationMessageDelete', payload);
        io.to('admin').emit('adminModerationMessageDelete', payload);
        break;
      case REDIS_CHANNELS.USER_ACTIVITY_LOG:
        io.emit('userActivity', payload);
        io.to('admin').emit('adminUserActivity', payload);
        break;

      // Timeline events
      case REDIS_CHANNELS.FEED_ARTICLE_NEW:
        // Notify admins of new articles for moderation
        io.to('admin').emit('timeline:article:new', payload);
        break;
      case REDIS_CHANNELS.ADMIN_MODERATION_BULK:
        // Real-time admin updates for bulk moderation
        io.to('admin').emit('timeline:moderation:bulk', payload);
        break;
      case REDIS_CHANNELS.ADMIN_FEED_REFRESH:
        // Notify admin room of feed refresh requests
        io.to('admin').emit('timeline:feed:refresh', payload);
        break;
      case REDIS_CHANNELS.TIMELINE_ARTICLES_NEW:
        // Notify public timeline of newly approved articles
        io.emit('timeline:articles:approved', payload);
        break;

      // Pong events
      case REDIS_CHANNELS.PONG_ELO_UPDATE:
        // Emit to everyone (for leaderboards/spectators)
        io.emit('pong:elo:update', payload);
        break;
      case REDIS_CHANNELS.PONG_TIER_CHANGE:
        // Emit to everyone (for leaderboards/spectators)
        io.emit('pong:tier:change', payload);
        break;
      case REDIS_CHANNELS.PONG_STATS_UPDATE:
        const pongStatsPayload = payload as any;
        if (pongStatsPayload.userId) {
          io.to(`user:${pongStatsPayload.userId}`).emit('pong:stats:update', payload);
        }
        break;

      // NOTE: Pong achievement events (pong:match:completed, pong:match:lost, pong:elo:milestone)
      // are handled exclusively by achievementEventHandler.ts and are not subscribed to by this handler

      // Chat events - emit using Redis channel names for EventBus compatibility
      case REDIS_CHANNELS.CHAT_MESSAGE:
        // Broadcast chat messages to all connected clients
        io.emit(REDIS_CHANNELS.CHAT_MESSAGE, payload);
        break;
      case REDIS_CHANNELS.CHAT_TYPING:
        // Broadcast typing indicators to all clients
        io.emit(REDIS_CHANNELS.CHAT_TYPING, payload);
        break;
      case REDIS_CHANNELS.CHAT_STOP_TYPING:
        // Broadcast stop typing indicators to all clients
        io.emit(REDIS_CHANNELS.CHAT_STOP_TYPING, payload);
        break;
      case REDIS_CHANNELS.CHAT_USERS_ONLINE:
        // Broadcast online users list to all clients
        io.emit(REDIS_CHANNELS.CHAT_USERS_ONLINE, payload);
        break;
      case REDIS_CHANNELS.CHAT_JOIN:
        // Broadcast user join events to all clients
        io.emit(REDIS_CHANNELS.CHAT_JOIN, payload);
        break;
      case REDIS_CHANNELS.CHAT_LEAVE:
        // Broadcast user leave events to all clients
        io.emit(REDIS_CHANNELS.CHAT_LEAVE, payload);
        break;

      // Comment events
      case REDIS_CHANNELS.PREDICTION_COMMENT_CREATE:
        const createCommentPayload = payload as any;
        if (createCommentPayload.predictionId) {
          io.to(`prediction:${createCommentPayload.predictionId}`).emit(
            'prediction:comment:created',
            payload,
          );
        }
        break;
      case REDIS_CHANNELS.PREDICTION_COMMENT_UPDATE:
        const updateCommentPayload = payload as any;
        if (updateCommentPayload.predictionId) {
          io.to(`prediction:${updateCommentPayload.predictionId}`).emit(
            'prediction:comment:updated',
            payload,
          );
        }
        break;
      case REDIS_CHANNELS.PREDICTION_COMMENT_DELETE:
        const deleteCommentPayload = payload as any;
        if (deleteCommentPayload.predictionId) {
          io.to(`prediction:${deleteCommentPayload.predictionId}`).emit(
            'prediction:comment:deleted',
            payload,
          );
        }
        break;
      case REDIS_CHANNELS.PREDICTION_COMMENT_LIKE:
        const likeCommentPayload = payload as any;
        if (likeCommentPayload.predictionId) {
          io.to(`prediction:${likeCommentPayload.predictionId}`).emit(
            'prediction:comment:liked',
            payload,
          );
        }
        break;

      default:
        console.warn('[socket] Unhandled Redis channel', channel);
    }
  });
}
