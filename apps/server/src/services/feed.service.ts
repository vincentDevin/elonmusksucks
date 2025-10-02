import { PrismaClient, FeedStatus } from '@prisma/client';
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

  async createFeed(data: {
    name: string;
    url: string;
    siteUrl?: string | null;
    allowImages?: boolean;
  }) {
    const feedData = { ...data, allowImages: data.allowImages ?? true, status: FeedStatus.ACTIVE };
    const feed = await this.repository.createFeed(feedData);
    return feed;
  }

  async deleteFeed(id: number) {
    return this.repository.deleteFeed(id);
  }

  async updateFeed(id: number, updates: any) {
    return this.repository.updateFeed(id, updates);
  }

  async bulkModerateArticles(ids: number[], action: string, notes?: string) {
    return this.repository.bulkModerateArticles(ids, action, notes);
  }

  async refreshFeed(feedId: number) {
    return this.repository.findFeedById(feedId);
  }

  async findArticleById(articleId: number) {
    return this.repository.findArticleById(articleId);
  }

  async updateArticleTags(articleId: number, tagIds: number[]) {
    return this.repository.updateArticleTags(articleId, tagIds);
  }

  async getArticleCountWithFilters(where: any) {
    return this.repository.getArticleCountWithFilters(where);
  }

  async getArticlesWithFilters(where: any, orderBy: any, take: number, skip: number) {
    return this.repository.getArticlesWithFilters(where, orderBy, take, skip);
  }
}
