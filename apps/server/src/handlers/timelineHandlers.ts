// apps/server/src/handlers/timelineHandlers.ts
import type { Server as IOServer, Socket } from 'socket.io';
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
  timelineSub.subscribe('feed:article:approved');
  timelineSub.subscribe('feed:article:rejected');
  timelineSub.subscribe('feed:article:new');

  // Tweet events (optional)
  timelineSub.subscribe('feed:tweet:new');
  timelineSub.subscribe('feed:tweet:hidden');

  // Feed management events
  timelineSub.subscribe('feed:source:created');
  timelineSub.subscribe('feed:source:updated');
  timelineSub.subscribe('feed:source:deleted');

  timelineSub.on('message', async (channel, message) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case 'feed:article:approved':
          // Broadcast new approved article to public timeline
          await handleArticleApproved(io, data);
          break;

        case 'feed:article:rejected':
          // Notify admin room only
          await handleArticleRejected(io, data);
          break;

        case 'feed:article:new':
          // Notify admin moderation queue
          await handleNewArticle(io, data);
          break;

        case 'feed:tweet:new':
          // Broadcast new tweet to public timeline (optional)
          await handleNewTweet(io, data);
          break;

        case 'feed:tweet:hidden':
          // Remove tweet from public timeline
          await handleTweetHidden(io, data);
          break;

        case 'feed:source:created':
        case 'feed:source:updated':
        case 'feed:source:deleted':
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
    socket.on('timeline:join', () => {
      socket.join('public:timeline');
      console.log(`[timeline] Socket ${socket.id} joined public timeline`);
    });

    socket.on('timeline:leave', () => {
      socket.leave('public:timeline');
      console.log(`[timeline] Socket ${socket.id} left public timeline`);
    });

    // Admin timeline room joining
    socket.on('admin:timeline:join', () => {
      if (socket.data.user?.role === 'ADMIN') {
        socket.join('admin:timeline');
        console.log(`[timeline] Admin socket ${socket.id} joined admin timeline`);
      } else {
        socket.emit('error', { message: 'Unauthorized: Admin role required' });
      }
    });

    socket.on('admin:timeline:leave', () => {
      socket.leave('admin:timeline');
      console.log(`[timeline] Socket ${socket.id} left admin timeline`);
    });

    // Manual feed refresh request (admin only)
    socket.on('admin:feed:refresh', async (data: { feedId: number }) => {
      if (socket.data.user?.role !== 'ADMIN') {
        socket.emit('error', { message: 'Unauthorized: Admin role required' });
        return;
      }

      try {
        // TODO: Trigger feed refresh job
        // await feedQueue.add('fetch', {
        //   feedId: data.feedId,
        //   forceRefresh: true
        // });

        socket.emit('admin:feed:refresh:ack', {
          feedId: data.feedId,
          status: 'queued',
        });

        console.log(
          `[timeline] Admin ${socket.data.user.id} triggered refresh for feed ${data.feedId}`,
        );
      } catch (error) {
        console.error('[timeline] Error triggering feed refresh:', error);
        socket.emit('error', { message: 'Failed to refresh feed' });
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
  io.to('public:timeline').emit('feed:article:approved', {
    articleId: data.articleId,
    card: data.card,
    timestamp: new Date().toISOString(),
  });

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
  io.to('admin:timeline').emit('feed:article:rejected', {
    articleId: data.articleId,
    reason: data.reason,
    timestamp: new Date().toISOString(),
  });

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
  io.to('admin:timeline').emit('feed:article:new', {
    articleId: data.articleId,
    title: data.title,
    publisher: data.publisher,
    timestamp: new Date().toISOString(),
  });

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
  io.to('public:timeline').emit('feed:tweet:new', {
    tweet: data.tweet,
    timestamp: new Date().toISOString(),
  });

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
  io.to('public:timeline').emit('feed:tweet:hidden', {
    tweetId: data.tweetId,
    timestamp: new Date().toISOString(),
  });

  console.log(`[timeline] Removed hidden tweet ${data.tweetId} from public timeline`);
}

/**
 * Handle feed management events for admin notifications
 */
async function handleFeedManagementEvent(io: IOServer, event: string, data: any) {
  io.to('admin:timeline').emit('feed:management:update', {
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  console.log(`[timeline] Notified admins of feed management event: ${event}`);
}

export default registerTimelineHandlers;
