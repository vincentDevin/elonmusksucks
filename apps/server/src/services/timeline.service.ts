import { PrismaClient } from '@prisma/client';
import { TimelineRepository } from '../repositories/TimelineRepository';
import type { ITimelineRepository } from '../repositories/interfaces/ITimelineRepository';
import { ReactionRepository } from '../repositories/ReactionRepository';
import type { IReactionRepository } from '../repositories/interfaces/IReactionRepository';
import { ContentRepository } from '../repositories/ContentRepository';
import type { IContentRepository } from '../repositories/interfaces/IContentRepository';
import { UserService } from './user.service';
import type { PrismaReactionType } from '@ems/types';

const prisma = new PrismaClient();
const userService = new UserService();

export class TimelineService {
  private repository: ITimelineRepository;
  private reactionRepository: IReactionRepository;
  private contentRepository: IContentRepository;

  constructor() {
    this.repository = new TimelineRepository(prisma);
    this.reactionRepository = new ReactionRepository(prisma);
    this.contentRepository = new ContentRepository();
  }

  async getArticles(params: { cursor?: Date; limit: number }) {
    return this.repository.getApprovedArticles(params);
  }

  async getPublicPosts(params: {
    cursor?: number;
    limit: number;
    sortBy?: 'recent' | 'trending';
    viewerId?: number;
  }) {
    const result = await this.contentRepository.getPublicTimeline(params);
    return result.content;
  }

  async getArticleDetails(articleId: number): Promise<any> {
    return this.repository.getArticleDetails(articleId);
  }

  async toggleArticleReaction(articleId: number, userId: number, type: PrismaReactionType) {
    return this.reactionRepository.toggleArticleReaction(articleId, userId, type);
  }

  async getArticleReactions(articleId: number) {
    const reactions = await this.reactionRepository.getArticleReactions(articleId);

    // Enrich user data with signed avatar URLs
    const enrichedReactions = await Promise.all(
      reactions.map(async (reaction: any) => {
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
    // Create comment using Content model with articleId
    const comment = await this.contentRepository.createContent({
      authorId: userId,
      type: 'COMMENT',
      body: content,
      articleId,
    });

    // Fetch the full comment with author details
    const fullComment = await this.contentRepository.getContentWithDetails(comment.id);

    return fullComment || comment;
  }

  async getArticleComments(articleId: number, limit: number, cursor?: string, viewerId?: number) {
    try {
      // Get comments for article using Content repository
      const result = await this.contentRepository.getArticleComments(articleId, {
        limit,
        cursor: cursor ? parseInt(cursor) : undefined,
        viewerId,
      });

      // Enrich user data with signed avatar URLs
      const enrichedComments = await Promise.all(
        result.comments.map(async (comment: any) => {
          try {
            if (comment.author) {
              const enrichedUser = await userService.enrichUserWithAvatar(comment.author);
              console.log(
                `[timeline] Enriched comment ${comment.id} author avatarUrl:`,
                enrichedUser.avatarUrl,
              );
              return {
                ...comment,
                user: enrichedUser,
                author: enrichedUser, // Keep both for compatibility
              };
            }
            return comment;
          } catch (error) {
            console.error(`[timeline] Error enriching comment ${comment.id}:`, error);
            // Return comment with basic author data if enrichment fails
            return {
              ...comment,
              user: comment.author || { id: comment.authorId, name: 'Unknown', avatarUrl: null },
              author: comment.author || { id: comment.authorId, name: 'Unknown', avatarUrl: null },
            };
          }
        }),
      );

      return {
        comments: enrichedComments,
        nextCursor: result.nextCursor?.toString(),
      };
    } catch (error) {
      console.error('[timeline] Error in getArticleComments:', error);
      throw error;
    }
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
