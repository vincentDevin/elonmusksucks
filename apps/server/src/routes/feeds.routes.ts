// apps/server/src/routes/feeds.routes.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.middleware';
import { Queue } from 'bullmq';
import redisClient from '../lib/redis';
import type {
  CreateFeedRequest,
  UpdateFeedRequest,
  PublicFeedSource,
  OPMLImportResult,
} from '@ems/types';
import multer from 'multer';
import { parseOpmlString, generateOpmlXml } from '../utils/opml';

const router = Router();
const prisma = new PrismaClient();
const feedQueue = new Queue('feed', { connection: redisClient });
// const articleQueue = new Queue('article', { connection: redisClient }); // TODO: Use for article enrichment

// Multer configuration for OPML uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1MB limit
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/xml' ||
      file.mimetype === 'application/xml' ||
      file.originalname.endsWith('.opml')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only OPML/XML files are allowed'));
    }
  },
});

/**
 * Admin Feed Management APIs
 * POST /api/admin/feeds - Create new feed
 * PATCH /api/admin/feeds/:id - Update feed (status, name, urls)
 * DELETE /api/admin/feeds/:id - Delete feed
 * GET /api/admin/feeds - List all feeds with health stats
 */

// All feed management routes require admin auth
router.use(requireAdmin);

// POST /api/admin/feeds
// Body: CreateFeedRequest { name, url, siteUrl?, allowImages? }
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, url, siteUrl, allowImages = true } = req.body as CreateFeedRequest;

    // Validate required fields
    if (!name || !url) {
      res.status(400).json({ error: 'Name and URL are required' });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid feed URL format' });
      return;
    }

    // Check for duplicate feed URL
    const existingFeed = await prisma.feedSource.findFirst({
      where: { url },
    });

    if (existingFeed) {
      res.status(409).json({
        error: 'Feed URL already exists',
        existingFeed: {
          id: existingFeed.id,
          name: existingFeed.name,
          status: existingFeed.status,
        },
      });
      return;
    }

    // Create feed source
    const feed = await prisma.feedSource.create({
      data: {
        name,
        url,
        siteUrl,
        allowImages,
        status: 'ACTIVE',
      },
    });

    // Queue initial feed fetch
    await feedQueue.add('fetch', {
      feedId: feed.id,
      url: feed.url,
      forceRefresh: true,
    });

    // Convert to PublicFeedSource format
    const publicFeed: PublicFeedSource = {
      id: feed.id,
      name: feed.name,
      url: feed.url,
      siteUrl: feed.siteUrl,
      status: feed.status as any,
      allowImages: feed.allowImages,
      lastFetchedAt: feed.lastFetchedAt?.toISOString() || null,
      lastSuccessAt: feed.lastSuccessAt?.toISOString() || null,
      lastErrorAt: feed.lastErrorAt?.toISOString() || null,
      lastErrorMsg: feed.lastErrorMsg,
      fetchCount: feed.fetchCount,
      errorCount: feed.errorCount,
      createdAt: feed.createdAt.toISOString(),
      updatedAt: feed.updatedAt.toISOString(),
    };

    console.log(`[feeds] Created feed ${feed.id}: ${feed.name}`);
    res.status(201).json(publicFeed);
  } catch (error) {
    console.error('[feeds] Error creating feed:', error);
    res.status(500).json({ error: 'Failed to create feed' });
  }
});

