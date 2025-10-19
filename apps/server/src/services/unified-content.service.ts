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
import { PrismaAdminRepository } from '../repositories/AdminRepository';
import { AnalyticsRepository } from '../repositories/AnalyticsRepository';
import { TagRepository } from '../repositories/TagRepository';
import { ContentRepository } from '../repositories/ContentRepository';
import { FeedRepository } from '../repositories/FeedRepository';
import { UserService } from './user.service';

/**
 * Unified Content Service
 *
 * Business logic for unified content management across all content types.
 * Handles moderation, bulk operations, analytics, and event publishing.
 */
export class UnifiedContentService {
  private repo: IUnifiedContentRepository;
  private adminRepo: PrismaAdminRepository;
  private analyticsRepo: AnalyticsRepository;
  private tagRepo: TagRepository;
  private contentRepo: ContentRepository;
  private feedRepo: FeedRepository;
  private userService: UserService;

  constructor(private eventBus: IEventBus) {
    this.repo = new UnifiedContentRepository();
    this.adminRepo = new PrismaAdminRepository();
    this.analyticsRepo = new AnalyticsRepository();
    this.tagRepo = new TagRepository();
    this.contentRepo = new ContentRepository();
    this.feedRepo = new FeedRepository();
    this.userService = new UserService();
  }

  /**
   * Get unified content with filters and pagination
   */
  async getContent(filters: UnifiedContentFilters): Promise<UnifiedContentResponse> {
    const { items, total } = await this.repo.getUnifiedContent(filters);

    // Enrich author avatars for items that have author data
    const authors = items.filter((item: any) => item.author).map((item: any) => item.author);
    if (authors.length > 0) {
      const enrichedAuthors = await this.userService.enrichUsersWithAvatars(authors);
      const authorMap = new Map(enrichedAuthors.map((author) => [author.id, author]));

      // Map enriched authors back to items
      items.forEach((item: any) => {
        if (item.author) {
          const enrichedAuthor = authorMap.get(item.author.id);
          if (enrichedAuthor) {
            item.author = enrichedAuthor;
          }
        }
      });
    }

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
    const item = await this.repo.getUnifiedContentById(unifiedId);

    if (!item) return null;

    // Enrich author avatar if author data exists
    if ((item as any).author) {
      const enrichedAuthor = await this.userService.enrichUserWithAvatar((item as any).author);
      (item as any).author = enrichedAuthor;
    }

    return item;
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

    // Get engagement metrics from repository
    const engagement = await this.contentRepo.getEngagementTotals();

    // Get moderation stats from repositories
    const [pendingArticles, flaggedContent, rejectedArticles] = await Promise.all([
      this.feedRepo.getPendingArticlesCount(),
      this.contentRepo.getFlaggedContentCount(),
      this.feedRepo.getRejectedArticlesCount(),
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
        totalViews: engagement.totalViews,
        totalReactions: engagement.totalReactions,
        totalComments: engagement.totalComments,
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
        await this.feedRepo.updateArticleStatus(id, 'APPROVED', parameters.reason);
        break;

      case 'reject':
        await this.feedRepo.updateArticleStatus(id, 'REJECTED', parameters.reason);
        break;

      case 'delete':
        await this.feedRepo.deleteArticle(id);
        break;
    }
  }

  /**
   * Moderate content (posts/comments)
   */
  private async moderateContent(id: number, action: string, parameters: any): Promise<void> {
    switch (action) {
      case 'approve':
        await this.contentRepo.updateContentModeration(id, {
          isFlagged: false,
          moderationNote: parameters.reason,
        });
        break;

      case 'reject':
      case 'flag':
        await this.contentRepo.updateContentModeration(id, {
          isFlagged: true,
          moderationNote: parameters.reason,
        });
        break;

      case 'delete':
        // Use soft delete (sets isDeleted = true)
        // Pass 0 as moderatorId since we don't have it in this context
        await this.contentRepo.deleteContent(id, 0, true);
        break;
    }
  }

  /**
   * Moderate a prediction
   */
  private async moderatePrediction(id: number, action: string, _parameters: any): Promise<void> {
    switch (action) {
      case 'approve':
        await this.adminRepo.updatePredictionStatus(id, 'approved');
        break;

      case 'reject':
        await this.adminRepo.updatePredictionStatus(id, 'rejected');
        break;

      case 'delete':
        // Predictions shouldn't be deleted, mark as rejected instead
        await this.adminRepo.updatePredictionStatus(id, 'rejected');
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
    const endDate = new Date();
    const dailyData = await this.analyticsRepo.getDailyCreationCounts(startDate, endDate);

    return dailyData.map((day) => ({
      date: day.date,
      count: day.total,
      byType: {
        article: day.articles,
        user_post: day.posts,
        comment: 0, // Posts include comments in the count
        prediction: day.predictions,
      },
    }));
  }

  /**
   * Get top tags by usage
   */
  private async getTopTags(limit: number): Promise<any[]> {
    const tags = await this.tagRepo.getPopularTags(limit);

    return tags.map((tag) => ({
      tag: tag.name,
      count: tag.usageCount,
      engagement: 0, // Would need to aggregate engagement per tag
    }));
  }

  /**
   * Get top authors by content count
   */
  private async getTopAuthors(limit: number): Promise<any[]> {
    const authors = await this.analyticsRepo.getTopAuthors(limit);

    return authors.map((author) => ({
      id: author.userId,
      name: author.username,
      type: 'user' as const,
      itemCount: author.contentCount,
      totalEngagement: 0, // Would need to sum engagement metrics
    }));
  }
}
