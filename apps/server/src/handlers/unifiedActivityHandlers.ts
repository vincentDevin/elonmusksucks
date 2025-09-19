// apps/server/src/handlers/unifiedActivityHandlers.ts
import type { Socket } from 'socket.io';
import { unifiedActivityService } from '../services/unifiedActivity.service';
import { REDIS_CHANNELS } from '@ems/types';
import redisClient from '../lib/redis';

interface UnifiedActivityRequest {
  limit?: number;
  includePersonal?: boolean;
  includeSocial?: boolean;
  includePlatform?: boolean;
  includeLive?: boolean;
  timeframe?: '1h' | '6h' | '24h' | '7d' | 'all';
}

interface VerboseActivity {
  id: string;
  type: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';

  // User context
  userId?: number;
  userName: string;
  userAvatar?: string;

  // Rich content
  title: string;
  description: string;
  icon: string;
  color: string;

  // Financial context (from bet details if available)
  amount?: number;
  odds?: number;
  payout?: number;

  // Prediction context (from prediction relation if available)
  predictionId?: number;
  predictionTitle?: string;
  category?: string;
  optionLabel?: string;

  // Meta flags
  isPersonal: boolean;
  isHighValue: boolean;
  isWin?: boolean;
  streak?: number;
}

export function setupUnifiedActivityHandlers(socket: Socket) {
  console.log(`[unified-activity] Setting up global activity handlers`);

  /**
   * Handle unified activity feed requests
   */
  socket.on('unified:activity:request', async (params: UnifiedActivityRequest = {}) => {
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
      // Get GLOBAL activity stream data for all users
      let activities: any[] = [];

      if (includePlatform || includeSocial) {
        // Get all public activities (not user-filtered) from unified service
        const publicActivities = await unifiedActivityService.getPublicActivities(
          Math.min(limit, 100),
        );
        activities = publicActivities;
      }

      // Personal activities are included in the global feed now
      // All activities from unified service are already properly filtered

      // Sort by timestamp and limit
      activities = activities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, Math.min(limit, 100));

      // Transform to verbose format with rich context
      const verboseActivities: VerboseActivity[] = activities.map((activity) => {
        const betAmount = activity.bet?.amount;
        const isHighValue = betAmount && betAmount >= 1000;
        const priority = isHighValue
          ? 'high'
          : activity.type === 'achievement_unlocked'
            ? 'medium'
            : activity.type === 'prediction_resolved'
              ? 'medium'
              : 'low';

        // Extract context from relations
        const userName = activity.user.name;
        const userAvatar = activity.user.avatarUrl;
        const predictionTitle = activity.prediction?.title;
        const predictionCategory = activity.prediction?.category;
        const predictionId = activity.prediction?.id;

        // Generate rich, contextual descriptions
        let title = '';
        let description = '';
        let icon = '•';
        let color = '';

        switch (activity.type) {
          case 'bet_placed':
            icon = '💰';
            color = 'text-green-500';
            title = `${userName} placed a bet`;
            description = `Bet ${betAmount || 0}🪙${predictionTitle ? ` on "${predictionTitle}"` : ''}`;
            break;

          case 'parlay_started':
            icon = '🎯';
            color = 'text-blue-500';
            title = `${userName} started a parlay`;
            description = `Multi-leg parlay for ${betAmount || 0}🪙`;
            break;

          case 'prediction_created':
            icon = '🔮';
            color = 'text-purple-500';
            title = `${userName} created a prediction`;
            description = `"${predictionTitle || activity.title}"${predictionCategory ? ` in ${predictionCategory}` : ''}`;
            break;

          case 'prediction_resolved':
            icon = '✅';
            color = 'text-green-600';
            title = `Prediction resolved`;
            description = `"${predictionTitle || activity.title}" → Winner decided`;
            break;

          case 'big_win':
            icon = '🏆';
            color = 'text-yellow-500';
            title = `${userName} hit a big win!`;
            description = `Won ${betAmount || 0}🪙${predictionTitle ? ` on "${predictionTitle}"` : ''}`;
            break;

          case 'achievement_unlocked':
            icon = '🏅';
            color = 'text-orange-500';
            title = `${userName} unlocked an achievement`;
            description = `Earned "${activity.title || 'New Achievement'}"`;
            break;

          case 'user_followed':
            icon = '👥';
            color = 'text-blue-400';
            title = `${userName} followed someone`;
            description = activity.description || 'New connection in the prediction community';
            break;

          case 'leaderboard_update':
            icon = '📊';
            color = 'text-indigo-500';
            title = 'Leaderboard updated';
            description = 'Rankings refreshed with latest performance data';
            break;

          default:
            title = activity.title || `${userName} - ${activity.type}`;
            description = activity.description || 'Platform activity';
        }

        return {
          id: activity.id.toString(), // Convert number to string
          type: activity.type,
          timestamp: activity.createdAt, // Use createdAt from ActivityStreamEntry
          priority,

          // User context
          userId: activity.user.id,
          userName,
          userAvatar: userAvatar || undefined,

          // Rich content
          title,
          description,
          icon,
          color,

          // Financial context (from bet relation)
          amount: betAmount,
          odds: undefined, // Not available in current ActivityStreamEntry
          payout: undefined, // Not available in current ActivityStreamEntry

          // Prediction context (from prediction relation)
          predictionId,
          predictionTitle,
          category: predictionCategory,
          optionLabel: undefined, // Not available in current ActivityStreamEntry

          // Meta flags
          isPersonal: activity.isPersonal,
          isHighValue: isHighValue || false,
          isWin: undefined, // Not available in current ActivityStreamEntry
          streak: undefined, // Not available in current ActivityStreamEntry
        };
      });

      // Sort by timestamp (newest first) and apply limit
      const sortedActivities = verboseActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      console.log(
        `[unified-activity] Sending ${sortedActivities.length} verbose activities to client`,
      );
      socket.emit('unified:activity:response', sortedActivities);
    } catch (error) {
      console.error(`[unified-activity] Error fetching activities:`, error);
      socket.emit('unified:activity:response', []);
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
    io.emit('unified:activity:update', verboseActivity);

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
        io.emit('unified:activity:update', activityData);
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
