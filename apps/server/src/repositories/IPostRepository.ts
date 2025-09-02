import { UserPost, PostVisibility, PostContentType } from '@prisma/client';

export interface IPostRepository {
  createPost(data: {
    authorId: number;
    content: string;
    contentType?: PostContentType;
    visibility?: PostVisibility;
    mediaUrls?: string[];
    linkPreview?: any;
    parentId?: number | null;
  }): Promise<UserPost>;

  getPost(postId: number, viewerId?: number): Promise<UserPost | null>;

  updatePost(postId: number, authorId: number, content: string): Promise<UserPost | null>;

  deletePost(postId: number, deletedBy: number, isAdmin?: boolean): Promise<boolean>;

  getPublicTimeline(options: {
    cursor?: number;
    limit?: number;
    sortBy?: 'recent' | 'trending';
  }): Promise<{ posts: UserPost[]; nextCursor?: number }>;

  getUserPosts(
    userId: number,
    options: {
      cursor?: number;
      limit?: number;
      includeReplies?: boolean;
    },
    viewerId?: number,
  ): Promise<{ posts: UserPost[]; nextCursor?: number }>;

  getPostComments(
    postId: number,
    options: {
      cursor?: number;
      limit?: number;
    },
  ): Promise<{ comments: UserPost[]; nextCursor?: number }>;

  getTrendingPosts(limit?: number): Promise<UserPost[]>;
}
