/**
 * Content Database Types
 *
 * Types for the unified Content and Reaction models
 */

import type { PrismaContent, PrismaReaction, PrismaContentType, PrismaReactionType } from '../prisma';

// ============================================================================
// Content Types (Unified Model)
// ============================================================================

export type DbContent = PrismaContent;

export interface PublicContent {
  id: number;
  authorId: number;
  type: PrismaContentType;
  body: string;
  articleId: number | null;
  predictionId: number | null;
  parentId: number | null;
  threadDepth: number;
  reactionsCount: number;
  repliesCount: number;
  isDeleted: boolean;
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  author?: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey: string | null;
  };
  children?: PublicContent[];
}

// ============================================================================
// Reaction Types (Unified Model)
// ============================================================================

export type DbReaction = PrismaReaction;

export interface PublicReaction {
  id: number;
  userId: number;
  type: PrismaReactionType;
  contentId: number | null;
  articleId: number | null;
  predictionId: number | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey: string | null;
  };
}

// ============================================================================
// Legacy Types (for backward compatibility during migration)
// ============================================================================

export interface PostReaction {
  id: number;
  postId: number;
  userId: number;
  type: PrismaReactionType;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
}

export interface PostMention {
  id: number;
  postId: number;
  userId: number;
  startIndex: number;
  endIndex: number;
  userName?: string;
}

export interface Hashtag {
  id: number;
  tag: string;
  usageCount: number;
  createdAt: string;
}

// ============================================================================
// Content Creation & Update Types
// ============================================================================

export interface DbLinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

export interface DbCreateContentData {
  authorId: number;
  type: PrismaContentType;
  body: string;
  articleId?: number | null;
  predictionId?: number | null;
  parentId?: number | null;
  visibility?: 'public' | 'private' | 'followers';
  mediaUrls?: string[];
  linkPreview?: DbLinkPreview;
}

// ============================================================================
// Detailed Content Types
// ============================================================================

export interface DbContentWithDetails {
  id: number;
  authorId: number;
  type: PrismaContentType;
  body: string;
  articleId: number | null;
  predictionId: number | null;
  parentId: number | null;
  threadDepth: number;
  reactionsCount: number;
  repliesCount: number;
  isDeleted: boolean;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  author: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey: string | null;
  };
  reactions?: Array<{
    id: number;
    userId: number;
    type: PrismaReactionType;
    user: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
  }>;
  parent?: DbContentWithDetails | null;
  children?: DbContentWithDetails[];
  userHasReacted?: boolean;
  userReactionType?: PrismaReactionType | null;
}

export interface DbUserFeedContent {
  id: number;
  authorId: number;
  type: PrismaContentType;
  body: string;
  parentId: number | null;
  threadDepth: number;
  reactionsCount: number;
  repliesCount: number;
  createdAt: Date;
  author: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  parent?: {
    id: number;
    body: string;
    authorId: number;
  } | null;
  // Additional fields for UI compatibility
  authorName?: string;
  authorAvatar?: string | null;
  commentsCount?: number;
  visibility?: string;
  mediaUrls?: string[];
  linkPreview?: any;
  viewsCount?: string;
  sharesCount?: number;
  editedAt?: Date | null;
  updatedAt?: Date;
  reactionCounts?: Record<string, number>;
  userReaction?: string | null;
  children?: DbUserFeedContent[];
}

export interface DbUserMention {
  id: number;
  contentId: number;
  userId: number;
  startIndex: number;
  endIndex: number;
  isRead: boolean;
  createdAt: Date;
  content: {
    id: number;
    body: string;
    authorId: number;
    createdAt: Date;
    author: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
  };
}

// ============================================================================
// Most Reacted Content Types
// ============================================================================

export interface DbMostReactedContent {
  id: number;
  type: 'content' | 'article' | 'prediction';
  title?: string;
  body?: string;
  url?: string;
  reactionCount: number;
  topReactions: Array<{
    type: PrismaReactionType;
    count: number;
  }>;
  createdAt: Date;
}

// ============================================================================
// Enum Re-exports
// ============================================================================

export type { PrismaContentType as ContentType, PrismaReactionType as ReactionType };
