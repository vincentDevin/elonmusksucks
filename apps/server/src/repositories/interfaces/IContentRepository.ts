// apps/server/src/repositories/interfaces/IContentRepository.ts
import type {
  PrismaContent,
  PrismaContentType,
  PostVisibility,
  PostContentType,
  DbLinkPreview,
  DbContentWithDetails,
  DbUserMention,
  ReportReason,
} from '@ems/types';

/**
 * Unified Content Repository
 * Handles all content types: Posts, Comments (on Articles/Predictions)
 * Replaces: IPostRepository, IPredictionCommentRepository, Article/Prediction comment logic
 */
export interface IContentRepository {
  // ============================================
  // CREATE
  // ============================================

  /** Create a new content (post or comment) */
  createContent(data: {
    authorId: number;
    type: PrismaContentType;
    body: string;
    contentType?: PostContentType;
    visibility?: PostVisibility;
    mediaUrls?: string[];
    linkPreview?: DbLinkPreview;
    // Polymorphic parent - what is this attached to?
    articleId?: number | null;
    predictionId?: number | null;
    // Threading - reply to another content
    parentId?: number | null;
  }): Promise<PrismaContent>;

  // ============================================
  // READ
  // ============================================

  /** Get content by ID */
  getContentById(contentId: number, viewerId?: number): Promise<PrismaContent | null>;

  /** Get content with full details (author, reactions, reply count, etc.) */
  getContentWithDetails(contentId: number, viewerId?: number): Promise<DbContentWithDetails | null>;

  /** Get top-level posts (no parent, type=POST) for public timeline */
  getPublicTimeline(options: {
    cursor?: number;
    limit?: number;
    sortBy?: 'recent' | 'trending';
    viewerId?: number;
  }): Promise<{ content: PrismaContent[]; nextCursor?: number }>;

  /** Get user's posts (type=POST, created by userId) */
  getUserPosts(
    userId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
      viewerId?: number;
    },
  ): Promise<{ content: PrismaContent[]; nextCursor?: number }>;

  /** Get comments for a specific article */
  getArticleComments(
    articleId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
      viewerId?: number;
    },
  ): Promise<{ comments: PrismaContent[]; nextCursor?: number }>;

  /** Get comments for a specific prediction */
  getPredictionComments(
    predictionId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
      viewerId?: number;
    },
  ): Promise<{ comments: PrismaContent[]; nextCursor?: number }>;

  /** Get replies to a specific content (by parentId) */
  getReplies(
    parentId: number,
    options: {
      cursor?: number;
      limit?: number;
      viewerId?: number;
    },
  ): Promise<{ replies: PrismaContent[]; nextCursor?: number }>;

  /** Get trending content */
  getTrendingContent(options: {
    limit?: number;
    type?: PrismaContentType;
  }): Promise<PrismaContent[]>;

  /** Get comment count for article */
  getArticleCommentCount(articleId: number): Promise<number>;

  /** Get comment count for prediction */
  getPredictionCommentCount(predictionId: number): Promise<number>;

  /** Get comment counts for multiple predictions in bulk */
  getPredictionCommentCountsBulk(predictionIds: number[]): Promise<Map<number, number>>;

  /** Get reply count for content */
  getReplyCount(contentId: number): Promise<number>;

  // ============================================
  // UPDATE
  // ============================================

  /** Update content body */
  updateContent(contentId: number, authorId: number, body: string): Promise<PrismaContent | null>;

  /** Increment view count */
  incrementViewCount(contentId: number): Promise<void>;

  /** Increment reaction count (called by ReactionRepository) */
  incrementReactionCount(contentId: number): Promise<void>;

  /** Decrement reaction count (called by ReactionRepository) */
  decrementReactionCount(contentId: number): Promise<void>;

  /** Increment reply count (when child created) */
  incrementReplyCount(contentId: number): Promise<void>;

  /** Decrement reply count (when child deleted) */
  decrementReplyCount(contentId: number): Promise<void>;

  // ============================================
  // DELETE
  // ============================================

  /** Soft delete content (sets isDeleted = true) */
  deleteContent(contentId: number, deletedBy: number, isAdmin?: boolean): Promise<boolean>;

  /** Hard delete content (permanent removal) - admin only */
  hardDeleteContent(contentId: number): Promise<boolean>;

  // ============================================
  // VALIDATION & OWNERSHIP
  // ============================================

  /** Check if user owns content */
  isContentOwner(contentId: number, userId: number): Promise<boolean>;

  /** Check if content exists and is not deleted */
  isContentValid(contentId: number): Promise<boolean>;

  // ============================================
  // MENTIONS & HASHTAGS
  // ============================================

  /** Add mentions to content */
  addMentions(
    contentId: number,
    mentions: Array<{ userId: number; startIndex: number; endIndex: number }>,
  ): Promise<void>;

  /** Add hashtags to content */
  addHashtags(contentId: number, hashtags: string[]): Promise<void>;

  /** Get content by hashtag */
  getContentByHashtag(
    hashtag: string,
    options: { cursor?: number; limit?: number },
  ): Promise<{ content: PrismaContent[]; nextCursor?: number }>;

  /** Get user mentions */
  getUserMentions(
    userId: number,
    options: { cursor?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<{ mentions: DbUserMention[]; nextCursor?: number }>;

  /** Get trending hashtags */
  getTrendingHashtags(limit?: number): Promise<
    Array<{
      id: number;
      tag: string;
      usageCount: number;
      trendingScore: number;
    }>
  >;

  // ============================================
  // REPORTS
  // ============================================

  /** Check if user has already reported content */
  hasUserReportedContent(contentId: number, reporterId: number): Promise<boolean>;

  /** Create a content report */
  createContentReport(data: {
    contentId: number;
    reporterId: number;
    reason: ReportReason;
    details?: string;
  }): Promise<{ id: number }>;

  // ============================================
  // STATS & ANALYTICS
  // ============================================

  /** Get user content statistics */
  getUserContentStats(userId: number): Promise<{
    totalPosts: number;
    totalComments: number;
    totalReactions: number;
    totalViews: number;
  }>;

  /** Get recent activity for user */
  getUserRecentActivity(userId: number, limit?: number): Promise<PrismaContent[]>;

  /** Get total engagement metrics across all content */
  getEngagementTotals(): Promise<{
    totalViews: number;
    totalReactions: number;
    totalComments: number;
  }>;

  /** Get count of flagged content */
  getFlaggedContentCount(): Promise<number>;

  /** Update content moderation status */
  updateContentModeration(
    contentId: number,
    data: { isFlagged: boolean; moderationNote?: string | null },
  ): Promise<PrismaContent | null>;
}
