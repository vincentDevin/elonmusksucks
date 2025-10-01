// apps/server/src/repositories/ContentRepository.ts
import { PrismaClient } from '@prisma/client';
import type {
  PrismaContent,
  PrismaContentType,
  PostVisibility,
  PostContentType,
  DbLinkPreview,
  DbContentWithDetails,
  DbUserMention,
} from '@ems/types';
import { IContentRepository } from './interfaces/IContentRepository';

/**
 * Content Repository Implementation
 * Handles all content types: Posts, Comments (on Articles/Predictions)
 * Unified repository replacing separate post and comment repositories
 */
export class ContentRepository implements IContentRepository {
  constructor(private prisma: PrismaClient = new PrismaClient()) {}

  // ============================================
  // CREATE
  // ============================================

  /**
   * Create a new content (post or comment)
   * Handles thread depth calculation and parent reply count updates
   */
  async createContent(data: {
    authorId: number;
    type: PrismaContentType;
    body: string;
    contentType?: PostContentType;
    visibility?: PostVisibility;
    mediaUrls?: string[];
    linkPreview?: DbLinkPreview;
    articleId?: number | null;
    predictionId?: number | null;
    parentId?: number | null;
  }): Promise<PrismaContent> {
    // Calculate thread depth if this is a reply
    let threadDepth = 0;
    if (data.parentId) {
      const parent = await this.prisma.content.findUnique({
        where: { id: data.parentId },
        select: { threadDepth: true },
      });
      threadDepth = parent ? parent.threadDepth + 1 : 0;
    }

    const content = await this.prisma.content.create({
      data: {
        authorId: data.authorId,
        type: data.type,
        body: data.body,
        contentType: data.contentType || 'TEXT',
        visibility: data.visibility || 'PUBLIC',
        mediaUrls: data.mediaUrls || undefined,
        linkPreview: data.linkPreview ? (data.linkPreview as any) : undefined,
        articleId: data.articleId || null,
        predictionId: data.predictionId || null,
        parentId: data.parentId || null,
        threadDepth,
      },
    });

    // Increment parent's reply count if this is a reply
    if (data.parentId) {
      await this.incrementReplyCount(data.parentId);
    }

    // Increment article/prediction comment count
    if (data.articleId) {
      await this.prisma.article.update({
        where: { id: data.articleId },
        data: { commentsCount: { increment: 1 } },
      });
    }
    if (data.predictionId) {
      // Note: Prediction doesn't have commentsCount field in schema yet
      // This would need to be added or tracked differently
    }

    return content as PrismaContent;
  }

  // ============================================
  // READ
  // ============================================

