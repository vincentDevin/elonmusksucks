import { ContentRepository } from '../repositories/ContentRepository';
import type { IContentRepository } from '../repositories/interfaces/IContentRepository';
import type {
  DbUserFeedContent,
  PrismaContentType,
  PostVisibility,
  ReportReason,
} from '@ems/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';
import { unifiedActivityService } from './unifiedActivity.service';

export class PostService {
  private contentRepository: IContentRepository;
  private unifiedActivityService = unifiedActivityService;

  constructor() {
    this.contentRepository = new ContentRepository();
  }

  /**
   * Create a new post with validation and notifications
   */
  async createPost(
    authorId: number,
    data: {
      content: string;
      visibility?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';
      mediaUrls?: string[];
      linkPreview?: any;
      parentId?: number | null;
    },
  ): Promise<DbUserFeedContent> {
    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError('Post content cannot be empty');
    }

    if (data.content.length > 500) {
      throw new ValidationError('Post content cannot exceed 500 characters');
    }

    // Validate media
    if (data.mediaUrls && data.mediaUrls.length > 4) {
      throw new ValidationError('Maximum 4 images allowed per post');
    }

    // Validate parent exists if this is a reply
    if (data.parentId) {
      const parent = await this.contentRepository.getContentById(data.parentId);
      if (!parent) {
        throw new NotFoundError('Parent post not found');
      }

      // Check thread depth limit
      if (parent.threadDepth >= 10) {
        throw new ValidationError('Maximum thread depth reached');
      }
    }

    // Extract mentions and hashtags
    const mentions = this.extractMentions(data.content);
    const hashtags = this.extractHashtags(data.content);

    // Create the post using Content model
    const content = await this.contentRepository.createContent({
      authorId,
      type: 'POST' as PrismaContentType,
      body: data.content,
      visibility: (data.visibility || 'PUBLIC') as PostVisibility,
      mediaUrls: data.mediaUrls,
      linkPreview: data.linkPreview,
      parentId: data.parentId || null,
    });

    // Process mentions and hashtags in background
    if (mentions.length > 0) {
      this.processMentions(content.id, mentions).catch(console.error);
    }
    if (hashtags.length > 0) {
      this.processHashtags(content.id, hashtags).catch(console.error);
    }

    // Get full content with author to return DbUserFeedContent
    const fullContent = await this.contentRepository.getContentById(content.id);
    if (!fullContent) {
      throw new Error('Failed to retrieve created post');
    }

