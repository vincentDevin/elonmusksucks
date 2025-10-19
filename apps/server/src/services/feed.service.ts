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

    // Optimize: Get all article counts in a single aggregation query instead of looping
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all counts in parallel using Promise.all
    const [totalCounts, recentCounts] = await Promise.all([
      // Aggregate total articles per feed
      this.repository['prisma'].article.groupBy({
        by: ['feedId'],
        _count: {
          id: true,
        },
      }),
      // Aggregate recent articles per feed
      this.repository['prisma'].article.groupBy({
        by: ['feedId'],
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Create lookup maps for O(1) access
    const totalCountMap = new Map(totalCounts.map((c) => [c.feedId, c._count.id]));
    const recentCountMap = new Map(recentCounts.map((c) => [c.feedId, c._count.id]));

    // Build stats array with O(n) complexity instead of O(n * 2) with queries
    const stats = feeds.map((feed) => {
      const totalArticles = totalCountMap.get(feed.id) || 0;
      const recentArticles = recentCountMap.get(feed.id) || 0;
      const errorRate = feed.fetchCount > 0 ? (feed.errorCount / feed.fetchCount) * 100 : 0;

      // Average fetch time (mock for now - would need to track actual fetch times)
      const avgFetchTime = Math.random() * 2000 + 500; // 500-2500ms

      return {
        feedId: feed.id,
        totalArticles,
        recentArticles,
        errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
        avgFetchTime: Math.round(avgFetchTime),
        lastSuccess: feed.lastSuccessAt?.toISOString() || null,
        lastError: feed.lastErrorAt?.toISOString() || null,
      };
    });

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

  async bulkUpdateArticleTags(updates: Array<{ articleId: number; tagIds: number[] }>) {
    return this.repository.bulkUpdateArticleTags(updates);
  }

  async getArticleCountWithFilters(where: any) {
    return this.repository.getArticleCountWithFilters(where);
  }

  async getArticlesWithFilters(where: any, orderBy: any, take: number, skip: number) {
    return this.repository.getArticlesWithFilters(where, orderBy, take, skip);
  }
}
