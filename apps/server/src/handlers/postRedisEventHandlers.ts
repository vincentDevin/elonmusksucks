// apps/server/src/handlers/postRedisEventHandlers.ts
// -----------------------------------------------------------------------------
// Redis → Socket.IO broadcast handlers for post domain
// Subscribes to Redis channels and broadcasts events to connected clients
// -----------------------------------------------------------------------------

import { Server as IOServer } from 'socket.io';
import type IORedis from 'ioredis';
import {
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  ROOM_HELPERS,
  type PostCreatedRedisPayload,
  type PostUpdatedRedisPayload,
  type PostDeletedRedisPayload,
  type PostSharedRedisPayload,
  type PostReactionRedisPayload,
  type CommentCreatedRedisPayload,
  type CommentDeletedRedisPayload,
  type PostNewBroadcast,
  type PostUpdatedBroadcast,
  type PostDeletedBroadcast,
  type PostSharedBroadcast,
  type PostReactionBroadcast,
  type CommentNewBroadcast,
  type CommentDeletedBroadcast,
} from '@ems/types';
import redisClient from '../lib/redis';

/**
 * Register all post-related Redis event handlers
 */
export function registerPostRedisHandlers(io: IOServer): IORedis {
  // Create dedicated subscriber client for post events
  const postSub = redisClient.duplicate();

  // Subscribe to post-related Redis channels
  const channels = [
    REDIS_CHANNELS.POST_CREATED,
    REDIS_CHANNELS.POST_UPDATED,
    REDIS_CHANNELS.POST_DELETED,
    REDIS_CHANNELS.POST_SHARED,
    REDIS_CHANNELS.POST_REACTION,
    REDIS_CHANNELS.COMMENT_CREATED,
    REDIS_CHANNELS.COMMENT_DELETED,
  ];

  // Subscribe to all channels at once and listen for messages
  postSub.subscribe(...channels);

  postSub.on('message', (channel: string, message: string | Buffer) => {
    console.log('[postRedisEventHandlers] Received Redis message:', channel);
    try {
      // Convert message to string if it's a Buffer
      const messageStr = typeof message === 'string' ? message : message.toString();
      const data = JSON.parse(messageStr);
      console.log('[postRedisEventHandlers] Parsed data, calling handler...');
      handleRedisEvent(io, channel, data);
    } catch (error) {
      console.error(
        `[postRedisEventHandlers] Failed to parse Redis message for ${channel}:`,
        String(error),
      );
    }
  });

  return postSub;
}

/**
 * Union type for all post-related Redis payloads
 */
type PostRedisPayload =
  | PostCreatedRedisPayload
  | PostUpdatedRedisPayload
  | PostDeletedRedisPayload
  | PostSharedRedisPayload
  | PostReactionRedisPayload
  | CommentCreatedRedisPayload
  | CommentDeletedRedisPayload;

/**
 * Handle individual Redis events and broadcast to appropriate rooms
 */
function handleRedisEvent(io: IOServer, channel: string, data: PostRedisPayload): void {
  console.log('[postRedisEventHandlers] handleRedisEvent called for channel:', channel);

  switch (channel) {
    case REDIS_CHANNELS.POST_CREATED:
      console.log('[postRedisEventHandlers] Matched POST_CREATED, calling handlePostCreated...');
      handlePostCreated(io, data as PostCreatedRedisPayload);
      break;
    case REDIS_CHANNELS.POST_UPDATED:
      handlePostUpdated(io, data as PostUpdatedRedisPayload);
      break;
    case REDIS_CHANNELS.POST_DELETED:
      handlePostDeleted(io, data as PostDeletedRedisPayload);
      break;
    case REDIS_CHANNELS.POST_SHARED:
      handlePostShared(io, data as PostSharedRedisPayload);
      break;
    case REDIS_CHANNELS.POST_REACTION:
      handlePostReaction(io, data as PostReactionRedisPayload);
      break;
    case REDIS_CHANNELS.COMMENT_CREATED:
      handleCommentCreated(io, data as CommentCreatedRedisPayload);
      break;
    case REDIS_CHANNELS.COMMENT_DELETED:
      handleCommentDeleted(io, data as CommentDeletedRedisPayload);
      break;
    default:
      console.warn(`Unhandled post Redis channel: ${channel}`);
  }
}

