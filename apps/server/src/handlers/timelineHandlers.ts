// apps/server/src/handlers/timelineHandlers.ts
import type { Server as IOServer, Socket } from 'socket.io';
import {
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  type AdminFeedRefreshRequest,
  type AdminFeedRefreshAck,
  type FeedArticleApprovedBroadcast,
  type FeedArticleRejectedBroadcast,
  type FeedArticleNewBroadcast,
  type FeedTweetNewBroadcast,
  type FeedTweetHiddenBroadcast,
  type FeedManagementUpdateBroadcast,
} from '@ems/types';
import redisClient from '../lib/redis';

/**
 * Timeline-specific Socket.IO handlers for Homepage Timeline feature
 *
 * Handles:
 * - Real-time article approvals and rejections
 * - New tweet notifications
 * - Feed management events for admins
 * - Timeline room management
 */

export function registerTimelineHandlers(io: IOServer) {
  // Subscribe to Redis channels for timeline events
  const timelineSub = redisClient.duplicate();

  // Article moderation events
  timelineSub.subscribe(REDIS_CHANNELS.FEED_ARTICLE_APPROVED);
  timelineSub.subscribe(REDIS_CHANNELS.FEED_ARTICLE_REJECTED);
  timelineSub.subscribe(REDIS_CHANNELS.FEED_ARTICLE_NEW);

  // Tweet events (optional)
  timelineSub.subscribe(REDIS_CHANNELS.FEED_TWEET_NEW);
  timelineSub.subscribe(REDIS_CHANNELS.FEED_TWEET_HIDDEN);

  // Feed management events
  timelineSub.subscribe(REDIS_CHANNELS.FEED_SOURCE_CREATED);
  timelineSub.subscribe(REDIS_CHANNELS.FEED_SOURCE_UPDATED);
  timelineSub.subscribe(REDIS_CHANNELS.FEED_SOURCE_DELETED);

  timelineSub.on('message', async (channel, message) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case REDIS_CHANNELS.FEED_ARTICLE_APPROVED:
          // Broadcast new approved article to public timeline
          await handleArticleApproved(io, data);
          break;

        case REDIS_CHANNELS.FEED_ARTICLE_REJECTED:
          // Notify admin room only
          await handleArticleRejected(io, data);
          break;

        case REDIS_CHANNELS.FEED_ARTICLE_NEW:
          // Notify admin moderation queue
          await handleNewArticle(io, data);
          break;

        case REDIS_CHANNELS.FEED_TWEET_NEW:
          // Broadcast new tweet to public timeline (optional)
          await handleNewTweet(io, data);
          break;

        case REDIS_CHANNELS.FEED_TWEET_HIDDEN:
          // Remove tweet from public timeline
          await handleTweetHidden(io, data);
          break;

        case REDIS_CHANNELS.FEED_SOURCE_CREATED:
        case REDIS_CHANNELS.FEED_SOURCE_UPDATED:
        case REDIS_CHANNELS.FEED_SOURCE_DELETED:
          // Notify admin feed managers
          await handleFeedManagementEvent(io, channel, data);
          break;

        default:
          console.warn(`[timeline-handlers] Unknown channel: ${channel}`);
      }
    } catch (error) {
      console.error(`[timeline-handlers] Error processing ${channel}:`, error);
    }
  });

  // Socket connection handlers
  io.on('connection', (socket: Socket) => {
    // Timeline room joining
    socket.on(SOCKET_EVENTS.TIMELINE_JOIN, () => {
      socket.join(SOCKET_ROOMS.PUBLIC_TIMELINE);
      console.log(`[timeline] Socket ${socket.id} joined public timeline`);
    });

    socket.on(SOCKET_EVENTS.TIMELINE_LEAVE, () => {
      socket.leave(SOCKET_ROOMS.PUBLIC_TIMELINE);
      console.log(`[timeline] Socket ${socket.id} left public timeline`);
    });

    // Admin timeline room joining
    socket.on(SOCKET_EVENTS.ADMIN_TIMELINE_JOIN, () => {
      if (socket.data.user?.role === 'ADMIN') {
        socket.join(SOCKET_ROOMS.ADMIN_TIMELINE);
        console.log(`[timeline] Admin socket ${socket.id} joined admin timeline`);
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized: Admin role required' });
      }
    });

    socket.on(SOCKET_EVENTS.ADMIN_TIMELINE_LEAVE, () => {
      socket.leave(SOCKET_ROOMS.ADMIN_TIMELINE);
      console.log(`[timeline] Socket ${socket.id} left admin timeline`);
    });

    // Manual feed refresh request (admin only)
    socket.on(SOCKET_EVENTS.ADMIN_FEED_REFRESH, async (data: AdminFeedRefreshRequest) => {
      if (socket.data.user?.role !== 'ADMIN') {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized: Admin role required' });
        return;
      }

      try {
        // TODO: Trigger feed refresh job
        // await feedQueue.add('fetch', {
        //   feedId: data.feedId,
        //   forceRefresh: true
        // });

        const ackResponse: AdminFeedRefreshAck = {
          feedId: data.feedId,
          status: 'queued',
        };
        socket.emit(SOCKET_EVENTS.ADMIN_FEED_REFRESH_ACK, ackResponse);

        console.log(
          `[timeline] Admin ${socket.data.user.id} triggered refresh for feed ${data.feedId}`,
        );
      } catch (error) {
        console.error('[timeline] Error triggering feed refresh:', error);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to refresh feed' });
      }
    });
  });

  console.log('[timeline-handlers] Timeline Socket.IO handlers registered');

  // Cleanup function
  return () => {
    timelineSub.disconnect();
  };
}

