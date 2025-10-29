// apps/server/src/repositories/ReactionRepository.ts
import prisma from '../db';
import { Reaction, ReactionType } from '@prisma/client';
import type { IReactionRepository } from './interfaces/IReactionRepository';

export class ReactionRepository implements IReactionRepository {
  private readonly prisma = prisma;

  // ============================================
  // CONTENT REACTIONS (posts, comments)
  // ============================================

  async toggleContentReaction(
    contentId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: Reaction;
    previousType?: ReactionType;
  }> {
    // Check if user already has a reaction
    const existingReaction = await this.getUserContentReaction(contentId, userId);

    if (!existingReaction) {
      // Add new reaction
      const reaction = await this.prisma.reaction.create({
        data: {
          userId,
          contentId,
          type,
        },
      });

      // Increment content reaction count
      await this.prisma.content.update({
        where: { id: contentId },
        data: { reactionsCount: { increment: 1 } },
      });

      return { action: 'added', reaction };
    } else if (existingReaction.type === type) {
      // Remove same reaction type
      await this.prisma.reaction.delete({
        where: { id: existingReaction.id },
      });

      // Decrement content reaction count
      await this.prisma.content.update({
        where: { id: contentId },
        data: { reactionsCount: { decrement: 1 } },
      });

      return { action: 'removed', previousType: type };
    } else {
      // Change reaction type (no count change)
      const reaction = await this.prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { type },
      });

