// apps/server/src/repositories/interfaces/IPredictionCommentRepository.ts
import type {
  DbPredictionComment,
  PredictionCommentWithUser,
  CreatePredictionCommentPayload,
  UpdatePredictionCommentPayload,
} from '@ems/types';

export interface IPredictionCommentRepository {
  /** Create a new comment */
  createComment(
    data: CreatePredictionCommentPayload & { userId: number },
  ): Promise<DbPredictionComment>;

  /** Update an existing comment */
  updateComment(
    id: number,
    data: UpdatePredictionCommentPayload,
  ): Promise<DbPredictionComment | null>;

  /** Delete a comment (soft delete by setting content to "[deleted]") */
  deleteComment(id: number): Promise<void>;

  /** Find comment by ID */
  findCommentById(id: number): Promise<DbPredictionComment | null>;

  /** Get comments for a prediction with user data and nested replies */
  getCommentsByPredictionId(predictionId: number): Promise<PredictionCommentWithUser[]>;

  /** Get top-level comments for a prediction (no replies) */
  getTopLevelComments(
    predictionId: number,
    limit?: number,
    offset?: number,
  ): Promise<PredictionCommentWithUser[]>;

  /** Get replies for a specific comment */
  getReplies(parentId: number): Promise<PredictionCommentWithUser[]>;

  /** Get comment count for a prediction */
  getCommentCount(predictionId: number): Promise<number>;

  /** Like/unlike a comment (toggle) */
  toggleCommentLike(
    commentId: number,
    userId: number,
  ): Promise<{ liked: boolean; likesCount: number }>;

  /** Check if user has liked a comment */
  hasUserLikedComment(commentId: number, userId: number): Promise<boolean>;

  /** Get recent comments by user */
  getUserRecentComments(userId: number, limit?: number): Promise<PredictionCommentWithUser[]>;

  /** Validate comment ownership */
  isCommentOwner(commentId: number, userId: number): Promise<boolean>;

  /** Get comment statistics for a user */
  getUserCommentStats(userId: number): Promise<{
    totalComments: number;
    totalLikes: number;
    averageLikesPerComment: number;
  }>;
}
