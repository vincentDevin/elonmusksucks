import { Socket, Server as IOServer } from 'socket.io';
import { EnhancedUserStatsService } from '../services/enhancedUserStats.service';
import redisClient from '../lib/redis';

const enhancedUserStatsService = new EnhancedUserStatsService();

export interface StatsUpdatePayload {
  userId: number;
  changes: {
    winRate?: number;
    profit?: number;
    rank?: number;
    streak?: number;
    totalBets?: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    isUnlocked: boolean;
  }>;
  timestamp: string;
}

export interface RankingChangePayload {
  userId: number;
  oldRank: number;
  newRank: number;
  change: number;
  category: 'allTime' | 'daily';
  percentile: number;
}

export interface AchievementUnlockedPayload {
  userId: number;
  achievement: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  progress: {
    previous: number;
    current: number;
    target: number;
  };
  timestamp: string;
}

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
        case 'stats:update':
          handleStatsUpdate(io, data);
          break;
        case 'ranking:change':
          handleRankingChange(io, data);
          break;
        case 'achievement:unlocked':
          handleAchievementUnlocked(io, data);
          break;
        case 'stats:refresh':
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

    await redisClient.publish('stats:update', JSON.stringify(payload));
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

    await redisClient.publish('ranking:change', JSON.stringify(payload));
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

    await redisClient.publish('achievement:unlocked', JSON.stringify(payload));
  }

  static async emitStatsRefresh(userId: number): Promise<void> {
    await redisClient.publish('stats:refresh', JSON.stringify({ userId }));
  }
}
