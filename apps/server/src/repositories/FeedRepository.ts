import { PrismaClient, FeedStatus, ArticleStatus } from '@prisma/client';
import type { IFeedRepository } from './interfaces/IFeedRepository';

// TEMP: Re-export shared types for backwards compatibility during migration
export type { PageQuery, CursorPage, SortOrder, DateRange } from '@ems/types';

export class FeedRepository implements IFeedRepository {
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

  /**
   * Bulk update article tags - optimized for performance
   * Updates tags for multiple articles in batched operations
   */
  async bulkUpdateArticleTags(
    updates: Array<{ articleId: number; tagIds: number[] }>,
  ): Promise<{ updated: number }> {
    if (updates.length === 0) {
      return { updated: 0 };
    }

    const articleIds = updates.map((u) => u.articleId);

    // Step 1: Delete all existing tags for these articles (single query)
    await this.prisma.articleTag.deleteMany({
      where: {
        articleId: { in: articleIds },
      },
    });

    // Step 2: Prepare all new tag associations
    const allTagAssociations: Array<{ articleId: number; tagId: number }> = [];
    for (const update of updates) {
      for (const tagId of update.tagIds) {
        allTagAssociations.push({
          articleId: update.articleId,
          tagId,
        });
      }
    }

    // Step 3: Create all new tag associations (single query)
    if (allTagAssociations.length > 0) {
      await this.prisma.articleTag.createMany({
        data: allTagAssociations,
        skipDuplicates: true, // Prevent errors if duplicate associations exist
      });
    }

    return { updated: updates.length };
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

  /**
   * Create article with tags (for feed worker)
   */
  async createArticleWithTags(data: {
    feedId: number;
    guid: string | null;
    url: string;
    canonicalUrl?: string;
    title: string;
    excerpt?: string;
    leadImageUrl?: string;
    publishedAt: Date;
    hash: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    tags: {
      create: Array<{
        tag: {
          connectOrCreate: {
            where: { name: string };
            create: { name: string; slug: string };
          };
        };
      }>;
    };
  }) {
    return this.prisma.article.create({
      data,
    });
  }

  /**
   * Find article by hash for deduplication
   */
  async findArticleByHash(hash: string) {
    return this.prisma.article.findUnique({
      where: { hash },
    });
  }

  /**
   * Update article with enrichment data
   */
  async updateArticleEnrichment(
    articleId: number,
    data: {
      leadImageUrl?: string;
      excerpt?: string;
      canonicalUrl?: string;
      tags?: {
        create: Array<{
          tag: {
            connectOrCreate: {
              where: { name: string };
              create: { name: string; slug: string };
            };
          };
        }>;
      };
    },
  ) {
    return this.prisma.article.update({
      where: { id: articleId },
      data,
    });
  }

  /**
   * Get article with tags and feed (for enrichment worker)
   */
  async findArticleWithTagsAndFeed(articleId: number) {
    return this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        feed: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }
}
