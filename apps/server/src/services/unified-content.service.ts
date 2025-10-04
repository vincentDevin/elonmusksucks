// apps/server/src/services/unified-content.service.ts
import type {
  UnifiedContentFilters,
  UnifiedContentItem,
  UnifiedContentResponse,
  UnifiedContentBulkOperation,
  UnifiedContentBulkResult,
  UnifiedContentAnalytics,
  IEventBus,
} from '@ems/types';
import type { IUnifiedContentRepository } from '../repositories/interfaces/IUnifiedContentRepository';
import { UnifiedContentRepository } from '../repositories/UnifiedContentRepository';
import { PrismaClient } from '@prisma/client';

/**
 * Unified Content Service
 *
 * Business logic for unified content management across all content types.
 * Handles moderation, bulk operations, analytics, and event publishing.
 */
export class UnifiedContentService {
  private repo: IUnifiedContentRepository;

  constructor(
    private eventBus: IEventBus,
    private prisma: PrismaClient = new PrismaClient(),
  ) {
    this.repo = new UnifiedContentRepository(prisma);
  }

  /**
   * Get unified content with filters and pagination
   */
  async getContent(filters: UnifiedContentFilters): Promise<UnifiedContentResponse> {
    const { items, total } = await this.repo.getUnifiedContent(filters);

    const limit = filters.limit || 25;
    const offset = filters.offset || 0;
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const hasMore = offset + items.length < total;

    return {
      items,
      pagination: {
        total,
        hasMore,
        currentPage,
        totalPages,
        limit,
        offset,
      },
      filters,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get single unified content item by ID
   */
  async getContentById(unifiedId: string): Promise<UnifiedContentItem | null> {
    return this.repo.getUnifiedContentById(unifiedId);
  }

  /**
   * Perform bulk moderation operation
   */
  async bulkModerate(
    operation: UnifiedContentBulkOperation,
    moderatorId: number,
  ): Promise<UnifiedContentBulkResult> {
    const { action, itemIds, parameters } = operation;
    const results: UnifiedContentBulkResult['results'] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const itemId of itemIds) {
      try {
        const parts = itemId.split(':');
        if (parts.length !== 2) {
          results.push({
            itemId,
            success: false,
            error: 'Invalid unified ID format',
          });
          failureCount++;
          continue;
        }

        const [type, idStr] = parts;
        const id = parseInt(idStr, 10);

        if (isNaN(id)) {
          results.push({
            itemId,
            success: false,
            error: 'Invalid ID number',
          });
          failureCount++;
          continue;
        }

        // Perform action based on content type
        await this.performModerationAction(type as any, id, action, parameters, moderatorId);

        results.push({
          itemId,
          success: true,
        });
        successCount++;

        // Publish moderation event
        await this.publishModerationEvent(type as any, id, action, moderatorId);
      } catch (error) {
        results.push({
          itemId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failureCount++;
      }
    }

    return {
      successCount,
      failureCount,
      totalProcessed: itemIds.length,
      results,
      processedAt: new Date().toISOString(),
      processedBy: {
        id: moderatorId,
        name: 'Admin', // Would need to fetch from user
      },
    };
  }

  /**
   * Get analytics for unified content
   */
  async getAnalytics(timeRange?: string): Promise<UnifiedContentAnalytics> {
    // Parse time range (default: last 7 days)
    const days = this.parseTimeRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get content counts
    const counts = await this.repo.getContentCounts();

    // Get engagement metrics (simplified - would need more complex aggregation)
    const [totalViews, totalReactions, totalComments] = await Promise.all([
      this.prisma.content.aggregate({
        _sum: { viewsCount: true },
      }),
      this.prisma.content.aggregate({
        _sum: { reactionsCount: true },
      }),
      this.prisma.content.aggregate({
        _sum: { repliesCount: true },
      }),
    ]);

    // Get moderation stats
    const [pendingArticles, flaggedContent, rejectedArticles] = await Promise.all([
      this.prisma.article.count({ where: { status: 'PENDING' } }),
      this.prisma.content.count({ where: { isFlagged: true } }),
      this.prisma.article.count({ where: { status: 'REJECTED' } }),
    ]);

    // Get daily creation trends (last 7 days)
    const dailyCreated = await this.getDailyCreationTrends(startDate);

    // Get top tags (would need to aggregate from ArticleTag and Hashtag)
    const topTags = await this.getTopTags(10);

    // Get top authors
    const topAuthors = await this.getTopAuthors(5);

    return {
      overview: {
        totalItems: counts.total,
        itemsByType: counts.byType,
        itemsByStatus: counts.byStatus,
        averageQualityScore: 0, // Would need quality score implementation
        totalViews: Number(totalViews._sum.viewsCount || 0),
        totalReactions: totalReactions._sum.reactionsCount || 0,
        totalComments: totalComments._sum.repliesCount || 0,
      },

      moderation: {
        pendingReview: pendingArticles,
        flaggedContent,
        rejectedContent: rejectedArticles,
        autoModerated: 0, // Would need auto-moderation tracking
        manualReview: pendingArticles + flaggedContent,
        averageReviewTime: 0, // Would need review time tracking
      },

      trends: {
        dailyCreated,
        weeklyEngagement: [], // Would need to aggregate engagement data
        topTags,
        topAuthors,
      },

      quality: {
        averageScores: {
          quality: 0,
          readability: 0,
          toxicity: 0,
        },
        flaggedContent,
        aiGeneratedContent: 0,
        spamContent: 0,
        lowQualityContent: 0,
        highQualityContent: 0,
      },

      timeRange: {
        from: startDate.toISOString(),
        to: new Date().toISOString(),
        days,
      },

      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Approve content
   */
  async approveContent(unifiedId: string, moderatorId: number, reason?: string): Promise<void> {
    const parts = unifiedId.split(':');
    if (parts.length !== 2) throw new Error('Invalid unified ID format');

    const [type, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) throw new Error('Invalid ID number');

    await this.performModerationAction(type as any, id, 'approve', { reason }, moderatorId);
    await this.publishModerationEvent(type as any, id, 'approve', moderatorId);
  }

  /**
   * Reject content
   */
  async rejectContent(unifiedId: string, moderatorId: number, reason?: string): Promise<void> {
    const parts = unifiedId.split(':');
    if (parts.length !== 2) throw new Error('Invalid unified ID format');

    const [type, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) throw new Error('Invalid ID number');

    await this.performModerationAction(type as any, id, 'reject', { reason }, moderatorId);
    await this.publishModerationEvent(type as any, id, 'reject', moderatorId);
  }

  /**
   * Flag content for review
   */
  async flagContent(unifiedId: string, moderatorId: number, reason?: string): Promise<void> {
    const parts = unifiedId.split(':');
    if (parts.length !== 2) throw new Error('Invalid unified ID format');

    const [type, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) throw new Error('Invalid ID number');

    await this.performModerationAction(type as any, id, 'flag', { reason }, moderatorId);
    await this.publishModerationEvent(type as any, id, 'flag', moderatorId);
  }

  /**
   * Delete content
   */
  async deleteContent(unifiedId: string, moderatorId: number, _reason?: string): Promise<void> {
    const success = await this.repo.deleteUnifiedContent(unifiedId, moderatorId);
    if (!success) {
      throw new Error('Failed to delete content');
    }

    const parts = unifiedId.split(':');
    if (parts.length === 2) {
      await this.publishModerationEvent(
        parts[0] as any,
        parseInt(parts[1], 10),
        'delete',
        moderatorId,
      );
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Perform moderation action on specific content type
   */
  private async performModerationAction(
    type: string,
    id: number,
    action: string,
    parameters: any = {},
    _moderatorId: number,
  ): Promise<void> {
    switch (type) {
      case 'article':
        await this.moderateArticle(id, action, parameters);
        break;

      case 'user_post':
      case 'comment':
        await this.moderateContent(id, action, parameters);
        break;

      case 'prediction':
        await this.moderatePrediction(id, action, parameters);
        break;

      default:
        throw new Error(`Unknown content type: ${type}`);
    }
  }

  /**
   * Moderate an article
   */
  private async moderateArticle(id: number, action: string, parameters: any): Promise<void> {
    switch (action) {
      case 'approve':
        await this.prisma.article.update({
          where: { id },
          data: {
            status: 'APPROVED',
            modNotes: parameters.reason,
          },
        });
        break;

      case 'reject':
        await this.prisma.article.update({
          where: { id },
          data: {
            status: 'REJECTED',
            modNotes: parameters.reason,
          },
        });
        break;

      case 'delete':
        await this.prisma.article.delete({ where: { id } });
        break;
    }
  }

  /**
   * Moderate content (posts/comments)
   */
  private async moderateContent(id: number, action: string, parameters: any): Promise<void> {
    switch (action) {
      case 'approve':
        await this.prisma.content.update({
          where: { id },
          data: {
            isFlagged: false,
            moderationNote: parameters.reason,
          },
        });
        break;

      case 'reject':
      case 'flag':
        await this.prisma.content.update({
          where: { id },
          data: {
            isFlagged: true,
            moderationNote: parameters.reason,
          },
        });
        break;

      case 'delete':
        await this.prisma.content.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
        break;
    }
  }

  /**
   * Moderate a prediction
   */
  private async moderatePrediction(id: number, action: string, _parameters: any): Promise<void> {
    switch (action) {
      case 'approve':
        await this.prisma.prediction.update({
          where: { id },
          data: { approved: true },
        });
        break;

      case 'reject':
        await this.prisma.prediction.update({
          where: { id },
          data: { approved: false },
        });
        break;

      case 'delete':
        // Predictions shouldn't be deleted, mark as rejected instead
        await this.prisma.prediction.update({
          where: { id },
          data: { approved: false },
        });
        break;
    }
  }

  /**
   * Publish moderation event to Redis
   */
  private async publishModerationEvent(
    type: string,
    id: number,
    action: string,
    moderatorId: number,
  ): Promise<void> {
    const eventPayload = {
      type,
      id,
      action,
      moderatorId,
      timestamp: new Date().toISOString(),
    };

    // Publish to content moderation channel
    await this.eventBus.publish('content:moderated' as any, eventPayload);
  }

  /**
   * Parse time range string to number of days
   */
  private parseTimeRange(timeRange?: string): number {
    if (!timeRange) return 7;

    const match = timeRange.match(/(\d+)([dDwWmM])/);
    if (!match) return 7;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'd':
        return value;
      case 'w':
        return value * 7;
      case 'm':
        return value * 30;
      default:
        return 7;
    }
  }

  /**
   * Get daily creation trends
   */
  private async getDailyCreationTrends(startDate: Date): Promise<any[]> {
    // Simplified implementation - would need proper date aggregation
    const days = [];
    const current = new Date(startDate);
    const now = new Date();

    while (current <= now) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const [articleCount, contentCount, predictionCount] = await Promise.all([
        this.prisma.article.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.content.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.prediction.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      days.push({
        date: current.toISOString().split('T')[0],
        count: articleCount + contentCount + predictionCount,
        byType: {
          article: articleCount,
          user_post: contentCount,
          comment: 0, // Included in contentCount
          prediction: predictionCount,
        },
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * Get top tags by usage
   */
  private async getTopTags(limit: number): Promise<any[]> {
    const hashtags = await this.prisma.hashtag.findMany({
      orderBy: { usageCount: 'desc' },
      take: limit,
    });

    return hashtags.map((tag) => ({
      tag: tag.tag,
      count: tag.usageCount,
      engagement: 0, // Would need to aggregate engagement per tag
    }));
  }

  /**
   * Get top authors by content count
   */
  private async getTopAuthors(limit: number): Promise<any[]> {
    // Group by author and count
    const authors = await this.prisma.content.groupBy({
      by: ['authorId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const authorsWithDetails = await Promise.all(
      authors.map(async (author) => {
        const user = await this.prisma.user.findUnique({
          where: { id: author.authorId },
        });

        return {
          id: author.authorId,
          name: user?.name || 'Unknown',
          type: 'user' as const,
          itemCount: author._count.id,
          totalEngagement: 0, // Would need to sum engagement metrics
        };
      }),
    );

    return authorsWithDetails;
  }
}
