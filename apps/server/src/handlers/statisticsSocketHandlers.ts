import { Server as IOServer } from 'socket.io';
import type IORedis from 'ioredis';
import {
  StatsUpdatePayload,
  RankingChangePayload,
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  ROOM_HELPERS,
  type StatsCurrentResponse,
  type StatsErrorResponse,
  type StatsUpdatedBroadcast,
  type RankingChangedBroadcast,
  type StatsRankingBroadcast,
  type StatsRefreshedBroadcast,
} from '@ems/types';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';

// TEMP: Re-export shared ACK types for backwards compatibility during migration
export type { AckCallback, AckCallbackObj, AckResult, AckOk, AckErr } from '@ems/types';
import { EnhancedUserStatsService } from '../services/enhancedUserStats.service';
import { UserRepository } from '../repositories/UserRepository';
import { BettingRepository } from '../repositories/BettingRepository';
import { StatsRepository } from '../repositories/StatsRepository';
import { eventBus } from '../lib/EventBus';

const userRepository = new UserRepository();
const bettingRepository = new BettingRepository();
// Using shared prisma from db.ts
const statsRepository = new StatsRepository();
const enhancedUserStatsService = new EnhancedUserStatsService(
  userRepository,
  bettingRepository,
  statsRepository,
);

/**
 * Register real-time statistics handlers for individual socket connections
 */
export function registerStatisticsHandlers(socket: AuthenticatedSocket): void {
  const user = socket.user;
  if (!user) return;

  // Join user's personal statistics room
  socket.join(ROOM_HELPERS.userStatsSubscription(user.id));
  console.log(`[stats-socket] User ${user.id} joined personal stats room`);

  // Handle request for live stats updates
  socket.on(SOCKET_EVENTS.STATS_SUBSCRIBE, async () => {
    try {
      console.log(`[stats-socket] User ${user.id} subscribed to live stats`);

      // Send current stats immediately
      const currentStats = await enhancedUserStatsService.getEnhancedStats(user.id);
      const response: StatsCurrentResponse = {
        stats: currentStats,
        timestamp: new Date().toISOString(),
      };
      socket.emit(SOCKET_EVENTS.STATS_CURRENT, response);
    } catch (error) {
      console.error('[stats-socket] Error fetching current stats:', error);
      const errorResponse: StatsErrorResponse = { message: 'Failed to fetch current statistics' };
      socket.emit(SOCKET_EVENTS.STATS_ERROR, errorResponse);
    }
  });

  // Handle unsubscribe from live stats
  socket.on(SOCKET_EVENTS.STATS_UNSUBSCRIBE, () => {
    socket.leave(ROOM_HELPERS.userStatsSubscription(user.id));
    console.log(`[stats-socket] User ${user.id} unsubscribed from live stats`);
  });

  // Handle ranking subscription
  socket.on(SOCKET_EVENTS.RANKING_SUBSCRIBE, () => {
    socket.join(ROOM_HELPERS.userRankingSubscription(user.id));
    console.log(`[stats-socket] User ${user.id} subscribed to ranking updates`);
  });

  // Handle achievement subscription
  socket.on(SOCKET_EVENTS.ACHIEVEMENTS_SUBSCRIBE, () => {
    socket.join(ROOM_HELPERS.userAchievementsSubscription(user.id));
    console.log(`[stats-socket] User ${user.id} subscribed to achievement updates`);
  });

  // Cleanup on disconnect
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log(`[stats-socket] User ${user.id} disconnected from stats`);
  });
}

/**
 * Register Redis event handlers for statistics broadcasts
 */
export function registerStatisticsRedisHandlers(io: IOServer, redisSub: IORedis): void {
  // Subscribe to statistics-related Redis channels
  // NOTE: ACHIEVEMENT_UNLOCKED is handled by redisEventHandlers.ts to avoid duplicate emissions
  redisSub.subscribe(
    REDIS_CHANNELS.STATS_UPDATE,
    REDIS_CHANNELS.RANKING_CHANGE,
    REDIS_CHANNELS.STATS_REFRESH,
  );

  redisSub.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case REDIS_CHANNELS.STATS_UPDATE:
          handleStatsUpdate(io, data);
          break;
        case REDIS_CHANNELS.RANKING_CHANGE:
          handleRankingChange(io, data);
          break;
        case REDIS_CHANNELS.STATS_REFRESH:
          handleStatsRefresh(io, data);
          break;
        default:
          console.log(`[stats-redis] Unknown channel: ${channel}`);
      }
    } catch (error) {
      console.error(`[stats-redis] Error processing ${channel}:`, error);
    }
  });
}