      return { action: 'changed', reaction, previousType: existingReaction.type };
    }
  }

  async getUserContentReaction(contentId: number, userId: number): Promise<Reaction | null> {
    return this.prisma.reaction.findFirst({
      where: {
        contentId,
        userId,
      },
    });
  }

  async getContentReactions(contentId: number): Promise<Reaction[]> {
    return this.prisma.reaction.findMany({
      where: { contentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContentReactionCounts(contentId: number): Promise<Record<ReactionType, number>> {
    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { contentId },
      _count: { type: true },
    });

    const counts: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    };

    reactions.forEach((reaction) => {
      counts[reaction.type] = reaction._count.type;
    });

    return counts;
  }

  async getContentReactionsPaginated(
    contentId: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: ReactionType;
    },
  ): Promise<{ reactions: Reaction[]; nextCursor?: number }> {
    const limit = options.limit ?? 50;

    const reactions = await this.prisma.reaction.findMany({
      where: {
        contentId,
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
            profilePictureKey: true,
          },
        },
      },
    });

    const hasMore = reactions.length > limit;
    const resultReactions = hasMore ? reactions.slice(0, -1) : reactions;
    const nextCursor = hasMore ? resultReactions[resultReactions.length - 1]?.id : undefined;

    return { reactions: resultReactions, nextCursor };
  }

  // ============================================
  // ARTICLE REACTIONS
  // ============================================

  async toggleArticleReaction(
    articleId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: Reaction;
    previousType?: ReactionType;
  }> {
    // Check if user already has a reaction
    const existingReaction = await this.getUserArticleReaction(articleId, userId);

    if (!existingReaction) {
      // Add new reaction
      const reaction = await this.prisma.reaction.create({
        data: {
          userId,
          articleId,
          type,
        },
      });

      // Increment article reaction count
      await this.prisma.article.update({
        where: { id: articleId },
        data: { reactionsCount: { increment: 1 } },
      });

      return { action: 'added', reaction };
    } else if (existingReaction.type === type) {
      // Remove same reaction type
      await this.prisma.reaction.delete({
        where: { id: existingReaction.id },
      });

      // Decrement article reaction count
      await this.prisma.article.update({
        where: { id: articleId },
        data: { reactionsCount: { decrement: 1 } },
      });

      return { action: 'removed', previousType: type };
    } else {
      // Change reaction type (no count change)
      const reaction = await this.prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { type },
      });

      return { action: 'changed', reaction, previousType: existingReaction.type };
    }
  }

  async getUserArticleReaction(articleId: number, userId: number): Promise<Reaction | null> {
    return this.prisma.reaction.findFirst({
      where: {
        articleId,
        userId,
      },
    });
  }

  async getArticleReactions(articleId: number): Promise<Reaction[]> {
    return this.prisma.reaction.findMany({
      where: { articleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArticleReactionCounts(articleId: number): Promise<Record<ReactionType, number>> {
    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { articleId },
      _count: { type: true },
    });

    const counts: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    };

    reactions.forEach((reaction) => {
      counts[reaction.type] = reaction._count.type;
    });

    return counts;
  }

  async getArticleReactionsBulk(
    articleIds: number[],
  ): Promise<Array<{ id: number; articleId: number | null; userId: number; type: ReactionType }>> {
    return this.prisma.reaction.findMany({
      where: {
        articleId: { in: articleIds },
      },
      select: {
        id: true,
        articleId: true,
        userId: true,
        type: true,
      },
    });
  }

  // ============================================
  // PREDICTION REACTIONS
  // ============================================

  async togglePredictionReaction(
    predictionId: number,
    userId: number,
    type: ReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: Reaction;
    previousType?: ReactionType;
  }> {
    // Check if user already has a reaction
    const existingReaction = await this.getUserPredictionReaction(predictionId, userId);

    if (!existingReaction) {
      // Add new reaction
      const reaction = await this.prisma.reaction.create({
        data: {
          userId,
          predictionId,
          type,
        },
      });

      // Note: Prediction doesn't have reactionsCount in schema yet
      // This would need to be added if we want denormalized counts

      return { action: 'added', reaction };
    } else if (existingReaction.type === type) {
      // Remove same reaction type
      await this.prisma.reaction.delete({
        where: { id: existingReaction.id },
      });

      return { action: 'removed', previousType: type };
    } else {
      // Change reaction type
      const reaction = await this.prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { type },
      });

      return { action: 'changed', reaction, previousType: existingReaction.type };
    }
  }

  async getUserPredictionReaction(predictionId: number, userId: number): Promise<Reaction | null> {
    return this.prisma.reaction.findFirst({
      where: {
        predictionId,
        userId,
      },
    });
  }

  async getPredictionReactions(predictionId: number): Promise<Reaction[]> {
    return this.prisma.reaction.findMany({
      where: { predictionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPredictionReactionCounts(predictionId: number): Promise<Record<ReactionType, number>> {
    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { predictionId },
      _count: { type: true },
    });

    const counts: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    };

    reactions.forEach((reaction) => {
      counts[reaction.type] = reaction._count.type;
    });

    return counts;
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  async getUserReactionsForContent(
    userId: number,
    contentIds: number[],
  ): Promise<Map<number, Reaction>> {
    const reactions = await this.prisma.reaction.findMany({
      where: {
        userId,
        contentId: {
          in: contentIds,
        },
      },
    });

    const map = new Map<number, Reaction>();
    reactions.forEach((reaction) => {
      if (reaction.contentId) {
        map.set(reaction.contentId, reaction);
      }
    });

    return map;
  }

  async getUserReactionsForArticles(
    userId: number,
    articleIds: number[],
  ): Promise<Map<number, Reaction>> {
    const reactions = await this.prisma.reaction.findMany({
      where: {
        userId,
        articleId: {
          in: articleIds,
        },
      },
    });

    const map = new Map<number, Reaction>();
    reactions.forEach((reaction) => {
      if (reaction.articleId) {
        map.set(reaction.articleId, reaction);
      }
    });

    return map;
  }

  async getUserReactionsForPredictions(
    userId: number,
    predictionIds: number[],
  ): Promise<Map<number, Reaction>> {
    const reactions = await this.prisma.reaction.findMany({
      where: {
        userId,
        predictionId: {
          in: predictionIds,
        },
      },
    });

    const map = new Map<number, Reaction>();
    reactions.forEach((reaction) => {
      if (reaction.predictionId) {
        map.set(reaction.predictionId, reaction);
      }
    });

    return map;
  }

  async getPredictionReactionCountsBulk(
    predictionIds: number[],
  ): Promise<Map<number, Record<ReactionType, number>>> {
    if (predictionIds.length === 0) {
      return new Map();
    }

    const reactions = await this.prisma.reaction.groupBy({
      by: ['predictionId', 'type'],
      where: { predictionId: { in: predictionIds } },
      _count: { type: true },
    });

    const countsMap = new Map<number, Record<ReactionType, number>>();

    // Initialize counts for all predictions
    predictionIds.forEach((id) => {
      countsMap.set(id, {
        LIKE: 0,
        LOVE: 0,
        LAUGH: 0,
        WOW: 0,
        SAD: 0,
        ANGRY: 0,
      });
    });

    // Populate with actual counts
    reactions.forEach((reaction) => {
      if (reaction.predictionId) {
        const counts = countsMap.get(reaction.predictionId);
        if (counts) {
          counts[reaction.type] = reaction._count.type;
        }
      }
    });

    return countsMap;
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getUserReactionStats(userId: number): Promise<{
    totalReactions: number;
    reactionsByType: Record<ReactionType, number>;
  }> {
    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { userId },
      _count: { type: true },
    });

    const reactionsByType: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    };

    let totalReactions = 0;

    reactions.forEach((reaction) => {
      reactionsByType[reaction.type] = reaction._count.type;
      totalReactions += reaction._count.type;
    });

    return {
      totalReactions,
      reactionsByType,
    };
  }

  async getMostReactedContent(limit?: number): Promise<any[]> {
    // Get most reacted content (across all types)
    const contentReactions = await this.prisma.content.findMany({
      where: {
        reactionsCount: {
          gt: 0,
        },
        isDeleted: false,
      },
      orderBy: {
        reactionsCount: 'desc',
      },
      take: limit || 10,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        _count: {
          select: {
            reactions: true,
          },
        },
      },
    });

    return contentReactions;
  }
}
