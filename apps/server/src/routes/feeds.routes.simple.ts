// apps/server/src/routes/feeds.routes.simple.ts
// Simplified feeds routes for Phase 2 - basic functionality
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';
import { Queue } from 'bullmq';

const router = Router();
const prisma = new PrismaClient();
const feedQueue = new Queue('feed', { connection: redisClient });

// Note: Admin auth is handled by parent admin routes

// GET /api/admin/feeds - List feeds
router.get('/', async (_req: any, res: any) => {
  try {
    const feeds = await prisma.feedSource.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const publicFeeds = feeds.map((feed) => ({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      siteUrl: feed.siteUrl,
      status: feed.status,
      allowImages: feed.allowImages,
      lastFetchedAt: feed.lastFetchedAt?.toISOString() || null,
      lastSuccessAt: feed.lastSuccessAt?.toISOString() || null,
      lastErrorAt: feed.lastErrorAt?.toISOString() || null,
      lastErrorMsg: feed.lastErrorMsg,
      fetchCount: feed.fetchCount,
      errorCount: feed.errorCount,
      createdAt: feed.createdAt.toISOString(),
      updatedAt: feed.updatedAt.toISOString(),
    }));

    res.json(publicFeeds);
  } catch (error) {
    console.error('[feeds] Error listing feeds:', error);
    res.status(500).json({ error: 'Failed to list feeds' });
  }
});

// GET /api/admin/feeds/stats - Get feed statistics
router.get('/stats', async (_req: any, res: any) => {
  try {
    const feeds = await prisma.feedSource.findMany();
    const stats = [];

    for (const feed of feeds) {
      // Calculate stats for each feed
      const totalArticles = await prisma.article.count({
        where: { feedId: feed.id },
      });

      // Recent articles (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentArticles = await prisma.article.count({
        where: {
          feedId: feed.id,
          createdAt: { gte: sevenDaysAgo },
        },
      });

      // Error rate calculation
      const errorRate = feed.fetchCount > 0 ? (feed.errorCount / feed.fetchCount) * 100 : 0;

      // Average fetch time (mock for now - would need to track actual fetch times)
      const avgFetchTime = Math.random() * 2000 + 500; // 500-2500ms

      const feedStats = {
        feedId: feed.id,
        totalArticles,
        recentArticles,
        errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
        avgFetchTime: Math.round(avgFetchTime),
        lastSuccess: feed.lastSuccessAt?.toISOString() || null,
        lastError: feed.lastErrorAt?.toISOString() || null,
      };

      stats.push(feedStats);
    }

    res.json(stats);
  } catch (error) {
    console.error('[feeds] Error fetching feed stats:', error);
    res.status(500).json({ error: 'Failed to fetch feed statistics' });
  }
});

