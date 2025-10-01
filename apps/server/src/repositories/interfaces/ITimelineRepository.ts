import type {
  DbArticleFeedParams,
  DbArticleWithTags,
  DbArticleWithStats,
  DbSearchFilters,
  DbSearchResult,
  DbSearchSuggestion,
  DbTrendingContentParams,
  DbTrendingContent,
  DbToggleBookmarkResult,
  DbUserBookmarksParams,
  DbUserBookmarksResult,
  DbBookmarkCollectionWithCount,
  DbCreateBookmarkCollectionData,
  DbShareArticleData,
  DbShareArticleResult,
  DbArticleShareStats,
} from '@ems/types';

/**
 * Timeline Repository
 * Handles article feed management, article details, and tag associations
 * NOTE: Reactions and Comments now handled by IReactionRepository and IContentRepository
 */
export interface ITimelineRepository {
  // ============================================
  // ARTICLE FEED
  // ============================================

  /** Get approved articles for timeline */
  getApprovedArticles(params: DbArticleFeedParams): Promise<DbArticleWithTags[]>;

  /** Get article details with tags */
  getArticleDetails(articleId: number): Promise<DbArticleWithTags | null>;

  /** Get article with full stats (reactions, comments, tags) */
  getArticleWithStats(articleId: number): Promise<DbArticleWithStats>;

  // Search and Discovery
  searchContent(params: {
    query: string;
    filters: DbSearchFilters;
    limit: number;
    cursor?: string;
  }): Promise<DbSearchResult>;

  getSearchSuggestions(query: string): Promise<DbSearchSuggestion[]>;

  getTrendingContent(params: DbTrendingContentParams): Promise<DbTrendingContent>;

  // Bookmark System
  toggleArticleBookmark(
    articleId: number,
    userId: number,
    collectionId?: number,
  ): Promise<DbToggleBookmarkResult>;

  getUserBookmarks(userId: number, params: DbUserBookmarksParams): Promise<DbUserBookmarksResult>;

  getBookmarkCollections(userId: number): Promise<DbBookmarkCollectionWithCount[]>;

  createBookmarkCollection(
    userId: number,
    data: DbCreateBookmarkCollectionData,
  ): Promise<DbBookmarkCollectionWithCount>;

  // Social Sharing
  shareArticle(
    articleId: number,
    userId: number,
    data: DbShareArticleData,
  ): Promise<DbShareArticleResult>;

  getArticleShareStats(articleId: number): Promise<DbArticleShareStats>;
}
