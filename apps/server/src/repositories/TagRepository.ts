// apps/server/src/repositories/TagRepository.ts
import prisma from '../db';
import { Tag } from '@prisma/client';
import { ITagRepository } from './interfaces/ITagRepository';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export class TagRepository implements ITagRepository {
  private prisma = prisma;

  // ============================================
  // CREATE
  // ============================================

  async createTag(data: { name: string; slug: string; description?: string | null }): Promise<Tag> {
    return this.prisma.tag.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        usageCount: 0,
      },
    });
  }

  async findOrCreateTag(name: string): Promise<Tag> {
    const slug = slugify(name);

    // Try to find existing tag by name or slug
    let tag = await this.prisma.tag.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (!tag) {
      tag = await this.createTag({ name, slug });
    }

    return tag;
  }

  async findOrCreateTags(names: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];

    for (const name of names) {
      const tag = await this.findOrCreateTag(name);
      tags.push(tag);
    }

    return tags;
  }

  // ============================================
  // READ
  // ============================================

  async getTagById(id: number): Promise<Tag | null> {
    return this.prisma.tag.findUnique({
      where: { id },
    });
  }

  async getTagBySlug(slug: string): Promise<Tag | null> {
    return this.prisma.tag.findUnique({
      where: { slug },
    });
  }

  async getTagByName(name: string): Promise<Tag | null> {
    return this.prisma.tag.findUnique({
      where: { name },
    });
  }

  async getAllTags(): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPopularTags(limit?: number): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: {
        usageCount: {
          gt: 0,
        },
      },
      orderBy: { usageCount: 'desc' },
      take: limit || 20,
    });
  }

  async getTagsWithStats(): Promise<
    Array<
      Tag & {
        _count: {
          articles: number;
        };
      }
    >
  > {
    return this.prisma.tag.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: { usageCount: 'desc' },
    });
  }

  async searchTags(query: string, limit?: number): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { usageCount: 'desc' },
      take: limit || 10,
    });
  }

  // ============================================
  // ARTICLE TAG ASSOCIATIONS
  // ============================================

  async addTagsToArticle(articleId: number, tagIds: number[]): Promise<void> {
    await this.prisma.articleTag.createMany({
      data: tagIds.map((tagId) => ({
        articleId,
        tagId,
      })),
      skipDuplicates: true,
    });

    // Increment usage counts
    await Promise.all(tagIds.map((tagId) => this.incrementUsageCount(tagId)));
  }

  async removeTagsFromArticle(articleId: number, tagIds: number[]): Promise<void> {
    await this.prisma.articleTag.deleteMany({
      where: {
        articleId,
        tagId: {
          in: tagIds,
        },
      },
    });

    // Decrement usage counts
    await Promise.all(tagIds.map((tagId) => this.decrementUsageCount(tagId)));
  }

  async replaceArticleTags(articleId: number, tagIds: number[]): Promise<void> {
    // Get current tags
    const currentTags = await this.prisma.articleTag.findMany({
      where: { articleId },
      select: { tagId: true },
    });

    const currentTagIds = currentTags.map((t) => t.tagId);

    // Find tags to add and remove
    const toAdd = tagIds.filter((id) => !currentTagIds.includes(id));
    const toRemove = currentTagIds.filter((id) => !tagIds.includes(id));

    // Remove old tags
    if (toRemove.length > 0) {
      await this.removeTagsFromArticle(articleId, toRemove);
    }

    // Add new tags
    if (toAdd.length > 0) {
      await this.addTagsToArticle(articleId, toAdd);
    }
  }

  async getArticleTags(articleId: number): Promise<Tag[]> {
    const articleTags = await this.prisma.articleTag.findMany({
      where: { articleId },
      include: {
        tag: true,
      },
    });

    return articleTags.map((at) => at.tag);
  }

  async getArticlesByTag(
    tagId: number,
    options: {
      cursor?: number;
      limit?: number;
    },
  ): Promise<{ articles: any[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const articleTags = await this.prisma.articleTag.findMany({
      where: {
        tagId,
        ...(options.cursor && { id: { lt: options.cursor } }),
      },
      include: {
        article: {
          include: {
            feed: {
              select: {
                name: true,
                siteUrl: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const articles = articleTags.map((at) => at.article);
    const hasMore = articles.length > limit;
    const items = hasMore ? articles.slice(0, limit) : articles;
    const nextCursor = hasMore ? articleTags[articleTags.length - 2].id : undefined;

    return { articles: items, nextCursor };
  }

  // ============================================
  // UPDATE
  // ============================================

  async updateTag(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
    },
  ): Promise<Tag | null> {
    try {
      return await this.prisma.tag.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });
    } catch {
      return null;
    }
  }

  async incrementUsageCount(id: number): Promise<void> {
    await this.prisma.tag.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  async decrementUsageCount(id: number): Promise<void> {
    await this.prisma.tag.update({
      where: { id },
      data: { usageCount: { decrement: 1 } },
    });
  }

  async syncUsageCounts(): Promise<void> {
    const tags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
    });

    await Promise.all(
      tags.map((tag) =>
        this.prisma.tag.update({
          where: { id: tag.id },
          data: { usageCount: tag._count.articles },
        }),
      ),
    );
  }

  // ============================================
  // DELETE
  // ============================================

  async deleteTag(id: number): Promise<boolean> {
    try {
      // Check if tag is in use
      const count = await this.prisma.articleTag.count({
        where: { tagId: id },
      });

      if (count > 0) {
        return false; // Cannot delete tag in use
      }

      await this.prisma.tag.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteUnusedTags(): Promise<number> {
    const result = await this.prisma.tag.deleteMany({
      where: {
        usageCount: 0,
        articles: {
          none: {},
        },
      },
    });

    return result.count;
  }

  // ============================================
  // VALIDATION
  // ============================================

  async isSlugAvailable(slug: string, excludeId?: number): Promise<boolean> {
    const existing = await this.prisma.tag.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return true;
    }

    return excludeId !== undefined && existing.id === excludeId;
  }

  async isTagInUse(id: number): Promise<boolean> {
    const count = await this.prisma.articleTag.count({
      where: { tagId: id },
    });

    return count > 0;
  }
}
