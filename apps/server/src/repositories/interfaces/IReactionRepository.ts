// apps/server/src/repositories/interfaces/IReactionRepository.ts
import type { PrismaReaction, PrismaReactionType } from '@ems/types';

/**
 * Unified Reaction Repository
 * Handles polymorphic reactions on Content, Articles, and Predictions
 * Replaces: PostReaction, ArticleReaction, PredictionCommentLike logic
 */
export interface IReactionRepository {
  // ============================================
  // CONTENT REACTIONS (posts, comments)
  // ============================================

  /** Toggle reaction on content (add if doesn't exist, remove if exists, change if different type) */
  toggleContentReaction(
    contentId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PrismaReaction;
    previousType?: PrismaReactionType;
  }>;

  /** Get user's reaction on content */
  getUserContentReaction(contentId: number, userId: number): Promise<PrismaReaction | null>;

  /** Get all reactions on content */
  getContentReactions(contentId: number): Promise<PrismaReaction[]>;

  /** Get reaction counts for content */
  getContentReactionCounts(contentId: number): Promise<Record<PrismaReactionType, number>>;

  /** Get paginated reactions on content */
  getContentReactionsPaginated(
    contentId: number,
    options: {
      cursor?: number;
      limit?: number;
      type?: PrismaReactionType;
    },
  ): Promise<{ reactions: PrismaReaction[]; nextCursor?: number }>;

  // ============================================
  // ARTICLE REACTIONS
  // ============================================

  /** Toggle reaction on article */
  toggleArticleReaction(
    articleId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PrismaReaction;
    previousType?: PrismaReactionType;
  }>;

  /** Get user's reaction on article */
  getUserArticleReaction(articleId: number, userId: number): Promise<PrismaReaction | null>;

  /** Get all reactions on article */
  getArticleReactions(articleId: number): Promise<PrismaReaction[]>;

  /** Get reaction counts for article */
  getArticleReactionCounts(articleId: number): Promise<Record<PrismaReactionType, number>>;

  // ============================================
  // PREDICTION REACTIONS
  // ============================================

  /** Toggle reaction on prediction */
  togglePredictionReaction(
    predictionId: number,
    userId: number,
    type: PrismaReactionType,
  ): Promise<{
    action: 'added' | 'removed' | 'changed';
    reaction?: PrismaReaction;
    previousType?: PrismaReactionType;
  }>;

  /** Get user's reaction on prediction */
  getUserPredictionReaction(predictionId: number, userId: number): Promise<PrismaReaction | null>;

  /** Get all reactions on prediction */
  getPredictionReactions(predictionId: number): Promise<PrismaReaction[]>;

  /** Get reaction counts for prediction */
  getPredictionReactionCounts(predictionId: number): Promise<Record<PrismaReactionType, number>>;

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /** Get user reactions for multiple content items */
  getUserReactionsForContent(
    userId: number,
    contentIds: number[],
  ): Promise<Map<number, PrismaReaction>>;

  /** Get user reactions for multiple articles */
  getUserReactionsForArticles(
    userId: number,
    articleIds: number[],
  ): Promise<Map<number, PrismaReaction>>;

  /** Get user reactions for multiple predictions */
  getUserReactionsForPredictions(
    userId: number,
    predictionIds: number[],
  ): Promise<Map<number, PrismaReaction>>;

  // ============================================
  // STATISTICS
  // ============================================

  /** Get total reactions given by user */
  getUserReactionStats(userId: number): Promise<{
    totalReactions: number;
    reactionsByType: Record<PrismaReactionType, number>;
  }>;

  /** Get most popular content by reactions */
  getMostReactedContent(limit?: number): Promise<import('@ems/types').DbMostReactedContent[]>;
}
