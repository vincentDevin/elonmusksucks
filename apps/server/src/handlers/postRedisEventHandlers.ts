// apps/server/src/handlers/postRedisEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket.IO broadcast handlers for post domain
// Subscribes to Redis channels and broadcasts events to connected clients
// -----------------------------------------------------------------------------

import { Server as IOServer } from 'socket.io';
import redisClient from '../lib/redis';

/**
 * Register all post-related Redis event handlers
 */
export function registerPostRedisHandlers(io: IOServer): typeof redisClient {
  // Create dedicated subscriber client for post events
  const postSub = redisClient.duplicate();

  // Subscribe to post-related Redis channels
  const channels = [
    'post:created',
    'post:updated',
    'post:deleted',
    'post:shared',
    'post:reaction',
    'comment:created',
    'comment:deleted',
  ];

  // Subscribe to all channels at once and listen for messages
  postSub.subscribe(...channels);

  postSub.on('message', (channel: string, message: string | Buffer) => {
    try {
      // Convert message to string if it's a Buffer
      const messageStr = typeof message === 'string' ? message : message.toString();
      const data = JSON.parse(messageStr);
      handleRedisEvent(io, channel, data);
    } catch (error) {
      console.error(`Failed to parse Redis message for ${channel}:`, String(error));
    }
  });

  return postSub;
}

/**
 * Handle individual Redis events and broadcast to appropriate rooms
 */
function handleRedisEvent(io: IOServer, channel: string, data: any): void {
  switch (channel) {
    case 'post:created':
      handlePostCreated(io, data);
      break;
    case 'post:updated':
      handlePostUpdated(io, data);
      break;
    case 'post:deleted':
      handlePostDeleted(io, data);
      break;
    case 'post:shared':
      handlePostShared(io, data);
      break;
    case 'post:reaction':
      handlePostReaction(io, data);
      break;
    case 'comment:created':
      handleCommentCreated(io, data);
      break;
    case 'comment:deleted':
      handleCommentDeleted(io, data);
      break;
    default:
      console.warn(`Unhandled post Redis channel: ${channel}`);
  }
}

/**
 * Broadcast new post to relevant users
 */
function handlePostCreated(io: IOServer, data: { post: any; authorId: number }): void {
  const { post } = data;

  // Broadcast to public timeline if post is public
  if (post.visibility === 'PUBLIC') {
    io.emit('post:new', post);
  }

  // Broadcast to author's followers (if applicable)
  // TODO: Implement follower rooms
  // io.to(`user:${authorId}:followers`).emit('post:new', post);

  // Broadcast to mentioned users
  if (post.mentions && post.mentions.length > 0) {
    post.mentions.forEach((mention: any) => {
      io.to(`user:${mention.userId}`).emit('post:new', post);
    });
  }
}

/**
 * Broadcast post update to viewers
 */
function handlePostUpdated(io: IOServer, data: { post: any; editedBy: number }): void {
  const { post, editedBy } = data;

  // Broadcast to all users currently viewing this post
  io.emit('post:updated', {
    id: post.id,
    content: post.content,
    editedAt: post.editedAt,
    editedBy,
  });
}

/**
 * Broadcast post deletion to viewers
 */
function handlePostDeleted(io: IOServer, data: { postId: number; deletedBy: number }): void {
  const { postId, deletedBy } = data;

  // Broadcast to all users currently viewing this post
  io.emit('post:deleted', {
    postId,
    deletedBy,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast post share update
 */
function handlePostShared(
  io: IOServer,
  data: { postId: number; sharesCount: number; sharedBy: number },
): void {
  const { postId, sharesCount, sharedBy } = data;

  // Broadcast updated share count to all viewers
  io.emit('post:shared', {
    postId,
    sharesCount,
    sharedBy,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast reaction update
 */
function handlePostReaction(
  io: IOServer,
  data: { postId: number; userId: number; type: string },
): void {
  const { postId, userId, type } = data;

  // Broadcast reaction to all viewers of the post
  io.emit('post:reaction', {
    postId,
    userId,
    type,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast new comment to viewers
 */
function handleCommentCreated(
  io: IOServer,
  data: { comment: any; postId: number; authorId: number },
): void {
  const { comment, postId, authorId } = data;

  // Broadcast to all users viewing the parent post
  io.emit('comment:new', {
    comment,
    postId,
    authorId,
  });
}

/**
 * Broadcast comment deletion to viewers
 */
function handleCommentDeleted(io: IOServer, data: { commentId: number; deletedBy: number }): void {
  const { commentId, deletedBy } = data;

  // Broadcast to all users viewing the thread
  io.emit('comment:deleted', {
    commentId,
    deletedBy,
    timestamp: new Date().toISOString(),
  });
}
