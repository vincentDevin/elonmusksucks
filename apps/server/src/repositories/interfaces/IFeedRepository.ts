// apps/server/src/repositories/interfaces/IFeedRepository.ts

import type { Article, FeedSource, FeedStatus, Prisma } from '@prisma/client';

export interface IFeedRepository {
  // Feed operations
  findMany(): Promise<FeedSource[]>;
  findManyWithStats(): Promise<FeedSource[]>;
  getArticleCount(feedId: number): Promise<number>;
  getRecentArticleCount(feedId: number, since: Date): Promise<number>;
  createFeed(data: {
    name: string;
    url: string;
    siteUrl?: string | null;
    allowImages: boolean;
    status: FeedStatus;
  }): Promise<FeedSource>;
  deleteFeed(id: number): Promise<FeedSource>;
  updateFeed(id: number, updates: any): Promise<FeedSource>;
  bulkModerateArticles(
    ids: number[],
    action: string,
    notes?: string,
  ): Promise<{
    updateResult: Prisma.BatchPayload;
    approvedArticles: any[];
  }>;
  findFeedById(id: number): Promise<FeedSource | null>;

  // Article operations
  findArticleById(
    id: number,
  ): Promise<{ id: number; tags: { id: number; articleId: number; tagId: number }[] } | null>;
  updateArticleTags(id: number, tagIds: number[]): Promise<Article | null>;
  getArticleCountWithFilters(where: any): Promise<number>;
  getArticlesWithFilters(where: any, orderBy: any, take: number, skip: number): Promise<Article[]>;

  // Worker-specific article operations
  createArticleWithTags(data: {
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
  }): Promise<Article>;

  findArticleByHash(hash: string): Promise<Article | null>;

  updateArticleEnrichment(
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
  ): Promise<Article>;

  findArticleWithTagsAndFeed(articleId: number): Promise<any>;
}
