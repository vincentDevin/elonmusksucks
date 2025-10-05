// apps/server/src/handlers/postHandlers.ts
// -----------------------------------------------------------------------------
// Socket handlers for post-related real-time events
// Channel naming rules:
//   • Commands (client → server)  : present‑tense `post:<action>`
//   • Redis channel published     : same as command
//   • Broadcasts (server → client): camelCase events
// -----------------------------------------------------------------------------

import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import { PostService } from '../services/post.service';
import {
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  type PostCreateRequest,
  type PostCreateResponse,
  type PostEditRequest,
  type PostEditResponse,
  type PostDeleteRequest,
  type PostDeleteResponse,
  type PostReactRequest,
  type PostReactResponse,
  type CommentCreateRequest,
  type CommentCreateResponse,
  type CommentDeleteRequest,
  type CommentDeleteResponse,
  // type SharePostResponse, // TODO: Uncomment when sharePost is implemented
  toError,
} from '@ems/types';
import { eventBus } from '../lib/EventBus';

const postService = new PostService();

/**
 * Register all post-related socket handlers
 */
export function registerPostHandlers(socket: AuthenticatedSocket): void {
  socket.on(SOCKET_EVENTS.POST_CREATE, handlePostCreate);
  socket.on(SOCKET_EVENTS.POST_EDIT, handlePostEdit);
  socket.on(SOCKET_EVENTS.POST_DELETE, handlePostDelete);
  socket.on(SOCKET_EVENTS.POST_REACT, handlePostReact);
  // socket.on(SOCKET_EVENTS.POST_SHARE, handlePostShare); // TODO: Implement sharePost in PostService
  socket.on(SOCKET_EVENTS.COMMENT_CREATE, handleCommentCreate);
  socket.on(SOCKET_EVENTS.COMMENT_DELETE, handleCommentDelete);
}

/**
 * Handle real-time post creation
 */
async function handlePostCreate(
  this: AuthenticatedSocket,
  payload: PostCreateRequest,
  callback?: (response: PostCreateResponse) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // Filter payload to only include supported visibility values
    const servicePayload = {
      content: payload.content,
      mediaUrls: payload.mediaUrls,
      linkPreview: payload.linkPreview,
      parentId: payload.parentId,
      // Only include visibility if it's one of the supported values
      ...(payload.visibility &&
        ['PUBLIC', 'PRIVATE', 'FOLLOWERS'].includes(payload.visibility) && {
          visibility: payload.visibility as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS',
        }),
    };

    // Create post via service
    const newPost = await postService.createPost(userId, servicePayload);

    console.log('[postHandlers] Post created, publishing to Redis:', {
      postId: newPost.id,
      authorId: userId,
      channel: REDIS_CHANNELS.POST_CREATED,
    });

    // Publish to Redis for cross-server broadcasting
    await eventBus.publish(REDIS_CHANNELS.POST_CREATED, {
      post: newPost,
      authorId: userId,
    });

    console.log('[postHandlers] ✅ Published POST_CREATED to Redis');

    callback?.({ success: true, post: newPost });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error creating post:', err);
    callback?.({ error: err.message || 'Failed to create post' });
  }
}

/**
 * Handle real-time post editing
 */
async function handlePostEdit(
  this: AuthenticatedSocket,
  payload: PostEditRequest,
  callback?: (response: PostEditResponse) => void,
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
    await eventBus.publish(REDIS_CHANNELS.POST_UPDATED, {
      post: updatedPost,
      editedBy: userId,
    });

    callback?.({ success: true, post: updatedPost });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error editing post:', err);
    callback?.({ error: err.message || 'Failed to edit post' });
  }
}

/**
 * Handle real-time post deletion
 */
async function handlePostDelete(
  this: AuthenticatedSocket,
  payload: PostDeleteRequest,
  callback?: (response: PostDeleteResponse) => void,
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
    await eventBus.publish(REDIS_CHANNELS.POST_DELETED, {
      postId: payload.postId,
      deletedBy: userId,
    });

    callback?.({ success: true });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error deleting post:', err);
    callback?.({ error: err.message || 'Failed to delete post' });
  }
}

/**
 * Handle real-time post reactions
 */
async function handlePostReact(
  this: AuthenticatedSocket,
  payload: PostReactRequest,
  callback?: (response: PostReactResponse) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ error: 'Not authenticated' });
      return;
    }

    // This would typically call a reaction service
    // For now, just publish the event
    await eventBus.publish(REDIS_CHANNELS.POST_REACTION, {
      postId: payload.postId,
      userId,
      type: payload.type,
    });

    callback?.({ success: true });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error reacting to post:', err);
    callback?.({ error: err.message || 'Failed to react to post' });
  }
}

/**
 * Handle real-time post sharing
 * TODO: Implement sharePost method in PostService
 */
/*
async function handlePostShare(
  this: AuthenticatedSocket,
  payload: { postId: number },
  callback?: (response: SharePostResponse) => void,
): Promise<void> {
  try {
    const userId = this.user?.id;
    if (!userId) {
      callback?.({ success: false, error: 'Not authenticated' });
      return;
    }

    // Share post via service
    const result = await postService.sharePost(payload.postId, userId);

    // The service already publishes to Redis, so we just need to callback
    callback?.({ success: true, sharesCount: result.sharesCount });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error sharing post:', err);
    callback?.({ success: false, error: err.message || 'Failed to share post' });
  }
}
*/

/**
 * Handle real-time comment creation
 */
async function handleCommentCreate(
  this: AuthenticatedSocket,
  payload: CommentCreateRequest,
  callback?: (response: CommentCreateResponse) => void,
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
    await eventBus.publish(REDIS_CHANNELS.COMMENT_CREATED, {
      comment: newComment,
      postId: payload.postId,
      authorId: userId,
    });

    callback?.({ success: true, comment: newComment });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error creating comment:', err);
    callback?.({ error: err.message || 'Failed to create comment' });
  }
}

/**
 * Handle real-time comment deletion
 */
async function handleCommentDelete(
  this: AuthenticatedSocket,
  payload: CommentDeleteRequest,
  callback?: (response: CommentDeleteResponse) => void,
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
    await eventBus.publish(REDIS_CHANNELS.COMMENT_DELETED, {
      commentId: payload.commentId,
      deletedBy: userId,
    });

    callback?.({ success: true });
  } catch (error: unknown) {
    const err = toError(error);
    console.error('Error deleting comment:', err);
    callback?.({ error: err.message || 'Failed to delete comment' });
  }
}