/**
 * Handle user statistics updates
 */
function handleStatsUpdate(io: IOServer, payload: StatsUpdatePayload): void {
  const { userId, changes, achievements, timestamp } = payload;

  // Emit to user's personal stats room
  const broadcast: StatsUpdatedBroadcast = {
    changes,
    achievements,
    timestamp,
  };
  io.to(ROOM_HELPERS.userStatsSubscription(userId)).emit(SOCKET_EVENTS.STATS_UPDATED, broadcast);

  console.log(`[stats-redis] Stats updated for user ${userId}:`, changes);
}

/**
 * Handle ranking changes
 */
function handleRankingChange(io: IOServer, payload: RankingChangePayload): void {
  const { userId, oldRank, newRank, change, category, percentile } = payload;

  // Emit to user's ranking room
  const rankingBroadcast: RankingChangedBroadcast = {
    oldRank,
    newRank,
    change,
    category,
    percentile,
    timestamp: new Date().toISOString(),
  };
  io.to(ROOM_HELPERS.userRankingSubscription(userId)).emit(
    SOCKET_EVENTS.RANKING_CHANGED,
    rankingBroadcast,
  );

  // Also emit to stats room for general updates
  const statsBroadcast: StatsRankingBroadcast = {
    rank: newRank,
    change,
    category,
    percentile,
  };
  io.to(ROOM_HELPERS.userStatsSubscription(userId)).emit(
    SOCKET_EVENTS.STATS_RANKING,
    statsBroadcast,
  );

  console.log(
    `[stats-redis] Ranking changed for user ${userId}: ${oldRank} → ${newRank} (${change > 0 ? '+' : ''}${change})`,
  );
}

/**
 * Handle stats refresh events (when stats are recalculated)
 */
function handleStatsRefresh(io: IOServer, payload: { userId: number }): void {
  const { userId } = payload;

  // Trigger a fresh stats fetch for the user
  enhancedUserStatsService
    .getEnhancedStats(userId)
    .then((stats) => {
      const refreshBroadcast: StatsRefreshedBroadcast = {
        stats,
        timestamp: new Date().toISOString(),
      };
      io.to(ROOM_HELPERS.userStatsSubscription(userId)).emit(
        SOCKET_EVENTS.STATS_REFRESHED,
        refreshBroadcast,
      );
      console.log(`[stats-redis] Stats refreshed for user ${userId}`);
    })
    .catch((error) => {
      console.error(`[stats-redis] Error refreshing stats for user ${userId}:`, error);
    });
}

/**
 * Utility functions for emitting statistics events from other services
 */
export class StatisticsEventEmitter {
  static async emitStatsUpdate(
    userId: number,
    changes: StatsUpdatePayload['changes'],
  ): Promise<void> {
    const payload: StatsUpdatePayload = {
      userId,
      changes,
      timestamp: new Date().toISOString(),
    };

    await eventBus.publish(REDIS_CHANNELS.STATS_UPDATE, payload);
  }

  static async emitRankingChange(
    userId: number,
    oldRank: number,
    newRank: number,
    category: 'allTime' | 'daily',
  ): Promise<void> {
    const change = oldRank - newRank; // Positive = rank improved
    const payload: RankingChangePayload = {
      userId,
      oldRank,
      newRank,
      change,
      category,
      percentile: 0, // This would be calculated by the leaderboard service
    };

    await eventBus.publish(REDIS_CHANNELS.RANKING_CHANGE, payload);
  }

  static async emitStatsRefresh(userId: number): Promise<void> {
    await eventBus.publish(REDIS_CHANNELS.STATS_REFRESH, { userId });
  }
}
