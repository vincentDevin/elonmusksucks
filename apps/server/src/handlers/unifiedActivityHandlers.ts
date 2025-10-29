// apps/server/src/handlers/unifiedActivityHandlers.ts
import type { Socket } from 'socket.io';
import { unifiedActivityService } from '../services/unifiedActivity.service';
import {
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  type UnifiedActivityRequest,
  type VerboseActivity,
} from '@ems/types';
import redisClient from '../lib/redis';

export function setupUnifiedActivityHandlers(socket: Socket) {
  console.log(`[unified-activity] Setting up global activity handlers for socket ${socket.id}`);
  console.log(
    `[unified-activity] Listening for event: "${SOCKET_EVENTS.UNIFIED_ACTIVITY_REQUEST}"`,
  );

  /**
   * Handle unified activity feed requests
   */
  socket.on(SOCKET_EVENTS.UNIFIED_ACTIVITY_REQUEST, async (params: UnifiedActivityRequest = {}) => {
    console.log(`[unified-activity] ✅ RECEIVED REQUEST from socket ${socket.id}`);

    const {
      limit = 50,
      includePersonal = true,
      includeSocial = true,
      includePlatform = true,
      includeLive = true,
      timeframe = 'all',
    } = params;

    console.log(`[unified-activity] Client requested unified activity feed:`, {
      limit,
      includePersonal,
      includeSocial,
      includePlatform,
      includeLive,
      timeframe,
    });

    try {
      // Get GLOBAL activity stream from Redis cache (faster and more up-to-date)
      let activities: any[] = [];

      if (includePlatform || includeSocial) {
        // Get recent activities from Redis cache for real-time data
        const recentActivities = await unifiedActivityService.getRecentActivities(
          Math.min(limit, 100),
        );
        activities = recentActivities;
      }

      console.log(`[unified-activity] Retrieved ${activities.length} activities from Redis cache`);

      // If Redis cache is empty, fall back to database
      if (activities.length === 0) {
        console.log('[unified-activity] Redis cache empty, falling back to database');
        const dbActivities = await unifiedActivityService.getPublicActivities(Math.min(limit, 50));
        console.log(`[unified-activity] Retrieved ${dbActivities.length} activities from database`);
        activities = dbActivities;
      }

      console.log(`[unified-activity] Sending ${activities.length} activities to client`);
      socket.emit(SOCKET_EVENTS.UNIFIED_ACTIVITY_RESPONSE, activities);
    } catch (error) {
      console.error(`[unified-activity] Error fetching activities:`, error);
      socket.emit(SOCKET_EVENTS.UNIFIED_ACTIVITY_RESPONSE, []);
    }
  });

  // No subscription needed - all activities are now globally broadcast
  // Users automatically receive all public activities without subscribing
}

/**
 * Broadcast new activity to ALL connected users (Global Broadcast Model)
 * No rooms or subscriptions - everyone gets all public activities
 */
export async function broadcastNewActivity(io: any, activity: any) {
  try {
    // Transform activity to verbose format
    const verboseActivity: VerboseActivity = {
      id: activity.id,
      type: activity.type,
      timestamp: new Date().toISOString(),
      priority: activity.amount >= 1000 ? 'high' : 'medium',

      userId: activity.userId,
      userName: activity.userName || 'Anonymous',
      userAvatar: activity.userAvatar,

      title: activity.title || `${activity.userName} - ${activity.type}`,
      description: activity.description || 'New platform activity',
      icon: activity.icon || '•',
      color: activity.color || 'text-content',

      amount: activity.amount,
      odds: activity.odds,
      payout: activity.payout,

      predictionId: activity.predictionId,
      predictionTitle: activity.predictionTitle,
      category: activity.category,
      optionLabel: activity.optionLabel,

      isPersonal: false,
      isHighValue: activity.amount >= 1000,
      isWin: activity.isWin,
      streak: activity.streak,
    };

    // Global broadcast to ALL connected clients - no rooms needed
    io.emit(SOCKET_EVENTS.UNIFIED_ACTIVITY_UPDATE, verboseActivity);

    console.log(`[unified-activity] Global broadcast: ${verboseActivity.title}`);
  } catch (error) {
    console.error('[unified-activity] Error broadcasting activity:', error);
  }
}

/**
 * Setup Redis subscriber for unified activity events (Global Broadcast Model)
 * All activities broadcast to ALL clients - no user-specific channels
 */
export function setupUnifiedActivityRedisHandlers(io: any) {
  const redisSub = redisClient.duplicate();

  // Subscribe to single global channel only
  redisSub.subscribe(REDIS_CHANNELS.UNIFIED_ACTIVITY_GLOBAL);

  redisSub.on('message', (channel: string, message: string) => {
    try {
      const activityData = JSON.parse(message);

      if (channel === REDIS_CHANNELS.UNIFIED_ACTIVITY_GLOBAL) {
        // Global broadcast to ALL connected clients
        io.emit(SOCKET_EVENTS.UNIFIED_ACTIVITY_UPDATE, activityData);
      }
    } catch (error) {
      console.error(`[unified-activity-redis] Error processing ${channel}:`, error);
    }
  });

  console.log('[unified-activity-redis] Redis subscriber initialized for global broadcasting');

  // MEMORY LEAK FIX: Return the client so it can be tracked for cleanup
  return redisSub;
}

// Legacy activity transformation removed - all activities now use unified service
