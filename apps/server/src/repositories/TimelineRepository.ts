import { PrismaClient } from '@prisma/client';

export class TimelineRepository {
  constructor(private prisma: PrismaClient) {}

  async getApprovedArticles(params: { cursor?: Date; limit: number }) {
    const where: any = { status: 'APPROVED' };

    if (params.cursor) {
      where.publishedAt = { lt: params.cursor };
    }

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
      orderBy: { publishedAt: 'desc' },
      take: params.limit + 1,
    });
  }
}
