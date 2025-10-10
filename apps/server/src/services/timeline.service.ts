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

  async getArticlesWithReactions(
    articleIds: number[],
    viewerId?: number,
  ): Promise<
    Map<
      number,
      {
        counts: Record<string, number>;
        userReaction?: string;
        totalCount: number;
      }
    >
  > {
    if (articleIds.length === 0) {
      return new Map();
    }

    // Fetch all reactions for these articles
    const reactions = await this.reactionRepository.getArticleReactionsBulk(articleIds);

    // Group by article ID and count by type
    const reactionMap = new Map<
      number,
      {
        counts: Record<string, number>;
        userReaction?: string;
        totalCount: number;
      }
    >();

    // Initialize all articles with empty counts
    articleIds.forEach((id) => {
      reactionMap.set(id, {
        counts: {},
        userReaction: undefined,
        totalCount: 0,
      });
    });

    // Process reactions
    reactions.forEach((reaction: any) => {
      const articleId = reaction.articleId;
      if (!articleId) return;

      const data = reactionMap.get(articleId);
      if (!data) return;

      // Increment count for this reaction type
      data.counts[reaction.type] = (data.counts[reaction.type] || 0) + 1;
      data.totalCount += 1;

      // Check if this is the viewer's reaction
      if (viewerId && reaction.userId === viewerId) {
        data.userReaction = reaction.type;
      }
    });

    return reactionMap;
  }

  async getPublicPosts(params: {
    cursor?: number;
    limit: number;
    sortBy?: 'recent' | 'trending';
    viewerId?: number;
  }) {
    const result = await this.contentRepository.getPublicTimeline(params);

    // Batch enrich user avatars - access author directly from repository result
    const authors = result.content.filter((c: any) => c.author).map((c: any) => c.author);
    const enrichedAuthors = await userService.enrichUsersWithAvatars(authors);
    const authorMap = new Map(enrichedAuthors.map((author) => [author.id, author]));

    // Map enriched authors back to posts
    const enrichedPosts = result.content.map((post: any) => {
      if (post.author) {
        const enrichedUser = authorMap.get(post.author.id);
        if (enrichedUser) {
          return {
            ...post,
            user: enrichedUser,
            author: enrichedUser, // Keep both for compatibility
          };
        }
      }
      // Fallback if enrichment fails or no author
      return {
        ...post,
        user: post.author || { id: post.authorId, name: 'Unknown', avatarUrl: null },
        author: post.author || { id: post.authorId, name: 'Unknown', avatarUrl: null },
      };
    });

    return enrichedPosts;
  }

  async getArticleDetails(articleId: number): Promise<any> {
    return this.repository.getArticleDetails(articleId);
  }

  async toggleArticleReaction(articleId: number, userId: number, type: PrismaReactionType) {
    return this.reactionRepository.toggleArticleReaction(articleId, userId, type);
  }

  async getArticleReactions(articleId: number) {
    const reactions = await this.reactionRepository.getArticleReactions(articleId);

    // Batch enrich user avatars
    const users = reactions.filter((r: any) => r.user).map((r: any) => r.user);
    const enrichedUsers = await userService.enrichUsersWithAvatars(users);
    const userMap = new Map(enrichedUsers.map((user) => [user.id, user]));

    // Map enriched users back to reactions
    const enrichedReactions = reactions.map((reaction: any) => {
      if (reaction.user) {
        const enrichedUser = userMap.get(reaction.user.id);
        if (enrichedUser) {
          return {
            ...reaction,
            user: enrichedUser,
          };
        }
      }
      return reaction;
    });

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

      // Batch enrich user avatars
      const authors = result.comments.filter((c: any) => c.author).map((c: any) => c.author);
      const enrichedAuthors = await userService.enrichUsersWithAvatars(authors);
      const authorMap = new Map(enrichedAuthors.map((author) => [author.id, author]));

      // Map enriched authors back to comments
      const enrichedComments = result.comments.map((comment: any) => {
        if (comment.author) {
          const enrichedUser = authorMap.get(comment.author.id);
          if (enrichedUser) {
            return {
              ...comment,
              user: enrichedUser,
              author: enrichedUser, // Keep both for compatibility
            };
          }
        }
        // Fallback if enrichment fails or no author
        return {
          ...comment,
          user: comment.author || { id: comment.authorId, name: 'Unknown', avatarUrl: null },
          author: comment.author || { id: comment.authorId, name: 'Unknown', avatarUrl: null },
        };
      });

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

    // Helper function to calculate trending score
    // Formula: reactions × 2 + comments × 3 + views × 0.0001 + shares × 5
    const calculateScore = (reactions: number, comments: number, views: number, shares = 0) => {
      return reactions * 2 + comments * 3 + views * 0.0001 + shares * 5;
    };

    // Transform articles to TrendingItem
    const articleItems = trendingData.articles.map((article) => ({
      id: `article-${article.id}`,
      type: 'article' as const,
      title: article.title,
      excerpt: article.excerpt || undefined,
      author: {
        id: String(article.feed?.id || 0),
        name: article.feed?.name || 'Unknown Source',
        avatar: undefined,
      },
      engagement: {
        views: 0, // Articles don't track views currently
        reactions: article.reactionsCount || 0,
        comments: article.commentsCount || 0,
        shares: 0, // Not tracked yet
        score: calculateScore(article.reactionsCount || 0, article.commentsCount || 0, 0, 0),
      },
      timestamp: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
      tags: article.tags?.map((at) => at.tag.name) || [],
      mediaUrl: article.leadImageUrl || undefined,
      trendingRank: undefined, // Will be set after sorting
      trendingChange: 'new' as const, // Default to 'new' (could be enhanced with Redis cache)
    }));

    // Transform posts to TrendingItem
    const postItems = trendingData.posts.map((post) => ({
      id: `post-${post.id}`,
      type: 'post' as const,
      title: post.content.length > 100 ? post.content.substring(0, 97) + '...' : post.content,
      excerpt: undefined,
      author: {
        id: String(post.author.id),
        name: post.author.name,
        avatar: post.author.avatarUrl || undefined,
      },
      engagement: {
        views: post.viewsCount || 0,
        reactions: post.reactionsCount || 0,
        comments: post.repliesCount || 0,
        shares: 0, // Not tracked yet
        score: calculateScore(
          post.reactionsCount || 0,
          post.repliesCount || 0,
          post.viewsCount || 0,
          0,
        ),
      },
      timestamp: post.createdAt.toISOString(),
      tags: undefined,
      mediaUrl: undefined,
      trendingRank: undefined,
      trendingChange: 'new' as const,
    }));

    // Combine and sort by score
    const allItems = [...articleItems, ...postItems].sort(
      (a, b) => b.engagement.score - a.engagement.score,
    );

    // Assign trending ranks
    const itemsWithRanks = allItems.slice(0, params.limit).map((item, index) => ({
      ...item,
      trendingRank: index + 1,
    }));

    return {
      items: itemsWithRanks,
    };
  }

  // ===============================================
  // Bookmark System Methods
  // ===============================================

  async checkArticleBookmark(articleId: number, userId: number): Promise<boolean> {
    return this.repository.checkArticleBookmark(articleId, userId);
  }

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
