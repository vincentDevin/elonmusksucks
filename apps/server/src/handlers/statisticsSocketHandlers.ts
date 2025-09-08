import { Socket, Server as IOServer } from 'socket.io';
import {
  StatsUpdatePayload,
  RankingChangePayload,
  AchievementUnlockedPayload,
  REDIS_CHANNELS,
} from '@ems/types';

// TEMP: Re-export shared ACK types for backwards compatibility during migration
export type { AckCallback, AckCallbackObj, AckResult, AckOk, AckErr } from '@ems/types';
import { EnhancedUserStatsService } from '../services/enhancedUserStats.service';
import { UserRepository } from '../repositories/UserRepository';
import { BettingRepository } from '../repositories/BettingRepository';
import { StatsRepository } from '../repositories/StatsRepository';
import { PrismaClient } from '@prisma/client';
import { eventBus } from '../lib/EventBus';

const userRepository = new UserRepository();
const bettingRepository = new BettingRepository();
const prisma = new PrismaClient();
const statsRepository = new StatsRepository(prisma);
const enhancedUserStatsService = new EnhancedUserStatsService(
  userRepository,
  bettingRepository,
  statsRepository,
);

/**
 * Register real-time statistics handlers for individual socket connections
 */
export function registerStatisticsHandlers(socket: Socket): void {
  const user = (socket as any).user;
  if (!user) return;

  // Join user's personal statistics room
  socket.join(`user:${user.id}:stats`);
  console.log(`[stats-socket] User ${user.id} joined personal stats room`);

  // Handle request for live stats updates
  socket.on('stats:subscribe', async () => {
    try {
      console.log(`[stats-socket] User ${user.id} subscribed to live stats`);

      // Send current stats immediately
      const currentStats = await enhancedUserStatsService.getEnhancedStats(user.id);
      socket.emit('stats:current', {
        stats: currentStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[stats-socket] Error fetching current stats:', error);
      socket.emit('stats:error', { message: 'Failed to fetch current statistics' });
    }
  });

  // Handle unsubscribe from live stats
  socket.on('stats:unsubscribe', () => {
    socket.leave(`user:${user.id}:stats`);
    console.log(`[stats-socket] User ${user.id} unsubscribed from live stats`);
  });

  // Handle ranking subscription
  socket.on('ranking:subscribe', () => {
    socket.join(`user:${user.id}:ranking`);
    console.log(`[stats-socket] User ${user.id} subscribed to ranking updates`);
  });

  // Handle achievement subscription
  socket.on('achievements:subscribe', () => {
    socket.join(`user:${user.id}:achievements`);
    console.log(`[stats-socket] User ${user.id} subscribed to achievement updates`);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`[stats-socket] User ${user.id} disconnected from stats`);
  });
}

/**
 * Register Redis event handlers for statistics broadcasts
 */
export function registerStatisticsRedisHandlers(io: IOServer, redisSub: any): void {
  // Subscribe to statistics-related Redis channels
  redisSub.subscribe('stats:update', 'ranking:change', 'achievement:unlocked', 'stats:refresh');

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
        case REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED:
          handleAchievementUnlocked(io, data);
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
  io.to(`user:${userId}:stats`).emit('stats:updated', {
    changes,
    achievements,
    timestamp,
  });

  console.log(`[stats-redis] Stats updated for user ${userId}:`, changes);
}

/**
 * Handle ranking changes
 */
function handleRankingChange(io: IOServer, payload: RankingChangePayload): void {
  const { userId, oldRank, newRank, change, category, percentile } = payload;

  // Emit to user's ranking room
  io.to(`user:${userId}:ranking`).emit('ranking:changed', {
    oldRank,
    newRank,
    change,
    category,
    percentile,
    timestamp: new Date().toISOString(),
  });

  // Also emit to stats room for general updates
  io.to(`user:${userId}:stats`).emit('stats:ranking', {
    rank: newRank,
    change,
    category,
    percentile,
  });

  console.log(
    `[stats-redis] Ranking changed for user ${userId}: ${oldRank} → ${newRank} (${change > 0 ? '+' : ''}${change})`,
  );
}

/**
 * Handle achievement unlocks
 */
function handleAchievementUnlocked(io: IOServer, payload: any): void {
  // Ensure payload has required fields
  const userId = payload.userId;
  if (!userId) {
    console.error('[stats-redis] Achievement payload missing userId');
    return;
  }

  // Handle both old and new achievement payload formats
  const achievement = payload.achievement || {
    id: payload.achievementId || 'unknown',
    title: payload.name || 'Achievement Unlocked',
    description: payload.description || '',
    category: payload.category || 'general',
  };

  const progress = payload.progress || {
    previous: 0,
    current: 1,
    target: 1,
  };

  const timestamp = payload.timestamp || new Date().toISOString();

  // Emit to user's achievement room
  io.to(`user:${userId}:achievements`).emit('achievement:unlocked', {
    achievement,
    progress,
    timestamp,
  });

  // Also emit to stats room for general updates
  io.to(`user:${userId}:stats`).emit('stats:achievement', {
    achievement,
    progress,
  });

  console.log(
    `[stats-redis] Achievement unlocked for user ${userId}: ${achievement.title || 'Unknown'}`,
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
      io.to(`user:${userId}:stats`).emit('stats:refreshed', {
        stats,
        timestamp: new Date().toISOString(),
      });
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

  static async emitAchievementUnlocked(
    userId: number,
    achievement: AchievementUnlockedPayload['achievement'],
    progress: AchievementUnlockedPayload['progress'],
  ): Promise<void> {
    const payload: AchievementUnlockedPayload = {
      userId,
      achievement,
      progress,
      timestamp: new Date().toISOString(),
    };

    await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, payload);
  }

  static async emitStatsRefresh(userId: number): Promise<void> {
    await eventBus.publish(REDIS_CHANNELS.STATS_REFRESH, { userId });
  }
}
