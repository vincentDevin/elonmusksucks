import { type Server as IOServer } from 'socket.io';
import type IORedis from 'ioredis';
import {
  IEventBus,
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  ROOM_HELPERS,
  type PongEloUpdateRedisPayload,
  type PongTierChangeRedisPayload,
  type PongStatsUpdateRedisPayload,
  type PongLeaderboardUpdateRedisPayload,
  type PongEloUpdatedBroadcast,
  type PongPlayerEloChangedBroadcast,
  type PongTierChangedBroadcast,
  type PongTierAnnouncementBroadcast,
  type PongStatsUpdatedBroadcast,
  type PongLeaderboardUpdatedBroadcast,
  type PongUserStats,
  type PongMatchSummary,
  type PongLeaderboardEntry,
} from '@ems/types';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';

/**
 * Register Pong-specific Socket.IO event handlers
 */
export function registerPongHandlers(socket: AuthenticatedSocket) {
  // Subscribe to Pong leaderboard updates
  socket.on(SOCKET_EVENTS.PONG_SUBSCRIBE_LEADERBOARD, (metric: string) => {
    socket.join(ROOM_HELPERS.pongLeaderboard(metric));
    console.log(`[pong] Socket ${socket.id} subscribed to ${metric} leaderboard`);
  });

  // Unsubscribe from Pong leaderboard updates
  socket.on(SOCKET_EVENTS.PONG_UNSUBSCRIBE_LEADERBOARD, (metric: string) => {
    socket.leave(ROOM_HELPERS.pongLeaderboard(metric));
    console.log(`[pong] Socket ${socket.id} unsubscribed from ${metric} leaderboard`);
  });

  // Subscribe to personal Elo updates
  socket.on(SOCKET_EVENTS.PONG_SUBSCRIBE_ELO, () => {
    const user = socket.user;
    if (user?.id) {
      socket.join(ROOM_HELPERS.pongUser(user.id));
      console.log(`[pong] Socket ${socket.id} subscribed to user ${user.id} Elo updates`);
    }
  });

  // Unsubscribe from personal Elo updates
  socket.on(SOCKET_EVENTS.PONG_UNSUBSCRIBE_ELO, () => {
    const user = socket.user;
    if (user?.id) {
      socket.leave(ROOM_HELPERS.pongUser(user.id));
      console.log(`[pong] Socket ${socket.id} unsubscribed from user ${user.id} Elo updates`);
    }
  });

  // Subscribe to Pong stats updates
  socket.on(SOCKET_EVENTS.PONG_SUBSCRIBE_STATS, () => {
    socket.join(SOCKET_ROOMS.PONG_STATS);
    console.log(`[pong] Socket ${socket.id} subscribed to Pong stats updates`);
  });

  // Unsubscribe from Pong stats updates
  socket.on(SOCKET_EVENTS.PONG_UNSUBSCRIBE_STATS, () => {
    socket.leave(SOCKET_ROOMS.PONG_STATS);
    console.log(`[pong] Socket ${socket.id} unsubscribed from Pong stats updates`);
  });

  // Handle disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log(`[pong] Socket ${socket.id} disconnected from Pong handlers`);
  });
}

/**
 * Register Redis event handlers for Pong events
 */
export function registerPongRedisHandlers(io: IOServer, redisSub: IORedis) {
  redisSub.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case REDIS_CHANNELS.PONG_ELO_UPDATE:
          handleEloUpdate(io, data);
          break;
        case REDIS_CHANNELS.PONG_TIER_CHANGE:
          handleTierChange(io, data);
          break;
        case REDIS_CHANNELS.PONG_STATS_UPDATE:
          handleStatsUpdate(io, data);
          break;
        case REDIS_CHANNELS.PONG_LEADERBOARD_UPDATE:
          handleLeaderboardUpdate(io, data);
          break;
        default:
          console.log(`[pong] Unhandled Redis channel: ${channel}`);
      }
    } catch (error) {
      console.error(`[pong] Error processing Redis message from ${channel}:`, error);
    }
  });
}

/**
 * Handle Elo rating updates
 */
function handleEloUpdate(io: IOServer, data: PongEloUpdateRedisPayload) {
  const { userId, oldRating, newRating, change, tier, matchId } = data;

  // Send to user's personal room
  const eloUpdatedBroadcast: PongEloUpdatedBroadcast = {
    userId,
    oldRating,
    newRating,
    change,
    tier,
    matchId,
    timestamp: new Date().toISOString(),
  };
  io.to(ROOM_HELPERS.pongUser(userId)).emit(SOCKET_EVENTS.PONG_ELO_UPDATED, eloUpdatedBroadcast);

  // Send to general Pong stats room
  const playerEloChangedBroadcast: PongPlayerEloChangedBroadcast = {
    userId,
    newRating,
    change,
    tier,
  };
  io.to(SOCKET_ROOMS.PONG_STATS).emit(
    SOCKET_EVENTS.PONG_PLAYER_ELO_CHANGED,
    playerEloChangedBroadcast,
  );

  console.log(
    `[pong] Elo update broadcasted for user ${userId}: ${oldRating} -> ${newRating} (${change > 0 ? '+' : ''}${change})`,
  );
}

