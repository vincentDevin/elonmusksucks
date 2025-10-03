// apps/server/src/handlers/redisEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket fan‑out for core domain events (present‑tense only).
// -----------------------------------------------------------------------------

import { Server } from 'socket.io';
import { SOCKET_ROOMS, REDIS_CHANNELS, SOCKET_EVENTS } from '@ems/types';
import type { RedisChannel } from '@ems/types';

const ADMIN_ROOM = 'admin';
const ADMIN_PREDICTIONS_ROOM = 'admin:predictions';

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
      case REDIS_CHANNELS.PREDICTION_CREATED:
        io.to(SOCKET_ROOMS.PREDICTIONS).emit(SOCKET_EVENTS.PREDICTION_CREATED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_CREATED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_CREATED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        break;
      case REDIS_CHANNELS.PREDICTION_RESOLVE:
      case REDIS_CHANNELS.PREDICTION_RESOLVED_FAST:
        io.to(SOCKET_ROOMS.PREDICTIONS).emit(SOCKET_EVENTS.PREDICTION_RESOLVED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_RESOLVED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_RESOLVED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        break;
      case REDIS_CHANNELS.PREDICTION_APPROVED:
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_APPROVED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_APPROVED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        break;
      case REDIS_CHANNELS.PREDICTION_REJECTED:
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_REJECTED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_REJECTED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PREDICTION_STATUS_CHANGE, payload);
        break;
      case REDIS_CHANNELS.BET_PLACE:
        io.to(SOCKET_ROOMS.BETTING).emit(SOCKET_EVENTS.BET_PLACED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.BET_PLACED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.BET_PLACED, payload);
        break;
      case REDIS_CHANNELS.PARLAY_PLACE:
        io.to(SOCKET_ROOMS.BETTING).emit(SOCKET_EVENTS.PARLAY_PLACED, payload);
        io.to(ADMIN_PREDICTIONS_ROOM).emit(REDIS_CHANNELS.PARLAY_PLACED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.PARLAY_PLACED, payload);
        break;
      case REDIS_CHANNELS.ODDS_UPDATE_ENHANCED:
        io.to(SOCKET_ROOMS.PREDICTIONS).emit(SOCKET_EVENTS.ODDS_UPDATE_ENHANCED, payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_ALL_TIME:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit(SOCKET_EVENTS.LEADERBOARD_ALL_TIME, payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_DAILY:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit(SOCKET_EVENTS.LEADERBOARD_DAILY, payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit(REDIS_CHANNELS.LEADERBOARD_RANK_CHANGE, payload);
        break;
      case REDIS_CHANNELS.LEADERBOARD_MILESTONE:
        io.to(SOCKET_ROOMS.LEADERBOARD).emit(REDIS_CHANNELS.LEADERBOARD_MILESTONE, payload);
        break;

      // Stats and achievements events
      case REDIS_CHANNELS.STATS_UPDATE:
        // Emit to specific user room if userId is in payload
        const statsPayload = payload as any;
        if (statsPayload.userId) {
          io.to(`user:${statsPayload.userId}`).emit(REDIS_CHANNELS.STATS_UPDATE, payload);
        } else {
          io.emit(REDIS_CHANNELS.STATS_UPDATE, payload);
        }
        break;
      case REDIS_CHANNELS.STATS_REFRESH:
        const refreshPayload = payload as any;
        if (refreshPayload.userId) {
          io.to(`user:${refreshPayload.userId}`).emit(REDIS_CHANNELS.STATS_REFRESH, payload);
        }
        break;
      case REDIS_CHANNELS.RANKING_CHANGE:
        const rankingPayload = payload as any;
        if (rankingPayload.userId) {
          io.to(`user:${rankingPayload.userId}`).emit(REDIS_CHANNELS.RANKING_CHANGE, payload);
        }
        io.emit(REDIS_CHANNELS.RANKING_CHANGE, payload); // Also broadcast globally for leaderboard updates
        break;
      case REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED:
        const achievementPayload = payload as any;
        if (achievementPayload.userId) {
          io.to(`user:${achievementPayload.userId}`).emit(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, payload);
        }
        io.emit(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, payload); // Also broadcast globally for activity feed
        break;
      case REDIS_CHANNELS.USER_STATS_UPDATE:
        const userStatsPayload = payload as any;
        if (userStatsPayload.userId) {
          io.to(`user:${userStatsPayload.userId}`).emit(REDIS_CHANNELS.USER_STATS_UPDATE, payload);
        }
        break;

      // Bet and parlay status events
      case REDIS_CHANNELS.BET_STATUS_CHANGE:
        const betStatusPayload = payload as any;
        if (betStatusPayload.userId) {
          io.to(`user:${betStatusPayload.userId}`).emit(REDIS_CHANNELS.BET_STATUS_CHANGE, payload);
        }
        break;
      case REDIS_CHANNELS.PARLAY_STATUS_CHANGE:
        const parlayStatusPayload = payload as any;
        if (parlayStatusPayload.userId) {
          io.to(`user:${parlayStatusPayload.userId}`).emit(REDIS_CHANNELS.PARLAY_STATUS_CHANGE, payload);
        }
        break;

      // Admin metrics event for real-time dashboard updates
      case REDIS_CHANNELS.ADMIN_METRICS_UPDATE:
        // Broadcast to admin room only
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.ADMIN_METRICS_UPDATE, payload);
        break;

      // NOTE: 'activity:newsflash' removed - handled by unified activity system
      case REDIS_CHANNELS.MODERATION_USER_BAN:
        io.emit(SOCKET_EVENTS.MODERATION_USER_BAN, payload);
        // Emit to admin room specifically
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.ADMIN_MODERATION_USER_BAN, payload);
        break;
      case REDIS_CHANNELS.MODERATION_USER_MUTE:
        io.emit(SOCKET_EVENTS.MODERATION_USER_MUTE, payload);
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.ADMIN_MODERATION_USER_MUTE, payload);
        break;
      case REDIS_CHANNELS.MODERATION_USER_UNBAN:
        io.emit(SOCKET_EVENTS.MODERATION_USER_UNBAN, payload);
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.ADMIN_MODERATION_USER_UNBAN, payload);
        break;
      case REDIS_CHANNELS.MODERATION_USER_KICK:
        io.emit(SOCKET_EVENTS.MODERATION_USER_KICK, payload);
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.ADMIN_MODERATION_USER_KICK, payload);
        break;
      case REDIS_CHANNELS.MODERATION_MESSAGE_DELETE:
        io.emit(SOCKET_EVENTS.MODERATION_MESSAGE_DELETE, payload);
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.ADMIN_MODERATION_MESSAGE_DELETE, payload);
        break;
      case REDIS_CHANNELS.USER_ACTIVITY_LOG:
        io.emit(SOCKET_EVENTS.USER_ACTIVITY, payload);
        io.to(ADMIN_ROOM).emit(SOCKET_EVENTS.ADMIN_USER_ACTIVITY, payload);
        break;

      // Timeline events
      case REDIS_CHANNELS.FEED_ARTICLE_NEW:
        // Notify admins of new articles for moderation
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.TIMELINE_ARTICLE_NEW, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.CONTENT_UPDATED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.FEEDS_UPDATED, payload);
        break;
      case REDIS_CHANNELS.ADMIN_MODERATION_BULK:
        // Real-time admin updates for bulk moderation
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.TIMELINE_MODERATION_BULK, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.CONTENT_MODERATED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.ARTICLES_BULK_MODERATED, payload);
        break;
      case REDIS_CHANNELS.ADMIN_FEED_REFRESH:
        // Notify admin room of feed refresh requests
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.TIMELINE_FEED_REFRESH, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.FEEDS_UPDATED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.CONTENT_UPDATED, payload);
        break;
      case REDIS_CHANNELS.TIMELINE_ARTICLES_NEW:
        // Notify public timeline of newly approved articles
        io.emit(REDIS_CHANNELS.TIMELINE_ARTICLES_APPROVED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.CONTENT_UPDATED, payload);
        break;
      case REDIS_CHANNELS.FEED_SOURCE_CREATED:
      case REDIS_CHANNELS.FEED_SOURCE_UPDATED:
      case REDIS_CHANNELS.FEED_SOURCE_DELETED:
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.FEEDS_UPDATED, payload);
        io.to(ADMIN_ROOM).emit(REDIS_CHANNELS.CONTENT_UPDATED, payload);
        break;

      // Pong events
      case REDIS_CHANNELS.PONG_ELO_UPDATE:
        // Emit to everyone (for leaderboards/spectators)
        io.emit(SOCKET_EVENTS.PONG_ELO_UPDATE, payload);
        break;
      case REDIS_CHANNELS.PONG_TIER_CHANGE:
        // Emit to everyone (for leaderboards/spectators)
        io.emit(SOCKET_EVENTS.PONG_TIER_CHANGE, payload);
        break;
      case REDIS_CHANNELS.PONG_STATS_UPDATE:
        const pongStatsPayload = payload as any;
        if (pongStatsPayload.userId) {
          io.to(`user:${pongStatsPayload.userId}`).emit(SOCKET_EVENTS.PONG_STATS_UPDATE, payload);
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
            REDIS_CHANNELS.PREDICTION_COMMENT_CREATE,
            payload,
          );
        }
        break;
      case REDIS_CHANNELS.PREDICTION_COMMENT_UPDATE:
        const updateCommentPayload = payload as any;
        if (updateCommentPayload.predictionId) {
          io.to(`prediction:${updateCommentPayload.predictionId}`).emit(
            REDIS_CHANNELS.PREDICTION_COMMENT_UPDATE,
            payload,
          );
        }
        break;
      case REDIS_CHANNELS.PREDICTION_COMMENT_DELETE:
        const deleteCommentPayload = payload as any;
        if (deleteCommentPayload.predictionId) {
          io.to(`prediction:${deleteCommentPayload.predictionId}`).emit(
            REDIS_CHANNELS.PREDICTION_COMMENT_DELETE,
            payload,
          );
        }
        break;
      case REDIS_CHANNELS.PREDICTION_COMMENT_LIKE:
        const likeCommentPayload = payload as any;
        if (likeCommentPayload.predictionId) {
          io.to(`prediction:${likeCommentPayload.predictionId}`).emit(
            REDIS_CHANNELS.PREDICTION_COMMENT_LIKE,
            payload,
          );
        }
        break;

      default:
        console.warn('[socket] Unhandled Redis channel', channel);
    }
  });
}
