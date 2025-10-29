import type { Request, Response } from 'express';
import { OPMLService } from '../services/opml.service';
import { FeedStatus } from '@prisma/client';

const opmlService = new OPMLService();

/**
 * POST /api/admin/opml/import
 * Import feeds from OPML content
 */
export async function importOPML(req: Request, res: Response) {
  try {
    const { content, overwriteExisting = false, preserveCategories = true } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        error: 'OPML content is required',
        message: 'Please provide valid OPML content in the request body',
      });
      return;
    }

    if (content.trim().length === 0) {
      res.status(400).json({
        error: 'Empty OPML content',
        message: 'OPML content cannot be empty',
      });
      return;
    }

    const result = await opmlService.importFromOPML({
      content,
      overwriteExisting,
      preserveCategories,
    });

    // Success if we imported at least one feed or if there were no failures
    if (result.importedFeeds > 0 || result.failedFeeds === 0) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[opml] Error importing OPML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to import OPML',
      message: errorMessage,
    });
  }
}

/**
 * GET /api/admin/opml/export
 * Export current feeds to OPML format
 */
export async function exportOPML(_req: Request, res: Response) {
  try {
    const opmlContent = await opmlService.exportToOPML();

    // Set appropriate headers for file download
    const filename = `elonmusksucks-feeds-${new Date().toISOString().split('T')[0]}.opml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(opmlContent);
  } catch (error) {
    console.error('[opml] Error exporting OPML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to export OPML',
      message: errorMessage,
    });
  }
}

/**
 * POST /api/admin/opml/validate
 * Validate OPML content without importing
 */
export async function validateOPML(req: Request, res: Response) {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({
        error: 'OPML content is required',
        message: 'Please provide valid OPML content in the request body',
      });
      return;
    }

    if (content.trim().length === 0) {
      res.status(400).json({
        error: 'Empty OPML content',
        message: 'OPML content cannot be empty',
      });
      return;
    }

    const result = await opmlService.validateOPML(content);
    res.status(200).json(result);
  } catch (error) {
    console.error('[opml] Error validating OPML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to validate OPML',
      message: errorMessage,
      valid: false,
    });
  }
}

/**
 * GET /api/admin/opml/stats
 * Get OPML-related statistics
 */
export async function getOPMLStats(_req: Request, res: Response) {
  try {
    // This endpoint provides statistics about feeds that could be useful for OPML operations
    const { FeedService } = await import('../services/feed.service');
    const feedService = new FeedService();
    const feeds = await feedService.listFeeds();

    const stats = {
      totalFeeds: feeds.length,
      activeFeeds: feeds.filter((feed) => feed.status === FeedStatus.ACTIVE).length,
      pausedFeeds: feeds.filter((feed) => feed.status === FeedStatus.PAUSED).length,
      blockedFeeds: feeds.filter((feed) => feed.status === FeedStatus.BLOCKED).length,
      feedsWithSiteUrl: feeds.filter((feed) => feed.siteUrl).length,
      feedsWithoutSiteUrl: feeds.filter((feed) => !feed.siteUrl).length,
      // TODO: Add category statistics when feed categories are implemented
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('[opml] Error getting OPML stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to get OPML statistics',
      message: errorMessage,
    });
  }
}