/**
 * Handle approved article broadcast to public timeline
 */
async function handleArticleApproved(
  io: IOServer,
  data: {
    articleId: number;
    card: any; // TimelineItem payload
  },
) {
  const broadcast: FeedArticleApprovedBroadcast = {
    articleId: data.articleId,
    card: data.card,
    timestamp: new Date().toISOString(),
  };
  io.to(SOCKET_ROOMS.PUBLIC_TIMELINE).emit(
    SOCKET_EVENTS.FEED_ARTICLE_APPROVED_BROADCAST,
    broadcast,
  );

  console.log(`[timeline] Broadcasted approved article ${data.articleId} to public timeline`);
}

/**
 * Handle rejected article notification to admin room
 */
async function handleArticleRejected(
  io: IOServer,
  data: {
    articleId: number;
    reason?: string;
  },
) {
  const broadcast: FeedArticleRejectedBroadcast = {
    articleId: data.articleId,
    reason: data.reason,
    timestamp: new Date().toISOString(),
  };
  io.to(SOCKET_ROOMS.ADMIN_TIMELINE).emit(SOCKET_EVENTS.FEED_ARTICLE_REJECTED_BROADCAST, broadcast);

  console.log(`[timeline] Notified admins of rejected article ${data.articleId}`);
}

/**
 * Handle new article notification to admin moderation queue
 */
async function handleNewArticle(
  io: IOServer,
  data: {
    articleId: number;
    title: string;
    publisher: string;
  },
) {
  const broadcast: FeedArticleNewBroadcast = {
    articleId: data.articleId,
    title: data.title,
    publisher: data.publisher,
    timestamp: new Date().toISOString(),
  };
  io.to(SOCKET_ROOMS.ADMIN_TIMELINE).emit(SOCKET_EVENTS.FEED_ARTICLE_NEW_BROADCAST, broadcast);

  console.log(`[timeline] Notified admins of new article ${data.articleId} for moderation`);
}

/**
 * Handle new tweet broadcast to public timeline
 */
async function handleNewTweet(
  io: IOServer,
  data: {
    tweet: any; // TimelineItem payload
  },
) {
  const broadcast: FeedTweetNewBroadcast = {
    tweet: data.tweet,
    timestamp: new Date().toISOString(),
  };
  io.to(SOCKET_ROOMS.PUBLIC_TIMELINE).emit(SOCKET_EVENTS.FEED_TWEET_NEW_BROADCAST, broadcast);

  console.log(`[timeline] Broadcasted new tweet ${data.tweet.id} to public timeline`);
}

/**
 * Handle hidden tweet removal from public timeline
 */
async function handleTweetHidden(
  io: IOServer,
  data: {
    tweetId: string;
  },
) {
  const broadcast: FeedTweetHiddenBroadcast = {
    tweetId: data.tweetId,
    timestamp: new Date().toISOString(),
  };
  io.to(SOCKET_ROOMS.PUBLIC_TIMELINE).emit(SOCKET_EVENTS.FEED_TWEET_HIDDEN_BROADCAST, broadcast);

  console.log(`[timeline] Removed hidden tweet ${data.tweetId} from public timeline`);
}

/**
 * Handle feed management events for admin notifications
 */
async function handleFeedManagementEvent(io: IOServer, event: string, data: any) {
  const broadcast: FeedManagementUpdateBroadcast = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };
  io.to(SOCKET_ROOMS.ADMIN_TIMELINE).emit(SOCKET_EVENTS.FEED_MANAGEMENT_UPDATE, broadcast);

  console.log(`[timeline] Notified admins of feed management event: ${event}`);
}

export default registerTimelineHandlers;
