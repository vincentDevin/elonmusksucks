/**
 * Unified Content Transformers
 *
 * Utility functions to transform database models into UnifiedContentItem format.
 * These are pure transformation functions with no database dependencies.
 */

import type {
  PrismaArticle,
  PrismaContent,
  PrismaPrediction,
  PrismaUser,
  PrismaFeedSource,
  UnifiedContentItem,
  UnifiedContentType,
  UnifiedContentStatus,
  ContentAuthorType,
  ContentPriority,
} from '../index.js';

// ============================================================================
// Type Guards & Helpers
// ============================================================================

/**
 * Check if a value is a valid UnifiedContentType
 */
export function isUnifiedContentType(value: string): value is UnifiedContentType {
  return ['article', 'user_post', 'comment', 'prediction'].includes(value);
}

/**
 * Parse a unified content ID back into type and original ID
 */
export function parseUnifiedId(unifiedId: string): { type: UnifiedContentType; id: number } | null {
  const parts = unifiedId.split(':');
  if (parts.length !== 2) return null;

  const [typeStr, idStr] = parts;
  const id = parseInt(idStr, 10);

  if (!isUnifiedContentType(typeStr) || isNaN(id)) return null;

  return { type: typeStr, id };
}

/**
 * Create a unified content ID from type and original ID
 */
export function createUnifiedId(type: UnifiedContentType, id: number): string {
  return `${type}:${id}`;
}

/**
 * Map article status to unified status
 */
export function mapArticleStatus(status: string): UnifiedContentStatus {
  const statusMap: Record<string, UnifiedContentStatus> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  };
  return statusMap[status] || 'pending';
}

/**
 * Map content flags to unified status
 */
export function mapContentStatus(content: {
  isDeleted: boolean;
  isFlagged: boolean;
}): UnifiedContentStatus {
  if (content.isDeleted) return 'deleted';
  if (content.isFlagged) return 'flagged';
  return 'approved'; // Default for public content
}

/**
 * Map prediction approval to unified status
 */
export function mapPredictionStatus(prediction: {
  approved: boolean;
  resolved: boolean;
}): UnifiedContentStatus {
  if (prediction.resolved) return 'approved'; // Resolved predictions are considered approved
  return prediction.approved ? 'approved' : 'pending';
}

/**
 * Calculate content priority based on various factors
 */
export function calculateContentPriority(metrics: {
  reportCount?: number;
  isFlagged?: boolean;
  createdAt: Date;
  viewsCount?: number | bigint;
}): ContentPriority {
  // High priority if flagged or has reports
  if (metrics.isFlagged || (metrics.reportCount && metrics.reportCount > 0)) {
    return 'high';
  }

  // Urgent if created recently and has high views
  const ageInHours = (Date.now() - new Date(metrics.createdAt).getTime()) / (1000 * 60 * 60);
  const views = typeof metrics.viewsCount === 'bigint'
    ? Number(metrics.viewsCount)
    : metrics.viewsCount || 0;

  if (ageInHours < 24 && views > 1000) {
    return 'urgent';
  }

  return 'normal';
}

// ============================================================================
// Article Transformers
// ============================================================================

/**
 * Transform Article model to UnifiedContentItem
 */
export function transformArticleToUnified(
  article: PrismaArticle & { feed?: PrismaFeedSource | null },
): UnifiedContentItem {
  const feedName = article.feed?.name || 'Unknown Feed';
  const feedId = article.feed?.id || 0;

  return {
    id: createUnifiedId('article', article.id),
    originalId: article.id,
    type: 'article',
    title: article.title,
    content: article.excerpt || '',
    excerpt: article.excerpt || undefined,

    author: {
      id: feedId,
      name: feedName,
      type: 'feed' as ContentAuthorType,
      avatarUrl: undefined, // Feeds don't have avatars currently
    },

    status: mapArticleStatus(article.status),
    priority: calculateContentPriority({
      createdAt: article.createdAt,
      viewsCount: 0, // Articles don't track views currently
    }),
    flags: [],
    moderationNotes: article.modNotes || undefined,

    metadata: {
      url: article.url,
      feedId: article.feedId,
      feedName,
      canonicalUrl: article.canonicalUrl || undefined,
      leadImageUrl: article.leadImageUrl || undefined,
      tags: [], // Would need to join with ArticleTag
    },

    engagement: {
      views: 0, // Not tracked for articles currently
      reactions: {
        total: article.reactionsCount || 0,
      },
      comments: article.commentsCount || 0,
      shares: 0, // Would need to count ArticleShare
      bookmarks: 0, // Would need to count ArticleBookmark
    },

    timestamps: {
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      publishedAt: article.publishedAt?.toISOString(),
    },
  };
}

