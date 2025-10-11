import type { Request, Response } from 'express';
import { TimelineService } from '../services/timeline.service';
import { UserService } from '../services/user.service';
import type {
  TimelineItem,
  TimelineResponse,
  ArticleReactionResponse,
  ArticleCommentResponse,
} from '@ems/types';
import { validateArticleId } from '../utils/timeline';
import { serializeBigInt } from '../utils/bigintSerializer';
import type { AuthRequest } from '../middleware/auth.middleware';

const timelineService = new TimelineService();
const userService = new UserService();

/**
 * Get unified timeline (posts + articles)
 * GET /api/timeline
 */
export async function getTimeline(req: Request, res: Response) {
  try {
    const { limit = '30', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 30, 100);
    const viewerId = (req as any).user?.id; // Optional: include user reactions if authenticated

    // Parse cursor as timestamp for filtering
    const cursorDate = cursor ? new Date(cursor as string) : undefined;

    // Get both articles and posts, then merge and sort
    // Fetch more items than requested to ensure we have enough after merging and sorting
    const articlesPromise = timelineService.getArticles({
      cursor: cursorDate,
      limit: pageLimit * 2,
    });

    const postsPromise = timelineService.getPublicPosts({
      cursor: undefined, // Posts use numeric cursor, skip for now - will filter in memory
      limit: pageLimit * 2,
      viewerId,
    });

    const [articles, posts] = await Promise.all([articlesPromise, postsPromise]);

    // Posts are already enriched with avatar URLs by the service layer
    // No need to double-enrich here

    // Fetch reactions for all articles in bulk
    const articleIds = articles.map((a: any) => a.id);
    const articlesWithReactions = await timelineService.getArticlesWithReactions(
      articleIds,
      viewerId,
    );

    // Convert articles to TimelineItem format with reaction data
    const articleItems: TimelineItem[] = articles.map((article: any) => {
      const reactionData = articlesWithReactions.get(article.id) || {
        counts: {},
        userReaction: undefined,
        totalCount: 0,
      };

      return {
        id: `article-${article.id}`,
        type: 'article' as const,
        timestamp: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
        content: {
          title: article.title,
          excerpt: article.excerpt || undefined,
          url: article.url,
          imageUrl: article.leadImageUrl || null,
          author: article.feed?.name,
          source: article.feed?.siteUrl || undefined,
        },
        engagement: {
          reactions: reactionData.totalCount,
          comments: article.commentsCount || 0,
        },
        reactionCounts: reactionData.counts,
        userReaction: reactionData.userReaction,
        tags: Array.isArray(article.tags)
          ? article.tags.map((t: any) => t.tag?.name || t.name || t).filter(Boolean)
          : [],
      };
    });

    // Convert posts to TimelineItem format with embedded post data
    const postItems: TimelineItem[] = posts
      .filter((post: any) => {
        // Filter posts by cursor if provided
        if (!cursorDate) return true;
        return new Date(post.createdAt) < cursorDate;
      })
      .map((post: any) => ({
        id: `post-${post.id}`,
        type: 'article' as const, // Using 'article' type for posts too (timeline only has article/tweet)
        timestamp: post.createdAt.toISOString(),
        content: {
          title: post.author?.name || 'User Post',
          excerpt: post.body.substring(0, 200),
          url: `/posts/${post.id}`, // Internal post URL
          imageUrl: post.mediaUrls?.[0] || null,
          author: post.author?.name,
          source: 'Community Post',
        },
        engagement: {
          reactions: post._count?.reactions || 0,
          comments: post._count?.children || 0,
        },
        tags: [],
        // Add full post data for frontend to use
        postData: {
          id: post.id,
          authorId: post.authorId,
          type: post.type || 'POST',
          content: post.body, // For type compatibility
          body: post.body, // For PostCard component
          contentType: post.contentType,
          visibility: post.visibility,
          mediaUrls: post.mediaUrls,
          linkPreview: post.linkPreview,
          parentId: post.parentId,
          threadDepth: post.threadDepth,
          reactionsCount: post._count?.reactions || 0,
          repliesCount: post._count?.children || 0,
          likesCount: post._count?.reactions || 0,
          commentsCount: post._count?.children || 0,
          sharesCount: post.sharesCount || 0,
          viewsCount: post.viewCount?.toString() || '0',
          reactionCounts: post.reactionCounts,
          userReaction: post.userReaction,
          isDeleted: post.isDeleted,
          isFlagged: post.isFlagged,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          editedAt: post.editedAt,
          children: undefined,
          authorName: post.author?.name,
          authorAvatar: post.author?.avatarUrl,
          author: post.author ||
            post.user || {
              id: post.authorId,
              name: 'Unknown',
              avatarUrl: null,
            },
          canEdit: false,
          canDelete: false,
        },
      }));

    // Merge and sort by timestamp (newest first)
    const allItems = [...articleItems, ...postItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Apply pagination - take only the requested limit
    const items = allItems.slice(0, pageLimit);

    // Check if there are more items
    // We fetched pageLimit * 2 of each type, so if we have more than pageLimit after merging, there's more
    const hasMore = allItems.length > pageLimit;

    // Next cursor is the timestamp of the last item in this page
    const nextCursor = items.length > 0 ? items[items.length - 1].timestamp : undefined;

    const payload: TimelineResponse = {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
    res.json(payload);
  } catch (error) {
    console.error('[timeline] Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
}

export const getArticleDetails = async (req: Request, res: Response) => {
  try {
    const articleId = validateArticleId(req.params.id);

    if (articleId === null) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const article = await timelineService.getArticleDetails(articleId);

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Convert to PublicArticle format
    const publicArticle = {
      id: article.id,
      feedId: article.feedId,
      guid: article.guid,
      url: article.url,
      canonicalUrl: article.canonicalUrl,
      title: article.title,
      excerpt: article.excerpt,
      leadImageUrl: article.leadImageUrl,
      publishedAt: article.publishedAt?.toISOString() || null,
      fetchedAt: article.fetchedAt.toISOString(),
      hash: article.hash,
      status: article.status,
      tags: article.tags,
      modNotes: article.modNotes,
      reactions: article.reactions,
      comments: article.comments,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      feed: article.feed
        ? {
            id: article.feed.id,
            name: article.feed.name,
            url: '', // Not exposing internal feed URL
            siteUrl: article.feed.siteUrl,
            status: article.feed.status,
            allowImages: true,
            lastFetchedAt: null,
            lastSuccessAt: null,
            lastErrorAt: null,
            lastErrorMsg: null,
            fetchCount: 0,
            errorCount: 0,
            createdAt: '',
            updatedAt: '',
          }
        : null,
    };

    res.json(publicArticle);
  } catch (error) {
    console.error('[timeline] Error fetching article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
};

export const toggleArticleReaction = async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { type = 'like' } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    // Validate reaction type - use same types as posts
    const validTypes = ['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD', 'ANGRY'] as const;
    if (!validTypes.includes(type as (typeof validTypes)[number])) {
      res.status(400).json({ error: 'Invalid reaction type' });
      return;
    }

    const result = await timelineService.toggleArticleReaction(articleId, userId, type);

    const payload: ArticleReactionResponse = {
      action: result.action,
      type: type,
      totalReactions: 0, // TODO: Get actual count from result
      reactionCounts: {}, // TODO: Get actual counts from result
    };
    res.json(payload);
  } catch (error: any) {
    console.error('[timeline] Error toggling article reaction:', error);

    if (error.message === 'Article not found') {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    if (error.message === 'Article not available for reactions') {
      res.status(403).json({ error: 'Article not available for reactions' });
      return;
    }

    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
};

export const getArticleReactions = async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const reactions = await timelineService.getArticleReactions(articleId);

    // Group by reaction type
    const groupedReactions = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.type]) {
          acc[reaction.type] = [];
        }
        acc[reaction.type].push({
          id: reaction.id,
          user: reaction.user,
          createdAt: reaction.createdAt.toISOString(),
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    res.json({
      reactions: groupedReactions,
      total: reactions.length,
    });
  } catch (error) {
    console.error('[timeline] Error fetching article reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
};

export const createArticleComment = async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
      return;
    }

    const newComment = await timelineService.createArticleComment(articleId, userId, content);

    // Enrich author with avatar if available
    let enrichedAuthor;
    if ('author' in newComment && newComment.author) {
      try {
        enrichedAuthor = await userService.enrichUserWithAvatar(newComment.author);
      } catch (error) {
        console.error('[timeline] Error enriching comment author:', error);
        enrichedAuthor = newComment.author;
      }
    }

    const payload: ArticleCommentResponse = {
      id: newComment.id,
      content: newComment.body,
      body: newComment.body,
      authorId: newComment.authorId,
      authorName: enrichedAuthor?.name || 'Unknown',
      articleId,
      createdAt: newComment.createdAt.toISOString(),
      author: enrichedAuthor,
      user: enrichedAuthor,
    };

    res.status(201).json(payload);
  } catch (error: any) {
    console.error('[timeline] Error creating article comment:', error);

    if (error.message === 'Article not found') {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    if (error.message === 'Article not available for comments') {
      res.status(403).json({ error: 'Article not available for comments' });
      return;
    }

    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const getArticleComments = async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { limit = '20', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 20, 100);
    const viewerId = (req as any).user?.id; // Optional: include user reactions if authenticated

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const result = await timelineService.getArticleComments(
      articleId,
      pageLimit,
      cursor as string,
      viewerId,
    );

    // Convert BigInt values to strings before JSON serialization
    const jsonString = JSON.stringify(result, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );

    res.setHeader('Content-Type', 'application/json');
    res.send(jsonString);
  } catch (error) {
    console.error('[timeline] Error fetching article comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// ===============================================
// Search and Discovery Controllers
// ===============================================

export async function searchTimeline(req: AuthRequest, res: Response) {
  try {
    const { q, filters, limit = '30', cursor } = req.query;
    const viewerId = req.user?.id; // Get authenticated user's ID

    // Allow empty query if filters are provided (for filtering without search)
    if (typeof q !== 'string') {
      return res
        .status(400)
        .json({ error: 'Search query parameter is required (can be empty string)' });
    }

    const pageLimit = Math.min(parseInt(limit as string) || 30, 100);

    // Parse filters if provided
    let parsedFilters;
    try {
      parsedFilters = filters ? JSON.parse(filters as string) : {};
    } catch (error) {
      return res.status(400).json({ error: 'Invalid filters format' });
    }

    const searchParams = {
      query: q,
      filters: parsedFilters,
      limit: pageLimit,
      cursor: cursor as string | undefined,
      viewerId,
    };

    const results = await timelineService.searchTimeline(searchParams);
    res.json(serializeBigInt(results));
  } catch (error) {
    console.error('[timeline] Error searching timeline:', error);
    res.status(500).json({ error: 'Failed to search timeline' });
  }
}

export async function getSearchSuggestions(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    if (q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await timelineService.getSearchSuggestions(q);
    res.json({ suggestions });
  } catch (error) {
    console.error('[timeline] Error fetching search suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}

export async function getTrendingContent(req: Request, res: Response) {
  try {
    const { timeRange = 'day', limit = '10', type = 'all' } = req.query;

    const pageLimit = Math.min(parseInt(limit as string) || 10, 50);

    const validTimeRanges = ['hour', 'day', 'week', 'month'];
    const validTypes = ['articles', 'posts', 'all'];

    if (!validTimeRanges.includes(timeRange as string)) {
      return res.status(400).json({ error: 'Invalid timeRange parameter' });
    }

    if (!validTypes.includes(type as string)) {
      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    const trendingParams = {
      timeRange: timeRange as 'hour' | 'day' | 'week' | 'month',
      limit: pageLimit,
      type: type as 'articles' | 'posts' | 'all',
    };

    const trending = await timelineService.getTrendingContent(trendingParams);
    res.json(trending);
  } catch (error) {
    console.error('[timeline] Error fetching trending content:', error);
    res.status(500).json({ error: 'Failed to fetch trending content' });
  }
}

// ===============================================
// Bookmark System Controllers
// ===============================================

export async function checkArticleBookmark(req: AuthRequest, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const isBookmarked = await timelineService.checkArticleBookmark(articleId, userId);

    res.json({ isBookmarked });
  } catch (error) {
    console.error('[timeline] Error checking bookmark status:', error);
    res.status(500).json({ error: 'Failed to check bookmark status' });
  }
}

export async function checkArticleBookmarksBulk(req: AuthRequest, res: Response) {
  try {
    const { articleIds } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(articleIds)) {
      res.status(400).json({ error: 'articleIds must be an array' });
      return;
    }

    if (articleIds.length === 0) {
      res.json({ bookmarks: {} });
      return;
    }

    if (articleIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 article IDs allowed' });
      return;
    }

    const parsedIds = articleIds.map((id) => parseInt(id as string)).filter((id) => !isNaN(id));

    if (parsedIds.length !== articleIds.length) {
      res.status(400).json({ error: 'All article IDs must be valid numbers' });
      return;
    }

    const bookmarkMap = await timelineService.checkArticleBookmarksBulk(parsedIds, userId);

    // Convert Map to object for JSON serialization
    const bookmarks: Record<number, boolean> = {};
    bookmarkMap.forEach((isBookmarked, articleId) => {
      bookmarks[articleId] = isBookmarked;
    });

    res.json({ bookmarks });
  } catch (error) {
    console.error('[timeline] Error checking bulk bookmark status:', error);
    res.status(500).json({ error: 'Failed to check bookmark status' });
  }
}

export async function toggleArticleBookmark(req: AuthRequest, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    const { collectionId } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const result = await timelineService.toggleArticleBookmark(articleId, userId, collectionId);
    res.json(result);
  } catch (error: any) {
    console.error('[timeline] Error toggling article bookmark:', error);

    if (error.message === 'Article not found') {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
}

export async function getUserBookmarks(req: AuthRequest, res: Response) {
  try {
    const { limit = '20', cursor, collectionId } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 20, 100);
    const userId = req.user!.id;

    const bookmarks = await timelineService.getUserBookmarks(userId, {
      limit: pageLimit,
      cursor: cursor as string,
      collectionId: collectionId ? parseInt(collectionId as string) : undefined,
    });

    res.json(bookmarks);
  } catch (error) {
    console.error('[timeline] Error fetching user bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
}

export async function getBookmarkCollections(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const collections = await timelineService.getBookmarkCollections(userId);
    res.json({ collections });
  } catch (error) {
    console.error('[timeline] Error fetching bookmark collections:', error);
    res.status(500).json({ error: 'Failed to fetch bookmark collections' });
  }
}

export async function createBookmarkCollection(req: AuthRequest, res: Response) {
  try {
    const { name, description, isPrivate = false } = req.body;
    const userId = req.user!.id;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Collection name is required' });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({ error: 'Collection name too long (max 100 characters)' });
      return;
    }

    const collection = await timelineService.createBookmarkCollection(userId, {
      name: name.trim(),
      description: description?.trim() || null,
      isPrivate: Boolean(isPrivate),
    });

    res.status(201).json(collection);
  } catch (error) {
    console.error('[timeline] Error creating bookmark collection:', error);
    res.status(500).json({ error: 'Failed to create bookmark collection' });
  }
}

// ===============================================
// Social Sharing Controllers
// ===============================================

export async function shareArticle(req: AuthRequest, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    const { platform, message, targetUsers } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const validPlatforms = ['internal', 'twitter', 'facebook', 'linkedin', 'email', 'copy_link'];
    if (platform && !validPlatforms.includes(platform)) {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    const shareResult = await timelineService.shareArticle(articleId, userId, {
      platform: platform || 'internal',
      message: message?.trim() || null,
      targetUsers: targetUsers || [],
    });

    res.json(shareResult);
  } catch (error: any) {
    console.error('[timeline] Error sharing article:', error);

    if (error.message === 'Article not found') {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to share article' });
  }
}

export async function getArticleShareStats(req: Request, res: Response) {
  try {
    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const stats = await timelineService.getArticleShareStats(articleId);
    res.json(stats);
  } catch (error) {
    console.error('[timeline] Error fetching article share stats:', error);
    res.status(500).json({ error: 'Failed to fetch share stats' });
  }
}
