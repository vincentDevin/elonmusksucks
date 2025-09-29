// apps/server/src/services/predictionComment.service.ts
import type { IPredictionCommentRepository } from '../repositories/interfaces/IPredictionCommentRepository';
import { PredictionCommentRepository } from '../repositories/PredictionCommentRepository';
import type {
  PredictionCommentWithUser,
  CreatePredictionCommentPayload,
  UpdatePredictionCommentPayload,
  PredictionCommentEvent,
  IEventBus,
} from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import { UserService } from './user.service';
import { eventBus as defaultEventBus } from '../lib/EventBus';

export class PredictionCommentService {
  private userService = new UserService();

  constructor(
    private repo: IPredictionCommentRepository = new PredictionCommentRepository(),
    private eventBus: IEventBus = defaultEventBus,
  ) {}

  /**
   * Create a new comment on a prediction
   */
  async createComment(
    data: CreatePredictionCommentPayload & { userId: number },
  ): Promise<PredictionCommentWithUser> {
    // Validate content
    if (!data.content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    if (data.content.length > 2000) {
      throw new Error('Comment content cannot exceed 2000 characters');
    }

    // Create the comment
    const comment = await this.repo.createComment(data);

    // Get user data for the response
    const user = await this.userService.getPublicSocketUser(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const commentWithUser: PredictionCommentWithUser = {
      id: comment.id,
      predictionId: comment.predictionId,
      userId: comment.userId,
      content: comment.content,
      parentId: comment.parentId,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt?.toISOString() || null,
      likesCount: comment.likesCount,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      replyCount: 0,
    };

    // Publish real-time event
    const event: PredictionCommentEvent = {
      type: 'comment_created',
      comment: commentWithUser,
      predictionId: data.predictionId,
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.publish(REDIS_CHANNELS.PREDICTION_COMMENT_CREATE, event);

    return commentWithUser;
  }

  /**
   * Update an existing comment
   */
  async updateComment(
    commentId: number,
    userId: number,
    data: UpdatePredictionCommentPayload,
  ): Promise<PredictionCommentWithUser> {
    // Validate ownership
    const isOwner = await this.repo.isCommentOwner(commentId, userId);
    if (!isOwner) {
      throw new Error('Only the comment author can edit this comment');
    }

    // Validate content
    if (!data.content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    if (data.content.length > 2000) {
      throw new Error('Comment content cannot exceed 2000 characters');
    }

    // Update the comment
    const updatedComment = await this.repo.updateComment(commentId, data);
    if (!updatedComment) {
      throw new Error('Comment not found');
    }

    // Get user data for the response
    const user = await this.userService.getPublicSocketUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const commentWithUser: PredictionCommentWithUser = {
      id: updatedComment.id,
      predictionId: updatedComment.predictionId,
      userId: updatedComment.userId,
      content: updatedComment.content,
      parentId: updatedComment.parentId,
      isEdited: updatedComment.isEdited,
      editedAt: updatedComment.editedAt?.toISOString() || null,
      likesCount: updatedComment.likesCount,
      createdAt: updatedComment.createdAt.toISOString(),
      updatedAt: updatedComment.updatedAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };

    // Publish real-time event
    const event: PredictionCommentEvent = {
      type: 'comment_updated',
      comment: commentWithUser,
      predictionId: updatedComment.predictionId,
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.publish(REDIS_CHANNELS.PREDICTION_COMMENT_UPDATE, event);

    return commentWithUser;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: number, userId: number): Promise<void> {
    // Validate ownership
    const isOwner = await this.repo.isCommentOwner(commentId, userId);
    if (!isOwner) {
      throw new Error('Only the comment author can delete this comment');
    }

    // Get comment data before deletion for the event
    const comment = await this.repo.findCommentById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Soft delete the comment
    await this.repo.deleteComment(commentId);

    // Publish real-time event
    const event: PredictionCommentEvent = {
      type: 'comment_deleted',
      comment: {
        id: comment.id,
        predictionId: comment.predictionId,
        userId: comment.userId,
        content: '[deleted]',
        parentId: comment.parentId,
        isEdited: true,
        editedAt: new Date().toISOString(),
        likesCount: comment.likesCount,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: userId,
          name: '[deleted]',
          avatarUrl: null,
        },
      },
      predictionId: comment.predictionId,
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.publish(REDIS_CHANNELS.PREDICTION_COMMENT_DELETE, event);
  }

  /**
   * Get all comments for a prediction
   */
  async getCommentsByPredictionId(predictionId: number): Promise<PredictionCommentWithUser[]> {
    return this.repo.getCommentsByPredictionId(predictionId);
  }

  /**
   * Get top-level comments with pagination
   */
  async getTopLevelComments(
    predictionId: number,
    limit = 20,
    offset = 0,
  ): Promise<PredictionCommentWithUser[]> {
    return this.repo.getTopLevelComments(predictionId, limit, offset);
  }

  /**
   * Get replies for a specific comment
   */
  async getReplies(parentId: number): Promise<PredictionCommentWithUser[]> {
    return this.repo.getReplies(parentId);
  }

  /**
   * Get comment count for a prediction
   */
  async getCommentCount(predictionId: number): Promise<number> {
    return this.repo.getCommentCount(predictionId);
  }

  /**
   * Toggle like on a comment
   */
  async toggleCommentLike(
    commentId: number,
    userId: number,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const result = await this.repo.toggleCommentLike(commentId, userId);

    // Get comment data for the event
    const comment = await this.repo.findCommentById(commentId);
    if (comment) {
      const user = await this.userService.getPublicSocketUser(userId);

      if (user) {
        const commentWithUser: PredictionCommentWithUser = {
          id: comment.id,
          predictionId: comment.predictionId,
          userId: comment.userId,
          content: comment.content,
          parentId: comment.parentId,
          isEdited: comment.isEdited,
          editedAt: comment.editedAt?.toISOString() || null,
          likesCount: result.likesCount,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
          },
        };

        // Publish real-time event
        const event: PredictionCommentEvent = {
          type: 'comment_liked',
          comment: commentWithUser,
          predictionId: comment.predictionId,
          timestamp: new Date().toISOString(),
        };

        await this.eventBus.publish(REDIS_CHANNELS.PREDICTION_COMMENT_LIKE, event);
      }
    }

    return result;
  }

  /**
   * Check if user has liked a comment
   */
  async hasUserLikedComment(commentId: number, userId: number): Promise<boolean> {
    return this.repo.hasUserLikedComment(commentId, userId);
  }

  /**
   * Get recent comments by a user
   */
  async getUserRecentComments(userId: number, limit = 10): Promise<PredictionCommentWithUser[]> {
    return this.repo.getUserRecentComments(userId, limit);
  }

  /**
   * Get comment statistics for a user
   */
  async getUserCommentStats(userId: number): Promise<{
    totalComments: number;
    totalLikes: number;
    averageLikesPerComment: number;
  }> {
    return this.repo.getUserCommentStats(userId);
  }
}

export const predictionCommentService = new PredictionCommentService();
