// apps/server/src/repositories/interfaces/ITimelineRepository.ts

export interface ITimelineRepository {
  getApprovedArticles(params: { cursor?: Date; limit: number }): Promise<any[]>;
  getTimelineTweets(params: { cursor?: string; limit: number }): Promise<any[]>;
  getArticleDetails(articleId: number): Promise<any>;
  toggleArticleReaction(
    articleId: number,
    userId: number,
    type: string,
  ): Promise<{
    action: 'added' | 'removed';
    counts: { reactions: number; comments: number };
  }>;
  getArticleReactions(articleId: number): Promise<any[]>;
  createArticleComment(articleId: number, userId: number, content: string): Promise<any>;
  getArticleComments(
    articleId: number,
    limit: number,
    cursor?: string,
  ): Promise<{
    comments: any[];
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }>;

  // Search and Discovery
  searchContent(params: { query: string; filters: any; limit: number; cursor?: string }): Promise<{
    items: any[];
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
  }>;
  getSearchSuggestions(query: string): Promise<
    Array<{
      type: 'article' | 'tag' | 'author' | 'feed';
      value: string;
      count?: number;
    }>
  >;
  getTrendingContent(params: {
    timeRange: 'hour' | 'day' | 'week' | 'month';
    limit: number;
    contentType: 'articles' | 'posts' | 'all';
  }): Promise<{
    articles: any[];
    posts: any[];
    tags: any[];
    authors: any[];
  }>;

  // Bookmark System
  toggleArticleBookmark(
    articleId: number,
    userId: number,
    collectionId?: number,
  ): Promise<{
    action: 'added' | 'removed';
    bookmarkId?: number;
  }>;
  getUserBookmarks(
    userId: number,
    params: {
      limit: number;
      cursor?: string;
      collectionId?: number;
    },
  ): Promise<{
    bookmarks: any[];
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }>;
  getBookmarkCollections(userId: number): Promise<any[]>;
  createBookmarkCollection(
    userId: number,
    data: {
      name: string;
      description?: string | null;
      isPrivate: boolean;
    },
  ): Promise<any>;

  // Social Sharing
  shareArticle(
    articleId: number,
    userId: number,
    data: {
      platform: string;
      message?: string | null;
      targetUsers: number[];
    },
  ): Promise<{
    shareId: number;
    shareUrl?: string;
  }>;
  getArticleShareStats(articleId: number): Promise<{
    totalShares: number;
    platforms: Record<string, number>;
    recentShares: any[];
  }>;
}