  /**
   * Get content by ID
   * Returns null if content doesn't exist or is deleted
   */
  async getContentById(contentId: number): Promise<PrismaContent | null> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.isDeleted) {
      return null;
    }

    return content as PrismaContent;
  }

  /**
   * Get content with full details (author, reactions, mentions, hashtags)
   * Includes all related data for complete content display
   */
  async getContentWithDetails(contentId: number): Promise<DbContentWithDetails | null> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: true,
          },
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    if (!content || content.isDeleted) {
      return null;
    }

    return content as unknown as DbContentWithDetails;
  }

  /**
   * Get public timeline
   * Returns top-level posts (no parent) sorted by recent or trending
   */
  async getPublicTimeline(options: {
    cursor?: number;
    limit?: number;
    sortBy?: 'recent' | 'trending';
  }): Promise<{ content: PrismaContent[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const where = {
      type: 'POST' as PrismaContentType,
      visibility: 'PUBLIC' as PostVisibility,
      isDeleted: false,
      parentId: null, // Top-level posts only
      ...(options.cursor && { id: { lt: options.cursor } }),
    };

    const orderBy =
      options.sortBy === 'trending'
        ? [{ reactionsCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const content = await this.prisma.content.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    const hasMore = content.length > limit;
    const items = hasMore ? content.slice(0, limit) : content;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { content: items as PrismaContent[], nextCursor };
  }

  /**
   * Get user's posts
   * Returns posts created by a specific user with pagination
   */
  async getUserPosts(
    userId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
    },
  ): Promise<{ content: PrismaContent[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const where = {
      authorId: userId,
      type: 'POST' as PrismaContentType,
      isDeleted: false,
      ...(!options.includeReplies && { parentId: null }),
      ...(options.cursor && { id: { lt: options.cursor } }),
    };

    const content = await this.prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    const hasMore = content.length > limit;
    const items = hasMore ? content.slice(0, limit) : content;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { content: items as PrismaContent[], nextCursor };
  }

  /**
   * Get comments for a specific article
   * Returns paginated comments with optional threading
   */
  async getArticleComments(
    articleId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
    },
  ): Promise<{ comments: PrismaContent[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const where = {
      articleId,
      type: 'COMMENT' as PrismaContentType,
      isDeleted: false,
      ...(!options.includeReplies && { parentId: null }),
      ...(options.cursor && { id: { lt: options.cursor } }),
    };

    const comments = await this.prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { comments: items as PrismaContent[], nextCursor };
  }

  /**
   * Get comments for a specific prediction
   * Returns paginated comments with optional threading
   */
  async getPredictionComments(
    predictionId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
    },
  ): Promise<{ comments: PrismaContent[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const where = {
      predictionId,
      type: 'COMMENT' as PrismaContentType,
      isDeleted: false,
      ...(!options.includeReplies && { parentId: null }),
      ...(options.cursor && { id: { lt: options.cursor } }),
    };

    const comments = await this.prisma.content.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { comments: items as PrismaContent[], nextCursor };
  }

  /**
   * Get replies to a specific content
   * Returns child content in chronological order
   */
  async getReplies(
    parentId: number,
    options: {
      cursor?: number;
      limit?: number;
    },
  ): Promise<{ replies: PrismaContent[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const where = {
      parentId,
      isDeleted: false,
      ...(options.cursor && { id: { lt: options.cursor } }),
    };

    const replies = await this.prisma.content.findMany({
      where,
      orderBy: { createdAt: 'asc' }, // Replies in chronological order
      take: limit + 1,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, limit) : replies;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { replies: items as PrismaContent[], nextCursor };
  }

  /**
   * Get trending content
   * Returns content sorted by engagement (reactions, views) in last 24 hours
   */
  async getTrendingContent(options: {
    limit?: number;
    type?: PrismaContentType;
  }): Promise<PrismaContent[]> {
    const limit = options.limit || 10;

    const content = await this.prisma.content.findMany({
      where: {
        ...(options.type && { type: options.type }),
        isDeleted: false,
        visibility: 'PUBLIC',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: [{ reactionsCount: 'desc' }, { viewsCount: 'desc' }],
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
    });

    return content as PrismaContent[];
  }

  /**
   * Get comment count for an article
   * Returns total number of comments (excluding deleted)
   */
  async getArticleCommentCount(articleId: number): Promise<number> {
    return this.prisma.content.count({
      where: {
        articleId,
        type: 'COMMENT',
        isDeleted: false,
      },
    });
  }

  /**
   * Get comment count for a prediction
   * Returns total number of comments (excluding deleted)
   */
  async getPredictionCommentCount(predictionId: number): Promise<number> {
    return this.prisma.content.count({
      where: {
        predictionId,
        type: 'COMMENT',
        isDeleted: false,
      },
    });
  }

  /**
   * Get reply count for content
   * Returns total number of direct replies (excluding deleted)
   */
  async getReplyCount(contentId: number): Promise<number> {
    return this.prisma.content.count({
      where: {
        parentId: contentId,
        isDeleted: false,
      },
    });
  }

  // ============================================
  // UPDATE
  // ============================================

  /**
   * Update content body
   * Verifies ownership before allowing update
   */
  async updateContent(
    contentId: number,
    authorId: number,
    body: string,
  ): Promise<PrismaContent | null> {
    // Verify ownership
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.authorId !== authorId || content.isDeleted) {
      return null;
    }

    const updated = await this.prisma.content.update({
      where: { id: contentId },
      data: {
        body,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    return updated as PrismaContent;
  }

  /**
   * Increment view count
   * Called when content is viewed
   */
  async incrementViewCount(contentId: number): Promise<void> {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { viewsCount: { increment: 1 } },
    });
  }

  /**
   * Increment reaction count
   * Called by ReactionRepository when reaction is added
   */
  async incrementReactionCount(contentId: number): Promise<void> {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { reactionsCount: { increment: 1 } },
    });
  }

  /**
   * Decrement reaction count
   * Called by ReactionRepository when reaction is removed
   */
  async decrementReactionCount(contentId: number): Promise<void> {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { reactionsCount: { decrement: 1 } },
    });
  }

  /**
   * Increment reply count
   * Called when a child content is created
   */
  async incrementReplyCount(contentId: number): Promise<void> {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { repliesCount: { increment: 1 } },
    });
  }

  /**
   * Decrement reply count
   * Called when a child content is deleted
   */
  async decrementReplyCount(contentId: number): Promise<void> {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { repliesCount: { decrement: 1 } },
    });
  }

  // ============================================
  // DELETE
  // ============================================

  /**
   * Soft delete content
   * Sets isDeleted flag and updates parent/article counts
   */
  async deleteContent(contentId: number, deletedBy: number, isAdmin?: boolean): Promise<boolean> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return false;
    }

    // Check permissions
    if (!isAdmin && content.authorId !== deletedBy) {
      return false;
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });

    // Decrement parent's reply count if this was a reply
    if (content.parentId) {
      await this.decrementReplyCount(content.parentId);
    }

    // Decrement article/prediction comment count
    if (content.articleId) {
      await this.prisma.article.update({
        where: { id: content.articleId },
        data: { commentsCount: { decrement: 1 } },
      });
    }

    return true;
  }

  /**
   * Hard delete content
   * Permanently removes content from database (admin only)
   */
  async hardDeleteContent(contentId: number): Promise<boolean> {
    try {
      await this.prisma.content.delete({
        where: { id: contentId },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // VALIDATION & OWNERSHIP
  // ============================================

  /**
   * Check if user owns content
   * Returns true if user is the author
   */
  async isContentOwner(contentId: number, userId: number): Promise<boolean> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { authorId: true },
    });

    return content?.authorId === userId;
  }

  /**
   * Check if content is valid
   * Returns true if content exists and is not deleted
   */
  async isContentValid(contentId: number): Promise<boolean> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { isDeleted: true },
    });

    return content !== null && !content.isDeleted;
  }

  // ============================================
  // MENTIONS & HASHTAGS
  // ============================================

  /**
   * Add mentions to content
   * Creates ContentMention records for @mentioned users
   */
  async addMentions(
    contentId: number,
    mentions: Array<{ userId: number; startIndex: number; endIndex: number }>,
  ): Promise<void> {
    await this.prisma.contentMention.createMany({
      data: mentions.map((m) => ({
        contentId,
        userId: m.userId,
        startIndex: m.startIndex,
        endIndex: m.endIndex,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Add hashtags to content
   * Creates or updates hashtags and links them to content
   */
  async addHashtags(contentId: number, hashtags: string[]): Promise<void> {
    for (const tag of hashtags) {
      // Find or create hashtag
      const hashtag = await this.prisma.hashtag.upsert({
        where: { tag },
        create: { tag, usageCount: 1 },
        update: { usageCount: { increment: 1 } },
      });

      // Link to content
      await this.prisma.contentHashtag.create({
        data: {
          contentId,
          hashtagId: hashtag.id,
        },
      });
    }
  }

  /**
   * Get content by hashtag
   * Returns all content tagged with a specific hashtag
   */
  async getContentByHashtag(
    hashtag: string,
    options: { cursor?: number; limit?: number },
  ): Promise<{ content: PrismaContent[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const hashtagRecord = await this.prisma.hashtag.findUnique({
      where: { tag: hashtag },
    });

    if (!hashtagRecord) {
      return { content: [], nextCursor: undefined };
    }

    const contentHashtags = await this.prisma.contentHashtag.findMany({
      where: {
        hashtagId: hashtagRecord.id,
        content: {
          isDeleted: false,
          ...(options.cursor && { id: { lt: options.cursor } }),
        },
      },
      include: {
        content: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
      },
      orderBy: { content: { createdAt: 'desc' } },
      take: limit + 1,
    });

    const content = contentHashtags.map((ch) => ch.content);
    const hasMore = content.length > limit;
    const items = hasMore ? content.slice(0, limit) : content;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { content: items as PrismaContent[], nextCursor };
  }

  /**
   * Get user mentions
   * Returns all mentions of a specific user with content details
   */
  async getUserMentions(
    userId: number,
    options: { cursor?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<{ mentions: DbUserMention[]; nextCursor?: number }> {
    const limit = options.limit || 20;

    const mentions = await this.prisma.contentMention.findMany({
      where: {
        userId,
        content: {
          isDeleted: false,
        },
        ...(options.cursor && { id: { lt: options.cursor } }),
      },
      include: {
        content: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = mentions.length > limit;
    const items = hasMore ? mentions.slice(0, limit) : mentions;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { mentions: items as unknown as DbUserMention[], nextCursor };
  }

  // ============================================
  // STATS & ANALYTICS
  // ============================================

  /**
   * Get user content statistics
   * Returns aggregate stats for user's content
   */
  async getUserContentStats(userId: number): Promise<{
    totalPosts: number;
    totalComments: number;
    totalReactions: number;
    totalViews: number;
  }> {
    const [posts, comments, aggregates] = await Promise.all([
      this.prisma.content.count({
        where: {
          authorId: userId,
          type: 'POST',
          isDeleted: false,
        },
      }),
      this.prisma.content.count({
        where: {
          authorId: userId,
          type: 'COMMENT',
          isDeleted: false,
        },
      }),
      this.prisma.content.aggregate({
        where: {
          authorId: userId,
          isDeleted: false,
        },
        _sum: {
          reactionsCount: true,
          viewsCount: true,
        },
      }),
    ]);

    return {
      totalPosts: posts,
      totalComments: comments,
      totalReactions: Number(aggregates._sum.reactionsCount || 0),
      totalViews: Number(aggregates._sum.viewsCount || 0),
    };
  }

  /**
   * Get user's recent activity
   * Returns user's most recent content
   */
  async getUserRecentActivity(userId: number, limit?: number): Promise<PrismaContent[]> {
    const content = await this.prisma.content.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit || 10,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
    });

    return content as PrismaContent[];
  }
}
