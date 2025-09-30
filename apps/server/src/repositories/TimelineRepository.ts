import { PrismaClient } from '@prisma/client';
import type { ITimelineRepository } from './interfaces/ITimelineRepository';

export class TimelineRepository implements ITimelineRepository {
  constructor(private prisma: PrismaClient) {}

  async getApprovedArticles(params: { cursor?: Date; limit: number }) {
    const where: any = { status: 'APPROVED' };

    if (params.cursor) {
      where.publishedAt = { lt: params.cursor };
    }

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
      orderBy: { publishedAt: 'desc' },
      take: params.limit + 1,
    });
  }

  async getTimelineTweets(params: { cursor?: string; limit: number }) {
    const where: {
      status: string;
      id?: { lt: string };
    } = {
      status: 'VISIBLE',
    };

    if (params.cursor) {
      where.id = { lt: params.cursor };
    }

    return this.prisma.tweet.findMany({
      where,
      include: {
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true,
          },
          take: 5,
        },
      },
      orderBy: { postedAt: 'desc' },
      take: params.limit + 1,
    });
  }

  async getArticleDetails(articleId: number): Promise<any> {
    return this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true,
            status: true,
          },
        },
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true,
          },
        },
      },
    });
  }

  async toggleArticleReaction(
    articleId: number,
    userId: number,
    type: string,
  ): Promise<{
    action: 'added' | 'removed';
    counts: { reactions: number; comments: number };
  }> {
    // Check if article exists and is approved
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.status !== 'APPROVED') {
      throw new Error('Article not available for reactions');
    }

    // Check if user already reacted with this type
    const existingReaction = await this.prisma.articleReaction.findUnique({
      where: {
        articleId_userId_type: {
          articleId,
          userId,
          type,
        },
      },
    });

    let action: 'added' | 'removed';

    if (existingReaction) {
      // Remove existing reaction
      await this.prisma.$transaction(async (tx: any) => {
        await tx.articleReaction.delete({
          where: { id: existingReaction.id },
        });

        // Decrement reaction count
        await tx.article.update({
          where: { id: articleId },
          data: { reactions: { decrement: 1 } },
        });
      });
      action = 'removed';
    } else {
      // Add new reaction
      await this.prisma.$transaction(async (tx: any) => {
        await tx.articleReaction.create({
          data: { articleId, userId, type },
        });

        // Increment reaction count
        await tx.article.update({
          where: { id: articleId },
          data: { reactions: { increment: 1 } },
        });
      });
      action = 'added';
    }

    // Get updated reaction counts
    const updatedCounts = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { reactions: true, comments: true },
    });

    return {
      action,
      counts: {
        reactions: updatedCounts?.reactions || 0,
        comments: updatedCounts?.comments || 0,
      },
    };
  }

  async getArticleReactions(articleId: number): Promise<any[]> {
    return this.prisma.articleReaction.findMany({
      where: { articleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createArticleComment(articleId: number, userId: number, content: string): Promise<any> {
    // Check if article exists and is approved
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.status !== 'APPROVED') {
      throw new Error('Article not available for comments');
    }

    // Create comment and increment counter
    const newComment = await this.prisma.$transaction(async (tx: any) => {
      const comment = await tx.articleComment.create({
        data: {
          articleId,
          userId,
          content: content.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              profilePictureKey: true,
            },
          },
        },
      });

      // Increment comment count
      await tx.article.update({
        where: { id: articleId },
        data: { comments: { increment: 1 } },
      });

      return comment;
    });

    return newComment;
  }

  async getArticleComments(
    articleId: number,
    limit: number,
    cursor?: string,
  ): Promise<{
    comments: any[];
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> {
    const pageLimit = Math.min(limit || 20, 100);
    const where: any = { articleId };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate };
      }
    }

    const comments = await this.prisma.articleComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    const hasMore = comments.length > pageLimit;
    const items = comments.slice(0, pageLimit);

    const formattedComments = items.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      user: comment.user,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    return {
      comments: formattedComments,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
  }

  // ===============================================
  // Search and Discovery Methods
  // ===============================================

  async searchContent(params: {
    query: string;
    filters: any;
    limit: number;
    cursor?: string;
  }): Promise<{
    items: any[];
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
  }> {
    const pageLimit = Math.min(params.limit || 30, 100);

    // Search in articles
    const articleWhere: any = {
      status: 'APPROVED',
      OR: [
        { title: { contains: params.query, mode: 'insensitive' } },
        { excerpt: { contains: params.query, mode: 'insensitive' } },
      ],
    };

    // Apply cursor for pagination
    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!isNaN(cursorDate.getTime())) {
        articleWhere.publishedAt = { lt: cursorDate };
      }
    }

    // Apply filters
    if (params.filters.dateRange) {
      if (params.filters.dateRange.start) {
        articleWhere.publishedAt = {
          ...articleWhere.publishedAt,
          gte: new Date(params.filters.dateRange.start),
        };
      }
      if (params.filters.dateRange.end) {
        articleWhere.publishedAt = {
          ...articleWhere.publishedAt,
          lte: new Date(params.filters.dateRange.end),
        };
      }
    }

    const articles = await this.prisma.article.findMany({
      where: articleWhere,
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
      take: pageLimit + 1,
    });

    const hasMore = articles.length > pageLimit;
    const items = articles.slice(0, pageLimit);

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].publishedAt?.toISOString() ||
          items[items.length - 1].createdAt.toISOString()
        : undefined;

    return {
      items,
      nextCursor,
      hasMore,
      total: undefined,
    };
  }

  async getSearchSuggestions(query: string): Promise<
    Array<{
      type: 'article' | 'tag' | 'author' | 'feed';
      value: string;
      count?: number;
    }>
  > {
    const suggestions: Array<{
      type: 'article' | 'tag' | 'author' | 'feed';
      value: string;
      count?: number;
    }> = [];

    // Article title suggestions
    const articles = await this.prisma.article.findMany({
      where: {
        status: 'APPROVED',
        title: { contains: query, mode: 'insensitive' },
      },
      select: { title: true },
      take: 5,
    });

    articles.forEach((article) => {
      suggestions.push({
        type: 'article',
        value: article.title,
      });
    });

    // Feed suggestions
    const feeds = await this.prisma.feedSource.findMany({
      where: {
        status: 'ACTIVE',
        name: { contains: query, mode: 'insensitive' },
      },
      select: { name: true },
      take: 3,
    });

    feeds.forEach((feed: any) => {
      suggestions.push({
        type: 'feed',
        value: feed.name,
      });
    });

    return suggestions.slice(0, 8); // Limit total suggestions
  }

  async getTrendingContent(params: {
    timeRange: 'hour' | 'day' | 'week' | 'month';
    limit: number;
    contentType: 'articles' | 'posts' | 'all';
  }): Promise<{
    articles: any[];
    posts: any[];
    tags: any[];
    authors: any[];
  }> {
    const now = new Date();
    const timeRanges = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeRanges[params.timeRange];
    const limit = Math.min(params.limit || 10, 50);

    const result = {
      articles: [] as any[],
      posts: [] as any[],
      tags: [] as any[],
      authors: [] as any[],
    };

    // Get trending articles
    if (params.contentType === 'articles' || params.contentType === 'all') {
      const trendingArticles = await this.prisma.article.findMany({
        where: {
          status: 'APPROVED',
          publishedAt: { gte: since },
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
        orderBy: [{ reactions: 'desc' }, { comments: 'desc' }, { publishedAt: 'desc' }],
        take: limit,
      });

      result.articles = trendingArticles;
    }

    // Get trending feeds (as authors)
    const trendingFeeds = await this.prisma.feedSource.findMany({
      where: {
        status: 'ACTIVE',
        articles: {
          some: {
            status: 'APPROVED',
            publishedAt: { gte: since },
          },
        },
      },
      select: {
        id: true,
        name: true,
        siteUrl: true,
        _count: {
          select: {
            articles: {
              where: {
                status: 'APPROVED',
                publishedAt: { gte: since },
              },
            },
          },
        },
      },
      orderBy: {
        articles: {
          _count: 'desc',
        },
      },
      take: Math.min(limit, 10),
    });

    result.authors = trendingFeeds;

    return result;
  }

  // ===============================================
  // Bookmark System Methods
  // ===============================================

  async toggleArticleBookmark(
    articleId: number,
    userId: number,
    collectionId?: number,
  ): Promise<{
    action: 'added' | 'removed';
    bookmarkId?: number;
  }> {
    // Check if article exists and is approved
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.status !== 'APPROVED') {
      throw new Error('Article not available for bookmarking');
    }

    // Check if user already bookmarked this article
    const existingBookmark = await this.prisma.articleBookmark.findFirst({
      where: {
        articleId,
        userId,
        collectionId: collectionId || null,
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await this.prisma.articleBookmark.delete({
        where: { id: existingBookmark.id },
      });
      return { action: 'removed' };
    } else {
      // Add bookmark
      const bookmark = await this.prisma.articleBookmark.create({
        data: {
          articleId,
          userId,
          collectionId: collectionId || null,
        },
      });
      return { action: 'added', bookmarkId: bookmark.id };
    }
  }

  async getUserBookmarks(
    userId: number,
    params: {
      limit: number;
      cursor?: string;
      collectionId?: number;
    },
  ): Promise<{
    bookmarks: any[];
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> {
    const pageLimit = Math.min(params.limit || 20, 100);
    const where: any = { userId };

    if (params.collectionId) {
      where.collectionId = params.collectionId;
    }

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate };
      }
    }

    const bookmarks = await this.prisma.articleBookmark.findMany({
      where,
      include: {
        article: {
          include: {
            feed: {
              select: {
                id: true,
                name: true,
                siteUrl: true,
              },
            },
          },
        },
        collection: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    const hasMore = bookmarks.length > pageLimit;
    const items = bookmarks.slice(0, pageLimit);

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    return {
      bookmarks: items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
  }

  async getBookmarkCollections(userId: number): Promise<any[]> {
    return this.prisma.bookmarkCollection.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            bookmarks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBookmarkCollection(
    userId: number,
    data: {
      name: string;
      description?: string | null;
      isPrivate: boolean;
    },
  ): Promise<any> {
    return this.prisma.bookmarkCollection.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
      },
    });
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
  ): Promise<{
    shareId: number;
    shareUrl?: string;
  }> {
    // Check if article exists and is approved
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true, title: true, url: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.status !== 'APPROVED') {
      throw new Error('Article not available for sharing');
    }

    // Create share record
    const share = await this.prisma.articleShare.create({
      data: {
        articleId,
        userId,
        platform: data.platform,
        message: data.message,
        targetUsers: data.targetUsers,
      },
    });

    // Generate share URL based on platform
    const shareUrl =
      data.platform === 'copy_link'
        ? `${process.env.BASE_URL_CLIENT}/articles/${articleId}`
        : undefined;

    return {
      shareId: share.id,
      shareUrl,
    };
  }

  async getArticleShareStats(articleId: number): Promise<{
    totalShares: number;
    platforms: Record<string, number>;
    recentShares: any[];
  }> {
    const shares = await this.prisma.articleShare.findMany({
      where: { articleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Recent shares
    });

    // Group by platform
    const platforms = shares.reduce(
      (acc: any, share: any) => {
        acc[share.platform] = (acc[share.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalShares: shares.length,
      platforms,
      recentShares: shares.slice(0, 5),
    };
  }
}
