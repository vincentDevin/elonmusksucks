// apps/server/src/repositories/PredictionCommentRepository.ts
import prisma from '../db';
import type { IPredictionCommentRepository } from './interfaces/IPredictionCommentRepository';
import type {
  DbPredictionComment,
  PredictionCommentWithUser,
  CreatePredictionCommentPayload,
  UpdatePredictionCommentPayload,
} from '@ems/types';

export class PredictionCommentRepository implements IPredictionCommentRepository {
  async createComment(
    data: CreatePredictionCommentPayload & { userId: number },
  ): Promise<DbPredictionComment> {
    return prisma.predictionComment.create({
      data: {
        predictionId: data.predictionId,
        userId: data.userId,
        content: data.content,
        parentId: data.parentId || null,
      },
    });
  }

  async updateComment(
    id: number,
    data: UpdatePredictionCommentPayload,
  ): Promise<DbPredictionComment | null> {
    return prisma.predictionComment.update({
      where: { id },
      data: {
        content: data.content,
        isEdited: true,
        editedAt: new Date(),
      },
    });
  }

  async deleteComment(id: number): Promise<void> {
    await prisma.predictionComment.update({
      where: { id },
      data: {
        content: '[deleted]',
        isEdited: true,
        editedAt: new Date(),
      },
    });
  }

  async findCommentById(id: number): Promise<DbPredictionComment | null> {
    return prisma.predictionComment.findUnique({
      where: { id },
    });
  }

  async getCommentsByPredictionId(predictionId: number): Promise<PredictionCommentWithUser[]> {
    const comments = await prisma.predictionComment.findMany({
      where: {
        predictionId,
        parentId: null, // Only top-level comments first
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.formatComments(comments);
  }

  async getTopLevelComments(
    predictionId: number,
    limit = 20,
    offset = 0,
  ): Promise<PredictionCommentWithUser[]> {
    const comments = await prisma.predictionComment.findMany({
      where: {
        predictionId,
        parentId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return comments.map((comment) => ({
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
      user: comment.user,
      replyCount: comment._count.replies,
    }));
  }

  async getReplies(parentId: number): Promise<PredictionCommentWithUser[]> {
    const replies = await prisma.predictionComment.findMany({
      where: { parentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.formatComments(replies);
  }

  async getCommentCount(predictionId: number): Promise<number> {
    return prisma.predictionComment.count({
      where: { predictionId },
    });
  }

  async toggleCommentLike(
    commentId: number,
    userId: number,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const existingLike = await prisma.predictionCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike - remove the like and decrement count
      await Promise.all([
        prisma.predictionCommentLike.delete({
          where: { id: existingLike.id },
        }),
        prisma.predictionComment.update({
          where: { id: commentId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const updatedComment = await prisma.predictionComment.findUnique({
        where: { id: commentId },
        select: { likesCount: true },
      });

      return {
        liked: false,
        likesCount: updatedComment?.likesCount || 0,
      };
    } else {
      // Like - add the like and increment count
      await Promise.all([
        prisma.predictionCommentLike.create({
          data: {
            commentId,
            userId,
          },
        }),
        prisma.predictionComment.update({
          where: { id: commentId },
          data: {
            likesCount: {
              increment: 1,
            },
          },
        }),
      ]);

      const updatedComment = await prisma.predictionComment.findUnique({
        where: { id: commentId },
        select: { likesCount: true },
      });

      return {
        liked: true,
        likesCount: updatedComment?.likesCount || 0,
      };
    }
  }

  async hasUserLikedComment(commentId: number, userId: number): Promise<boolean> {
    const like = await prisma.predictionCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });
    return !!like;
  }

  async getUserRecentComments(userId: number, limit = 10): Promise<PredictionCommentWithUser[]> {
    const comments = await prisma.predictionComment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        prediction: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return this.formatComments(comments);
  }

  async isCommentOwner(commentId: number, userId: number): Promise<boolean> {
    const comment = await prisma.predictionComment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });
    return comment?.userId === userId;
  }

  async getUserCommentStats(userId: number): Promise<{
    totalComments: number;
    totalLikes: number;
    averageLikesPerComment: number;
  }> {
    const [commentCount, likesSum] = await Promise.all([
      prisma.predictionComment.count({
        where: { userId },
      }),
      prisma.predictionComment.aggregate({
        where: { userId },
        _sum: {
          likesCount: true,
        },
      }),
    ]);

    const totalComments = commentCount;
    const totalLikes = likesSum._sum.likesCount || 0;
    const averageLikesPerComment = totalComments > 0 ? totalLikes / totalComments : 0;

    return {
      totalComments,
      totalLikes,
      averageLikesPerComment: Math.round(averageLikesPerComment * 100) / 100,
    };
  }

  private formatComments(comments: any[]): PredictionCommentWithUser[] {
    return comments.map((comment) => ({
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
      user: comment.user,
      replies: comment.replies ? this.formatComments(comment.replies) : undefined,
      replyCount: comment._count?.replies,
    }));
  }
}
