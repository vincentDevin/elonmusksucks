// apps/server/src/controllers/predictionComment.controller.ts
import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { predictionCommentService } from '../services/predictionComment.service';
import type { CreatePredictionCommentPayload, UpdatePredictionCommentPayload } from '@ems/types';

/**
 * Create a new comment on a prediction
 * POST /api/predictions/:id/comments
 */
export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const predictionId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { content, parentId }: CreatePredictionCommentPayload = req.body;

    if (!predictionId || isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    if (parentId && (typeof parentId !== 'number' || parentId <= 0)) {
      res.status(400).json({ error: 'Invalid parent comment ID' });
      return;
    }

    const comment = await predictionCommentService.createComment({
      predictionId,
      userId,
      content: content.trim(),
      parentId,
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('[predictionComment] Error creating comment:', error);
    const message = error instanceof Error ? error.message : 'Failed to create comment';
    res.status(500).json({ error: message });
  }
}

/**
 * Update an existing comment
 * PUT /api/predictions/comments/:commentId
 */
export async function updateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user!.id;
    const { content }: UpdatePredictionCommentPayload = req.body;

    if (!commentId || isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' });
      return;
    }

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const comment = await predictionCommentService.updateComment(commentId, userId, {
      content: content.trim(),
    });

    res.json(comment);
  } catch (error) {
    console.error('[predictionComment] Error updating comment:', error);
    const message = error instanceof Error ? error.message : 'Failed to update comment';

    if (message.includes('Only the comment author')) {
      res.status(403).json({ error: message });
    } else if (message.includes('Comment not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}

/**
 * Delete a comment
 * DELETE /api/predictions/comments/:commentId
 */
export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user!.id;

    if (!commentId || isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' });
      return;
    }

    await predictionCommentService.deleteComment(commentId, userId);

    res.status(204).send();
  } catch (error) {
    console.error('[predictionComment] Error deleting comment:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete comment';

    if (message.includes('Only the comment author')) {
      res.status(403).json({ error: message });
    } else if (message.includes('Comment not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
}

/**
 * Get all comments for a prediction
 * GET /api/predictions/:id/comments
 */
export async function getComments(req: Request, res: Response): Promise<void> {
  try {
    const predictionId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!predictionId || isNaN(predictionId)) {
      res.status(400).json({ error: 'Invalid prediction ID' });
      return;
    }

    // Get top-level comments with pagination
    const comments = await predictionCommentService.getTopLevelComments(
      predictionId,
      limit,
      offset,
    );
    const totalCount = await predictionCommentService.getCommentCount(predictionId);

    res.json({
      comments,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('[predictionComment] Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
}

/**
 * Get replies for a comment
 * GET /api/predictions/comments/:commentId/replies
 */
export async function getReplies(req: Request, res: Response): Promise<void> {
  try {
    const commentId = parseInt(req.params.commentId);

    if (!commentId || isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' });
      return;
    }

    const replies = await predictionCommentService.getReplies(commentId);

    res.json({ replies });
  } catch (error) {
    console.error('[predictionComment] Error getting replies:', error);
    res.status(500).json({ error: 'Failed to get replies' });
  }
}

/**
 * Toggle like on a comment
 * POST /api/predictions/comments/:commentId/like
 */
export async function toggleCommentLike(req: AuthRequest, res: Response): Promise<void> {
  try {
    const commentId = parseInt(req.params.commentId);
    const userId = req.user!.id;

    if (!commentId || isNaN(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' });
      return;
    }

    const result = await predictionCommentService.toggleCommentLike(commentId, userId);

    res.json(result);
  } catch (error) {
    console.error('[predictionComment] Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle comment like' });
  }
}

/**
 * Get user's recent comments
 * GET /api/users/:userId/comments
 */
export async function getUserComments(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId || isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const comments = await predictionCommentService.getUserRecentComments(userId, limit);
    const stats = await predictionCommentService.getUserCommentStats(userId);

    res.json({
      comments,
      stats,
    });
  } catch (error) {
    console.error('[predictionComment] Error getting user comments:', error);
    res.status(500).json({ error: 'Failed to get user comments' });
  }
}
