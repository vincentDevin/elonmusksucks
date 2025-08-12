// apps/server/src/routes/timeline.routes.simple.ts
// Simplified timeline routes for Phase 2 - basic functionality
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Simple timeline routes - Phase 2 implementation
 */

// GET /api/timeline/articles - Basic article listing
router.get('/articles', async (req: any, res: any) => {
  try {
    const { limit = '30', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 30, 100);
    
    const where: any = { status: 'APPROVED' };
    
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.publishedAt = { lt: cursorDate };
      }
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: pageLimit + 1
    });

    const hasMore = articles.length > pageLimit;
    const items = articles.slice(0, pageLimit);

    const timelineItems = items.map(article => ({
      id: `article-${article.id}`,
      type: 'article' as const,
      timestamp: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
      content: {
        title: article.title,
        excerpt: article.excerpt || undefined,
        url: article.url,
        imageUrl: article.leadImageUrl,
        author: article.feed?.name || 'Unknown',
        source: article.feed?.siteUrl ? new URL(article.feed.siteUrl).hostname : 'Unknown'
      },
      engagement: {
        reactions: article.reactions,
        comments: article.comments
      },
      tags: article.tags,
      sourceLinks: []
    }));

    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].publishedAt?.toISOString() || items[items.length - 1].createdAt.toISOString()
      : undefined;

    res.json({
      items: timelineItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined
      }
    });

  } catch (error) {
    console.error('[timeline] Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/timeline/tweets - Placeholder for tweets
router.get('/tweets', async (_req: any, res: any) => {
  try {
    // For now, return empty tweets
    res.json({
      items: [],
      pagination: {
        cursor: undefined,
        hasMore: false,
        total: 0
      }
    });
  } catch (error) {
    console.error('[timeline] Error fetching tweets:', error);
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
});

// GET /api/articles/:id - Article details
router.get('/articles/:id', async (req: any, res: any) => {
  try {
    const articleId = parseInt(req.params.id);
    
    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true,
            status: true
          }
        }
      }
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Return simplified article data
    res.json({
      id: article.id,
      feedId: article.feedId,
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
      feed: article.feed ? {
        id: article.feed.id,
        name: article.feed.name,
        url: '',
        siteUrl: article.feed.siteUrl,
        status: article.feed.status,
        allowImages: true,
        lastFetchedAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMsg: null,
        fetchCount: 0,
        errorCount: 0,
        createdAt: '',
        updatedAt: ''
      } : null
    });

  } catch (error) {
    console.error('[timeline] Error fetching article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
});

export default router;