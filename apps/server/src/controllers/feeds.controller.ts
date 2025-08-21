import type { Request, Response } from 'express';
import { FeedService } from '../services/feed.service';

const feedService = new FeedService();

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
