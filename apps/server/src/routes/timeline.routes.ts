// apps/server/src/routes/timeline.routes.ts
import { Router, Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import type { TimelineItem, TimelineResponse } from '@ems/types';
import { extractDomain, validateArticleId } from '../utils/timeline';

const router = Router();
const prisma = new PrismaClient();

/**
 * Public Timeline APIs - SSR and client-side
 * GET /api/timeline/articles?status=APPROVED&cursor=<iso>&limit=30&tag=&sort=
 * GET /api/timeline/tweets?cursor=<tweetId>&limit=50
 * GET /api/articles/:id
 */

// GET /api/timeline/articles
// Query params: status, cursor (ISO date), limit (max 100), tag, sort (newest/oldest)
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const {
      status = 'APPROVED',
      cursor,
      limit = '30',
      tag,
      sort = 'newest',
      search
    } = req.query as Record<string, string>;

    // Validate and sanitize parameters
    const pageLimit = Math.min(parseInt(limit) || 30, 100);
    const sortOrder = sort === 'oldest' ? 'asc' : 'desc';
    
    // Build where clause
    const where: any = {
      status: status as any
    };

    // Add tag filtering
    if (tag) {
      const tags = tag.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        where.tags = {
          hasSome: tags
        };
      }
    }

    // Add search filtering
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add cursor-based pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.publishedAt = sortOrder === 'desc' 
          ? { lt: cursorDate }
          : { gt: cursorDate };
      }
    }

    // Fetch articles
    const articles = await prisma.article.findMany({
      where,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true
          }
        },
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true
          },
          take: 5 // Limit related predictions
        }
      },
      orderBy: {
        publishedAt: sortOrder
      },
      take: pageLimit + 1 // Fetch one extra to determine if there are more
    });

    // Determine if there are more articles
    const hasMore = articles.length > pageLimit;
    const items = articles.slice(0, pageLimit);

    // Convert to TimelineItem format
    const timelineItems: TimelineItem[] = items.map(article => ({
      id: `article-${article.id}`,
      type: 'article' as const,
      timestamp: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
      content: {
        title: article.title,
        excerpt: article.excerpt || undefined,
        url: article.url,
        imageUrl: article.leadImageUrl,
        author: article.feed.name,
        source: extractDomain(article.feed.siteUrl || article.url)
      },
      engagement: {
        reactions: article.reactions,
        comments: article.comments
      },
      tags: article.tags,
      sourceLinks: article.sourceLinks.map(link => ({
        id: link.id,
        predictionId: link.predictionId,
        articleId: article.id,
        tweetId: null,
        url: article.url,
        title: link.title,
        publisher: article.feed.name,
        capturedAt: new Date().toISOString()
      }))
    }));

    // Generate next cursor
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].publishedAt?.toISOString() || items[items.length - 1].createdAt.toISOString()
      : undefined;

    const response: TimelineResponse = {
      items: timelineItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined // Not calculating total for performance
      }
    };

    res.json(response);

  } catch (error) {
    console.error('[timeline] Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/timeline/tweets  
// Query params: cursor (tweet snowflake ID), limit (max 100)
router.get('/tweets', async (req: Request, res: Response) => {
  try {
    const {
      cursor,
      limit = '50'
    } = req.query as Record<string, string>;

    // Validate parameters
    const pageLimit = Math.min(parseInt(limit) || 50, 100);
    
    // Build where clause
    const where: any = {
      status: 'VISIBLE'
    };

    // Add cursor-based pagination using tweet ID (string)
    if (cursor) {
      // For tweet IDs (snowflakes), we use string comparison
      where.id = { lt: cursor };
    }

    // Fetch tweets
    const tweets = await prisma.tweet.findMany({
      where,
      include: {
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true
          },
          take: 5
        }
      },
      orderBy: {
        postedAt: 'desc'
      },
      take: pageLimit + 1
    });

    // Determine if there are more tweets
    const hasMore = tweets.length > pageLimit;
    const items = tweets.slice(0, pageLimit);

    // Convert to TimelineItem format
    const timelineItems: TimelineItem[] = items.map(tweet => ({
      id: `tweet-${tweet.id}`,
      type: 'tweet' as const,
      timestamp: tweet.postedAt.toISOString(),
      content: {
        title: `@${tweet.authorHandle}`, // Tweet "title" is the handle
        excerpt: tweet.text,
        url: tweet.permalink,
        author: `@${tweet.authorHandle}`,
        source: 'X (Twitter)'
      },
      engagement: {
        reactions: tweet.likeCount,
        comments: tweet.replyCount
      },
      tags: [], // Tweets don't have tags by default
      sourceLinks: tweet.sourceLinks.map(link => ({
        id: link.id,
        predictionId: link.predictionId,
        articleId: null,
        tweetId: tweet.id,
        url: tweet.permalink,
        title: link.title,
        publisher: 'X (Twitter)',
        capturedAt: new Date().toISOString()
      }))
    }));

    // Generate next cursor (last tweet ID)
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].id
      : undefined;

    const response: TimelineResponse = {
      items: timelineItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined
      }
    };

    res.json(response);

  } catch (error) {
    console.error('[timeline] Error fetching tweets:', error);
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
});

// GET /api/articles/:id
// Get full article details for ArticleDrawer
const getArticleDetails: RequestHandler = async (req: Request, res: Response) => {
  try {
    const articleId = validateArticleId(req.params.id);
    
    if (articleId === null) {
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
        },
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true
          }
        }
      }
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Convert to PublicArticle format
    const publicArticle = {
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
        url: '', // Not exposing internal feed URL
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
    };

    res.json(publicArticle);

  } catch (error) {
    console.error('[timeline] Error fetching article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
};

router.get('/articles/:id', getArticleDetails);

export default router;