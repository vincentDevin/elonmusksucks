/**
 * Timeline Database Types
 *
 * Types for Article and FeedSource models
 */

import type {
  PrismaArticle,
  PrismaFeedSource,
  PrismaArticleStatus,
  PrismaArticleBookmark,
  PrismaBookmarkCollection,
  PrismaArticleShare,
} from '../prisma';
import type { PublicTag } from './tag';

// ============================================================================
// FeedSource Types
// ============================================================================

export type DbFeedSource = PrismaFeedSource;

export interface PublicFeedSource {
  id: number;
  name: string;
  url: string;
  siteUrl: string | null;
  status: string;
  allowImages: boolean;
  lastFetchedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMsg: string | null;
  fetchCount: number;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Article Types
// ============================================================================

export type DbArticle = PrismaArticle;

export interface PublicArticle {
  id: number;
  feedId: number;
  guid: string | null;
  url: string;
  canonicalUrl: string | null;
  title: string;
  excerpt: string | null;
  leadImageUrl: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  hash: string;
  status: PrismaArticleStatus;
  tags: PublicTag[]; // Now properly typed with normalized tags
  modNotes: string | null;
  reactionsCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  feed?: PublicFeedSource;
}

// ============================================================================
// Article Bookmark Types
// ============================================================================

export type DbArticleBookmark = PrismaArticleBookmark;

export interface PublicArticleBookmark {
  id: number;
  userId: number;
  articleId: number;
  collectionId: number | null;
  createdAt: string;
}

export type DbBookmarkCollection = PrismaBookmarkCollection;

export interface PublicBookmarkCollection {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bookmarks: number;
  };
}

// ============================================================================
// Article Share Types
// ============================================================================

export type DbArticleShare = PrismaArticleShare;

export interface PublicArticleShare {
  id: number;
  articleId: number;
  userId: number;
  platform: string;
  message: string | null;
  targetUsers: number[];
  createdAt: string;
}

// ============================================================================
// Timeline Item (unified content view)
// ============================================================================

export interface TimelineItem {
  id: string; // composite: 'article-123' or 'post-456' or 'tweet-789'
  type: 'article' | 'tweet';
  timestamp: string;
  content: {
    title: string;
    excerpt?: string;
    url: string;
    imageUrl?: string | null;
    author?: string; // feed name or twitter handle
    source?: string; // domain or 'Twitter'
  };
  engagement: {
    reactions: number;
    comments: number;
  };
  tags: string[];
  // Reaction data from backend (prevents N+1 queries)
  reactionCounts?: Record<string, number>;
  userReaction?: string;
  sourceLinks?: Array<{
    id: number;
    url: string;
    type: string;
    title?: string;
    predictionId?: number;
  }>;
  // When ID starts with 'post-', this contains the full UserFeedPost data
  postData?: {
    id: number;
    authorId: number;
    content: string;
    contentType: string;
    visibility: string;
    mediaUrls?: string[];
    linkPreview?: any;
    parentId: number | null;
    threadDepth: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: string;
    reactionCounts?: any;
    userReaction?: any;
    isDeleted: boolean;
    isFlagged: boolean;
    createdAt: string;
    updatedAt: string;
    editedAt?: string;
    children?: any;
    authorName?: string;
    authorAvatar?: string;
    canEdit?: boolean;
    canDelete?: boolean;
  };
}

// ============================================================================
// Article Moderation Data
// ============================================================================

export interface ArticleModerationData {
  id: number;
  title: string;
  url: string;
  feedName: string;
  publishedAt: string | null;
  status: PrismaArticleStatus;
  tags: string[];
  excerpt: string | null;
  modNotes: string | null;
  leadImageUrl: string | null;
}

// ============================================================================
// Timeline Query Types
// ============================================================================

export interface DbArticleFeedParams {
  cursor?: Date;
  limit: number;
  tagIds?: number[];
}

export interface DbArticleWithTags {
  id: number;
  feedId: number;
  guid: string | null;
  url: string;
  canonicalUrl: string | null;
  title: string;
  excerpt: string | null;
  leadImageUrl: string | null;
  publishedAt: Date | null;
  fetchedAt: Date;
  hash: string;
  status: PrismaArticleStatus;
  modNotes: string | null;
  reactionsCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  feed?: PrismaFeedSource;
  tags?: Array<{
    id: number;
    tagId: number;
    tag: {
      id: number;
      name: string;
      slug: string;
      color?: string | null;
    };
  }>;
}

export interface DbArticleWithStats {
  article: DbArticleWithTags;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
    color?: string | null;
  }>;
  reactionCounts: Record<string, number>;
  commentCount: number;
}

// ============================================================================
// Search and Discovery Types
// ============================================================================

export interface DbSearchFilters {
  tagIds?: number[];
  feedIds?: number[];
  startDate?: Date;
  endDate?: Date;
  status?: PrismaArticleStatus;
  contentType?: 'articles' | 'posts' | 'all';
}

export interface DbSearchResult {
  items: DbArticleWithTags[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface DbSearchSuggestion {
  type: 'article' | 'post' | 'tag' | 'author' | 'feed';
  value: string;
  id?: number;
  count?: number;
}

export interface DbTrendingContentParams {
  timeRange: 'hour' | 'day' | 'week' | 'month';
  limit: number;
  contentType: 'articles' | 'posts' | 'all';
}

export interface DbTrendingContent {
  articles: DbArticleWithTags[];
  posts: Array<{
    id: number;
    content: string;
    createdAt: Date;
    authorId: number;
    reactionsCount: number;
    repliesCount: number;
    viewsCount: number;
    author: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
    articleCount: number;
  }>;
  authors: Array<{
    id: number;
    name: string;
    articlesCount: number;
  }>;
}

// ============================================================================
// Bookmark Types
// ============================================================================

export interface DbToggleBookmarkResult {
  action: 'added' | 'removed';
  bookmarkId?: number;
}

export interface DbUserBookmarksParams {
  limit: number;
  cursor?: string;
  collectionId?: number;
}

export interface DbUserBookmarksResult {
  bookmarks: Array<{
    id: number;
    articleId: number;
    userId: number;
    collectionId: number | null;
    createdAt: Date;
    article: DbArticleWithTags;
  }>;
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

export interface DbCreateBookmarkCollectionData {
  name: string;
  description?: string | null;
  isPrivate: boolean;
}

export interface DbBookmarkCollectionWithCount {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    bookmarks: number;
  };
}

// ============================================================================
// Social Sharing Types
// ============================================================================

export interface DbShareArticleData {
  platform: string;
  message?: string | null;
  targetUsers: number[];
}

export interface DbShareArticleResult {
  shareId: number;
  shareUrl?: string;
}

export interface DbArticleShareStats {
  totalShares: number;
  platforms: Record<string, number>;
  recentShares: Array<{
    id: number;
    articleId: number;
    userId: number;
    platform: string;
    message: string | null;
    createdAt: Date;
    user: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
  }>;
}

// ============================================================================
// Enum Re-exports
// ============================================================================

export type { PrismaArticleStatus as ArticleStatus };
