import { PrismaClient } from '@prisma/client';
import type { ITimelineRepository } from './interfaces/ITimelineRepository';
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
import type { Prisma } from '@prisma/client';

// Type for ArticleTag with included tag relation
type ArticleTagWithTag = {
  id: number;
  tagId: number;
  tag: {
    id: number;
    name: string;
    slug: string;
  };
};

/**
 * Timeline Repository Implementation
 *
 * Handles article feed management, article details, search/discovery,
 * bookmarking system, and social sharing features.
 * All methods use proper types from @ems/types with no `any` types.
 */
export class TimelineRepository implements ITimelineRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get approved articles for the timeline feed
   * @param params - Cursor-based pagination params with optional tag filtering
   * @returns Array of articles with tags and feed information
   */
  async getApprovedArticles(params: DbArticleFeedParams): Promise<DbArticleWithTags[]> {
    const where: Prisma.ArticleWhereInput = { status: 'APPROVED' };

    if (params.cursor) {
      where.publishedAt = { lt: params.cursor };
    }

    // Filter by normalized tags
    if (params.tagIds && params.tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: {
            in: params.tagIds,
          },
        },
      };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            url: true,
            siteUrl: true,
            status: true,
            allowImages: true,
            lastFetchedAt: true,
            lastSuccessAt: true,
            lastErrorAt: true,
            lastErrorMsg: true,
            fetchCount: true,
            errorCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: params.limit + 1,
    });

    return articles.map((article) => ({
      id: article.id,
      feedId: article.feedId,
      guid: article.guid,
      url: article.url,
      canonicalUrl: article.canonicalUrl,
      title: article.title,
      excerpt: article.excerpt,
      leadImageUrl: article.leadImageUrl,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      hash: article.hash,
      status: article.status,
      modNotes: article.modNotes,
      reactionsCount: article.reactionsCount,
      commentsCount: article.commentsCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      feed: article.feed,
      tags: article.tags.map((at: ArticleTagWithTag) => ({
        id: at.id,
        tagId: at.tagId,
        tag: {
          id: at.tag.id,
          name: at.tag.name,
          slug: at.tag.slug,
        },
      })),
    }));
  }

  /**
   * Get article details with tags
   * @param articleId - ID of the article
   * @returns Article with tags or null if not found
   */
  async getArticleDetails(articleId: number): Promise<DbArticleWithTags | null> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            url: true,
            siteUrl: true,
            status: true,
            allowImages: true,
            lastFetchedAt: true,
            lastSuccessAt: true,
            lastErrorAt: true,
            lastErrorMsg: true,
            fetchCount: true,
            errorCount: true,
            createdAt: true,
            updatedAt: true,
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

    if (!article) return null;

    return {
      id: article.id,
      feedId: article.feedId,
      guid: article.guid,
      url: article.url,
      canonicalUrl: article.canonicalUrl,
      title: article.title,
      excerpt: article.excerpt,
      leadImageUrl: article.leadImageUrl,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      hash: article.hash,
      status: article.status,
      modNotes: article.modNotes,
      reactionsCount: article.reactionsCount,
      commentsCount: article.commentsCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      feed: article.feed,
    };
  }

  /**
   * Get article with full statistics (reactions, comments, tags)
   * @param articleId - ID of the article
   * @returns Article with comprehensive stats
   * @throws Error if article not found
   */
  async getArticleWithStats(articleId: number): Promise<DbArticleWithStats> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            url: true,
            siteUrl: true,
            status: true,
            allowImages: true,
            lastFetchedAt: true,
            lastSuccessAt: true,
            lastErrorAt: true,
            lastErrorMsg: true,
            fetchCount: true,
            errorCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    // Get reaction counts (grouped by type)
    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { articleId },
      _count: { type: true },
    });

    const reactionCounts: Record<string, number> = {};
    reactions.forEach((r) => {
      reactionCounts[r.type] = r._count.type;
    });

    // Get comment count
    const commentCount = await this.prisma.content.count({
      where: {
        articleId,
        type: 'COMMENT',
        isDeleted: false,
      },
    });

    return {
      article: {
        id: article.id,
        feedId: article.feedId,
        guid: article.guid,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        title: article.title,
        excerpt: article.excerpt,
        leadImageUrl: article.leadImageUrl,
        publishedAt: article.publishedAt,
        fetchedAt: article.fetchedAt,
        hash: article.hash,
        status: article.status,
        modNotes: article.modNotes,
        reactionsCount: article.reactionsCount,
        commentsCount: article.commentsCount,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        feed: article.feed,
        tags: article.tags.map((at: ArticleTagWithTag) => ({
          id: at.id,
          tagId: at.tagId,
          tag: {
            id: at.tag.id,
            name: at.tag.name,
            slug: at.tag.slug,
          },
        })),
      },
      tags: article.tags.map((at: ArticleTagWithTag) => ({
        id: at.tag.id,
        name: at.tag.name,
        slug: at.tag.slug,
      })),
      reactionCounts,
      commentCount,
    };
  }

  /**
   * Search content with filters and cursor-based pagination
   * @param params - Search query, filters, limit, and cursor
   * @returns Paginated search results
   */
  async searchContent(params: {
    query: string;
    filters: DbSearchFilters & {
      hasMedia?: boolean;
      hasReactions?: boolean;
      engagementLevel?: 'all' | 'low' | 'medium' | 'high' | 'viral';
    };
    limit: number;
    cursor?: string;
  }): Promise<DbSearchResult> {
    const pageLimit = Math.min(params.limit || 30, 100);

    // Build search where clause
    const articleWhere: Prisma.ArticleWhereInput = {
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
    if (params.filters.startDate || params.filters.endDate) {
      articleWhere.publishedAt = {
        ...(typeof articleWhere.publishedAt === 'object' ? articleWhere.publishedAt : {}),
      };
      if (params.filters.startDate) {
        (articleWhere.publishedAt as Prisma.DateTimeFilter).gte = params.filters.startDate;
      }
      if (params.filters.endDate) {
        (articleWhere.publishedAt as Prisma.DateTimeFilter).lte = params.filters.endDate;
      }
    }

    if (params.filters.tagIds && params.filters.tagIds.length > 0) {
      articleWhere.tags = {
        some: {
          tagId: { in: params.filters.tagIds },
        },
      };
    }

    if (params.filters.feedIds && params.filters.feedIds.length > 0) {
      articleWhere.feedId = { in: params.filters.feedIds };
    }

    // Apply media filter
    if (params.filters.hasMedia === true) {
      articleWhere.leadImageUrl = {
        not: null,
      };
    } else if (params.filters.hasMedia === false) {
      articleWhere.leadImageUrl = null;
    }

    // Apply reactions filter
    if (params.filters.hasReactions === true) {
      articleWhere.reactionsCount = {
        gt: 0,
      };
    } else if (params.filters.hasReactions === false) {
      articleWhere.reactionsCount = 0;
    }

    const articles = await this.prisma.article.findMany({
      where: articleWhere,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            url: true,
            siteUrl: true,
            status: true,
            allowImages: true,
            lastFetchedAt: true,
            lastSuccessAt: true,
            lastErrorAt: true,
            lastErrorMsg: true,
            fetchCount: true,
            errorCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
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
      items: items.map((article) => ({
        id: article.id,
        feedId: article.feedId,
        guid: article.guid,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        title: article.title,
        excerpt: article.excerpt,
        leadImageUrl: article.leadImageUrl,
        publishedAt: article.publishedAt,
        fetchedAt: article.fetchedAt,
        hash: article.hash,
        status: article.status,
        modNotes: article.modNotes,
        reactionsCount: article.reactionsCount,
        commentsCount: article.commentsCount,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        feed: article.feed,
        tags: article.tags.map((at: ArticleTagWithTag) => ({
          id: at.id,
          tagId: at.tagId,
          tag: {
            id: at.tag.id,
            name: at.tag.name,
            slug: at.tag.slug,
          },
        })),
      })),
      nextCursor,
      hasMore,
      total: undefined,
    };
  }

  /**
   * Search posts with filters and cursor-based pagination
   * @param params - Search query, filters, limit, and cursor
   * @returns Posts matching search criteria
   */
  async searchPosts(params: {
    query: string;
    filters: DbSearchFilters & {
      hashtag?: string;
      authorId?: number;
      hasMedia?: boolean;
      hasReactions?: boolean;
      engagementLevel?: 'all' | 'low' | 'medium' | 'high' | 'viral';
    };
    limit: number;
    cursor?: string;
    viewerId?: number;
  }) {
    const pageLimit = Math.min(params.limit || 30, 100);

    // Build search where clause for posts
    const postWhere: Prisma.ContentWhereInput = {
      type: 'POST',
      visibility: 'PUBLIC',
      body: { contains: params.query, mode: 'insensitive' },
    };

    // Apply cursor for pagination
    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!isNaN(cursorDate.getTime())) {
        postWhere.createdAt = { lt: cursorDate };
      }
    }

    // Apply date filters
    if (params.filters.startDate || params.filters.endDate) {
      postWhere.createdAt = {
        ...(typeof postWhere.createdAt === 'object' ? postWhere.createdAt : {}),
      };
      if (params.filters.startDate) {
        (postWhere.createdAt as Prisma.DateTimeFilter).gte = params.filters.startDate;
      }
      if (params.filters.endDate) {
        (postWhere.createdAt as Prisma.DateTimeFilter).lte = params.filters.endDate;
      }
    }

    // Apply hashtag filter
    if (params.filters.hashtag) {
      postWhere.body = {
        contains: `#${params.filters.hashtag}`,
        mode: 'insensitive',
      };
    }

    // Apply author filter
    if (params.filters.authorId) {
      postWhere.authorId = params.filters.authorId;
    }

    // Apply media filter
    if (params.filters.hasMedia === true) {
      postWhere.NOT = {
        mediaUrls: { equals: [] },
      };
    } else if (params.filters.hasMedia === false) {
      postWhere.mediaUrls = { equals: [] };
    }

    // Apply reactions filter
    if (params.filters.hasReactions === true) {
      postWhere.reactions = {
        some: {},
      };
    } else if (params.filters.hasReactions === false) {
      postWhere.reactions = {
        none: {},
      };
    }

    const posts = await this.prisma.content.findMany({
      where: postWhere,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true, // Needed for enrichUsersWithAvatars to generate fresh signed URLs
          },
        },
        reactions: {
          select: {
            id: true,
            type: true,
            userId: true,
          },
        },
        _count: {
          select: {
            reactions: true,
            children: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    // Filter by engagement level after fetching (can't easily do in SQL)
    let filteredPosts = posts;
    if (params.filters.engagementLevel && params.filters.engagementLevel !== 'all') {
      filteredPosts = posts.filter((post) => {
        const totalEngagement = post._count.reactions + post._count.children;
        switch (params.filters.engagementLevel) {
          case 'low':
            return totalEngagement < 50;
          case 'medium':
            return totalEngagement >= 50 && totalEngagement < 200;
          case 'high':
            return totalEngagement >= 200 && totalEngagement < 1000;
          case 'viral':
            return totalEngagement >= 1000;
          default:
            return true;
        }
      });
    }

    const hasMore = filteredPosts.length > pageLimit;
    const items = filteredPosts.slice(0, pageLimit);

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    return {
      items: items.map((post) => {
        // Calculate reaction counts by type
        const reactionCounts: Record<string, number> = {
          LIKE: 0,
          LOVE: 0,
          LAUGH: 0,
          ANGRY: 0,
          SAD: 0,
          WOW: 0,
        };

        let userReaction: string | null = null;

        if (post.reactions) {
          post.reactions.forEach((reaction: any) => {
            const type = reaction.type;
            reactionCounts[type] = (reactionCounts[type] || 0) + 1;

            if (params.viewerId && reaction.userId === params.viewerId) {
              userReaction = type;
            }
          });
        }

        return {
          // Spread all post fields
          ...post,
          // Convert dates to ISO strings
          editedAt: post.editedAt?.toISOString() || null,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
          // Add count fields with correct naming
          reactionsCount: post._count.reactions,
          repliesCount: post._count.children,
          // Ensure author is included
          author: post.author,
          // Add reaction breakdown
          reactionCounts,
          userReaction,
        };
      }),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get search suggestions based on query
   * @param query - Search query string
   * @returns Array of suggestions (articles, posts, hashtags, users, feeds)
   */
  async getSearchSuggestions(query: string): Promise<DbSearchSuggestion[]> {
    const suggestions: DbSearchSuggestion[] = [];

    // Article title suggestions
    const articles = await this.prisma.article.findMany({
      where: {
        status: 'APPROVED',
        title: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, title: true },
      take: 3,
    });

    articles.forEach((article) => {
      suggestions.push({
        type: 'article',
        value: article.title,
        id: article.id,
        count: 1,
      });
    });

    // Post content suggestions
    const posts = await this.prisma.content.findMany({
      where: {
        type: 'POST',
        visibility: 'PUBLIC',
        body: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        body: true,
        author: {
          select: { name: true },
        },
      },
      take: 3,
    });

    posts.forEach((post) => {
      const preview = post.body.length > 60 ? post.body.substring(0, 57) + '...' : post.body;
      suggestions.push({
        type: 'post',
        value: `${post.author.name}: ${preview}`,
        id: post.id,
        count: 1,
      });
    });

    // Hashtag suggestions (if query starts with #)
    if (query.startsWith('#')) {
      const hashtag = query.substring(1);
      const tags = await this.prisma.tag.findMany({
        where: {
          name: { contains: hashtag, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: { articles: true },
          },
        },
        take: 3,
      });

      tags.forEach((tag) => {
        suggestions.push({
          type: 'tag',
          value: `#${tag.name}`,
          id: tag.id,
          count: tag._count.articles,
        });
      });
    }

    // User suggestions
    const users = await this.prisma.user.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { contents: true },
        },
      },
      take: 3,
    });

    users.forEach((user) => {
      suggestions.push({
        type: 'author',
        value: user.name,
        id: user.id,
        count: user._count.contents,
      });
    });

    // Feed suggestions
    const feeds = await this.prisma.feedSource.findMany({
      where: {
        status: 'ACTIVE',
        name: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      take: 2,
    });

    feeds.forEach((feed) => {
      suggestions.push({
        type: 'feed',
        value: feed.name,
        id: feed.id,
      });
    });

    return suggestions.slice(0, 10); // Limit total suggestions
  }

  /**
   * Get trending content based on time range and content type
   * @param params - Time range, limit, and content type filters
   * @returns Trending articles, posts, tags, and authors
   */
  async getTrendingContent(params: DbTrendingContentParams): Promise<DbTrendingContent> {
    const now = new Date();
    const timeRanges = {
      hour: new Date(now.getTime() - 60 * 60 * 1000),
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const since = timeRanges[params.timeRange];
    const limit = Math.min(params.limit || 10, 50);

    const result: DbTrendingContent = {
      articles: [],
      posts: [],
      tags: [],
      authors: [],
    };

    // Get trending articles
    if (params.contentType === 'articles' || params.contentType === 'all') {
      type ArticleWithFeedAndTags = Prisma.ArticleGetPayload<{
        include: {
          feed: {
            select: {
              id: true;
              name: true;
              url: true;
              siteUrl: true;
              status: true;
              allowImages: true;
              lastFetchedAt: true;
              lastSuccessAt: true;
              lastErrorAt: true;
              lastErrorMsg: true;
              fetchCount: true;
              errorCount: true;
              createdAt: true;
              updatedAt: true;
            };
          };
          tags: {
            include: {
              tag: {
                select: {
                  id: true;
                  name: true;
                  slug: true;
                };
              };
            };
          };
        };
      }>;

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
              url: true,
              siteUrl: true,
              status: true,
              allowImages: true,
              lastFetchedAt: true,
              lastSuccessAt: true,
              lastErrorAt: true,
              lastErrorMsg: true,
              fetchCount: true,
              errorCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: [{ reactionsCount: 'desc' }, { commentsCount: 'desc' }, { publishedAt: 'desc' }],
        take: limit,
      });

      result.articles = trendingArticles.map((article: ArticleWithFeedAndTags) => ({
        id: article.id,
        feedId: article.feedId,
        guid: article.guid,
        url: article.url,
        canonicalUrl: article.canonicalUrl,
        title: article.title,
        excerpt: article.excerpt,
        leadImageUrl: article.leadImageUrl,
        publishedAt: article.publishedAt,
        fetchedAt: article.fetchedAt,
        hash: article.hash,
        status: article.status,
        modNotes: article.modNotes,
        reactionsCount: article.reactionsCount,
        commentsCount: article.commentsCount,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        feed: article.feed,
        tags: article.tags.map((at: ArticleTagWithTag) => ({
          id: at.id,
          tagId: at.tagId,
          tag: {
            id: at.tag.id,
            name: at.tag.name,
            slug: at.tag.slug,
          },
        })),
      }));
    }

    // Get trending posts
    if (params.contentType === 'posts' || params.contentType === 'all') {
      const trendingPosts = await this.prisma.content.findMany({
        where: {
          type: 'POST',
          createdAt: { gte: since },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { reactionsCount: 'desc' },
          { repliesCount: 'desc' },
          { viewsCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      result.posts = trendingPosts.map((post) => ({
        id: post.id,
        content: post.body,
        createdAt: post.createdAt,
        authorId: post.authorId,
        reactionsCount: post.reactionsCount,
        repliesCount: post.repliesCount,
        viewsCount: Number(post.viewsCount), // BigInt to number
        author: {
          id: post.author.id,
          name: post.author.name,
          avatarUrl: post.author.avatarUrl,
        },
      }));
    }

    // Get trending tags
    const trendingTags = await this.prisma.articleTag.groupBy({
      by: ['tagId'],
      where: {
        article: {
          status: 'APPROVED',
          publishedAt: { gte: since },
        },
      },
      _count: {
        articleId: true,
      },
      orderBy: {
        _count: {
          articleId: 'desc',
        },
      },
      take: Math.min(limit, 20),
    });

    const tagIds = trendingTags.map((t) => t.tagId);
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true, slug: true },
    });

    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
    result.tags = trendingTags
      .map((tt) => {
        const tag = tagMap.get(tt.tagId);
        if (!tag) return null;
        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          articleCount: tt._count.articleId,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

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

    result.authors = trendingFeeds.map((feed) => ({
      id: feed.id,
      name: feed.name,
      articlesCount: feed._count.articles,
    }));

    return result;
  }

  /**
   * Check if an article is bookmarked by a user
   * @param articleId - ID of the article
   * @param userId - ID of the user
   * @returns True if bookmarked, false otherwise
   */
  async checkArticleBookmark(articleId: number, userId: number): Promise<boolean> {
    const bookmark = await this.prisma.articleBookmark.findFirst({
      where: {
        articleId,
        userId,
      },
    });

    return bookmark !== null;
  }

  /**
   * Check bookmark status for multiple articles (bulk operation to prevent N+1)
   * @param articleIds - Array of article IDs
   * @param userId - ID of the user
   * @returns Map of articleId -> isBookmarked
   */
  async checkArticleBookmarksBulk(
    articleIds: number[],
    userId: number,
  ): Promise<Map<number, boolean>> {
    if (articleIds.length === 0) {
      return new Map();
    }

    const bookmarks = await this.prisma.articleBookmark.findMany({
      where: {
        articleId: { in: articleIds },
        userId,
      },
      select: {
        articleId: true,
      },
    });

    // Create a set of bookmarked article IDs for O(1) lookup
    const bookmarkedIds = new Set(bookmarks.map((b) => b.articleId));

    // Return map with boolean for each requested article
    const resultMap = new Map<number, boolean>();
    articleIds.forEach((id) => {
      resultMap.set(id, bookmarkedIds.has(id));
    });

    return resultMap;
  }

  /**
   * Toggle article bookmark (add or remove)
   * @param articleId - ID of the article
   * @param userId - ID of the user
   * @param collectionId - Optional collection ID
   * @returns Action taken (added or removed) and optional bookmark ID
   * @throws Error if article not found or not approved
   */
  async toggleArticleBookmark(
    articleId: number,
    userId: number,
    collectionId?: number,
  ): Promise<DbToggleBookmarkResult> {
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

  /**
   * Get user's bookmarked articles
   * @param userId - ID of the user
   * @param params - Pagination and filter params
   * @returns Bookmarks with pagination info
   */
  async getUserBookmarks(
    userId: number,
    params: DbUserBookmarksParams,
  ): Promise<DbUserBookmarksResult> {
    const pageLimit = Math.min(params.limit || 20, 100);
    const where: Prisma.ArticleBookmarkWhereInput = { userId };

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
                url: true,
                siteUrl: true,
                status: true,
                allowImages: true,
                lastFetchedAt: true,
                lastSuccessAt: true,
                lastErrorAt: true,
                lastErrorMsg: true,
                fetchCount: true,
                errorCount: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            tags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
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
      bookmarks: items.map((bookmark) => ({
        id: bookmark.id,
        articleId: bookmark.articleId,
        userId: bookmark.userId,
        collectionId: bookmark.collectionId,
        createdAt: bookmark.createdAt,
        article: {
          id: bookmark.article.id,
          feedId: bookmark.article.feedId,
          guid: bookmark.article.guid,
          url: bookmark.article.url,
          canonicalUrl: bookmark.article.canonicalUrl,
          title: bookmark.article.title,
          excerpt: bookmark.article.excerpt,
          leadImageUrl: bookmark.article.leadImageUrl,
          publishedAt: bookmark.article.publishedAt,
          fetchedAt: bookmark.article.fetchedAt,
          hash: bookmark.article.hash,
          status: bookmark.article.status,
          modNotes: bookmark.article.modNotes,
          reactionsCount: bookmark.article.reactionsCount,
          commentsCount: bookmark.article.commentsCount,
          createdAt: bookmark.article.createdAt,
          updatedAt: bookmark.article.updatedAt,
          feed: bookmark.article.feed,
          tags: bookmark.article.tags.map((at: ArticleTagWithTag) => ({
            id: at.id,
            tagId: at.tagId,
            tag: {
              id: at.tag.id,
              name: at.tag.name,
              slug: at.tag.slug,
            },
          })),
        },
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
  }

  /**
   * Get user's bookmark collections
   * @param userId - ID of the user
   * @returns Array of collections with bookmark counts
   */
  async getBookmarkCollections(userId: number): Promise<DbBookmarkCollectionWithCount[]> {
    const collections = await this.prisma.bookmarkCollection.findMany({
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

    return collections.map((collection) => ({
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      isPrivate: collection.isPrivate,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      _count: {
        bookmarks: collection._count.bookmarks,
      },
    }));
  }

  /**
   * Create a new bookmark collection
   * @param userId - ID of the user
   * @param data - Collection name, description, and privacy setting
   * @returns Created collection with bookmark count (0)
   */
  async createBookmarkCollection(
    userId: number,
    data: DbCreateBookmarkCollectionData,
  ): Promise<DbBookmarkCollectionWithCount> {
    const collection = await this.prisma.bookmarkCollection.create({
      data: {
        userId,
        name: data.name,
        description: data.description ?? null,
        isPrivate: data.isPrivate,
      },
      include: {
        _count: {
          select: {
            bookmarks: true,
          },
        },
      },
    });

    return {
      id: collection.id,
      userId: collection.userId,
      name: collection.name,
      description: collection.description,
      isPrivate: collection.isPrivate,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      _count: {
        bookmarks: collection._count.bookmarks,
      },
    };
  }

  /**
   * Share an article on a platform
   * @param articleId - ID of the article
   * @param userId - ID of the user sharing
   * @param data - Platform, message, and target users
   * @returns Share ID and optional share URL
   * @throws Error if article not found or not approved
   */
  async shareArticle(
    articleId: number,
    userId: number,
    data: DbShareArticleData,
  ): Promise<DbShareArticleResult> {
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
        message: data.message ?? null,
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

  /**
   * Get article sharing statistics
   * @param articleId - ID of the article
   * @returns Total shares, platform breakdown, and recent shares
   */
  async getArticleShareStats(articleId: number): Promise<DbArticleShareStats> {
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
      (acc, share) => {
        acc[share.platform] = (acc[share.platform] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalShares: shares.length,
      platforms,
      recentShares: shares.slice(0, 5).map((share) => ({
        id: share.id,
        articleId: share.articleId,
        userId: share.userId,
        platform: share.platform,
        message: share.message,
        createdAt: share.createdAt,
        user: {
          id: share.user.id,
          name: share.user.name,
          avatarUrl: share.user.avatarUrl,
        },
      })),
    };
  }
}
