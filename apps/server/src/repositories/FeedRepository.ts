import { PrismaClient, FeedStatus, ArticleStatus } from '@prisma/client';

// TEMP: Re-export shared types for backwards compatibility during migration
export type { PageQuery, CursorPage, SortOrder, DateRange } from '@ems/types';

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

  async updateArticleTags(id: number, tagIds: number[]) {
    // First, delete existing tags for this article
    await this.prisma.articleTag.deleteMany({
      where: { articleId: id },
    });

    // Then create new tag associations
    if (tagIds.length > 0) {
      await this.prisma.articleTag.createMany({
        data: tagIds.map((tagId) => ({
          articleId: id,
          tagId,
        })),
      });
    }

    // Return the updated article with its tags
    return this.prisma.article.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
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