// ============================================================================
// Content (Post/Comment) Transformers
// ============================================================================

/**
 * Transform Content model (POST type) to UnifiedContentItem
 */
export function transformPostToUnified(
  post: PrismaContent & { author: PrismaUser },
): UnifiedContentItem {
  return {
    id: createUnifiedId('user_post', post.id),
    originalId: post.id,
    type: 'user_post',
    content: post.body,

    author: {
      id: post.author.id,
      name: post.author.name,
      type: 'user' as ContentAuthorType,
      avatarUrl: post.author.avatarUrl || undefined,
    },

    status: mapContentStatus(post),
    priority: calculateContentPriority({
      isFlagged: post.isFlagged,
      reportCount: post.reportCount,
      createdAt: post.createdAt,
      viewsCount: post.viewsCount,
    }),
    flags: post.isFlagged ? ['flagged'] : [],
    moderationNotes: post.moderationNote || undefined,

    metadata: {
      contentType: post.contentType,
      visibility: post.visibility,
      parentId: post.parentId || undefined,
      threadDepth: post.threadDepth,
      mediaUrls: (post.mediaUrls as string[]) || undefined,
    },

    engagement: {
      views: Number(post.viewsCount),
      reactions: {
        total: post.reactionsCount || 0,
      },
      comments: post.repliesCount || 0,
      shares: post.sharesCount || 0,
    },

    timestamps: {
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      deletedAt: post.deletedAt?.toISOString(),
    },
  };
}

/**
 * Transform Content model (COMMENT type) to UnifiedContentItem
 */
export function transformCommentToUnified(
  comment: PrismaContent & { author: PrismaUser },
): UnifiedContentItem {
  return {
    id: createUnifiedId('comment', comment.id),
    originalId: comment.id,
    type: 'comment',
    content: comment.body,

    author: {
      id: comment.author.id,
      name: comment.author.name,
      type: 'user' as ContentAuthorType,
      avatarUrl: comment.author.avatarUrl || undefined,
    },

    status: mapContentStatus(comment),
    priority: calculateContentPriority({
      isFlagged: comment.isFlagged,
      reportCount: comment.reportCount,
      createdAt: comment.createdAt,
      viewsCount: comment.viewsCount,
    }),
    flags: comment.isFlagged ? ['flagged'] : [],
    moderationNotes: comment.moderationNote || undefined,

    metadata: {
      contentType: comment.contentType,
      visibility: comment.visibility,
      parentId: comment.parentId || undefined,
      threadDepth: comment.threadDepth,
      articleId: comment.articleId || undefined,
      predictionId: comment.predictionId || undefined,
    },

    engagement: {
      views: Number(comment.viewsCount),
      reactions: {
        total: comment.reactionsCount || 0,
      },
      comments: comment.repliesCount || 0,
      shares: 0,
    },

    timestamps: {
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      deletedAt: comment.deletedAt?.toISOString(),
    },
  };
}

// ============================================================================
// Prediction Transformers
// ============================================================================

/**
 * Transform Prediction model to UnifiedContentItem
 */