    return this.toFeedContent(fullContent);
  }

  /**
   * Update a post (edit)
   */
  async updatePost(postId: number, authorId: number, content: string): Promise<DbUserFeedContent> {
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Post content cannot be empty');
    }

    if (content.length > 500) {
      throw new ValidationError('Post content cannot exceed 500 characters');
    }

    const existingPost = await this.contentRepository.getContentById(postId);
    if (!existingPost) {
      throw new NotFoundError('Post not found');
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenError('Cannot edit this post');
    }

    const updatedPost = await this.contentRepository.updateContent(postId, authorId, content);
    if (!updatedPost) {
      throw new Error('Failed to update post');
    }

    return this.toFeedContent(updatedPost);
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: number, userId: number, isAdmin: boolean = false): Promise<void> {
    const post = await this.contentRepository.getContentById(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenError('Cannot delete this post');
    }

    const success = await this.contentRepository.deleteContent(postId, userId, isAdmin);
    if (!success) {
      throw new Error('Failed to delete post');
    }
  }

  /**
   * Get a single post with full details
   */
  async getPost(postId: number, viewerId?: number): Promise<DbUserFeedContent> {
    const post = await this.contentRepository.getContentById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return this.toFeedContent(post, viewerId);
  }

  /**
   * Get user's posts
   */
  async getUserPosts(
    userId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
    } = {},
    viewerId?: number,
  ): Promise<{ posts: DbUserFeedContent[]; nextCursor?: number }> {
    const result = await this.contentRepository.getUserPosts(
      userId,
      {
        limit: options.limit || 20,
        cursor: options.cursor,
        includeReplies: options.includeReplies ?? false,
      },
      viewerId,
    );

    return {
      posts: result.content.map((post) => this.toFeedContent(post, viewerId)),
      nextCursor: result.nextCursor,
    };
  }

  /**
   * Get post comments/replies
   */
  async getPostComments(
    postId: number,
    _viewerId?: number,
    options: {
      cursor?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: DbUserFeedContent[]; nextCursor?: number }> {
    const result = await this.contentRepository.getReplies(postId, {
      limit: options.limit || 20,
      cursor: options.cursor,
    });

    return {
      comments: result.replies.map((reply) => this.toFeedContent(reply)),
      nextCursor: result.nextCursor,
    };
  }

  /**
   * Report a post for moderation
   */
  async reportPost(
    postId: number,
    reporterId: number,
    reason: string,
    details?: string,
  ): Promise<{ success: boolean; reportId: number }> {
    // Check if post exists
    const post = await this.contentRepository.getContentById(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user already reported this content
    const existingReport = await prisma.contentReport.findFirst({
      where: {
        contentId: postId,
        reporterId,
      },
    });

    if (existingReport) {
      throw new ValidationError('You have already reported this post');
    }

    // Create the report
    const report = await prisma.contentReport.create({
      data: {
        contentId: postId,
        reporterId,
        reason: reason as ReportReason,
        details: details?.trim() || null,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      reportId: report.id,
    };
  }

  /**
   * Convert PrismaContent to DbUserFeedContent format
   */
  private toFeedContent(content: any, _viewerId?: number): DbUserFeedContent {
    return {
      id: content.id,
      authorId: content.authorId,
      type: content.type,
      body: content.body,
      parentId: content.parentId,
      threadDepth: content.threadDepth,
      reactionsCount: content.reactionsCount,
      repliesCount: content.repliesCount,
      createdAt: content.createdAt,
      author: content.author || {
        id: content.authorId,
        name: 'Unknown',
        avatarUrl: null,
      },
      parent: content.parent || null,
    };
  }

  /**
   * Extract mentions from content (@username)
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Extract hashtags from content (#tag)
   */
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1].toLowerCase());
    }

    return [...new Set(hashtags)]; // Remove duplicates
  }

  /**
   * Process mentions (create records and notify users)
   */
  private async processMentions(contentId: number, mentions: string[]): Promise<void> {
    for (const username of mentions) {
      try {
        const user = await prisma.user.findFirst({
          where: { name: username },
        });

        if (user) {
          // Get content details
          const content = await prisma.content.findUnique({
            where: { id: contentId },
            select: { body: true, authorId: true },
          });

          if (content) {
            const startIndex = content.body.indexOf(`@${username}`);
            if (startIndex !== -1) {
              // Create mention record using ContentMention
              await prisma.contentMention.create({
                data: {
                  contentId,
                  userId: user.id,
                  startIndex,
                  endIndex: startIndex + username.length + 1,
                },
              });

              // Create mention notification
              await this.createMentionNotification(contentId, user.id, username);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process mention @${username}:`, error);
      }
    }
  }

  /**
   * Create mention notification and activity
   */
  private async createMentionNotification(
    contentId: number,
    mentionedUserId: number,
    username: string,
  ): Promise<void> {
    try {
      // Get content and author details
      const content = await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      if (!content || !content.author) return;

      // Create unified activity for the mention
      const contentPreview =
        content.body.length > 50 ? content.body.substring(0, 47) + '...' : content.body;

      await this.unifiedActivityService.publishActivity({
        type: 'user_mentioned',
        userId: content.author.id,
        userName: content.author.name,
        userAvatar: content.author.avatarUrl || undefined,
        title: `${content.author.name} mentioned @${username}`,
        description: `"${contentPreview}"`,
        icon: '@',
        color: 'text-blue-400',
        priority: 'medium',
        isPersonal: false,
        isHighValue: false,
        meta: {
          contentId,
          mentionedUserId,
          mentionedUsername: username,
        },
      });
    } catch (error) {
      console.error(`Failed to create mention notification:`, error);
    }
  }

  /**
   * Process hashtags (create/update records)
   */
  private async processHashtags(contentId: number, hashtags: string[]): Promise<void> {
    for (const tag of hashtags) {
      try {
        // Find or create hashtag
        const hashtag = await prisma.hashtag.upsert({
          where: { tag },
          create: { tag, usageCount: 1 },
          update: { usageCount: { increment: 1 } },
        });

        // Link hashtag to content using ContentHashtag
        await prisma.contentHashtag.create({
          data: {
            contentId,
            hashtagId: hashtag.id,
          },
        });
      } catch (error) {
        console.error(`Failed to process hashtag #${tag}:`, error);
      }
    }
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit: number = 10): Promise<
    Array<{
      id: number;
      tag: string;
      usageCount: number;
      trendingScore?: number;
    }>
  > {
    // Get hashtags with most usage in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await prisma.hashtag.findMany({
      where: {
        contents: {
          some: {
            content: {
              createdAt: { gte: sevenDaysAgo },
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            contents: {
              where: {
                content: {
                  createdAt: { gte: sevenDaysAgo },
                },
              },
            },
          },
        },
      },
      orderBy: {
        usageCount: 'desc',
      },
      take: limit,
    });

    return trending.map((hashtag) => ({
      id: hashtag.id,
      tag: hashtag.tag,
      usageCount: hashtag.usageCount,
      trendingScore: hashtag._count.contents, // Recent usage count
    }));
  }

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(
    tag: string,
    options: {
      cursor?: number;
      limit?: number;
      viewerId?: number;
    } = {},
  ): Promise<{ posts: DbUserFeedContent[]; nextCursor?: number }> {
    const limit = options.limit ?? 20;

    // First find the hashtag
    const hashtag = await prisma.hashtag.findUnique({
      where: { tag },
    });

    if (!hashtag) {
      return { posts: [] };
    }

    // Get content with this hashtag
    const contentHashtags = await prisma.contentHashtag.findMany({
      where: {
        hashtagId: hashtag.id,
        content: {
          type: 'POST',
          visibility: 'PUBLIC', // Only show public posts in hashtag feeds
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
              },
            },
          },
        },
      },
      orderBy: {
        content: {
          createdAt: 'desc',
        },
      },
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
    });

    const hasMore = contentHashtags.length > limit;
    const resultPosts = hasMore ? contentHashtags.slice(0, -1) : contentHashtags;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1]?.id : undefined;

    const posts = resultPosts.map((ch) => this.toFeedContent(ch.content, options.viewerId));

    return { posts, nextCursor };
  }
}
