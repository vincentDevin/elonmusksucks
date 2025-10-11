import { ReactionRepository } from '../repositories/ReactionRepository';
import type { IReactionRepository } from '../repositories/interfaces/IReactionRepository';
import { ContentRepository } from '../repositories/ContentRepository';
import type { IContentRepository } from '../repositories/interfaces/IContentRepository';
import prisma from '../db';
import type { PrismaReaction, PrismaReactionType } from '@ems/types';
import { NotFoundError, ValidationError } from '../errors';

export class ReactionService {
  private reactionRepository: IReactionRepository;
  private contentRepository: IContentRepository;

  constructor() {
    this.reactionRepository = new ReactionRepository(prisma);
    this.contentRepository = new ContentRepository();
  }

  /**
   * Add or update a reaction to a post/content
   */
  async addReaction(
    contentId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    reaction: PrismaReaction | undefined;
    counts: Record<PrismaReactionType, number>;
    action: 'added' | 'changed' | 'removed';
  }> {
    // Validate content exists
    const content = await this.contentRepository.getContentById(contentId);
    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Validate reaction type
    if (!this.isValidReactionType(type)) {
      throw new ValidationError('Invalid reaction type');
    }

    // Use toggle method which handles add/change/remove
    const result = await this.reactionRepository.toggleContentReaction(contentId, userId, type);

    // Get updated counts
    const counts = await this.reactionRepository.getContentReactionCounts(contentId);

    // Real-time events are now handled by handlers → eventBus → redisEventHandlers

    return {
      reaction: result.reaction,
      counts,
      action: result.action,
    };
  }

  /**
   * Remove a reaction from a post/content (by toggling with same type)
   */
  async removeReaction(
    contentId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    success: boolean;
    counts: Record<PrismaReactionType, number>;
  }> {
    // Validate content exists
    const content = await this.contentRepository.getContentById(contentId);
    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Toggle will remove if same type exists
    const result = await this.reactionRepository.toggleContentReaction(contentId, userId, type);

    // Get updated counts
    const counts = await this.reactionRepository.getContentReactionCounts(contentId);

    // Real-time events are now handled by handlers → eventBus → redisEventHandlers

    return { success: result.action === 'removed', counts };
  }

  /**
   * Toggle a reaction (smart add/remove/change)
   */
  async toggleReaction(
    contentId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PrismaReaction;
    counts: Record<PrismaReactionType, number>;
  }> {
    // Validate content exists
    const content = await this.contentRepository.getContentById(contentId);
    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Validate reaction type
    if (!this.isValidReactionType(type)) {
      throw new ValidationError('Invalid reaction type');
    }

    // Toggle reaction
    const result = await this.reactionRepository.toggleContentReaction(contentId, userId, type);

    // Get updated counts
    const counts = await this.reactionRepository.getContentReactionCounts(contentId);

    // Real-time events are now handled by handlers → eventBus → redisEventHandlers

    return {
      action: result.action,
      reaction: result.reaction,
      counts,
    };
  }

