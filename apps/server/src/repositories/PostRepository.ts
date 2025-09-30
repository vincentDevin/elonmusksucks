import { UserPost, PostVisibility, PostContentType, Prisma, PrismaClient } from '@prisma/client';
import { IPostRepository } from './interfaces/IPostRepository';

export class PostRepository implements IPostRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new post
   */
  async createPost(data: {
    authorId: number;
    content: string;
    contentType?: PostContentType;
    visibility?: PostVisibility;
    mediaUrls?: string[];
    linkPreview?: any;
    parentId?: number | null;
  }): Promise<UserPost> {
    // Calculate thread depth if this is a reply
    let threadDepth = 0;
    if (data.parentId) {
      const parent = await this.prisma.userPost.findUnique({
        where: { id: data.parentId },
        select: { threadDepth: true },
      });
      threadDepth = (parent?.threadDepth ?? 0) + 1;
    }

    const post = await this.prisma.userPost.create({
      data: {
        authorId: data.authorId,
        content: data.content,
        contentType: data.contentType ?? 'TEXT',
        visibility: data.visibility ?? 'PUBLIC',
        mediaUrls: data.mediaUrls ? data.mediaUrls : undefined,
        linkPreview: data.linkPreview,
        parentId: data.parentId,
        threadDepth,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        reactions: true,
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    // Update parent's comment count if this is a reply
    if (data.parentId) {
      await this.prisma.userPost.update({
        where: { id: data.parentId },
        data: { commentsCount: { increment: 1 } },
      });
    }

    return post;
  }

  /**
   * Get a single post with full details
   */
  async getPost(postId: number, viewerId?: number): Promise<UserPost | null> {
    const post = await this.prisma.userPost.findUnique({
      where: { id: postId },
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
                profilePictureKey: true,
              },
            },
          },
        },
        children: {
          where: { isDeleted: false },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                profilePictureKey: true,
              },
            },
            reactions: true,
            _count: {
              select: {
                children: true,
                reactions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Limit initial children load
        },
        _count: {
          select: {
            children: true,
            reactions: true,
            reports: true,
          },
        },
      },
    });

    // Check visibility permissions
    if (post && !this.canViewPost(post, viewerId)) {
      return null;
    }

    // Increment view count
    if (post && viewerId) {
      await this.prisma.userPost.update({
        where: { id: postId },
        data: { viewsCount: { increment: 1 } },
      });
    }

    return post;
  }

  /**
   * Update a post (only content and edited timestamp)
   */
  async updatePost(postId: number, authorId: number, content: string): Promise<UserPost | null> {
    // Verify ownership
    const post = await this.prisma.userPost.findUnique({
      where: { id: postId },
      select: { authorId: true, createdAt: true },
    });

    if (!post || post.authorId !== authorId) {
      return null;
    }

    // Only allow edits within 5 minutes of creation
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (post.createdAt < fiveMinutesAgo) {
      throw new Error('Posts can only be edited within 5 minutes of creation');
    }

    return await this.prisma.userPost.update({
      where: { id: postId },
      data: {
        content,
        editedAt: new Date(),
      },
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
  }

  /**
   * Soft delete a post
   */
  async deletePost(postId: number, deletedBy: number, isAdmin: boolean = false): Promise<boolean> {
    const post = await this.prisma.userPost.findUnique({
      where: { id: postId },
      select: { authorId: true, parentId: true },
    });

    if (!post) return false;

    // Check permissions
    if (!isAdmin && post.authorId !== deletedBy) {
      return false;
    }

    await this.prisma.userPost.update({
      where: { id: postId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        content: '[deleted]', // Replace content for privacy
      },
    });

    // Update parent's comment count if this was a reply
    if (post.parentId) {
      await this.prisma.userPost.update({
        where: { id: post.parentId },
        data: { commentsCount: { decrement: 1 } },
      });
    }

    return true;
  }

  /**
   * Get public timeline with pagination
   */
  async getPublicTimeline(options: {
    cursor?: number;
    limit?: number;
    sortBy?: 'recent' | 'trending';
  }): Promise<{ posts: UserPost[]; nextCursor?: number }> {
    const limit = options.limit ?? 20;

    const whereClause: Prisma.UserPostWhereInput = {
      visibility: 'PUBLIC',
      isDeleted: false,
      parentId: null, // Only top-level posts in timeline
    };

    const orderBy: Prisma.UserPostOrderByWithRelationInput =
      options.sortBy === 'trending' ? { likesCount: 'desc' } : { createdAt: 'desc' };

    const posts = await this.prisma.userPost.findMany({
      where: whereClause,
      orderBy,
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
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
          take: 3,
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
    });

    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1]?.id : undefined;

    return { posts: resultPosts, nextCursor };
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
  ): Promise<{ posts: UserPost[]; nextCursor?: number }> {
    const limit = options.limit ?? 20;
    const isOwnProfile = userId === viewerId;

    const whereClause: Prisma.UserPostWhereInput = {
      authorId: userId,
      isDeleted: false,
      ...(options.includeReplies ? {} : { parentId: null }),
      ...(isOwnProfile ? {} : { visibility: { in: ['PUBLIC', 'FOLLOWERS'] } }),
    };

    const posts = await this.prisma.userPost.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                name: true,
              },
            },
          },
        },
        reactions: {
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
        },
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1]?.id : undefined;

    return { posts: resultPosts, nextCursor };
  }

  /**
   * Get post comments/replies
   */
  async getPostComments(
    postId: number,
    options: {
      cursor?: number;
      limit?: number;
    } = {},
  ): Promise<{ comments: UserPost[]; nextCursor?: number }> {
    const limit = options.limit ?? 50; // Increase limit since we're getting entire thread

    // Use raw SQL to get all comments in the thread using recursive CTE
    const comments = await this.prisma.$queryRaw<
      (UserPost & {
        author: {
          id: number;
          name: string;
          avatarUrl: string | null;
          profilePictureKey: string | null;
        };
        reactions: any[];
        _count: { children: number; reactions: number };
      })[]
    >`
      WITH RECURSIVE comment_tree AS (
        -- Base case: Direct comments on the post
        SELECT
          up.*,
          0 as depth_level
        FROM "UserPost" up
        WHERE up."parentId" = ${postId}
          AND up."isDeleted" = false

        UNION ALL

        -- Recursive case: Replies to comments
        SELECT
          up.*,
          ct.depth_level + 1
        FROM "UserPost" up
        INNER JOIN comment_tree ct ON up."parentId" = ct.id
        WHERE up."isDeleted" = false
          AND ct.depth_level < 10  -- Prevent infinite recursion
      )
      SELECT
        ct.*
      FROM comment_tree ct
      ORDER BY ct."createdAt" DESC
      LIMIT ${limit + 1}
    `;

    // Now fetch the related data for each comment
    const commentIds = comments.map((c) => c.id);

    const commentsWithIncludes = await this.prisma.userPost.findMany({
      where: {
        id: { in: commentIds },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
        reactions: true,
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = commentsWithIncludes.length > limit;
    const resultComments = hasMore ? commentsWithIncludes.slice(0, -1) : commentsWithIncludes;
    const nextCursor = hasMore ? resultComments[resultComments.length - 1]?.id : undefined;

    return { comments: resultComments, nextCursor };
  }

  /**
   * Check if a user can view a post based on visibility settings
   */
  private canViewPost(post: UserPost, viewerId?: number): boolean {
    if (post.isDeleted) return false;
    if (post.visibility === 'PUBLIC') return true;
    if (!viewerId) return false;
    if (post.authorId === viewerId) return true;

    // TODO: Check follower status for FOLLOWERS visibility
    // TODO: Check mention status for MENTIONED_ONLY visibility

    return false;
  }

  /**
   * Get trending posts (last 24 hours)
   */
  async getTrendingPosts(limit: number = 10): Promise<UserPost[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return await this.prisma.userPost.findMany({
      where: {
        visibility: 'PUBLIC',
        isDeleted: false,
        parentId: null,
        createdAt: { gte: yesterday },
      },
      orderBy: [{ likesCount: 'desc' }, { commentsCount: 'desc' }, { viewsCount: 'desc' }],
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
        _count: {
          select: {
            children: true,
            reactions: true,
          },
        },
      },
    });
  }
}
