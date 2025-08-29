import { type Server as IOServer, type Socket } from 'socket.io';
import { IEventBus } from '@ems/types';

/**
 * Register Pong-specific Socket.IO event handlers
 */
export function registerPongHandlers(socket: Socket) {
  // Subscribe to Pong leaderboard updates
  socket.on('pong:subscribe:leaderboard', (metric: string) => {
    socket.join(`pong:leaderboard:${metric}`);
    console.log(`[pong] Socket ${socket.id} subscribed to ${metric} leaderboard`);
  });

  // Unsubscribe from Pong leaderboard updates
  socket.on('pong:unsubscribe:leaderboard', (metric: string) => {
    socket.leave(`pong:leaderboard:${metric}`);
    console.log(`[pong] Socket ${socket.id} unsubscribed from ${metric} leaderboard`);
  });

  // Subscribe to personal Elo updates
  socket.on('pong:subscribe:elo', () => {
    const user = (socket as any).user;
    if (user?.id) {
      socket.join(`pong:user:${user.id}`);
      console.log(`[pong] Socket ${socket.id} subscribed to user ${user.id} Elo updates`);
    }
  });

  // Unsubscribe from personal Elo updates
  socket.on('pong:unsubscribe:elo', () => {
    const user = (socket as any).user;
    if (user?.id) {
      socket.leave(`pong:user:${user.id}`);
      console.log(`[pong] Socket ${socket.id} unsubscribed from user ${user.id} Elo updates`);
    }
  });

  // Subscribe to Pong stats updates
  socket.on('pong:subscribe:stats', () => {
    socket.join('pong:stats');
    console.log(`[pong] Socket ${socket.id} subscribed to Pong stats updates`);
  });

  // Unsubscribe from Pong stats updates
  socket.on('pong:unsubscribe:stats', () => {
    socket.leave('pong:stats');
    console.log(`[pong] Socket ${socket.id} unsubscribed from Pong stats updates`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[pong] Socket ${socket.id} disconnected from Pong handlers`);
  });
}

/**
 * Register Redis event handlers for Pong events
 */
export function registerPongRedisHandlers(io: IOServer, redisSub: any) {
  redisSub.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case 'pong:elo:update':
          handleEloUpdate(io, data);
          break;
        case 'pong:tier:change':
          handleTierChange(io, data);
          break;
        case 'pong:stats:update':
          handleStatsUpdate(io, data);
          break;
        case 'pong:leaderboard:update':
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
function handleEloUpdate(io: IOServer, data: any) {
  const { userId, oldRating, newRating, change, tier, matchId } = data;

  // Send to user's personal room
  io.to(`pong:user:${userId}`).emit('pong:elo:updated', {
    userId,
    oldRating,
    newRating,
    change,
    tier,
    matchId,
    timestamp: new Date().toISOString(),
  });

  // Send to general Pong stats room
  io.to('pong:stats').emit('pong:player:elo:changed', {
    userId,
    newRating,
    change,
    tier,
  });

  console.log(
    `[pong] Elo update broadcasted for user ${userId}: ${oldRating} -> ${newRating} (${change > 0 ? '+' : ''}${change})`,
  );
}

/**
 * Handle tier promotion/demotion events
 */
function handleTierChange(io: IOServer, data: any) {
  const { userId, oldTier, newTier, eloRating, isPromotion } = data;

  // Send to user's personal room
  io.to(`pong:user:${userId}`).emit('pong:tier:changed', {
    userId,
    oldTier,
    newTier,
    eloRating,
    isPromotion,
    timestamp: new Date().toISOString(),
  });

  // Send to general Pong stats room for celebration
  io.to('pong:stats').emit('pong:tier:announcement', {
    userId,
    newTier,
    isPromotion,
    eloRating,
  });

  console.log(
    `[pong] Tier change broadcasted for user ${userId}: ${oldTier} -> ${newTier} (${isPromotion ? 'promotion' : 'demotion'})`,
  );
}

/**
 * Handle general stats updates
 */
function handleStatsUpdate(io: IOServer, data: any) {
  const { userId, stats, matchResult } = data;

  // Send to user's personal room
  io.to(`pong:user:${userId}`).emit('pong:stats:updated', {
    userId,
    stats,
    matchResult,
    timestamp: new Date().toISOString(),
  });

  console.log(`[pong] Stats update broadcasted for user ${userId}`);
}

/**
 * Handle leaderboard updates
 */
function handleLeaderboardUpdate(io: IOServer, data: any) {
  const { metric, rankings, totalPlayers } = data;

  // Send to specific leaderboard subscribers
  io.to(`pong:leaderboard:${metric}`).emit('pong:leaderboard:updated', {
    metric,
    rankings,
    totalPlayers,
    timestamp: new Date().toISOString(),
  });

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

    await this.eventBus.publish('pong:elo:update', data);
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

    await this.eventBus.publish('pong:tier:change', data);
  }

  /**
   * Emit stats update event
   */
  async emitStatsUpdate(userId: number, stats: any, matchResult?: any) {
    const data = {
      userId,
      stats,
      matchResult,
    };

    await this.eventBus.publish('pong:stats:update', data);
  }

  /**
   * Emit leaderboard update event
   */
  async emitLeaderboardUpdate(metric: string, rankings: any[], totalPlayers: number) {
    const data = {
      metric,
      rankings: rankings.slice(0, 50), // Top 50 for real-time updates
      totalPlayers,
    };

    await this.eventBus.publish('pong:leaderboard:update', data);
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
