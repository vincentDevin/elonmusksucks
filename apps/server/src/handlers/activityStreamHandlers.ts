import { Socket, Server as IOServer } from 'socket.io';
import { activityStreamService } from '../services/activityStream.service';
import type { ActivityStreamEntry } from '@ems/types';

/**
 * Register activity stream handlers for individual socket connections
 */
export function registerActivityStreamHandlers(socket: Socket): void {
  const user = (socket as any).user;
  if (!user) return;

  // Join user's personal activity room
  socket.join(`user:${user.id}:activity`);
  console.log(`[activity-stream] User ${user.id} joined personal activity room`);

  // Handle request for recent activity
  socket.on('activity:subscribe', async (options: { limit?: number } = {}) => {
    try {
      console.log(`[activity-stream] User ${user.id} subscribed to activity stream`);

      // Send recent activity immediately
      const recentActivity = await activityStreamService.getRecentActivity(user.id, {
        limit: options.limit || 20,
      });

      socket.emit('activity:recent', {
        activities: recentActivity,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[activity-stream] Error fetching recent activity:', error);
      socket.emit('activity:error', { message: 'Failed to fetch recent activity' });
    }
  });

  // Handle request for public activity feed
  socket.on(
    'activity:subscribe:public',
    async (options: { limit?: number; types?: string[] } = {}) => {
      try {
        socket.join('activity:public');
        console.log(`[activity-stream] User ${user.id} subscribed to public activity feed`);

        // Send recent public activity immediately
        const publicActivity = await activityStreamService.getPublicActivityFeed({
          limit: options.limit || 30,
          types: options.types,
        });

        socket.emit('activity:public:recent', {
          activities: publicActivity,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[activity-stream] Error fetching public activity:', error);
        socket.emit('activity:error', { message: 'Failed to fetch public activity' });
      }
    },
  );

  // Handle request for activity stream (new unified approach)
  socket.on(
    'activity:request',
    async (
      params: {
        limit?: number;
        userId?: number;
        includePersonal?: boolean;
        includeSocial?: boolean;
        includePlatform?: boolean;
        timeframe?: '1h' | '6h' | '24h' | '7d' | 'all';
      } = {},
    ) => {
      try {
        console.log(`[activity-stream] User ${user.id} requested activity stream:`, params);

        const {
          limit = 50,
          includePersonal = true,
          includeSocial = true,
          includePlatform = true,
          timeframe = '24h',
        } = params;

        // Get activities based on filters
        const activities = await activityStreamService.getFilteredActivityFeed({
          userId: user.id,
          limit,
          includePersonal,
          includeSocial,
          includePlatform,
          timeframe,
        });

        // Format activities for frontend consumption
        const formattedActivities = activities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          title: activity.title || 'Activity Update',
          description: activity.description || '',
          timestamp: activity.createdAt,
          userId: activity.user?.id,
          userName: activity.user?.name,
          userAvatar: activity.user?.avatarUrl,
          amount: activity.details?.amount,
          predictionId: activity.details?.predictionId,
          predictionTitle: activity.details?.predictionTitle,
          category: activity.details?.category,
          metadata: activity.details || {},
          isPersonal: activity.user?.id === user.id,
          priority: activity.priority || 'medium',
        }));

        socket.emit('activity:response', formattedActivities);
      } catch (error) {
        console.error('[activity-stream] Error fetching activity stream:', error);
        socket.emit('activity:error', {
          message: 'Failed to fetch activity stream',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  // Handle request for normalized activity ticker (for dashboard)
  socket.on('activity:ticker:normalized', async (limit: number = 20) => {
    try {
      console.log(
        `[activity-stream] User ${user.id} requested normalized activity ticker (limit: ${limit})`,
      );

      // Get recent public activity and normalize it for ticker display
      const activities = await activityStreamService.getPublicActivityFeed({
        limit,
      });

      // Normalize activities for ticker display
      const normalizedActivities = activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        timestamp: activity.createdAt,
        user: activity.user,
        meta: {
          title: activity.title,
          description: activity.description,
          ...activity.details,
        },
        priority: activity.priority || 'medium',
      }));

      socket.emit('activity:ticker:normalized', normalizedActivities);
    } catch (error) {
      console.error('[activity-stream] Error fetching normalized ticker:', error);
      socket.emit('activity:error', { message: 'Failed to fetch activity ticker' });
    }
  });

  // Handle unsubscribe from activity streams
  socket.on('activity:unsubscribe', () => {
    socket.leave(`user:${user.id}:activity`);
    console.log(`[activity-stream] User ${user.id} unsubscribed from personal activity`);
  });

  socket.on('activity:unsubscribe:public', () => {
    socket.leave('activity:public');
    console.log(`[activity-stream] User ${user.id} unsubscribed from public activity`);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log(`[activity-stream] User ${user.id} disconnected from activity streams`);
  });
}

/**
 * Register Redis event handlers for activity broadcasts
 */
export function registerActivityStreamRedisHandlers(io: IOServer, redisSub: any): void {
  // Subscribe to activity-related Redis channels
  redisSub.subscribe('activity:personal', 'activity:global');

  redisSub.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case 'activity:personal':
          handlePersonalActivity(io, data);
          break;
        case 'activity:global':
          handleGlobalActivity(io, data);
          break;
        default:
          console.log(`[activity-stream-redis] Unknown channel: ${channel}`);
      }
    } catch (error) {
      console.error(`[activity-stream-redis] Error processing ${channel}:`, error);
    }
  });
}

