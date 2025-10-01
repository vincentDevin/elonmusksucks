// apps/server/src/repositories/interfaces/ITagRepository.ts
import type { PrismaTag } from '@ems/types';

/**
 * Tag Repository
 * Manages normalized article tags
 */
export interface ITagRepository {
  // ============================================
  // CREATE
  // ============================================

  /** Create a new tag */
  createTag(data: { name: string; slug: string; description?: string | null }): Promise<PrismaTag>;

  /** Find or create tag by name */
  findOrCreateTag(name: string): Promise<PrismaTag>;

  /** Batch find or create tags */
  findOrCreateTags(names: string[]): Promise<PrismaTag[]>;

  // ============================================
  // READ
  // ============================================

  /** Get tag by ID */
  getTagById(id: number): Promise<PrismaTag | null>;

  /** Get tag by slug */
  getTagBySlug(slug: string): Promise<PrismaTag | null>;

  /** Get tag by name */
  getTagByName(name: string): Promise<PrismaTag | null>;

  /** Get all tags */
  getAllTags(): Promise<PrismaTag[]>;

  /** Get popular tags (by usage count) */
  getPopularTags(limit?: number): Promise<PrismaTag[]>;

  /** Get tags with article count */
  getTagsWithStats(): Promise<
    Array<
      PrismaTag & {
        _count: {
          articles: number;
        };
      }
    >
  >;

  /** Search tags by name */
  searchTags(query: string, limit?: number): Promise<PrismaTag[]>;

  // ============================================
  // ARTICLE TAG ASSOCIATIONS
  // ============================================

  /** Add tags to article */
  addTagsToArticle(articleId: number, tagIds: number[]): Promise<void>;

  /** Remove tags from article */
  removeTagsFromArticle(articleId: number, tagIds: number[]): Promise<void>;

  /** Replace article tags (remove old, add new) */
  replaceArticleTags(articleId: number, tagIds: number[]): Promise<void>;

  /** Get tags for article */
  getArticleTags(articleId: number): Promise<PrismaTag[]>;

  /** Get articles for tag */
  getArticlesByTag(
    tagId: number,
    options: {
      cursor?: number;
      limit?: number;
    },
  ): Promise<import('@ems/types').DbTagArticlesResult>;

  // ============================================
  // UPDATE
  // ============================================

  /** Update tag */
  updateTag(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
    },
  ): Promise<PrismaTag | null>;

  /** Increment usage count */
  incrementUsageCount(id: number): Promise<void>;

  /** Decrement usage count */
  decrementUsageCount(id: number): Promise<void>;

  /** Sync usage counts (recalculate from ArticleTag) */
  syncUsageCounts(): Promise<void>;

  // ============================================
  // DELETE
  // ============================================

  /** Delete tag (only if no articles) */
  deleteTag(id: number): Promise<boolean>;

  /** Delete unused tags */
  deleteUnusedTags(): Promise<number>;

  // ============================================
  // VALIDATION
  // ============================================

  /** Check if slug is available */
  isSlugAvailable(slug: string, excludeId?: number): Promise<boolean>;

  /** Check if tag is in use */
  isTagInUse(id: number): Promise<boolean>;
}
