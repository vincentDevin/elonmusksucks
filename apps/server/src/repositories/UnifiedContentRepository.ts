// apps/server/src/repositories/UnifiedContentRepository.ts
import { PrismaClient, ArticleStatus } from '@prisma/client';
import type {
  UnifiedContentFilters,
  UnifiedContentItem,
  UnifiedContentType,
  UnifiedContentStatus,
  PrismaArticle,
  PrismaContent,
  PrismaPrediction,
  PrismaUser,
  PrismaFeedSource,
} from '@ems/types';
import {
  transformArticleToUnified,
  transformPostToUnified,
  transformCommentToUnified,
  transformPredictionToUnified,
  transformAndSortUnifiedContent,
} from '@ems/types';
import { IUnifiedContentRepository } from './interfaces/IUnifiedContentRepository';

/**
 * Unified Content Repository
 *
 * Orchestrates queries across Article, Content, and Prediction models
 * to provide a unified content management interface.
 *
 * This repository does NOT replace existing repositories - it orchestrates them.
 */
export class UnifiedContentRepository implements IUnifiedContentRepository {
  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  /**
   * Get unified content with comprehensive filtering
   */
  async getUnifiedContent(filters: UnifiedContentFilters): Promise<{
    items: UnifiedContentItem[];
    total: number;
  }> {
    const {
      types,
      statuses,
      authorIds,
      search,
      tags: _tags, // TODO: Implement tag filtering when needed
      createdAfter,
      createdBefore,
      minViews,
      minReactions,
      minComments,
      limit = 25,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Determine which types to fetch (default to all)
    const fetchTypes =
      types && types.length > 0 ? types : ['article', 'user_post', 'comment', 'prediction'];

    // Fetch from each model based on type filters
    const results: {
      articles?: Array<PrismaArticle & { feed?: PrismaFeedSource | null }>;
      posts?: Array<PrismaContent & { author: PrismaUser }>;
      comments?: Array<PrismaContent & { author: PrismaUser }>;
      predictions?: Array<
        PrismaPrediction & {
          creator?: PrismaUser;
          category?: { id: number; name: string } | null;
        }
      >;
    } = {};

    // Common date filters
    const dateFilter = {
      ...(createdAfter && { gte: new Date(createdAfter) }),
      ...(createdBefore && { lte: new Date(createdBefore) }),
    };

    // ARTICLES
    if (fetchTypes.includes('article')) {
      const articleStatusFilter = this.mapStatusesToArticleFilter(statuses);

      results.articles = await this.prisma.article.findMany({
        where: {
          ...(articleStatusFilter && { status: { in: articleStatusFilter } }),
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { excerpt: { contains: search, mode: 'insensitive' } },
            ],
          }),
          ...(minReactions !== undefined && { reactionsCount: { gte: minReactions } }),
          ...(minComments !== undefined && { commentsCount: { gte: minComments } }),
        },
        include: {
          feed: true,
        },
        take: limit * 2, // Get extra to handle post-filter limit
      });
    }

    // USER POSTS
    if (fetchTypes.includes('user_post')) {
      const contentStatusFilter = this.mapStatusesToContentFilter(statuses);

      results.posts = await this.prisma.content.findMany({
        where: {
          type: 'POST',
          ...contentStatusFilter,
          ...(authorIds && { authorId: { in: authorIds } }),
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            body: { contains: search, mode: 'insensitive' },
          }),
          ...(minViews !== undefined && { viewsCount: { gte: BigInt(minViews) } }),
          ...(minReactions !== undefined && { reactionsCount: { gte: minReactions } }),
          ...(minComments !== undefined && { repliesCount: { gte: minComments } }),
          // Top-level posts only (no parent)
          parentId: null,
          articleId: null,
          predictionId: null,
        },
        include: {
          author: true,
        },
        take: limit * 2,
      });
    }

    // COMMENTS
    if (fetchTypes.includes('comment')) {
      const contentStatusFilter = this.mapStatusesToContentFilter(statuses);

      results.comments = await this.prisma.content.findMany({
        where: {
          type: 'COMMENT',
          ...contentStatusFilter,
          ...(authorIds && { authorId: { in: authorIds } }),
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            body: { contains: search, mode: 'insensitive' },
          }),
          ...(minViews !== undefined && { viewsCount: { gte: BigInt(minViews) } }),
          ...(minReactions !== undefined && { reactionsCount: { gte: minReactions } }),
        },
        include: {
          author: true,
        },
        take: limit * 2,
      });
    }

    // PREDICTIONS
    if (fetchTypes.includes('prediction')) {
      const predictionStatusFilter = this.mapStatusesToPredictionFilter(statuses);

      results.predictions = await this.prisma.prediction.findMany({
        where: {
          ...predictionStatusFilter,
          ...(authorIds && { creatorUserId: { in: authorIds } }),
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          ...(search && {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }),
          ...(minViews !== undefined && { viewCount: { gte: minViews } }),
        },
        include: {
          creator: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: limit * 2,
      });
    }

    // Transform and merge all content
    // Map sortBy to valid transform function values (only 'createdAt', 'updatedAt', 'views' supported)
    const validSortBy: 'createdAt' | 'updatedAt' | 'views' =
      sortBy === 'updatedAt' || sortBy === 'views' ? sortBy : 'createdAt';
    const unified = transformAndSortUnifiedContent(results, validSortBy, sortOrder);

    // Apply pagination
    const paginated = unified.slice(offset, offset + limit);
    const total = unified.length;

    return { items: paginated, total };
  }

  /**
   * Get unified content by ID
   */
  async getUnifiedContentById(unifiedId: string): Promise<UnifiedContentItem | null> {
    const parts = unifiedId.split(':');
    if (parts.length !== 2) return null;

    const [type, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) return null;

    switch (type as UnifiedContentType) {
      case 'article': {
        const article = await this.prisma.article.findUnique({
          where: { id },
          include: { feed: true },
        });
        return article ? transformArticleToUnified(article) : null;
      }

      case 'user_post':
      case 'comment': {
        const content = await this.prisma.content.findUnique({
          where: { id },
          include: { author: true },
        });
        if (!content) return null;
        return content.type === 'POST'
          ? transformPostToUnified(content)
          : transformCommentToUnified(content);
      }

      case 'prediction': {
        const prediction = await this.prisma.prediction.findUnique({
          where: { id },
          include: {
            creator: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        return prediction ? transformPredictionToUnified(prediction) : null;
      }

      default:
        return null;
    }
  }

  /**
   * Get content count by type and status
   */
  async getContentCounts(): Promise<{
    byType: Record<UnifiedContentType, number>;
    byStatus: Record<UnifiedContentStatus, number>;
    total: number;
  }> {
    const [articleCount, postCount, commentCount, predictionCount] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.content.count({ where: { type: 'POST', parentId: null } }),
      this.prisma.content.count({ where: { type: 'COMMENT' } }),
      this.prisma.prediction.count(),
    ]);

    const byType: Record<UnifiedContentType, number> = {
      article: articleCount,
      user_post: postCount,
      comment: commentCount,
      prediction: predictionCount,
    };

    // Status counts (simplified - would need more complex queries for exact counts)
    const [pendingArticles, approvedArticles, rejectedArticles] = await Promise.all([
      this.prisma.article.count({ where: { status: 'PENDING' } }),
      this.prisma.article.count({ where: { status: 'APPROVED' } }),
      this.prisma.article.count({ where: { status: 'REJECTED' } }),
    ]);

    const [flaggedContent, deletedContent] = await Promise.all([
      this.prisma.content.count({ where: { isFlagged: true } }),
      this.prisma.content.count({ where: { isDeleted: true } }),
    ]);

    const [pendingPredictions, approvedPredictions] = await Promise.all([
      this.prisma.prediction.count({ where: { approved: false } }),
      this.prisma.prediction.count({ where: { approved: true } }),
    ]);

    const byStatus: Record<UnifiedContentStatus, number> = {
      pending: pendingArticles + pendingPredictions,
      approved: approvedArticles + approvedPredictions,
      rejected: rejectedArticles,
      flagged: flaggedContent,
      deleted: deletedContent,
      draft: 0, // Not implemented yet
    };

    const total = articleCount + postCount + commentCount + predictionCount;

    return { byType, byStatus, total };
  }

  /**
   * Delete content by unified ID
   */
  async deleteUnifiedContent(unifiedId: string, deletedBy: number): Promise<boolean> {
    const parts = unifiedId.split(':');
    if (parts.length !== 2) return false;

    const [type, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) return false;

    try {
      switch (type as UnifiedContentType) {
        case 'article':
          await this.prisma.article.delete({ where: { id } });
          return true;

        case 'user_post':
        case 'comment':
          await this.prisma.content.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy },
          });
          return true;

        case 'prediction':
          // Predictions typically shouldn't be deleted, but we can mark as rejected
          await this.prisma.prediction.update({
            where: { id },
            data: { approved: false },
          });
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error deleting unified content:', error);
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Map unified statuses to Article status filter
   */
  private mapStatusesToArticleFilter(
    statuses?: UnifiedContentStatus[],
  ): ArticleStatus[] | undefined {
    if (!statuses || statuses.length === 0) return undefined;

    const mapped: ArticleStatus[] = [];
    if (statuses.includes('pending')) mapped.push(ArticleStatus.PENDING);
    if (statuses.includes('approved')) mapped.push(ArticleStatus.APPROVED);
    if (statuses.includes('rejected')) mapped.push(ArticleStatus.REJECTED);

    return mapped.length > 0 ? mapped : undefined;
  }

  /**
   * Map unified statuses to Content filter object
   */
  private mapStatusesToContentFilter(statuses?: UnifiedContentStatus[]): Record<string, any> {
    if (!statuses || statuses.length === 0) return {};

    const filter: Record<string, any> = {};

    if (statuses.includes('flagged')) {
      filter.isFlagged = true;
    }

    if (statuses.includes('deleted')) {
      filter.isDeleted = true;
    }

    // For approved/pending, we use the absence of flags
    if (statuses.includes('approved') || statuses.includes('pending')) {
      if (!statuses.includes('flagged') && !statuses.includes('deleted')) {
        filter.isFlagged = false;
        filter.isDeleted = false;
      }
    }

    return filter;
  }

  /**
   * Map unified statuses to Prediction filter object
   */
  private mapStatusesToPredictionFilter(statuses?: UnifiedContentStatus[]): Record<string, any> {
    if (!statuses || statuses.length === 0) return {};

    const filter: Record<string, any> = {};

    if (statuses.includes('approved')) {
      filter.approved = true;
    }

    if (statuses.includes('pending')) {
      filter.approved = false;
    }

    return filter;
  }
}
