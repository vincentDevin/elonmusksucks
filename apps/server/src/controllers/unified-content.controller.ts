// apps/server/src/controllers/unified-content.controller.ts
import type { Response } from 'express';
import type {
  UnifiedContentFilters,
  UnifiedContentBulkOperation,
  IEventBus,
  UnifiedContentType,
  UnifiedContentStatus,
} from '@ems/types';
import type { AuthRequest } from '../middleware/auth.middleware';
import { UnifiedContentService } from '../services/unified-content.service';
import { PrismaClient } from '@prisma/client';

/**
 * Unified Content Controller
 *
 * Handles HTTP requests for unified content management.
 * Admin-only endpoints for cross-content moderation and analytics.
 */
export class UnifiedContentController {
  private service: UnifiedContentService;

  constructor(eventBus: IEventBus, prisma: PrismaClient = new PrismaClient()) {
    this.service = new UnifiedContentService(eventBus, prisma);
  }

  /**
   * GET /api/admin/unified-content
   * Get unified content with filters
   */
  async getContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters: UnifiedContentFilters = {
        // Type filtering
        types: req.query['types[]']
          ? Array.isArray(req.query['types[]'])
            ? (req.query['types[]'] as UnifiedContentType[])
            : [req.query['types[]'] as UnifiedContentType]
          : undefined,

        // Status filtering
        statuses: req.query['statuses[]']
          ? Array.isArray(req.query['statuses[]'])
            ? (req.query['statuses[]'] as UnifiedContentStatus[])
            : [req.query['statuses[]'] as UnifiedContentStatus]
          : undefined,

        // Author filtering
        authorIds: req.query['authorIds[]']
          ? (Array.isArray(req.query['authorIds[]'])
              ? req.query['authorIds[]']
              : [req.query['authorIds[]']]
            ).map((id) => parseInt(id as string, 10))
          : undefined,

        // Search
        search: req.query.search as string | undefined,

        // Tags
        tags: req.query['tags[]']
          ? Array.isArray(req.query['tags[]'])
            ? (req.query['tags[]'] as string[])
            : [req.query['tags[]'] as string]
          : undefined,

        // Date ranges
        createdAfter: req.query.createdAfter as string | undefined,
        createdBefore: req.query.createdBefore as string | undefined,
        publishedAfter: req.query.publishedAfter as string | undefined,
        publishedBefore: req.query.publishedBefore as string | undefined,

        // Engagement filters
        minViews: req.query.minViews ? parseInt(req.query.minViews as string, 10) : undefined,
        minReactions: req.query.minReactions
          ? parseInt(req.query.minReactions as string, 10)
          : undefined,
        minComments: req.query.minComments
          ? parseInt(req.query.minComments as string, 10)
          : undefined,

        // Quality filters
        minQualityScore: req.query.minQualityScore
          ? parseInt(req.query.minQualityScore as string, 10)
          : undefined,

        // Pagination
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,

        // Sorting
        sortBy: req.query.sortBy as any,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const response = await this.service.getContent(filters);
      res.json(response);
    } catch (error) {
      console.error('Error getting unified content:', error);
      res.status(500).json({
        error: 'Failed to fetch unified content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/admin/unified-content/:id
   * Get single unified content item
   */
  async getContentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const content = await this.service.getContentById(id);

      if (!content) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json(content);
    } catch (error) {
      console.error('Error getting content by ID:', error);
      res.status(500).json({
        error: 'Failed to fetch content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/unified-content/bulk
   * Perform bulk moderation operation
   */
  async bulkModerate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const operation: UnifiedContentBulkOperation = req.body;
      const moderatorId = req.user?.id;

      if (!moderatorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate operation
      if (!operation.action || !operation.itemIds || operation.itemIds.length === 0) {
        res.status(400).json({ error: 'Invalid bulk operation' });
        return;
      }

      const result = await this.service.bulkModerate(operation, moderatorId);
      res.json(result);
    } catch (error) {
      console.error('Error performing bulk moderation:', error);
      res.status(500).json({
        error: 'Failed to perform bulk operation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/admin/unified-content/analytics
   * Get unified content analytics
   */
  async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const timeRange = req.query.timeRange as string | undefined;
      const analytics = await this.service.getAnalytics(timeRange);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/unified-content/:id/approve
   * Approve content
   */
  async approveContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const moderatorId = req.user?.id;

      if (!moderatorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.service.approveContent(id, moderatorId, reason);
      res.json({ success: true, message: 'Content approved' });
    } catch (error) {
      console.error('Error approving content:', error);
      res.status(500).json({
        error: 'Failed to approve content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/unified-content/:id/reject
   * Reject content
   */
  async rejectContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const moderatorId = req.user?.id;

      if (!moderatorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.service.rejectContent(id, moderatorId, reason);
      res.json({ success: true, message: 'Content rejected' });
    } catch (error) {
      console.error('Error rejecting content:', error);
      res.status(500).json({
        error: 'Failed to reject content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/admin/unified-content/:id/flag
   * Flag content for review
   */
  async flagContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const moderatorId = req.user?.id;

      if (!moderatorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.service.flagContent(id, moderatorId, reason);
      res.json({ success: true, message: 'Content flagged' });
    } catch (error) {
      console.error('Error flagging content:', error);
      res.status(500).json({
        error: 'Failed to flag content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/admin/unified-content/:id
   * Delete content
   */
  async deleteContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const moderatorId = req.user?.id;

      if (!moderatorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.service.deleteContent(id, moderatorId, reason);
      res.json({ success: true, message: 'Content deleted' });
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({
        error: 'Failed to delete content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PATCH /api/admin/unified-content/:id/metadata
   * Update content metadata (tags, priority, etc.)
   */
  async updateMetadata(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const metadata = req.body;

      // TODO: Implement metadata update logic
      // This would need to be type-specific since different models have different metadata
      console.log('Updating metadata for:', id, metadata);

      res.json({
        success: true,
        message: 'Metadata update not yet implemented',
      });
    } catch (error) {
      console.error('Error updating metadata:', error);
      res.status(500).json({
        error: 'Failed to update metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/admin/unified-content/export
   * Export content data
   */
  async exportContent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || 'csv';

      // Parse filters from query string (same as getContent)
      const filters: UnifiedContentFilters = {
        types: req.query['types[]']
          ? Array.isArray(req.query['types[]'])
            ? (req.query['types[]'] as UnifiedContentType[])
            : [req.query['types[]'] as UnifiedContentType]
          : undefined,
        statuses: req.query['statuses[]']
          ? Array.isArray(req.query['statuses[]'])
            ? (req.query['statuses[]'] as UnifiedContentStatus[])
            : [req.query['statuses[]'] as UnifiedContentStatus]
          : undefined,
        search: req.query.search as string | undefined,
        createdAfter: req.query.createdAfter as string | undefined,
        createdBefore: req.query.createdBefore as string | undefined,
      };

      // Get content (without pagination limits for export)
      const response = await this.service.getContent({ ...filters, limit: 10000 });

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=content-export.json');
        res.json(response.items);
      } else if (format === 'csv') {
        // Simple CSV export
        const csv = this.convertToCSV(response.items);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=content-export.csv');
        res.send(csv);
      } else {
        res.status(400).json({ error: 'Unsupported export format' });
      }
    } catch (error) {
      console.error('Error exporting content:', error);
      res.status(500).json({
        error: 'Failed to export content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Convert content items to CSV format
   */
  private convertToCSV(items: any[]): string {
    if (items.length === 0) return '';

    const headers = [
      'ID',
      'Type',
      'Title',
      'Author',
      'Status',
      'Views',
      'Reactions',
      'Comments',
      'Created At',
    ];

    const rows = items.map((item) => [
      item.id,
      item.type,
      item.title || '',
      item.author.name,
      item.status,
      item.engagement.views,
      item.engagement.reactions.total,
      item.engagement.comments,
      item.timestamps.createdAt,
    ]);

    const csvRows = [headers, ...rows];
    return csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }
}
