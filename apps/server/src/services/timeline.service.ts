import { PrismaClient } from '@prisma/client';
import { TimelineRepository } from '../repositories/TimelineRepository';
import type { ITimelineRepository } from '../repositories/interfaces/ITimelineRepository';
import { UserService } from './user.service';

const prisma = new PrismaClient();
const userService = new UserService();

export class TimelineService {
  private repository: ITimelineRepository;

  constructor() {
    this.repository = new TimelineRepository(prisma);
  }

  async getArticles(params: { cursor?: Date; limit: number }) {
    return this.repository.getApprovedArticles(params);
  }

  async getTimelineTweets(params: { cursor?: string; limit: number }) {
    return this.repository.getTimelineTweets(params);
  }

  async getArticleDetails(articleId: number): Promise<any> {
    return this.repository.getArticleDetails(articleId);
  }

  async toggleArticleReaction(articleId: number, userId: number, type: string) {
    return this.repository.toggleArticleReaction(articleId, userId, type);
  }

  async getArticleReactions(articleId: number) {
    const reactions = await this.repository.getArticleReactions(articleId);

    // Enrich user data with signed avatar URLs
    const enrichedReactions = await Promise.all(
      reactions.map(async (reaction) => {
        if (reaction.user) {
          const enrichedUser = await userService.enrichUserWithAvatar(reaction.user);
          return {
            ...reaction,
            user: enrichedUser,
          };
        }
        return reaction;
      }),
    );

    return enrichedReactions;
  }

  async createArticleComment(articleId: number, userId: number, content: string) {
    const comment = await this.repository.createArticleComment(articleId, userId, content);

    // Enrich user data with signed avatar URL
    if (comment.user) {
      const enrichedUser = await userService.enrichUserWithAvatar(comment.user);
      return {
        ...comment,
        user: enrichedUser,
      };
    }

    return comment;
  }

  async getArticleComments(articleId: number, limit: number, cursor?: string) {
    const result = await this.repository.getArticleComments(articleId, limit, cursor);

    // Enrich user data with signed avatar URLs
    const enrichedComments = await Promise.all(
      result.comments.map(async (comment) => {
        if (comment.user) {
          const enrichedUser = await userService.enrichUserWithAvatar(comment.user);
          return {
            ...comment,
            user: enrichedUser,
          };
        }
        return comment;
      }),
    );

    return {
      ...result,
      comments: enrichedComments,
    };
  }

  // ===============================================
  // Search and Discovery Methods
  // ===============================================

  async searchTimeline(params: { query: string; filters?: any; limit: number; cursor?: string }) {
    // Basic text search implementation
    const searchResults = await this.repository.searchContent({
      query: params.query,
      filters: params.filters || {},
      limit: params.limit,
      cursor: params.cursor,
    });

    return {
      items: searchResults.items || [],
      pagination: {
        cursor: searchResults.nextCursor,
        hasMore: searchResults.hasMore || false,
        total: searchResults.total,
      },
    };
  }

  async getSearchSuggestions(query: string) {
    // Return search suggestions based on query
    const suggestions = await this.repository.getSearchSuggestions(query);

    return suggestions.map((suggestion) => ({
      type: suggestion.type,
      value: suggestion.value,
      count: suggestion.count || 0,
    }));
  }

  async getTrendingContent(params: {
    timeRange: 'hour' | 'day' | 'week' | 'month';
    limit: number;
    type: 'articles' | 'posts' | 'all';
  }) {
    const trendingData = await this.repository.getTrendingContent({
      timeRange: params.timeRange,
      limit: params.limit,
      contentType: params.type,
    });

    return {
      articles: trendingData.articles || [],
      posts: trendingData.posts || [],
      tags: trendingData.tags || [],
      authors: trendingData.authors || [],
    };
  }

  // ===============================================
  // Bookmark System Methods
  // ===============================================

  async toggleArticleBookmark(articleId: number, userId: number, collectionId?: number) {
    return this.repository.toggleArticleBookmark(articleId, userId, collectionId);
  }

  async getUserBookmarks(
    userId: number,
    params: {
      limit: number;
      cursor?: string;
      collectionId?: number;
    },
  ) {
    return this.repository.getUserBookmarks(userId, params);
  }

  async getBookmarkCollections(userId: number) {
    return this.repository.getBookmarkCollections(userId);
  }

  async createBookmarkCollection(
    userId: number,
    data: {
      name: string;
      description?: string | null;
      isPrivate: boolean;
    },
  ) {
    return this.repository.createBookmarkCollection(userId, data);
  }

  // ===============================================
  // Social Sharing Methods
  // ===============================================

  async shareArticle(
    articleId: number,
    userId: number,
    data: {
      platform: string;
      message?: string | null;
      targetUsers: number[];
    },
  ) {
    return this.repository.shareArticle(articleId, userId, data);
  }

  async getArticleShareStats(articleId: number) {
    return this.repository.getArticleShareStats(articleId);
  }
}
