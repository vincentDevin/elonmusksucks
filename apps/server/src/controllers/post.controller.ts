import { Response, NextFunction } from 'express';
import { PostService } from '../services/post.service';
import { ReactionService } from '../services/reaction.service';
import type { ReqWithUser } from './user.controller';
import type { CreateUserPostPayload, ReactionType } from '@ems/types';

const postService = new PostService();
const reactionService = new ReactionService();

/**
 * Create a new post
 * POST /api/posts
 */
export async function createPost(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { content, visibility, mediaUrls, linkPreview, parentId } =
      req.body as CreateUserPostPayload;

    // Filter visibility to supported values (service doesn't support MENTIONED_ONLY yet)
    const supportedVisibility =
      visibility && ['PUBLIC', 'PRIVATE', 'FOLLOWERS'].includes(visibility)
        ? (visibility as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS')
        : undefined;

    const post = await postService.createPost(userId, {
      content,
      visibility: supportedVisibility,
      mediaUrls,
      linkPreview,
      parentId,
    });

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single post
 * GET /api/posts/:id
 */
export async function getPost(req: ReqWithUser, res: Response, next: NextFunction): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const viewerId = req.user?.id;

    const post = await postService.getPost(postId, viewerId);
    res.json(post);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a post
 * PATCH /api/posts/:id
 */
export async function updatePost(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { content } = req.body;

    const post = await postService.updatePost(postId, userId, content);
    res.json(post);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a post
 * DELETE /api/posts/:id
 */
export async function deletePost(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const isAdmin = req.user?.role === 'ADMIN';

    await postService.deletePost(postId, userId, isAdmin);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get public timeline
 * GET /api/posts
 * TODO: Re-enable when getPublicTimeline is implemented in PostService
 */
export async function getTimeline(
  _req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // const viewerId = req.user?.id;
    // const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    // const limit = req.query.limit ? Number(req.query.limit) : 20;
    // const sortBy = req.query.sortBy as 'recent' | 'trending' | undefined;

    // const timeline = await postService.getPublicTimeline(viewerId, {
    //   cursor,
    //   limit,
    //   sortBy,
    // });

    res.json({ items: [], hasMore: false }); // Temporary placeholder
  } catch (error) {
    next(error);
  }
}

/**
 * Get trending posts
 * GET /api/posts/trending
 * TODO: Re-enable when getTrendingPosts is implemented in PostService
 */
export async function getTrendingPosts(
  _req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // const viewerId = req.user?.id;
    // const limit = req.query.limit ? Number(req.query.limit) : 10;

    // const posts = await postService.getTrendingPosts(viewerId, limit);
    res.json([]); // Temporary placeholder
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's posts
 * GET /api/users/:userId/posts
 */
export async function getUserPosts(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const viewerId = req.user?.id;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const includeReplies = req.query.includeReplies === 'true';

    const posts = await postService.getUserPosts(
      userId,
      {
        cursor,
        limit,
        includeReplies,
      },
      viewerId,
    );

    res.json(posts);
  } catch (error) {
    next(error);
  }
}

/**
 * Get post comments
 * GET /api/posts/:id/comments
 */
export async function getPostComments(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const viewerId = req.user?.id;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const comments = await postService.getPostComments(postId, viewerId, {
      cursor,
      limit,
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a comment on a post
 * POST /api/posts/:id/comments
 */
export async function createComment(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { content } = req.body;

    const comment = await postService.createPost(userId, {
      content,
      parentId: postId,
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle a reaction on a post
 * POST /api/posts/:id/reactions
 */
export async function toggleReaction(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { type } = req.body;

    if (!type) {
      res.status(400).json({ error: 'Reaction type is required' });
      return;
    }

    const result = await reactionService.toggleReaction(postId, userId, type as ReactionType);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get reactions for a post
 * GET /api/posts/:id/reactions
 */
export async function getPostReactions(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const type = req.query.type as ReactionType | undefined;

    const result = await reactionService.getPostReactions(postId, userId, {
      cursor,
      limit,
      type,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove a specific reaction from a post
 * DELETE /api/posts/:id/reactions/:type
 */
export async function removeReaction(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const type = req.params.type as ReactionType;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await reactionService.removeReaction(postId, userId, type);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get reaction counts for a post (public endpoint)
 * GET /api/posts/:id/reactions/counts
 */
export async function getReactionCounts(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);

    const counts = await reactionService.getReactionCounts(postId);
    res.json(counts);
  } catch (error) {
    next(error);
  }
}

/**
 * Share a post
 * POST /api/posts/:id/share
 * TODO: Re-enable when sharePost is implemented in PostService
 */
export async function sharePost(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // const result = await postService.sharePost(postId, userId);
    res.json({ success: true, postId }); // Temporary placeholder
  } catch (error) {
    next(error);
  }
}

/**
 * Report a post
 * POST /api/posts/:id/report
 */
export async function reportPost(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { reason, details } = req.body;

    if (!reason) {
      res.status(400).json({ error: 'Report reason is required' });
      return;
    }

    const result = await postService.reportPost(postId, userId, reason, details);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get trending hashtags
 * GET /api/posts/hashtags/trending
 */
export async function getTrendingHashtags(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const hashtags = await postService.getTrendingHashtags(limit);
    res.json(hashtags);
  } catch (error) {
    next(error);
  }
}

/**
 * Get posts by hashtag
 * GET /api/posts/hashtags/:tag
 */
export async function getPostsByHashtag(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tag = req.params.tag.toLowerCase();
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const viewerId = req.user?.id;

    const result = await postService.getPostsByHashtag(tag, {
      cursor,
      limit,
      viewerId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