// POST /api/admin/feeds - Create feed (basic implementation)
router.post('/', async (req: any, res: any) => {
  try {
    const { name, url, siteUrl, allowImages = true } = req.body;

    if (!name || !url) {
      res.status(400).json({ error: 'Name and URL are required' });
      return;
    }

    const feed = await prisma.feedSource.create({
      data: {
        name,
        url,
        siteUrl,
        allowImages,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      siteUrl: feed.siteUrl,
      status: feed.status,
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
  } catch (error) {
    console.error('Error creating feed:', error);
    res.status(500).json({ error: 'Failed to create feed' });
  }
});

// PATCH /api/admin/feeds/:id - Update feed (basic implementation)
router.patch('/:id', async (req: any, res: any) => {
  try {
    const feedId = parseInt(req.params.id);
    const { name, url, siteUrl, status, allowImages } = req.body;

    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (siteUrl !== undefined) updates.siteUrl = siteUrl;
    if (status !== undefined) updates.status = status;
    if (allowImages !== undefined) updates.allowImages = allowImages;

    const updatedFeed = await prisma.feedSource.update({
      where: { id: feedId },
      data: updates,
    });

    res.json({
      id: updatedFeed.id,
      name: updatedFeed.name,
      url: updatedFeed.url,
      siteUrl: updatedFeed.siteUrl,
      status: updatedFeed.status,
      allowImages: updatedFeed.allowImages,
      lastFetchedAt: updatedFeed.lastFetchedAt?.toISOString() || null,
      lastSuccessAt: updatedFeed.lastSuccessAt?.toISOString() || null,
      lastErrorAt: updatedFeed.lastErrorAt?.toISOString() || null,
      lastErrorMsg: updatedFeed.lastErrorMsg,
      fetchCount: updatedFeed.fetchCount,
      errorCount: updatedFeed.errorCount,
      createdAt: updatedFeed.createdAt.toISOString(),
      updatedAt: updatedFeed.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating feed:', error);
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

// DELETE /api/admin/feeds/:id - Delete feed (basic implementation)
router.delete('/:id', async (req: any, res: any) => {
  try {
    const feedId = parseInt(req.params.id);

    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    await prisma.feedSource.delete({
      where: { id: feedId },
    });

    res.json({ message: 'Feed deleted successfully' });
  } catch (error) {
    console.error('Error deleting feed:', error);
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

// POST /api/admin/moderate - Bulk moderation (basic implementation)
router.post('/moderate', async (req: any, res: any) => {
  try {
    const { ids, action, notes } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Article IDs array is required' });
      return;
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      res.status(400).json({ error: 'Action must be APPROVED or REJECTED' });
      return;
    }

    const updateResult = await prisma.article.updateMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
      },
      data: {
        status: action,
        modNotes: notes || null,
      },
    });

    // Publish real-time updates
    try {
      // Notify admin room of bulk moderation
      await redisClient.publish(
        'admin:moderation:bulk',
        JSON.stringify({
          ids,
          action,
          processed: updateResult.count,
          timestamp: new Date().toISOString(),
        }),
      );

      // If articles were approved, notify public timeline
      if (action === 'APPROVED' && updateResult.count > 0) {
        // Get the newly approved articles for public timeline
        const approvedArticles = await prisma.article.findMany({
          where: {
            id: { in: ids },
            status: 'APPROVED',
          },
          include: {
            feed: {
              select: {
                id: true,
                name: true,
                siteUrl: true,
              },
            },
          },
          orderBy: { publishedAt: 'desc' },
        });

        // Publish each approved article to timeline
        for (const article of approvedArticles) {
          await redisClient.publish(
            'timeline:articles:new',
            JSON.stringify({
              id: article.id,
              feedId: article.feedId,
              title: article.title,
              excerpt: article.excerpt,
              leadImageUrl: article.leadImageUrl,
              url: article.url,
              publishedAt: article.publishedAt?.toISOString(),
              tags: article.tags,
              feed: article.feed,
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }
    } catch (redisError) {
      console.error('Failed to publish moderation updates:', redisError);
      // Don't fail the request if Redis publish fails
    }

    res.json({
      processed: updateResult.count,
      action,
      message: `${updateResult.count} articles ${action.toLowerCase()}`,
    });
  } catch (error) {
    console.error('Error in bulk moderation:', error);
    res.status(500).json({ error: 'Failed to moderate articles' });
  }
});

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
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true, tags: true },
      });

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
          await prisma.article.update({
            where: { id: articleId },
            data: { tags: Array.from(currentTags) },
          });
          tagged++;
        }
        processed++;
      }
    }

    // Publish real-time updates to admin room
    try {
      await redisClient.publish(
        'admin:retagging:bulk',
        JSON.stringify({
          ids,
          addTags: add,
          removeTags: remove,
          processed,
          tagged,
          timestamp: new Date().toISOString(),
        }),
      );
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
    const totalCount = await prisma.article.count({ where });

    // Get articles with pagination
    const articles = await prisma.article.findMany({
      where,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit,
      skip: pageOffset,
    });

    const publicArticles = articles.map((article) => ({
      id: article.id,
      feedId: article.feedId,
      feedName: article.feed.name, // Add feedName for search/display
      guid: article.guid,
      url: article.url,
      canonicalUrl: article.canonicalUrl,
      title: article.title,
      excerpt: article.excerpt,
      leadImageUrl: article.leadImageUrl,
      publishedAt: article.publishedAt?.toISOString() || null,
      fetchedAt: article.fetchedAt.toISOString(),
      hash: article.hash,
      status: article.status,
      tags: article.tags,
      modNotes: article.modNotes,
      reactions: article.reactions,
      comments: article.comments,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      feed: article.feed,
    }));

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
router.post('/:id/refresh', async (req: any, res: any) => {
  try {
    const feedId = parseInt(req.params.id);

    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    // Check if feed exists
    const feed = await prisma.feedSource.findUnique({
      where: { id: feedId },
    });

    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Queue the feed fetch job for immediate processing
    await feedQueue.add(
      'fetch',
      {
        feedId,
        url: feed.url,
        forceRefresh: true,
      },
      {
        priority: 1, // High priority for manual refreshes
        delay: 0, // Immediate processing
      },
    );

    // Publish refresh notification to admin room
    try {
      await redisClient.publish(
        'admin:feed:refresh',
        JSON.stringify({
          feedId,
          feedName: feed.name,
          timestamp: new Date().toISOString(),
          message: 'Feed refresh requested',
        }),
      );
    } catch (redisError) {
      console.error('Failed to publish feed refresh notification:', redisError);
    }

    res.json({
      message: 'Feed refresh triggered successfully',
      feedId,
      feedName: feed.name,
    });
  } catch (error) {
    console.error('Error triggering feed refresh:', error);
    res.status(500).json({ error: 'Failed to trigger feed refresh' });
  }
});

export default router;