/**
 * Handle tier promotion/demotion events
 */
function handleTierChange(io: IOServer, data: PongTierChangeRedisPayload) {
  const { userId, oldTier, newTier, eloRating, isPromotion } = data;

  // Send to user's personal room
  const tierChangedBroadcast: PongTierChangedBroadcast = {
    userId,
    oldTier,
    newTier,
    eloRating,
    isPromotion,
    timestamp: new Date().toISOString(),
  };
  io.to(ROOM_HELPERS.pongUser(userId)).emit(SOCKET_EVENTS.PONG_TIER_CHANGED, tierChangedBroadcast);

  // Send to general Pong stats room for celebration
  const tierAnnouncementBroadcast: PongTierAnnouncementBroadcast = {
    userId,
    newTier,
    isPromotion,
    eloRating,
  };
  io.to(SOCKET_ROOMS.PONG_STATS).emit(
    SOCKET_EVENTS.PONG_TIER_ANNOUNCEMENT,
    tierAnnouncementBroadcast,
  );

  console.log(
    `[pong] Tier change broadcasted for user ${userId}: ${oldTier} -> ${newTier} (${isPromotion ? 'promotion' : 'demotion'})`,
  );
}

/**
 * Handle general stats updates
 */
function handleStatsUpdate(io: IOServer, data: PongStatsUpdateRedisPayload) {
  const { userId, stats, matchResult } = data;

  // Send to user's personal room
  const statsUpdatedBroadcast: PongStatsUpdatedBroadcast = {
    userId,
    stats,
    matchResult,
    timestamp: new Date().toISOString(),
  };
  io.to(ROOM_HELPERS.pongUser(userId)).emit(
    SOCKET_EVENTS.PONG_STATS_UPDATED,
    statsUpdatedBroadcast,
  );

  console.log(`[pong] Stats update broadcasted for user ${userId}`);
}

/**
 * Handle leaderboard updates
 */
function handleLeaderboardUpdate(io: IOServer, data: PongLeaderboardUpdateRedisPayload) {
  const { metric, rankings, totalPlayers } = data;

  // Send to specific leaderboard subscribers
  const leaderboardUpdatedBroadcast: PongLeaderboardUpdatedBroadcast = {
    metric,
    rankings,
    totalPlayers,
    timestamp: new Date().toISOString(),
  };
  io.to(ROOM_HELPERS.pongLeaderboard(metric)).emit(
    SOCKET_EVENTS.PONG_LEADERBOARD_UPDATED,
    leaderboardUpdatedBroadcast,
  );

  console.log(`[pong] Leaderboard update broadcasted for metric: ${metric}`);
}

/**
 * Utility class for emitting Pong events from services using dependency injection
 */
export class PongSocketEmitter {
  constructor(private eventBus: IEventBus) {}

  /**
   * Emit Elo rating change event
   */
  async emitEloUpdate(
    userId: number,
    oldRating: number,
    newRating: number,
    change: number,
    tier: string,
    matchId: string,
  ) {
    const data = {
      userId,
      oldRating,
      newRating,
      change,
      tier,
      matchId,
    };

    await this.eventBus.publish(REDIS_CHANNELS.PONG_ELO_UPDATE, data);
  }

  /**
   * Emit tier change event
   */
  async emitTierChange(userId: number, oldTier: string, newTier: string, eloRating: number) {
    const data = {
      userId,
      oldTier,
      newTier,
      eloRating,
      isPromotion: this.getTierRank(newTier) > this.getTierRank(oldTier),
    };

    await this.eventBus.publish(REDIS_CHANNELS.PONG_TIER_CHANGE, data);
  }

  /**
   * Emit stats update event
   */
  async emitStatsUpdate(userId: number, stats: PongUserStats, matchResult?: PongMatchSummary) {
    const data: PongStatsUpdateRedisPayload = {
      userId,
      stats,
      matchResult,
    };

    await this.eventBus.publish(REDIS_CHANNELS.PONG_STATS_UPDATE, data);
  }

  /**
   * Emit leaderboard update event
   */
  async emitLeaderboardUpdate(
    metric: string,
    rankings: PongLeaderboardEntry[],
    totalPlayers: number,
  ) {
    const data: PongLeaderboardUpdateRedisPayload = {
      metric,
      rankings: rankings.slice(0, 50), // Top 50 for real-time updates
      totalPlayers,
    };

    await this.eventBus.publish(REDIS_CHANNELS.PONG_LEADERBOARD_UPDATE, data);
  }

  /**
   * Get numeric rank for tier comparison
   */
  private getTierRank(tier: string): number {
    const ranks = {
      BRONZE: 1,
      SILVER: 2,
      GOLD: 3,
      PLATINUM: 4,
      DIAMOND: 5,
      MASTER: 6,
      GRANDMASTER: 7,
    };
    return ranks[tier as keyof typeof ranks] || 0;
  }
}