/**
 * Broadcast new post to relevant users
 */
async function handlePostCreated(io: IOServer, data: PostCreatedRedisPayload): Promise<void> {
  const { post } = data;

  // Broadcast to public timeline if post is public
  if (post.visibility === 'PUBLIC') {
    const broadcast: PostNewBroadcast = post;
    io.emit(SOCKET_EVENTS.POST_NEW, broadcast);
  }

  // Broadcast to author's followers (if applicable)
  // TODO: Implement follower rooms
  // io.to(ROOM_HELPERS.userFollowers(authorId)).emit(SOCKET_EVENTS.POST_NEW, post);

  // Broadcast to mentioned users
  if (post.mentions && post.mentions.length > 0) {
    post.mentions.forEach((mention) => {
      const broadcast: PostNewBroadcast = post;
      io.to(ROOM_HELPERS.user(mention.userId)).emit(SOCKET_EVENTS.POST_NEW, broadcast);
    });
  }
}

/**
 * Broadcast post update to viewers
 */
function handlePostUpdated(io: IOServer, data: PostUpdatedRedisPayload): void {
  const { post, editedBy } = data;

  // Broadcast to all users currently viewing this post
  const broadcast: PostUpdatedBroadcast = {
    id: post.id,
    content: post.content,
    editedAt: post.editedAt || new Date().toISOString(),
    editedBy,
  };
  io.emit(SOCKET_EVENTS.POST_UPDATED_BROADCAST, broadcast);
}

/**
 * Broadcast post deletion to viewers
 */
function handlePostDeleted(io: IOServer, data: PostDeletedRedisPayload): void {
  const { postId, deletedBy } = data;

  // Broadcast to all users currently viewing this post
  const broadcast: PostDeletedBroadcast = {
    postId,
    deletedBy,
    timestamp: new Date().toISOString(),
  };
  io.emit(SOCKET_EVENTS.POST_DELETED_BROADCAST, broadcast);
}

/**
 * Broadcast post share update
 */
function handlePostShared(io: IOServer, data: PostSharedRedisPayload): void {
  const { postId, sharesCount, sharedBy } = data;

  // Broadcast updated share count to all viewers
  const broadcast: PostSharedBroadcast = {
    postId,
    sharesCount,
    sharedBy,
    timestamp: new Date().toISOString(),
  };
  io.emit(SOCKET_EVENTS.POST_SHARED_BROADCAST, broadcast);
}

/**
 * Broadcast reaction update
 */
function handlePostReaction(io: IOServer, data: PostReactionRedisPayload): void {
  const { postId, userId, type } = data;

  // Broadcast reaction to all viewers of the post
  const broadcast: PostReactionBroadcast = {
    postId,
    userId,
    type,
    timestamp: new Date().toISOString(),
  };
  io.emit(SOCKET_EVENTS.POST_REACTION_BROADCAST, broadcast);
}

/**
 * Broadcast new comment to viewers
 */
async function handleCommentCreated(io: IOServer, data: CommentCreatedRedisPayload): Promise<void> {
  const { comment, postId, authorId } = data;

  // Broadcast to all users viewing the parent post
  const broadcast: CommentNewBroadcast = {
    comment,
    postId,
    authorId,
  };
  io.emit(SOCKET_EVENTS.COMMENT_NEW, broadcast);
}

/**
 * Broadcast comment deletion to viewers
 */
function handleCommentDeleted(io: IOServer, data: CommentDeletedRedisPayload): void {
  const { commentId, deletedBy } = data;

  // Broadcast to all users viewing the thread
  const broadcast: CommentDeletedBroadcast = {
    commentId,
    deletedBy,
    timestamp: new Date().toISOString(),
  };
  io.emit(SOCKET_EVENTS.COMMENT_DELETED_BROADCAST, broadcast);
}