  /**
   * Get all reactions for content
   */
  async getPostReactions(
    contentId: number,
    userId?: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: PrismaReactionType;
    } = {},
  ): Promise<{
    reactions: PrismaReaction[];
    counts: Record<PrismaReactionType, number>;
    userReaction?: PrismaReactionType;
    nextCursor?: number;
  }> {
    // Validate content exists
    const content = await this.contentRepository.getContentById(contentId);
    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Get paginated reactions
    const { reactions, nextCursor } = await this.reactionRepository.getContentReactionsPaginated(
      contentId,
      options,
    );

    // Get reaction counts
    const counts = await this.reactionRepository.getContentReactionCounts(contentId);

    // Get user's reaction if authenticated
    let userReaction: PrismaReactionType | undefined;
    if (userId) {
      const reaction = await this.reactionRepository.getUserContentReaction(contentId, userId);
      userReaction = reaction?.type;
    }

    return {
      reactions,
      counts,
      userReaction,
      nextCursor,
    };
  }

  /**
   * Get reaction summary for content (counts only)
   */
  async getReactionCounts(contentId: number): Promise<Record<PrismaReactionType, number>> {
    return await this.reactionRepository.getContentReactionCounts(contentId);
  }

  /**
   * Get user's reaction to content
   */
  async getUserReaction(contentId: number, userId: number): Promise<PrismaReactionType | null> {
    const reaction = await this.reactionRepository.getUserContentReaction(contentId, userId);
    return reaction?.type ?? null;
  }

  /**
   * Toggle a reaction on a prediction
   */
  async togglePredictionReaction(
    predictionId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PrismaReaction;
    counts: Record<PrismaReactionType, number>;
  }> {
    // Validate prediction exists
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });
    if (!prediction) {
      throw new NotFoundError('Prediction not found');
    }

    // Validate reaction type
    if (!this.isValidReactionType(type)) {
      throw new ValidationError('Invalid reaction type');
    }

    // Toggle reaction
    const result = await this.reactionRepository.togglePredictionReaction(
      predictionId,
      userId,
      type,
    );

    // Get updated counts
    const counts = await this.reactionRepository.getPredictionReactionCounts(predictionId);

    // Real-time events are now handled by handlers → eventBus → redisEventHandlers

    return {
      action: result.action,
      reaction: result.reaction,
      counts,
    };
  }

  /**
   * Get all reactions for a prediction
   */
  async getPredictionReactions(
    predictionId: number,
    userId?: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: PrismaReactionType;
    } = {},
  ): Promise<{
    reactions: PrismaReaction[];
    counts: Record<PrismaReactionType, number>;
    userReaction?: PrismaReactionType;
    nextCursor?: number;
  }> {
    // Validate prediction exists
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });
    if (!prediction) {
      throw new NotFoundError('Prediction not found');
    }

    // Get paginated reactions - Note: Repository doesn't have paginated prediction method,
    // so we'll get all and paginate manually
    const allReactions = await this.reactionRepository.getPredictionReactions(predictionId);

    // Apply type filter if specified
    const filteredReactions = options.type
      ? allReactions.filter((r) => r.type === options.type)
      : allReactions;

    // Apply pagination
    const limit = options.limit ?? 20;
    const cursor = options.cursor ?? 0;
    const reactions = filteredReactions.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < filteredReactions.length ? cursor + limit : undefined;

    // Get reaction counts
    const counts = await this.reactionRepository.getPredictionReactionCounts(predictionId);

    // Get user's reaction if authenticated
    let userReaction: PrismaReactionType | undefined;
    if (userId) {
      const reaction = await this.reactionRepository.getUserPredictionReaction(
        predictionId,
        userId,
      );
      userReaction = reaction?.type;
    }

    return {
      reactions,
      counts,
      userReaction,
      nextCursor,
    };
  }

  /**
   * Remove a specific reaction from a prediction
   */
  async removePredictionReaction(
    predictionId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    success: boolean;
    counts: Record<PrismaReactionType, number>;
  }> {
    // Validate prediction exists
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
    });
    if (!prediction) {
      throw new NotFoundError('Prediction not found');
    }

    // Toggle will remove if same type exists
    const result = await this.reactionRepository.togglePredictionReaction(
      predictionId,
      userId,
      type,
    );

    // Get updated counts
    const counts = await this.reactionRepository.getPredictionReactionCounts(predictionId);

    // Real-time events are now handled by handlers → eventBus → redisEventHandlers

    return { success: result.action === 'removed', counts };
  }

  /**
   * Get reaction counts for a prediction (public endpoint)
   */
  async getPredictionReactionCounts(
    predictionId: number,
  ): Promise<Record<PrismaReactionType, number>> {
    return await this.reactionRepository.getPredictionReactionCounts(predictionId);
  }

  /**
   * Validate reaction type
   */
  private isValidReactionType(type: string): type is PrismaReactionType {
    const validTypes = ['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'];
    return validTypes.includes(type);
  }
}
