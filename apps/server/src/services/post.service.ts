import { Server as SocketIOServer } from 'socket.io';
import { PostRepository } from '../repositories/PostRepository';
import prisma from '../db';
import type { UserFeedPost, PostContentType, PostVisibility, ReactionType } from '@ems/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';
import { unifiedActivityService } from './unifiedActivity.service';

export class PostService {
  private postRepository: PostRepository;
  private io?: SocketIOServer;
  private unifiedActivityService = unifiedActivityService;

  constructor(io?: SocketIOServer) {
    this.postRepository = new PostRepository(prisma);
    this.io = io;
  }

  /**
   * Create a new post with validation and notifications
   */
  async createPost(
    authorId: number,
    data: {
      content: string;
      contentType?: PostContentType;
      visibility?: PostVisibility;
      mediaUrls?: string[];
      linkPreview?: any;
      parentId?: number | null;
    },
  ): Promise<UserFeedPost> {
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
      const parent = await this.postRepository.getPost(data.parentId);
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

    // Create the post
    const post = await this.postRepository.createPost({
      authorId,
      content: data.content,
      contentType: data.contentType,
      visibility: data.visibility,
      mediaUrls: data.mediaUrls,
      linkPreview: data.linkPreview,
      parentId: data.parentId,
    });

    // Process mentions and hashtags in background
    if (mentions.length > 0) {
      this.processMentions(post.id, mentions).catch(console.error);
    }
    if (hashtags.length > 0) {
      this.processHashtags(post.id, hashtags).catch(console.error);
    }

    // Convert to API format
    const feedPost = this.toFeedPost(post);

    // Emit socket event for real-time updates
    if (this.io) {
      if (data.parentId) {
        // Emit comment created event
        this.io.emit('comment:created', {
          postId: data.parentId,
          comment: feedPost,
        });
      } else if (data.visibility === 'PUBLIC') {
        // Emit new post event for public timeline
        this.io.emit('post:created', feedPost);
      }
    }

    return feedPost;
  }

  /**
   * Update a post (edit)
   */
  async updatePost(postId: number, authorId: number, content: string): Promise<UserFeedPost> {
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Post content cannot be empty');
    }

    if (content.length > 500) {
      throw new ValidationError('Post content cannot exceed 500 characters');
    }

    const updatedPost = await this.postRepository.updatePost(postId, authorId, content);

    if (!updatedPost) {
      throw new ForbiddenError('Cannot edit this post');
    }

    const feedPost = this.toFeedPost(updatedPost);

    // Emit update event
    if (this.io) {
      this.io.emit('post:updated', {
        postId,
        content,
        editedAt: feedPost.editedAt,
      });
    }

