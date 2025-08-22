import { PrismaClient, FeedStatus, ArticleStatus } from '@prisma/client';

export class FeedRepository {
  constructor(private prisma: PrismaClient) {}

  async findMany() {
    return this.prisma.feedSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findManyWithStats() {
    return this.prisma.feedSource.findMany();
  }

  async getArticleCount(feedId: number) {
    return this.prisma.article.count({
      where: { feedId },
    });
  }

  async getRecentArticleCount(feedId: number, since: Date) {
    return this.prisma.article.count({
      where: {
        feedId,
        createdAt: { gte: since },
      },
    });
  }

  async createFeed(data: {
    name: string;
    url: string;
    siteUrl?: string | null;
    allowImages: boolean;
    status: FeedStatus;
  }) {
    return this.prisma.feedSource.create({
      data,
    });
  }

  async deleteFeed(id: number) {
    return this.prisma.feedSource.delete({ where: { id } });
  }

  async updateFeed(id: number, updates: any) {
    return this.prisma.feedSource.update({
      where: { id },
      data: updates,
    });
  }

  async bulkModerateArticles(ids: number[], action: string, notes?: string) {
    const updateResult = await this.prisma.article.updateMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
      },
      data: {
        status: action as ArticleStatus,
        modNotes: notes || null,
      },
    });

    // Get newly approved articles if action is APPROVED
    let approvedArticles: any[] = [];
    if (action === 'APPROVED' && updateResult.count > 0) {
      approvedArticles = await this.prisma.article.findMany({
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
    }

    return { updateResult, approvedArticles };
  }

  async findFeedById(id: number) {
    return this.prisma.feedSource.findUnique({
      where: { id },
    });
  }

  async findArticleById(id: number) {
    return this.prisma.article.findUnique({
      where: { id },
      select: { id: true, tags: true },
    });
  }

  async updateArticleTags(id: number, tags: string[]) {
    return this.prisma.article.update({
      where: { id },
      data: { tags },
    });
  }

  async getArticleCountWithFilters(where: any) {
    return this.prisma.article.count({ where });
  }

  async getArticlesWithFilters(where: any, orderBy: any, take: number, skip: number) {
    return this.prisma.article.findMany({
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
      orderBy,
      take,
      skip,
    });
  }
}
