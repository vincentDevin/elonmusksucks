import type { Request, Response } from 'express';
import { FeedService } from '../services/feed.service';
import redisClient from '../lib/redis';
import { Queue } from 'bullmq';

const feedService = new FeedService();
const feedQueue = new Queue('feed', { connection: redisClient });

export async function listFeeds(_req: Request, res: Response) {
  try {
    const feeds = await feedService.listFeeds();

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
}

export async function getFeedStats(_req: Request, res: Response) {
  try {
    const stats = await feedService.getFeedStats();
    res.json(stats);
  } catch (error) {
    console.error('[feeds] Error fetching feed stats:', error);
    res.status(500).json({ error: 'Failed to fetch feed statistics' });
  }
}

export async function createFeed(req: Request, res: Response) {
  try {
    const { name, url, siteUrl, allowImages = true } = req.body;

    if (!name || !url) {
      res.status(400).json({ error: 'Name and URL are required' });
      return;
    }

    const feed = await feedService.createFeed({ name, url, siteUrl, allowImages });

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
}

export async function deleteFeed(req: Request, res: Response) {
  try {
    const feedId = parseInt(req.params.id);

    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    await feedService.deleteFeed(feedId);
    res.json({ message: 'Feed deleted successfully' });
  } catch (error) {
    console.error('Error deleting feed:', error);
    res.status(500).json({ error: 'Failed to delete feed' });
  }
}

export const updateFeed = async (req: Request, res: Response) => {
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

    const updatedFeed = await feedService.updateFeed(feedId, updates);

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
};

export const bulkModerate = async (req: Request, res: Response) => {
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

    const { updateResult, approvedArticles } = await feedService.bulkModerateArticles(
      ids,
      action,
      notes,
    );

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
        // Publish each approved article to timeline
        for (const article of approvedArticles) {
          await redisClient.publish(
            'timeline:articles:new',
            JSON.stringify({
              id: article.id,
              feedId: article.feedId,
              title: article.title,
              excerpt: article.excerpt,
              url: article.url,
              leadImageUrl: article.leadImageUrl,
              publishedAt: article.publishedAt?.toISOString() || null,
              tags: article.tags,
              feed: {
                id: article.feed.id,
                name: article.feed.name,
                siteUrl: article.feed.siteUrl,
              },
            }),
          );
        }
      }
    } catch (publishError) {
      console.error('Error publishing real-time updates:', publishError);
      // Continue execution - don't fail the request for publishing errors
    }

    res.json({
      message: `${updateResult.count} articles ${action.toLowerCase()}`,
      processed: updateResult.count,
      action,
    });
  } catch (error) {
    console.error('Error in bulk moderation:', error);
    res.status(500).json({ error: 'Failed to moderate articles' });
  }
};

export const refreshFeed = async (req: Request, res: Response) => {
  try {
    const feedId = parseInt(req.params.id);

    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    // Check if feed exists
    const feed = await feedService.refreshFeed(feedId);

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

    res.json({
      message: 'Feed refresh queued successfully',
      feedId,
      feedName: feed.name,
    });
  } catch (error) {
    console.error('Error refreshing feed:', error);
    res.status(500).json({ error: 'Failed to refresh feed' });
  }
};

export const findArticleById = async (articleId: number) => {
  try {
    const article = await feedService.findArticleById(articleId);
    return article;
  } catch (error) {
    console.error('Error finding article:', error);
    throw error;
  }
};

export const updateArticleTags = async (articleId: number, tags: string[]) => {
  try {
    const result = await feedService.updateArticleTags(articleId, tags);
    return result;
  } catch (error) {
    console.error('Error updating article tags:', error);
    throw error;
  }
};

export const getArticleCount = async (where: any) => {
  try {
    const count = await feedService.getArticleCountWithFilters(where);
    return count;
  } catch (error) {
    console.error('Error getting article count:', error);
    throw error;
  }
};

export const getArticles = async (where: any, pageLimit: number, pageOffset: number) => {
  try {
    const articles = await feedService.getArticlesWithFilters(
      where,
      { createdAt: 'desc' },
      pageLimit,
      pageOffset,
    );

    const publicArticles = articles.map((article: any) => ({
      id: article.id,
      feedId: article.feedId,
      feedName: article.feed.name,
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

    return publicArticles;
  } catch (error) {
    console.error('Error getting articles:', error);
    throw error;
  }
};