// GET /api/admin/feeds
// Response: FeedSource[] with health statistics
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, includeStats = 'true' } = req.query as Record<string, string>;

    // Build where clause for status filtering
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Fetch feeds with optional article counts
    const feeds = await prisma.feedSource.findMany({
      where,
      include:
        includeStats === 'true'
          ? {
              _count: {
                select: {
                  articles: {
                    where: { status: 'APPROVED' },
                  },
                },
              },
            }
          : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to PublicFeedSource format with stats
    const publicFeeds: (PublicFeedSource & { articleCount?: number })[] = feeds.map((feed) => ({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      siteUrl: feed.siteUrl,
      status: feed.status as any,
      allowImages: feed.allowImages,
      lastFetchedAt: feed.lastFetchedAt?.toISOString() || null,
      lastSuccessAt: feed.lastSuccessAt?.toISOString() || null,
      lastErrorAt: feed.lastErrorAt?.toISOString() || null,
      lastErrorMsg: feed.lastErrorMsg,
      fetchCount: feed.fetchCount,
      errorCount: feed.errorCount,
      createdAt: feed.createdAt.toISOString(),
      updatedAt: feed.updatedAt.toISOString(),
      articleCount: includeStats === 'true' ? (feed as any)._count?.articles || 0 : undefined,
    }));

    res.json(publicFeeds);
  } catch (error) {
    console.error('[feeds] Error listing feeds:', error);
    res.status(500).json({ error: 'Failed to list feeds' });
  }
});

