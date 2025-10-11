import { ContentRepository } from '../repositories/ContentRepository';
import { UserRepository } from '../repositories/UserRepository';
import { UserService } from './user.service';
import type { IContentRepository } from '../repositories/interfaces/IContentRepository';
import type {
  DbUserFeedContent,
  PrismaContentType,
  PostVisibility,
  ReportReason,
  ReactionType,
} from '@ems/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';
import { unifiedActivityService } from './unifiedActivity.service';
import { sanitizePostContent, sanitizeWithMonitoring } from '../utils/sanitize';

const userService = new UserService();

export class PostService {
  private contentRepository: IContentRepository;
  private userRepository: UserRepository;
  private unifiedActivityService = unifiedActivityService;

  constructor() {
    this.contentRepository = new ContentRepository();
    this.userRepository = new UserRepository();
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
    // Sanitize content first (XSS protection)
    const sanitizedContent = sanitizeWithMonitoring(data.content, authorId, 'post:create');

    // Validate content
    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      throw new ValidationError('Post content cannot be empty');
    }

    if (sanitizedContent.length > 500) {
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

    // Extract mentions and hashtags from sanitized content
    const mentions = this.extractMentions(sanitizedContent);
    const hashtags = this.extractHashtags(sanitizedContent);

    // Create the post using Content model with sanitized content
    const content = await this.contentRepository.createContent({
      authorId,
      type: 'POST' as PrismaContentType,
      body: sanitizedContent, // Use sanitized content
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

    // Get full content with author and reactions to return DbUserFeedContent
    const fullContent = await this.contentRepository.getContentWithDetails(content.id);
    if (!fullContent) {
      throw new Error('Failed to retrieve created post');
    }

    // Enrich author avatar URL
    let enrichedAuthor = fullContent.author;
    if (fullContent.author) {
      const enrichedAuthors = await userService.enrichUsersWithAvatars([fullContent.author]);
      if (enrichedAuthors.length > 0) {
        enrichedAuthor = enrichedAuthors[0];
      }
    }

    return this.toFeedContent({
      ...fullContent,
      author: enrichedAuthor,
    });
  }

  /**
   * Update a post (edit)
   */
  async updatePost(postId: number, authorId: number, content: string): Promise<DbUserFeedContent> {
    // Sanitize content first (XSS protection)
    const sanitizedContent = sanitizeWithMonitoring(content, authorId, 'post:update');

    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      throw new ValidationError('Post content cannot be empty');
    }

    if (sanitizedContent.length > 500) {
      throw new ValidationError('Post content cannot exceed 500 characters');
    }

    const existingPost = await this.contentRepository.getContentById(postId);
    if (!existingPost) {
      throw new NotFoundError('Post not found');
    }

    if (existingPost.authorId !== authorId) {
      throw new ForbiddenError('Cannot edit this post');
    }

    const updatedPost = await this.contentRepository.updateContent(
      postId,
      authorId,
      sanitizedContent, // Use sanitized content
    );
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
    const post = await this.contentRepository.getContentWithDetails(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    console.log(
      '[post.service] getPost - post.reactions:',
      post.reactions?.length || 0,
      'reactions',
    );

    // Calculate reaction counts and user's reaction
    const reactionCounts: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      ANGRY: 0,
      SAD: 0,
      WOW: 0,
    };

    let userReaction: ReactionType | null = null;

    if (post.reactions) {
      post.reactions.forEach((reaction: any) => {
        const type = reaction.type as ReactionType;
        reactionCounts[type] = (reactionCounts[type] || 0) + 1;

        if (viewerId && reaction.userId === viewerId) {
          userReaction = type;
        }
      });
    }

    console.log(
      '[post.service] getPost - calculated reactionCounts:',
      reactionCounts,
      'userReaction:',
      userReaction,
    );

    // Enrich author avatar URL
    let enrichedAuthor = post.author;
    if (post.author) {
      const enrichedAuthors = await userService.enrichUsersWithAvatars([post.author]);
      if (enrichedAuthors.length > 0) {
        enrichedAuthor = enrichedAuthors[0];
      }
    }

    const result = this.toFeedContent(
      {
        ...post,
        author: enrichedAuthor,
        reactionCounts,
        userReaction,
      },
      viewerId,
    );

    console.log(
      '[post.service] getPost - returning result with reactionCounts:',
      result.reactionCounts,
    );

    return result;
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
    const result = await this.contentRepository.getUserPosts(userId, {
      limit: options.limit || 20,
      cursor: options.cursor,
      includeReplies: options.includeReplies ?? false,
      viewerId,
    });

    // Batch enrich user avatars - access author directly from repository result
    const authors = result.content.filter((c: any) => c.author).map((c: any) => c.author);
    const enrichedAuthors = await userService.enrichUsersWithAvatars(authors);
    const authorMap = new Map(enrichedAuthors.map((author) => [author.id, author]));

    // Map enriched authors back to posts and convert to feed content
    const posts = result.content.map((post: any) => {
      let finalAuthor;

      if (post.author) {
        const enrichedUser = authorMap.get(post.author.id);
        if (enrichedUser) {
          finalAuthor = enrichedUser;
        } else {
          finalAuthor = post.author;
        }
      } else {
        // Fallback if no author
        finalAuthor = { id: post.authorId, name: 'Unknown', avatarUrl: null };
      }

      // Convert to DbUserFeedContent format with enriched author
      return this.toFeedContent({ ...post, author: finalAuthor }, viewerId);
    });

    return {
      posts,
      nextCursor: result.nextCursor,
    };
  }

  /**
   * Get post comments/replies
   */
  async getPostComments(
    postId: number,
    viewerId?: number,
    options: {
      cursor?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: DbUserFeedContent[]; nextCursor?: number }> {
    const result = await this.contentRepository.getReplies(postId, {
      limit: options.limit || 20,
      cursor: options.cursor,
      viewerId,
    });

    // Batch enrich user avatars - access author directly from repository result
    const authors = result.replies.filter((c: any) => c.author).map((c: any) => c.author);
    const enrichedAuthors = await userService.enrichUsersWithAvatars(authors);
    const authorMap = new Map(enrichedAuthors.map((author) => [author.id, author]));

    // Map enriched authors back to comments and convert to feed content
    const comments = result.replies.map((reply: any) => {
      let finalAuthor;

      if (reply.author) {
        const enrichedUser = authorMap.get(reply.author.id);
        if (enrichedUser) {
          finalAuthor = enrichedUser;
        } else {
          finalAuthor = reply.author;
        }
      } else {
        // Fallback if no author
        finalAuthor = { id: reply.authorId, name: 'Unknown', avatarUrl: null };
      }

      // Convert to DbUserFeedContent format with enriched author
      return this.toFeedContent({ ...reply, author: finalAuthor }, viewerId);
    });

    return {
      comments,
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
    const hasReported = await this.contentRepository.hasUserReportedContent(postId, reporterId);
    if (hasReported) {
      throw new ValidationError('You have already reported this post');
    }

    // Create the report
    const report = await this.contentRepository.createContentReport({
      contentId: postId,
      reporterId,
      reason: reason as ReportReason,
      details,
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
      // Additional fields for UI compatibility
      authorName: content.author?.name,
      authorAvatar: content.author?.avatarUrl,
      commentsCount: content._count?.children || content.repliesCount || 0,
      visibility: content.visibility,
      mediaUrls: content.mediaUrls,
      linkPreview: content.linkPreview,
      viewsCount: content.viewsCount?.toString() || '0',
      sharesCount: content.sharesCount || 0,
      editedAt: content.editedAt,
      updatedAt: content.updatedAt,
      reactionCounts: content.reactionCounts || { LIKE: 0, LOVE: 0, LAUGH: 0, ANGRY: 0, SAD: 0 },
      userReaction: content.userReaction || null,
      children: content.children || [],
    } as any;
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
        const user = await this.userRepository.findByUsername(username);

        if (user) {
          // Get content details
          const content = await this.contentRepository.getContentById(contentId);

          if (content) {
            const startIndex = content.body.indexOf(`@${username}`);
            if (startIndex !== -1) {
              // Create mention record using ContentMention
              await this.contentRepository.addMentions(contentId, [
                {
                  userId: user.id,
                  startIndex,
                  endIndex: startIndex + username.length + 1,
                },
              ]);

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
      const content = await this.contentRepository.getContentWithDetails(contentId);

      if (!content) return;

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
    try {
      await this.contentRepository.addHashtags(contentId, hashtags);
    } catch (error) {
      console.error(`Failed to process hashtags:`, error);
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
    return this.contentRepository.getTrendingHashtags(limit);
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
    const result = await this.contentRepository.getContentByHashtag(tag, {
      cursor: options.cursor,
      limit: options.limit || 20,
    });

    return {
      posts: result.content.map((content) => this.toFeedContent(content, options.viewerId)),
      nextCursor: result.nextCursor,
    };
  }
}
