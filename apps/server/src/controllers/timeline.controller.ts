import type { Request, Response } from 'express';
import { TimelineService } from '../services/timeline.service';

const timelineService = new TimelineService();

export async function getArticles(req: Request, res: Response) {
  try {
    const { limit = '30', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 30, 100);

    const cursorDate = cursor ? new Date(cursor as string) : undefined;
    if (cursor && isNaN(cursorDate!.getTime())) {
      // Keep same behavior - ignore invalid cursor
      cursorDate ? undefined : undefined;
    }

    const articles = await timelineService.getArticles({
      cursor: cursorDate && !isNaN(cursorDate.getTime()) ? cursorDate : undefined,
      limit: pageLimit,
    });

    const hasMore = articles.length > pageLimit;
    const items = articles.slice(0, pageLimit);

    const timelineItems = items.map((article) => ({
      id: `article-${article.id}`,
      type: 'article' as const,
      timestamp: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
      content: {
        title: article.title,
        excerpt: article.excerpt || undefined,
        url: article.url,
        imageUrl: article.leadImageUrl,
        author: article.feed?.name || 'Unknown',
        source: article.feed?.siteUrl ? new URL(article.feed.siteUrl).hostname : 'Unknown',
      },
      engagement: {
        reactions: article.reactions,
        comments: article.comments,
      },
      tags: article.tags,
      sourceLinks: [],
    }));

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].publishedAt?.toISOString() ||
          items[items.length - 1].createdAt.toISOString()
        : undefined;

    res.json({
      items: timelineItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    });
  } catch (error) {
    console.error('[timeline] Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
}
