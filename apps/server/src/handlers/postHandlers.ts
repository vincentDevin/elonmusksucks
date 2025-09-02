// apps/server/src/handlers/postHandlers.ts
// -----------------------------------------------------------------------------
// Socket handlers for post-related real-time events
// Channel naming rules:
//   • Commands (client → server)  : present‑tense `post:<action>`
//   • Redis channel published     : same as command
//   • Broadcasts (server → client): camelCase events
// -----------------------------------------------------------------------------

import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import redisClient from '../lib/redis';
import { PostService } from '../services/post.service';
import type { PostContentType, PostVisibility } from '@ems/types';

const postService = new PostService();

/**
 * Register all post-related socket handlers
 */
export function registerPostHandlers(socket: AuthenticatedSocket): void {
  socket.on('post:create', handlePostCreate);
  socket.on('post:edit', handlePostEdit);
  socket.on('post:delete', handlePostDelete);
  socket.on('post:react', handlePostReact);
  socket.on('post:share', handlePostShare);
  socket.on('comment:create', handleCommentCreate);
  socket.on('comment:delete', handleCommentDelete);
}

/**
 * Handle real-time post creation
 */
async function handlePostCreate(
  this: AuthenticatedSocket,
  payload: {
    content: string;
    contentType?: PostContentType;
    visibility?: PostVisibility;
    mediaUrls?: string[];
    linkPreview?: any;
    parentId?: number | null;
  },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Create post via service
    const newPost = await postService.createPost(userId, payload);

    // Publish to Redis for cross-server broadcasting
    await redisClient.publish(
      'post:created',
      JSON.stringify({
        post: newPost,
        authorId: userId,
      }),
    );

    callback?.({ success: true, post: newPost });
  } catch (error: any) {
    console.error('Error creating post:', error);
    callback?.({ error: error.message || 'Failed to create post' });
  }
}

/**
 * Handle real-time post editing
 */
async function handlePostEdit(
  this: AuthenticatedSocket,
  payload: { postId: number; content: string },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Update post via service
    const updatedPost = await postService.updatePost(payload.postId, userId, payload.content);

    // Publish to Redis for cross-server broadcasting
    await redisClient.publish(
      'post:updated',
      JSON.stringify({
        post: updatedPost,
        editedBy: userId,
      }),
    );

    callback?.({ success: true, post: updatedPost });
  } catch (error: any) {
    console.error('Error editing post:', error);
    callback?.({ error: error.message || 'Failed to edit post' });
  }
}

/**
 * Handle real-time post deletion
 */
async function handlePostDelete(
  this: AuthenticatedSocket,
  payload: { postId: number },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Delete post via service
    await postService.deletePost(payload.postId, userId, false); // TODO: check admin status

    // Publish to Redis for cross-server broadcasting
    await redisClient.publish(
      'post:deleted',
      JSON.stringify({
        postId: payload.postId,
        deletedBy: userId,
      }),
    );

    callback?.({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    callback?.({ error: error.message || 'Failed to delete post' });
  }
}

/**
 * Handle real-time post reactions
 */
async function handlePostReact(
  this: AuthenticatedSocket,
  payload: { postId: number; type: string },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // This would typically call a reaction service
    // For now, just publish the event
    await redisClient.publish(
      'post:reaction',
      JSON.stringify({
        postId: payload.postId,
        userId,
        type: payload.type,
      }),
    );

    callback?.({ success: true });
  } catch (error: any) {
    console.error('Error reacting to post:', error);
    callback?.({ error: error.message || 'Failed to react to post' });
  }
}

/**
 * Handle real-time post sharing
 */
async function handlePostShare(
  this: AuthenticatedSocket,
  payload: { postId: number },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Share post via service
    const result = await postService.sharePost(payload.postId, userId);

    // The service already publishes to Redis, so we just need to callback
    callback?.({ success: true, sharesCount: result.sharesCount });
  } catch (error: any) {
    console.error('Error sharing post:', error);
    callback?.({ error: error.message || 'Failed to share post' });
  }
}

/**
 * Handle real-time comment creation
 */
async function handleCommentCreate(
  this: AuthenticatedSocket,
  payload: { postId: number; content: string },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Create comment via service
    const newComment = await postService.createPost(userId, {
      content: payload.content,
      parentId: payload.postId,
    });

    // Publish to Redis for cross-server broadcasting
    await redisClient.publish(
      'comment:created',
      JSON.stringify({
        comment: newComment,
        postId: payload.postId,
        authorId: userId,
      }),
    );

    callback?.({ success: true, comment: newComment });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    callback?.({ error: error.message || 'Failed to create comment' });
  }
}

/**
 * Handle real-time comment deletion
 */
async function handleCommentDelete(
  this: AuthenticatedSocket,
  payload: { commentId: number },
  callback?: (response: any) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Delete comment via service
    await postService.deletePost(payload.commentId, userId, false); // TODO: check admin status

    // Publish to Redis for cross-server broadcasting
    await redisClient.publish(
      'comment:deleted',
      JSON.stringify({
        commentId: payload.commentId,
        deletedBy: userId,
      }),
    );

    callback?.({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    callback?.({ error: error.message || 'Failed to delete comment' });
  }
}