/**
 * Handle personal activity events
 */
function handlePersonalActivity(
  io: IOServer,
  payload: { userId: number; activity: ActivityStreamEntry },
): void {
  const { userId, activity } = payload;

  // Emit to user's personal activity room
  io.to(`user:${userId}:activity`).emit('activity:new', {
    activity,
    timestamp: new Date().toISOString(),
  });

  console.log(`[activity-stream-redis] Personal activity for user ${userId}: ${activity.type}`);
}

/**
 * Handle global/public activity events
 */
function handleGlobalActivity(io: IOServer, payload: { activity: ActivityStreamEntry }): void {
  const { activity } = payload;

  // Emit to public activity room
  io.to('activity:public').emit('activity:public:new', {
    activity,
    timestamp: new Date().toISOString(),
  });

  // Also emit to general activity ticker (for dashboard feeds)
  io.emit('activity:ticker', {
    activity: {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      user: activity.user,
      timestamp: activity.createdAt,
    },
  });

  console.log(
    `[activity-stream-redis] Global activity: ${activity.type} by user ${activity.user.id}`,
  );
}

/**
 * Activity event broadcasting utilities
 */
export class ActivityBroadcaster {
  /**
   * Broadcast activity to specific user's personal stream
   */
  static broadcastPersonalActivity(
    io: IOServer,
    userId: number,
    activity: ActivityStreamEntry,
  ): void {
    io.to(`user:${userId}:activity`).emit('activity:new', {
      activity,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast activity to global public stream
   */
  static broadcastGlobalActivity(io: IOServer, activity: ActivityStreamEntry): void {
    io.to('activity:public').emit('activity:public:new', {
      activity,
      timestamp: new Date().toISOString(),
    });

    // Also emit to activity ticker
    io.emit('activity:ticker', {
      activity: {
        id: activity.id,
        type: activity.type,
        title: activity.title,
        user: activity.user,
        timestamp: activity.createdAt,
      },
    });
  }

  /**
   * Broadcast high-priority activity as notification
   */
  static broadcastHighPriorityActivity(io: IOServer, activity: ActivityStreamEntry): void {
    if (activity.priority !== 'high') return;

    // Broadcast to all connected users as notification
    io.emit('activity:highlight', {
      activity: {
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        user: activity.user,
        timestamp: activity.createdAt,
      },
    });

    console.log(
      `[activity-broadcaster] High-priority activity broadcast: ${activity.type} by ${activity.user.name}`,
    );
  }
}
