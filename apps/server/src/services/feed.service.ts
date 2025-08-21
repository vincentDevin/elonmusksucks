import { PrismaClient } from '@prisma/client';
import { FeedRepository } from '../repositories/FeedRepository';

const prisma = new PrismaClient();

export class FeedService {
  private repository: FeedRepository;

  constructor() {
    this.repository = new FeedRepository(prisma);
  }

  async listFeeds() {
    return this.repository.findMany();
  }

  async getFeedStats() {
    const feeds = await this.repository.findManyWithStats();
    const stats = [];

    for (const feed of feeds) {
      // Calculate stats for each feed
      const totalArticles = await this.repository.getArticleCount(feed.id);

      // Recent articles (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentArticles = await this.repository.getRecentArticleCount(feed.id, sevenDaysAgo);

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

    return stats;
  }
}