export function transformPredictionToUnified(
  prediction: PrismaPrediction & {
    creator?: PrismaUser;
    category?: { id: number; name: string } | null;
  },
): UnifiedContentItem {
  const creator = prediction.creator;

  return {
    id: createUnifiedId('prediction', prediction.id),
    originalId: prediction.id,
    type: 'prediction',
    title: prediction.title,
    content: prediction.description,

    author: {
      id: creator?.id || 0,
      name: creator?.name || 'Unknown',
      type: 'user' as ContentAuthorType,
      avatarUrl: creator?.avatarUrl || undefined,
    },

    status: mapPredictionStatus(prediction),
    priority: calculateContentPriority({
      createdAt: prediction.createdAt,
      viewsCount: prediction.viewCount,
    }),
    flags: [],

    metadata: {
      expiresAt: prediction.expiresAt.toISOString(),
      resolvedAt: prediction.resolvedAt?.toISOString(),
      resolved: prediction.resolved,
      winningOptionId: prediction.winningOptionId || undefined,
      categoryId: prediction.categoryId || undefined,
      categories: prediction.category ? [prediction.category.name] : undefined,
    },

    engagement: {
      views: prediction.viewCount || 0,
      reactions: {
        total: 0, // Predictions don't have reactions
      },
      comments: 0, // Would need to count from Content where predictionId = prediction.id
      shares: 0,
    },

    timestamps: {
      createdAt: prediction.createdAt.toISOString(),
      publishedAt: prediction.createdAt.toISOString(), // Use creation as publish time
    },
  };
}

// ============================================================================
// Batch Transformers
// ============================================================================

/**
 * Transform an array of articles to unified content items
 */
export function transformArticlesToUnified(
  articles: Array<PrismaArticle & { feed?: PrismaFeedSource | null }>,
): UnifiedContentItem[] {
  return articles.map(transformArticleToUnified);
}

/**
 * Transform an array of posts to unified content items
 */
export function transformPostsToUnified(
  posts: Array<PrismaContent & { author: PrismaUser }>,
): UnifiedContentItem[] {
  return posts.map(transformPostToUnified);
}

/**
 * Transform an array of comments to unified content items
 */
export function transformCommentsToUnified(
  comments: Array<PrismaContent & { author: PrismaUser }>,
): UnifiedContentItem[] {
  return comments.map(transformCommentToUnified);
}

/**
 * Transform an array of predictions to unified content items
 */
export function transformPredictionsToUnified(
  predictions: Array<PrismaPrediction & {
    creator?: PrismaUser;
    category?: { id: number; name: string } | null;
  }>,
): UnifiedContentItem[] {
  return predictions.map(transformPredictionToUnified);
}

// ============================================================================
// Mixed Content Transformer
// ============================================================================

/**
 * Transform mixed content types and sort by a unified field
 */
export function transformAndSortUnifiedContent(
  content: {
    articles?: Array<PrismaArticle & { feed?: PrismaFeedSource | null }>;
    posts?: Array<PrismaContent & { author: PrismaUser }>;
    comments?: Array<PrismaContent & { author: PrismaUser }>;
    predictions?: Array<PrismaPrediction & {
      creator?: PrismaUser;
      category?: { id: number; name: string } | null;
    }>;
  },
  sortBy: 'createdAt' | 'updatedAt' | 'views' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): UnifiedContentItem[] {
  const unified: UnifiedContentItem[] = [];

  if (content.articles) {
    unified.push(...transformArticlesToUnified(content.articles));
  }

  if (content.posts) {
    unified.push(...transformPostsToUnified(content.posts));
  }

  if (content.comments) {
    unified.push(...transformCommentsToUnified(content.comments));
  }

  if (content.predictions) {
    unified.push(...transformPredictionsToUnified(content.predictions));
  }

  // Sort by specified field
  unified.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'createdAt':
        aValue = a.timestamps.createdAt;
        bValue = b.timestamps.createdAt;
        break;
      case 'updatedAt':
        aValue = a.timestamps.updatedAt || a.timestamps.createdAt;
        bValue = b.timestamps.updatedAt || b.timestamps.createdAt;
        break;
      case 'views':
        aValue = a.engagement.views;
        bValue = b.engagement.views;
        break;
      default:
        aValue = a.timestamps.createdAt;
        bValue = b.timestamps.createdAt;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return unified;
}
