import { PrismaClient } from '@prisma/client';

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
}
