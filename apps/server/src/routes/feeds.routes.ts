// apps/server/src/routes/feeds.routes.simple.ts
// Simplified feeds routes for Phase 2 - basic functionality
import { Router } from 'express';
import { eventBus } from '../lib/EventBus';
import { REDIS_CHANNELS } from '@ems/types';
import {
  listFeeds,
  getFeedStats,
  createFeed,
  deleteFeed,
  updateFeed,
  bulkModerate,
  refreshFeed,
  findArticleById,
  updateArticleTags,
  getArticleCount,
  getArticles,
} from '../controllers/feeds.controller';
import { importOPML, exportOPML, validateOPML, getOPMLStats } from '../controllers/opml.controller';

const router = Router();

// Note: Admin auth is handled by parent admin routes

// GET /api/admin/feeds - List feeds
router.get('/', listFeeds);

// GET /api/admin/feeds/stats - Get feed statistics
router.get('/stats', getFeedStats);

// POST /api/admin/feeds - Create feed (basic implementation)
router.post('/', createFeed);

// PATCH /api/admin/feeds/:id - Update feed (basic implementation)
router.patch('/:id', updateFeed);

// DELETE /api/admin/feeds/:id - Delete feed (basic implementation)
router.delete('/:id', deleteFeed);

// POST /api/admin/moderate - Bulk moderation (basic implementation)
router.post('/moderate', bulkModerate);

// POST /api/admin/retag - Bulk retagging (basic implementation)
router.post('/retag', async (req: any, res: any) => {
  try {
    const { ids, add = [], remove = [] } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Article IDs array is required' });
      return;
    }

    let processed = 0;
    let tagged = 0;

    // Process in small batches
    for (const articleId of ids) {
      const article = await findArticleById(articleId);
      if (article) {
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
          await updateArticleTags(articleId, Array.from(currentTags));
          tagged++;
        }
        processed++;
      }
    }

    // Publish real-time updates to admin room
    try {
      await eventBus.publish(REDIS_CHANNELS.ADMIN_RETAGGING_BULK, {
        ids,
        addTags: add,
        removeTags: remove,
        processed,
        tagged,
        timestamp: new Date().toISOString(),
      });
    } catch (redisError) {
      console.error('Failed to publish retagging updates:', redisError);
      // Don't fail the request if Redis publish fails
    }

    res.json({
      processed,
      tagged,
      message: `Processed ${processed} articles, updated tags on ${tagged}`,
    });
  } catch (error) {
    console.error('Error in bulk retagging:', error);
    res.status(500).json({ error: 'Failed to retag articles' });
  }
});

// GET /api/admin/articles - Get articles for moderation
router.get('/articles', async (req: any, res: any) => {
  try {
    const { status = 'PENDING', limit = '25', offset = '0', search = '', feedId = '' } = req.query;

    const pageLimit = Math.min(parseInt(limit) || 25, 100);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);

    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }

    // Add feed filter
    if (feedId && feedId.trim() && feedId !== 'all') {
      where.feedId = parseInt(feedId);
    }

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { excerpt: { contains: searchTerm, mode: 'insensitive' } },
        { feed: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    // Get total count for pagination
    const totalCount = await getArticleCount(where);

    // Get articles with pagination
    const publicArticles = await getArticles(where, pageLimit, pageOffset);

    // Return paginated response
    const totalPages = Math.ceil(totalCount / pageLimit);
    const currentPage = Math.floor(pageOffset / pageLimit) + 1;

    res.json({
      articles: publicArticles,
      total: totalCount,
      page: currentPage,
      totalPages,
      pageSize: pageLimit,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// POST /api/admin/feeds/:id/refresh - Manual feed refresh trigger
router.post('/:id/refresh', refreshFeed);

// OPML Management Routes
// POST /api/admin/feeds/opml/import - Import feeds from OPML file
router.post('/opml/import', importOPML);

// GET /api/admin/feeds/opml/export - Export feeds to OPML file
router.get('/opml/export', exportOPML);

// POST /api/admin/feeds/opml/validate - Validate OPML content without importing
router.post('/opml/validate', validateOPML);

// GET /api/admin/feeds/opml/stats - Get OPML-related statistics
router.get('/opml/stats', getOPMLStats);

export default router;