// PATCH /api/admin/feeds/:id
// Body: UpdateFeedRequest (partial update)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const feedId = parseInt(req.params.id);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
    }

    const updateData = req.body as UpdateFeedRequest;
    const { name, url, siteUrl, status, allowImages } = updateData;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: 'Invalid feed URL format' });
        return;
      }

      // Check for duplicate URL (excluding current feed)
      const existingFeed = await prisma.feedSource.findFirst({
        where: {
          url,
          NOT: { id: feedId },
        },
      });

      if (existingFeed) {
        res.status(409).json({
          error: 'Feed URL already exists',
          existingFeed: {
            id: existingFeed.id,
            name: existingFeed.name,
          },
        });
        return;
      }
    }

    // Get current feed for comparison
    const currentFeed = await prisma.feedSource.findUnique({
      where: { id: feedId },
    });

    if (!currentFeed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Prepare update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (siteUrl !== undefined) updates.siteUrl = siteUrl;
    if (status !== undefined) updates.status = status;
    if (allowImages !== undefined) updates.allowImages = allowImages;

    // Update the feed
    const updatedFeed = await prisma.feedSource.update({
      where: { id: feedId },
      data: updates,
    });

    // Trigger re-fetch if URL changed
    if (url && url !== currentFeed.url) {
      await feedQueue.add('fetch', {
        feedId: updatedFeed.id,
        url: updatedFeed.url,
        forceRefresh: true,
      });
    }

    // Convert to PublicFeedSource format
    const publicFeed: PublicFeedSource = {
      id: updatedFeed.id,
      name: updatedFeed.name,
      url: updatedFeed.url,
      siteUrl: updatedFeed.siteUrl,
      status: updatedFeed.status as any,
      allowImages: updatedFeed.allowImages,
      lastFetchedAt: updatedFeed.lastFetchedAt?.toISOString() || null,
      lastSuccessAt: updatedFeed.lastSuccessAt?.toISOString() || null,
      lastErrorAt: updatedFeed.lastErrorAt?.toISOString() || null,
      lastErrorMsg: updatedFeed.lastErrorMsg,
      fetchCount: updatedFeed.fetchCount,
      errorCount: updatedFeed.errorCount,
      createdAt: updatedFeed.createdAt.toISOString(),
      updatedAt: updatedFeed.updatedAt.toISOString(),
    };

    console.log(`[feeds] Updated feed ${feedId}:`, Object.keys(updates));
    res.json(publicFeed);
  } catch (error) {
    console.error('[feeds] Error updating feed:', error);
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

// DELETE /api/admin/feeds/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const feedId = parseInt(req.params.id);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
    }

    // Check if feed exists and get article count
    const feed = await prisma.feedSource.findUnique({
      where: { id: feedId },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
    }

    console.log(`[feeds] Deleting feed ${feedId} with ${feed._count.articles} articles`);

    // Delete feed (articles will be deleted via cascade)
    await prisma.feedSource.delete({
      where: { id: feedId },
    });

    // TODO: Cancel any pending jobs for this feed in BullMQ
    // This would require tracking job IDs or implementing job cancellation

    res.json({
      message: 'Feed deleted successfully',
      deletedArticles: feed._count.articles,
    });
  } catch (error) {
    console.error('[feeds] Error deleting feed:', error);
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

/**
 * Admin Moderation APIs
 * POST /api/admin/moderate - Bulk article moderation
 * POST /api/admin/retag - Bulk article retagging
 */

// POST /api/admin/moderate
// Body: { ids: number[], action: "APPROVED"|"REJECTED", notes?: string }
router.post('/moderate', async (req: Request, res: Response) => {
  try {
    const { ids, action, notes } = req.body as {
      ids: number[];
      action: 'APPROVED' | 'REJECTED';
      notes?: string;
    };

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Article IDs array is required' });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      res.status(400).json({ error: 'Action must be APPROVED or REJECTED' });
    }

    // Batch update articles
    const updateResult = await prisma.article.updateMany({
      where: {
        id: { in: ids },
        status: 'PENDING', // Only update pending articles
      },
      data: {
        status: action,
        modNotes: notes || null,
        updatedAt: new Date(),
      },
    });

    console.log(`[feeds] Bulk moderated ${updateResult.count} articles: ${action}`);

    // Publish Socket.IO event for real-time admin updates
    await redisClient.publish(
      'admin:moderation:bulk',
      JSON.stringify({
        action,
        articleIds: ids,
        processed: updateResult.count,
        notes,
        timestamp: new Date().toISOString(),
      }),
    );

    // If approved, publish articles to timeline
    if (action === 'APPROVED') {
      await redisClient.publish(
        'timeline:articles:new',
        JSON.stringify({
          count: updateResult.count,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    res.json({
      processed: updateResult.count,
      action,
      message: `${updateResult.count} articles ${action.toLowerCase()}`,
    });
  } catch (error) {
    console.error('[feeds] Error in bulk moderation:', error);
    res.status(500).json({ error: 'Failed to moderate articles' });
  }
});

// POST /api/admin/retag
// Body: { ids: number[], add: string[], remove: string[] }
router.post('/retag', async (req: Request, res: Response) => {
  try {
    const {
      ids,
      add = [],
      remove = [],
    } = req.body as {
      ids: number[];
      add?: string[];
      remove?: string[];
    };

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Article IDs array is required' });
    }

    if (!Array.isArray(add) || !Array.isArray(remove)) {
      res.status(400).json({ error: 'Add and remove must be arrays' });
    }

    if (add.length === 0 && remove.length === 0) {
      res.status(400).json({ error: 'At least one tag to add or remove is required' });
    }

    // Process articles in batches to avoid memory issues
    const batchSize = 10;
    let processed = 0;
    let tagged = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);

      // Get current articles with their tags
      const articles = await prisma.article.findMany({
        where: { id: { in: batchIds } },
        select: { id: true, tags: true },
      });

      // Update each article's tags
      for (const article of articles) {
        const currentTags = new Set(article.tags);
        let hasChanges = false;

        // Remove tags
        for (const tag of remove) {
          if (currentTags.has(tag)) {
            currentTags.delete(tag);
            hasChanges = true;
          }
        }

        // Add tags
        for (const tag of add) {
          if (!currentTags.has(tag)) {
            currentTags.add(tag);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await prisma.article.update({
            where: { id: article.id },
            data: { tags: Array.from(currentTags) },
          });
          tagged++;
        }
        processed++;
      }
    }

    console.log(`[feeds] Bulk retagged ${tagged}/${processed} articles`);

    // Publish Socket.IO event for real-time updates
    await redisClient.publish(
      'admin:retagging:bulk',
      JSON.stringify({
        articleIds: ids,
        addedTags: add,
        removedTags: remove,
        processed,
        tagged,
        timestamp: new Date().toISOString(),
      }),
    );

    res.json({
      processed,
      tagged,
      message: `Processed ${processed} articles, updated tags on ${tagged}`,
    });
  } catch (error) {
    console.error('[feeds] Error in bulk retagging:', error);
    res.status(500).json({ error: 'Failed to retag articles' });
  }
});

/**
 * OPML Import/Export APIs
 * POST /api/admin/feeds/import-opml - Import OPML feed list
 * GET /api/admin/feeds/export-opml - Export current feeds as OPML
 */

// POST /api/admin/feeds/import-opml
// Multipart upload with OPML file
router.post('/import-opml', upload.single('opml'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'OPML file is required' });
    }

    const opmlContent = req.file.buffer.toString('utf-8');

    // Parse OPML file
    const parsedFeeds = await parseOpmlString(opmlContent);

    if (parsedFeeds.length === 0) {
      res.status(400).json({ error: 'No valid feeds found in OPML file' });
    }

    // Import feeds, skipping duplicates
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const createdFeeds: PublicFeedSource[] = [];

    for (const feedData of parsedFeeds) {
      try {
        // Check for existing feed
        const existing = await prisma.feedSource.findFirst({
          where: { url: feedData.url },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create new feed
        const feed = await prisma.feedSource.create({
          data: {
            name: feedData.name,
            url: feedData.url,
            siteUrl: feedData.siteUrl,
            allowImages: true,
            status: 'ACTIVE',
          },
        });

        // Queue initial fetch
        await feedQueue.add('fetch', {
          feedId: feed.id,
          url: feed.url,
          forceRefresh: true,
        });

        createdFeeds.push({
          id: feed.id,
          name: feed.name,
          url: feed.url,
          siteUrl: feed.siteUrl,
          status: feed.status as any,
          allowImages: feed.allowImages,
          lastFetchedAt: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          lastErrorMsg: null,
          fetchCount: 0,
          errorCount: 0,
          createdAt: feed.createdAt.toISOString(),
          updatedAt: feed.updatedAt.toISOString(),
        });

        created++;
      } catch (feedError) {
        const errorMsg = feedError instanceof Error ? feedError.message : 'Unknown error';
        errors.push(`Failed to create feed ${feedData.name}: ${errorMsg}`);
      }
    }

    console.log(
      `[feeds] OPML import: ${created} created, ${skipped} skipped, ${errors.length} errors`,
    );

    const result: OPMLImportResult = {
      imported: created,
      duplicates: skipped,
      errors,
    };

    res.json(result);
  } catch (error) {
    console.error('[feeds] Error importing OPML:', error);
    res.status(500).json({ error: 'Failed to import OPML file' });
  }
});

// GET /api/admin/feeds/export-opml
// Response: OPML XML file download
router.get('/export-opml', async (_req: Request, res: Response) => {
  try {
    // Get all active feeds
    const feeds = await prisma.feedSource.findMany({
      where: { status: 'ACTIVE' },
      select: {
        name: true,
        url: true,
        siteUrl: true,
      },
      orderBy: { name: 'asc' },
    });

    if (feeds.length === 0) {
      res.status(404).json({ error: 'No active feeds to export' });
    }

    // Generate OPML XML
    const opmlXml = generateOpmlXml({
      title: 'elonmusksucks.net RSS Feeds',
      dateCreated: new Date(),
      feeds: feeds.map((feed) => ({
        name: feed.name,
        url: feed.url,
        siteUrl: feed.siteUrl || undefined,
      })),
    });

    // Set response headers for file download
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `elonmusksucks-feeds-${timestamp}.opml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(opmlXml, 'utf8'));

    console.log(`[feeds] OPML export: ${feeds.length} feeds exported`);
    res.send(opmlXml);
  } catch (error) {
    console.error('[feeds] Error exporting OPML:', error);
    res.status(500).json({ error: 'Failed to export OPML file' });
  }
});

export default router;