    return feedPost;
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: number, userId: number, isAdmin: boolean = false): Promise<void> {
    const success = await this.postRepository.deletePost(postId, userId, isAdmin);

    if (!success) {
      throw new ForbiddenError('Cannot delete this post');
    }

    // Emit delete event
    if (this.io) {
      this.io.emit('post:deleted', { postId, deletedBy: userId });
    }
  }

  /**
   * Get a single post with full details
   */
  async getPost(postId: number, viewerId?: number): Promise<UserFeedPost> {
    const post = await this.postRepository.getPost(postId, viewerId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return this.toFeedPost(post, viewerId);
  }

  /**
   * Get public timeline
   */
  async getPublicTimeline(
    viewerId?: number,
    options: {
      cursor?: number;
      limit?: number;
      sortBy?: 'recent' | 'trending';
    } = {},
  ): Promise<{ posts: UserFeedPost[]; nextCursor?: number }> {
    const { posts, nextCursor } = await this.postRepository.getPublicTimeline(options);

    return {
      posts: posts.map((post) => this.toFeedPost(post, viewerId)),
      nextCursor,
    };
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
  ): Promise<{ posts: UserFeedPost[]; nextCursor?: number }> {
    const { posts, nextCursor } = await this.postRepository.getUserPosts(userId, options, viewerId);

    return {
      posts: posts.map((post) => this.toFeedPost(post, viewerId)),
      nextCursor,
    };
  }

  /**
   * Get post comments
   */
  async getPostComments(
    postId: number,
    viewerId?: number,
    options: {
      cursor?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: UserFeedPost[]; nextCursor?: number }> {
    const { comments, nextCursor } = await this.postRepository.getPostComments(postId, options);

    return {
      comments: comments.map((comment) => this.toFeedPost(comment, viewerId)),
      nextCursor,
    };
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(viewerId?: number, limit: number = 10): Promise<UserFeedPost[]> {
    const posts = await this.postRepository.getTrendingPosts(limit);
    return posts.map((post) => this.toFeedPost(post, viewerId));
  }

  /**
   * Share a post (increment share count)
   */
  async sharePost(
    postId: number,
    userId: number,
  ): Promise<{ success: boolean; sharesCount: number }> {
    // Check if post exists and is not deleted
    const post = await this.postRepository.getPost(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.isDeleted) {
      throw new ForbiddenError('Cannot share a deleted post');
    }

    // Check if post is private and user has access
    if (post.visibility === 'PRIVATE' && post.authorId !== userId) {
      throw new ForbiddenError('Cannot share a private post');
    }

    // Increment shares count
    const updatedPost = await prisma.userPost.update({
      where: { id: postId },
      data: {
        sharesCount: { increment: 1 },
      },
      select: { sharesCount: true },
    });

    // TODO: Create share activity record
    // TODO: Send notification to post author
    // TODO: Add to user's activity log

    // Emit real-time update
    if (this.io) {
      this.io.emit('post:shared', {
        postId,
        sharesCount: updatedPost.sharesCount,
        sharedBy: userId,
      });
    }

    return {
      success: true,
      sharesCount: updatedPost.sharesCount,
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
    // Check if post exists and is not deleted
    const post = await this.postRepository.getPost(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.isDeleted) {
      throw new ForbiddenError('Cannot report a deleted post');
    }

    // Check if user already reported this post
    const existingReport = await prisma.postReport.findFirst({
      where: {
        postId,
        reporterId,
      },
    });

    if (existingReport) {
      throw new ValidationError('You have already reported this post');
    }

    // Create the report
    const report = await prisma.postReport.create({
      data: {
        postId,
        reporterId,
        reason: reason as any, // Cast to ReportReason enum
        details: details?.trim() || null,
        status: 'PENDING',
      },
    });

    // Increment report count on the post
    await prisma.userPost.update({
      where: { id: postId },
      data: {
        reportCount: { increment: 1 },
      },
    });

    // TODO: Check if post should be auto-flagged based on report count
    // TODO: Send notification to moderators
    // TODO: Add to moderation queue

    // Emit real-time update for admins
    if (this.io) {
      this.io.to('admin').emit('post:reported', {
        postId,
        reportId: report.id,
        reason,
        reportCount: post.reportCount + 1,
      });
    }

    return {
      success: true,
      reportId: report.id,
    };
  }

  /**
   * Convert database post to API format
   */
  private toFeedPost(post: any, viewerId?: number): UserFeedPost {
    return {
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      contentType: post.contentType,
      visibility: post.visibility,
      mediaUrls: post.mediaUrls || undefined,
      linkPreview: post.linkPreview || undefined,
      parentId: post.parentId,
      threadDepth: post.threadDepth,
      likesCount: post.likesCount,
      commentsCount: post._count?.children ?? post.commentsCount,
      sharesCount: post.sharesCount,
      viewsCount: post.viewsCount.toString(),
      isDeleted: post.isDeleted,
      isFlagged: post.isFlagged,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      editedAt: post.editedAt?.toISOString(),
      authorName: post.author?.name,
      authorAvatar: post.author?.avatarUrl,
      reactionCounts: this.calculateReactionCounts(post.reactions || []),
      userReaction: post.reactions?.find((r: any) => r.userId === viewerId)?.type,
      canEdit: viewerId === post.authorId && !post.isDeleted,
      canDelete: viewerId === post.authorId || false, // TODO: check admin status
      children: post.children?.map((child: any) => this.toFeedPost(child, viewerId)),
    };
  }

  /**
   * Calculate reaction counts from reaction array
   */
  private calculateReactionCounts(reactions: any[]): Record<ReactionType, number> {
    const counts: Record<ReactionType, number> = {
      LIKE: 0,
      LOVE: 0,
      LAUGH: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    };

    reactions.forEach((reaction: any) => {
      if (reaction.type && reaction.type in counts) {
        counts[reaction.type as ReactionType]++;
      }
    });

    return counts;
  }

  /**
   * Extract mentions from content
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
   * Extract hashtags from content
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
  private async processMentions(postId: number, mentions: string[]): Promise<void> {
    for (const username of mentions) {
      try {
        const user = await prisma.user.findFirst({
          where: { name: username },
        });

        if (user) {
          // Create mention record
          const content = await prisma.userPost.findUnique({
            where: { id: postId },
            select: { content: true },
          });

          if (content) {
            const startIndex = content.content.indexOf(`@${username}`);
            if (startIndex !== -1) {
              await prisma.postMention.create({
                data: {
                  postId,
                  userId: user.id,
                  startIndex,
                  endIndex: startIndex + username.length + 1,
                },
              });

              // Create mention activity and notification
              await this.createMentionNotification(postId, user.id, username);
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
    postId: number,
    mentionedUserId: number,
    username: string,
  ): Promise<void> {
    try {
      // Get post and author details
      const post = await prisma.userPost.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      if (!post || !post.author) return;

      // Create unified activity for the mention
      const contentPreview =
        post.content.length > 50 ? post.content.substring(0, 47) + '...' : post.content;

      await this.unifiedActivityService.publishActivity({
        type: 'user_mentioned',
        userId: post.author.id,
        userName: post.author.name,
        userAvatar: post.author.avatarUrl || undefined,
        title: `${post.author.name} mentioned @${username}`,
        description: `"${contentPreview}"`,
        icon: '@',
        color: 'text-blue-400',
        priority: 'medium',
        isPersonal: false,
        isHighValue: false,
        meta: {
          postId,
          mentionedUserId,
          mentionedUsername: username,
        },
      });

      // Emit real-time notification to mentioned user
      if (this.io) {
        this.io.to(`user:${mentionedUserId}`).emit('mention:received', {
          postId,
          mentionId: `${postId}-${mentionedUserId}`,
          authorId: post.author.id,
          authorName: post.author.name,
          authorAvatar: post.author.avatarUrl,
          content: contentPreview,
          createdAt: post.createdAt.toISOString(),
        });
      }
    } catch (error) {
      console.error(`Failed to create mention notification:`, error);
    }
  }

  /**
   * Process hashtags (create/update records)
   */
  private async processHashtags(postId: number, hashtags: string[]): Promise<void> {
    for (const tag of hashtags) {
      try {
        // Find or create hashtag
        const hashtag = await prisma.hashtag.upsert({
          where: { tag },
          create: { tag, usageCount: 1 },
          update: { usageCount: { increment: 1 } },
        });

        // Link hashtag to post
        await prisma.postHashtag.create({
          data: {
            postId,
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
        posts: {
          some: {
            post: {
              createdAt: { gte: sevenDaysAgo },
              isDeleted: false,
            },
          },
        },
      },
      select: {
        id: true,
        tag: true,
        usageCount: true,
        _count: {
          select: {
            posts: {
              where: {
                post: {
                  createdAt: { gte: sevenDaysAgo },
                  isDeleted: false,
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
      trendingScore: hashtag._count.posts, // Recent usage count
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
  ): Promise<{ posts: UserFeedPost[]; nextCursor?: number }> {
    const limit = options.limit ?? 20;

    // First find the hashtag
    const hashtag = await prisma.hashtag.findUnique({
      where: { tag },
    });

    if (!hashtag) {
      return { posts: [] };
    }

    // Get posts with this hashtag
    const postHashtags = await prisma.postHashtag.findMany({
      where: {
        hashtagId: hashtag.id,
        post: {
          isDeleted: false,
          visibility: 'PUBLIC', // Only show public posts in hashtag feeds
        },
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                children: true,
                reactions: true,
              },
            },
          },
        },
      },
      orderBy: {
        post: {
          createdAt: 'desc',
        },
      },
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
    });

    const hasMore = postHashtags.length > limit;
    const resultPosts = hasMore ? postHashtags.slice(0, -1) : postHashtags;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1]?.id : undefined;

    const posts = resultPosts.map((ph) => this.toFeedPost(ph.post, options.viewerId));

    return { posts, nextCursor };
  }
}
