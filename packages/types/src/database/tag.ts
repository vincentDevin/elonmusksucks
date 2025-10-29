/**
 * Tag Database Types
 *
 * Types for the Tag and ArticleTag models (normalized from Article.tags string[])
 */

import type { PrismaTag, PrismaArticleTag } from '../prisma';

// ============================================================================
// Tag Types
// ============================================================================

export type DbTag = PrismaTag;

export interface PublicTag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// TagWithStats is exported from prisma.ts - import it when needed

// ============================================================================
// Article Tag Join Table
// ============================================================================

export type DbArticleTag = PrismaArticleTag;

export interface PublicArticleTag {
  id: number;
  articleId: number;
  tagId: number;
  createdAt: string;
}

// ============================================================================
// Tag Query Result Types
// ============================================================================

export interface DbTagArticlesResult {
  articles: Array<{
    id: number;
    title: string;
    url: string;
    excerpt: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    feed: {
      id: number;
      name: string;
      siteUrl: string | null;
    };
  }>;
  nextCursor?: number;
}
