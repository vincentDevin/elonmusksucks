import { PrismaClient } from '@prisma/client';
import type {
  UnifiedContentItem,
  UnifiedContentFilters,
  UnifiedContentResponse,
  UnifiedContentBulkOperation,
  UnifiedContentBulkResult,
  UnifiedContentAnalytics,
  UnifiedContentType,
  UnifiedContentStatus,
  ContentAuthorType,
} from '@ems/types';

/**
 * Unified Content Management Service
 *
 * This service provides a unified interface for managing all content types:
 * - Articles (from RSS feeds)
 * - User posts (user-generated content)
 * - Comments (on articles and posts)
 * - Predictions (prediction market content)
 *
 * Key features:
 * - Cross-content filtering and search
 * - Unified moderation workflows
 * - Bulk operations across content types
 * - Analytics and insights
 * - Real-time event publishing
 */
export class UnifiedContentService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get unified content items with filtering and pagination
   */
  async getContent(filters: UnifiedContentFilters): Promise<UnifiedContentResponse> {
    // const startTime = Date.now(); // TODO: Add performance tracking

    // Set defaults
    const limit = Math.min(filters.limit || 25, 100);
    const offset = filters.offset || 0;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const results: UnifiedContentItem[] = [];
    let totalCount = 0;

    // Fetch each content type based on filters
    if (!filters.types || filters.types.includes('article')) {
      const articles = await this.getArticles(filters, limit, offset);
      results.push(...articles.items);
      totalCount += articles.total;
    }

    if (!filters.types || filters.types.includes('user_post')) {
      const userPosts = await this.getUserPosts(filters, limit, offset);
      results.push(...userPosts.items);
      totalCount += userPosts.total;
    }

    if (!filters.types || filters.types.includes('comment')) {
      const comments = await this.getComments(filters, limit, offset);
      results.push(...comments.items);
      totalCount += comments.total;
    }

    if (!filters.types || filters.types.includes('prediction')) {
      const predictions = await this.getPredictions(filters, limit, offset);
      results.push(...predictions.items);
      totalCount += predictions.total;
    }

    // Sort results by the specified field
    results.sort((a, b) => {
      const aValue = this.getSortValue(a, sortBy);
      const bValue = this.getSortValue(b, sortBy);

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply limit after sorting
    const paginatedResults = results.slice(0, limit);

    return {
      items: paginatedResults,
      pagination: {
        total: totalCount,
        hasMore: totalCount > offset + limit,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get articles and convert to unified format
   */
  private async getArticles(
    filters: UnifiedContentFilters,
    limit: number,
    offset: number,
  ): Promise<{ items: UnifiedContentItem[]; total: number }> {
    try {
      // Build article-specific filters
      const where: any = {};

      if (filters.statuses) {
        where.status = { in: filters.statuses };
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
        if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [articles, total] = await Promise.all([
        this.prisma.article.findMany({
          where,
          include: {
            feed: true,
            articleReactions: {
              include: { user: true },
            },
            articleComments: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.article.count({ where }),
      ]);

      const unifiedItems = articles.map((article) => this.articleToUnified(article));

      return { items: unifiedItems, total };
    } catch (error) {
      console.error('Error fetching articles:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get user posts and convert to unified format
   */
  private async getUserPosts(
    filters: UnifiedContentFilters,
    limit: number,
    offset: number,
  ): Promise<{ items: UnifiedContentItem[]; total: number }> {
    try {
      const where: any = {};

      if (filters.authorIds) {
        where.authorId = { in: filters.authorIds };
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
        if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
      }

      if (filters.search) {
        where.content = { contains: filters.search, mode: 'insensitive' };
      }

      // Apply status filters if they map to user post fields
      if (filters.statuses) {
        if (filters.statuses.includes('deleted')) {
          where.isDeleted = true;
        }
        if (filters.statuses.includes('flagged')) {
          where.isFlagged = true;
        }
      }

      const [userPosts, total] = await Promise.all([
        this.prisma.userPost.findMany({
          where,
          include: {
            author: true,
            reactions: {
              include: { user: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.userPost.count({ where }),
      ]);

      const unifiedItems = userPosts.map((post) => this.userPostToUnified(post));

      return { items: unifiedItems, total };
    } catch (error) {
      console.error('Error fetching user posts:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get comments and convert to unified format
   */
  private async getComments(
    filters: UnifiedContentFilters,
    limit: number,
    offset: number,
  ): Promise<{ items: UnifiedContentItem[]; total: number }> {
    try {
      const where: any = {};

      if (filters.authorIds) {
        where.authorId = { in: filters.authorIds };
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
        if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
      }

      if (filters.search) {
        where.content = { contains: filters.search, mode: 'insensitive' };
      }

      if (filters.statuses?.includes('deleted')) {
        where.isDeleted = true;
      }

      const [comments, total] = await Promise.all([
        this.prisma.articleComment.findMany({
          where,
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.articleComment.count({ where }),
      ]);

      const unifiedItems = comments.map((comment) => this.commentToUnified(comment));

      return { items: unifiedItems, total };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get predictions and convert to unified format
   */
  private async getPredictions(
    filters: UnifiedContentFilters,
    limit: number,
    offset: number,
  ): Promise<{ items: UnifiedContentItem[]; total: number }> {
    try {
      const where: any = {};

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
        if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.statuses) {
        // Map unified statuses to prediction statuses
        const predictionStatuses = filters.statuses.map((status) => {
          switch (status) {
            case 'pending':
              return 'PENDING';
            case 'approved':
              return 'ACTIVE';
            case 'rejected':
              return 'REJECTED';
            default:
              return status.toUpperCase();
          }
        });
        where.status = { in: predictionStatuses };
      }

      const [predictions, total] = await Promise.all([
        this.prisma.prediction.findMany({
          where,
          include: {
            options: true,
            bets: {
              include: { user: true },
            },
            sourceLinks: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.prediction.count({ where }),
      ]);

      const unifiedItems = predictions.map((prediction) => this.predictionToUnified(prediction));

      return { items: unifiedItems, total };
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Convert Article to UnifiedContentItem
   */
  private articleToUnified(article: any): UnifiedContentItem {
    return {
      id: `article:${article.id}`,
      originalId: article.id,
      type: 'article',
      title: article.title,
      content: article.content || article.excerpt || '',
      excerpt: article.excerpt,
      author: {
        id: article.feed?.id || 0,
        name: article.feed?.name || 'Unknown Feed',
        type: 'feed' as ContentAuthorType,
      },
      status: this.mapArticleStatus(article.status),
      priority: 'normal',
      visibility: 'public',
      flags: [],
      metadata: {
        sourceId: article.feedId,
        url: article.url,
        tags: article.tags || [],
        categories: article.categories || [],
        language: article.language,
        imageUrls: article.imageUrl ? [article.imageUrl] : [],
      },
      engagement: {
        views: article.viewCount || 0,
        reactions: this.aggregateReactions(article.articleReactions || []),
        comments: article.articleComments?.length || 0,
        shares: 0,
        bookmarks: 0,
      },
      timestamps: {
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt?.toISOString(),
        publishedAt: article.publishedAt?.toISOString(),
      },
    };
  }

  /**
   * Convert UserPost to UnifiedContentItem
   */
  private userPostToUnified(post: any): UnifiedContentItem {
    return {
      id: `user_post:${post.id}`,
      originalId: post.id,
      type: 'user_post',
      content: post.content,
      excerpt: post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content,
      author: {
        id: post.author.id,
        name: post.author.name,
        type: 'user' as ContentAuthorType,
        avatarUrl: post.author.profileImageUrl,
      },
      status: this.mapUserPostStatus(post),
      priority: 'normal',
      visibility: post.visibility || 'public',
      flags: post.isFlagged ? ['flagged'] : [],
      metadata: {
        parentId: post.parentId,
        threadId: post.threadId,
        tags: [],
        categories: [],
      },
      engagement: {
        views: post.viewsCount || 0,
        reactions: this.aggregateReactions(post.reactions || []),
        comments: post.comments?.length || 0,
        shares: post.sharesCount || 0,
        bookmarks: 0,
      },
      timestamps: {
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt?.toISOString(),
        deletedAt: post.isDeleted ? post.updatedAt?.toISOString() : undefined,
      },
    };
  }

  /**
   * Convert Comment to UnifiedContentItem
   */
  private commentToUnified(comment: any): UnifiedContentItem {
    return {
      id: `comment:${comment.id}`,
      originalId: comment.id,
      type: 'comment',
      content: comment.content,
      excerpt:
        comment.content.length > 100 ? comment.content.substring(0, 100) + '...' : comment.content,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        type: 'user' as ContentAuthorType,
        avatarUrl: comment.author.profileImageUrl,
      },
      status: comment.isDeleted ? 'deleted' : 'approved',
      priority: 'normal',
      visibility: 'public',
      flags: [],
      metadata: {
        parentId: comment.parentId,
        sourceId: comment.entityId,
        tags: [],
        categories: [comment.entityType],
      },
      engagement: {
        views: 0,
        reactions: this.aggregateReactions(comment.reactions || []),
        comments: 0,
        shares: 0,
        bookmarks: 0,
      },
      timestamps: {
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt?.toISOString(),
        deletedAt: comment.isDeleted ? comment.updatedAt?.toISOString() : undefined,
      },
    };
  }

  /**
   * Convert Prediction to UnifiedContentItem
   */
  private predictionToUnified(prediction: any): UnifiedContentItem {
    return {
      id: `prediction:${prediction.id}`,
      originalId: prediction.id,
      type: 'prediction',
      title: prediction.title,
      content: prediction.description || '',
      excerpt:
        prediction.description?.length > 200
          ? prediction.description.substring(0, 200) + '...'
          : prediction.description,
      author: {
        id: 0, // System-generated
        name: 'System',
        type: 'system' as ContentAuthorType,
      },
      status: this.mapPredictionStatus(prediction.status),
      priority: 'normal',
      visibility: 'public',
      flags: [],
      metadata: {
        tags: prediction.tags || [],
        categories: prediction.categories || [],
        url: prediction.sourceLinks?.[0]?.url,
      },
      engagement: {
        views: 0,
        reactions: {},
        comments: 0,
        shares: 0,
        bookmarks: 0,
      },
      timestamps: {
        createdAt: prediction.createdAt.toISOString(),
        updatedAt: prediction.updatedAt?.toISOString(),
        publishedAt: prediction.createdAt.toISOString(),
      },
    };
  }

  /**
   * Perform bulk operations on content items
   */
  async performBulkOperation(
    operation: UnifiedContentBulkOperation,
  ): Promise<UnifiedContentBulkResult> {
    const result: UnifiedContentBulkResult = {
      successCount: 0,
      failureCount: 0,
      totalProcessed: operation.itemIds.length,
      errors: [],
      warnings: [],
      processedAt: new Date().toISOString(),
    };

    for (const itemId of operation.itemIds) {
      try {
        const [type, id] = itemId.split(':');
        const numericId = parseInt(id);

        switch (operation.action) {
          case 'approve':
            await this.approveContent(type as UnifiedContentType, numericId);
            break;
          case 'reject':
            await this.rejectContent(type as UnifiedContentType, numericId);
            break;
          case 'delete':
            await this.deleteContent(type as UnifiedContentType, numericId);
            break;
          case 'flag':
            await this.flagContent(
              type as UnifiedContentType,
              numericId,
              operation.parameters?.reason,
            );
            break;
          default:
            throw new Error(`Unsupported bulk operation: ${operation.action}`);
        }

        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({
          itemId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Get content analytics
   */
  async getAnalytics(): Promise<UnifiedContentAnalytics> {
    // This would aggregate data across all content types
    // Implementation would involve complex queries across multiple tables
    const overview = {
      totalItems: 0,
      itemsByType: {
        article: await this.prisma.article.count(),
        user_post: await this.prisma.userPost.count(),
        comment: await this.prisma.articleComment.count(),
        prediction: await this.prisma.prediction.count(),
        feed: await this.prisma.feedSource.count(),
      } as Record<UnifiedContentType, number>,
      itemsByStatus: {} as Record<UnifiedContentStatus, number>,
      averageQualityScore: 75, // Mock for now
      totalViews: 0,
      totalReactions: 0,
      totalComments: 0,
    };

    overview.totalItems = Object.values(overview.itemsByType).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      overview,
      trends: {
        dailyCreated: [], // Would implement actual trend queries
        weeklyEngagement: [],
        topTags: [],
      },
      quality: {
        averageScores: {
          quality: 75,
          readability: 80,
          toxicity: 10,
        },
        flaggedContent: 0,
        aiGeneratedContent: 0,
        spamContent: 0,
        lowQualityContent: 0,
      },
      moderation: {
        pendingReview: 0,
        autoApproved: 0,
        manuallyApproved: 0,
        rejected: 0,
        averageProcessingTime: 5.2,
        moderatorWorkload: [],
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // Helper methods

  private getSortValue(item: UnifiedContentItem, sortBy: string): any {
    switch (sortBy) {
      case 'createdAt':
        return item.timestamps.createdAt;
      case 'updatedAt':
        return item.timestamps.updatedAt || item.timestamps.createdAt;
      case 'publishedAt':
        return item.timestamps.publishedAt || item.timestamps.createdAt;
      case 'views':
        return item.engagement.views;
      case 'reactions':
        return Object.values(item.engagement.reactions).reduce((sum, count) => sum + count, 0);
      default:
        return item.timestamps.createdAt;
    }
  }

  private mapArticleStatus(status: string): UnifiedContentStatus {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'APPROVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  private mapUserPostStatus(post: any): UnifiedContentStatus {
    if (post.isDeleted) return 'deleted';
    if (post.isFlagged) return 'flagged';
    return 'approved';
  }

  private mapPredictionStatus(status: string): UnifiedContentStatus {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'ACTIVE':
        return 'approved';
      case 'RESOLVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  private aggregateReactions(reactions: any[]): Record<string, number> {
    const aggregated: Record<string, number> = {};
    reactions.forEach((reaction) => {
      aggregated[reaction.type] = (aggregated[reaction.type] || 0) + 1;
    });
    return aggregated;
  }

  private async approveContent(type: UnifiedContentType, id: number): Promise<void> {
    switch (type) {
      case 'article':
        await this.prisma.article.update({
          where: { id },
          data: { status: 'APPROVED' },
        });
        break;
      case 'user_post':
        await this.prisma.userPost.update({
          where: { id },
          data: { isFlagged: false },
        });
        break;
      default:
        throw new Error(`Approve not supported for type: ${type}`);
    }
  }

  private async rejectContent(type: UnifiedContentType, id: number): Promise<void> {
    switch (type) {
      case 'article':
        await this.prisma.article.update({
          where: { id },
          data: { status: 'REJECTED' },
        });
        break;
      default:
        throw new Error(`Reject not supported for type: ${type}`);
    }
  }

  private async deleteContent(type: UnifiedContentType, id: number): Promise<void> {
    switch (type) {
      case 'user_post':
        await this.prisma.userPost.update({
          where: { id },
          data: { isDeleted: true },
        });
        break;
      case 'comment':
        await this.prisma.articleComment.delete({
          where: { id },
        });
        break;
      default:
        throw new Error(`Delete not supported for type: ${type}`);
    }
  }

  private async flagContent(type: UnifiedContentType, id: number, _reason?: string): Promise<void> {
    switch (type) {
      case 'user_post':
        await this.prisma.userPost.update({
          where: { id },
          data: { isFlagged: true },
        });
        break;
      default:
        throw new Error(`Flag not supported for type: ${type}`);
    }
  }
}

// Export singleton instance
export const unifiedContentService = new UnifiedContentService();
