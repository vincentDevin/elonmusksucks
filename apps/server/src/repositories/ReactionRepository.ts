import { PrismaClient, PostReaction, ReactionType } from '@prisma/client';
import type { IReactionRepository } from './interfaces/IReactionRepository';

export class ReactionRepository implements IReactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Add a reaction to a post
   */
  async addReaction(postId: number, userId: number, type: ReactionType): Promise<PostReaction> {
    // Use upsert to handle cases where user changes reaction type
    const reaction = await this.prisma.postReaction.upsert({
      where: {
        postId_userId_type: {
          postId,
          userId,
          type,
        },
      },
      create: {
        postId,
        userId,
        type,
      },
      update: {
        type,
        createdAt: new Date(), // Update timestamp when changing reaction
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update the post's likes count
    await this.updatePostReactionCount(postId);

    return reaction;
  }

  /**
   * Remove a reaction from a post
   */
  async removeReaction(postId: number, userId: number, type: ReactionType): Promise<boolean> {
    const deleted = await this.prisma.postReaction.deleteMany({
      where: {
        postId,
        userId,
        type,
      },
    });

    if (deleted.count > 0) {
      await this.updatePostReactionCount(postId);
      return true;
    }

    return false;
  }

  /**
   * Get user's reaction to a post (any type)
   */
  async getUserReaction(postId: number, userId: number): Promise<PostReaction | null> {
    return await this.prisma.postReaction.findFirst({
      where: {
        postId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get all reactions for a post
   */
  async getPostReactions(postId: number): Promise<PostReaction[]> {
    return await this.prisma.postReaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get reaction counts by type for a post
   */
  async getReactionCounts(postId: number): Promise<Record<ReactionType, number>> {
    const reactions = await this.prisma.postReaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: {
        type: true,
      },
    });

    // Initialize all reaction types with 0
    const counts: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    };

    // Fill in actual counts
    reactions.forEach((reaction) => {
      counts[reaction.type] = reaction._count.type;
    });

    return counts;
  }

  /**
   * Update the post's total likes count (denormalized for performance)
   */
  async updatePostReactionCount(postId: number): Promise<void> {
    const totalReactions = await this.prisma.postReaction.count({
      where: { postId },
    });

    await this.prisma.userPost.update({
      where: { id: postId },
      data: { likesCount: totalReactions },
    });
  }

  /**
   * Get reactions with pagination for large posts
   */
  async getPostReactionsPaginated(
    postId: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: ReactionType;
    } = {},
  ): Promise<{ reactions: PostReaction[]; nextCursor?: number }> {
    const limit = options.limit ?? 50;

    const reactions = await this.prisma.postReaction.findMany({
      where: {
        postId,
        ...(options.type && { type: options.type }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = reactions.length > limit;
    const resultReactions = hasMore ? reactions.slice(0, -1) : reactions;
    const nextCursor = hasMore ? resultReactions[resultReactions.length - 1]?.id : undefined;

    return { reactions: resultReactions, nextCursor };
  }

  /**
   * Toggle reaction (add if not exists, remove if exists, or change type)
   */
  async toggleReaction(
    postId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PostReaction;
    previousType?: ReactionType;
  }> {
    // Check if user already has a reaction
    const existingReaction = await this.getUserReaction(postId, userId);

    if (!existingReaction) {
      // Add new reaction
      const reaction = await this.addReaction(postId, userId, type);
      return { action: 'added', reaction };
    } else if (existingReaction.type === type) {
      // Remove same reaction type
      await this.removeReaction(postId, userId, type);
      return { action: 'removed', previousType: type };
    } else {
      // Change reaction type - remove old, add new
      await this.removeReaction(postId, userId, existingReaction.type);
      const reaction = await this.addReaction(postId, userId, type);
      return { action: 'changed', reaction, previousType: existingReaction.type };
    }
  }
}
