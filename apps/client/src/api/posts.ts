import api from './axios';
import type { UserFeedPost, PostContentType, PostVisibility } from '@ems/types';

export interface CreatePostPayload {
  content: string;
  contentType?: PostContentType;
  visibility?: PostVisibility;
  mediaUrls?: string[];
  linkPreview?: any;
  parentId?: number | null;
}

export interface GetPostsOptions {
  cursor?: number;
  limit?: number;
  sortBy?: 'recent' | 'trending';
  includeReplies?: boolean;
}

/**
 * Create a new post
 */
export async function createPost(data: CreatePostPayload): Promise<UserFeedPost> {
  const response = await api.post<UserFeedPost>('/api/posts', data);
  return response.data;
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: number): Promise<UserFeedPost> {
  const response = await api.get<UserFeedPost>(`/api/posts/${postId}`);
  return response.data;
}

/**
 * Update a post
 */
export async function updatePost(postId: number, content: string): Promise<UserFeedPost> {
  const response = await api.patch<UserFeedPost>(`/api/posts/${postId}`, { content });
  return response.data;
}

/**
 * Delete a post
 */
export async function deletePost(postId: number): Promise<void> {
  await api.delete(`/api/posts/${postId}`);
}

/**
 * Get public timeline
 */
export async function getTimeline(options: GetPostsOptions = {}): Promise<{
  posts: UserFeedPost[];
  nextCursor?: number;
}> {
  const params = new URLSearchParams();
  if (options.cursor) params.append('cursor', options.cursor.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.sortBy) params.append('sortBy', options.sortBy);

  const response = await api.get<{ posts: UserFeedPost[]; nextCursor?: number }>(
    `/api/posts?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get trending posts
 */
export async function getTrendingPosts(limit: number = 10): Promise<UserFeedPost[]> {
  const response = await api.get<UserFeedPost[]>(`/api/posts/trending?limit=${limit}`);
  return response.data;
}

/**
 * Get user's posts
 */
export async function getUserPosts(
  userId: number,
  options: GetPostsOptions = {},
): Promise<{ posts: UserFeedPost[]; nextCursor?: number }> {
  const params = new URLSearchParams();
  if (options.cursor) params.append('cursor', options.cursor.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.includeReplies) params.append('includeReplies', 'true');

  const response = await api.get<{ posts: UserFeedPost[]; nextCursor?: number }>(
    `/api/users/${userId}/posts?${params.toString()}`,
  );
  return response.data;
}

/**
 * Get post comments
 */
export async function getPostComments(
  postId: number,
  options: { cursor?: number; limit?: number } = {},
): Promise<{ comments: UserFeedPost[]; nextCursor?: number }> {
  const params = new URLSearchParams();
  if (options.cursor) params.append('cursor', options.cursor.toString());
  if (options.limit) params.append('limit', options.limit.toString());

  const response = await api.get<{ comments: UserFeedPost[]; nextCursor?: number }>(
    `/api/posts/${postId}/comments?${params.toString()}`,
  );
  return response.data;
}

/**
 * Create a comment on a post
 */
export async function createComment(postId: number, content: string): Promise<UserFeedPost> {
  const response = await api.post<UserFeedPost>(`/api/posts/${postId}/comments`, { content });
  return response.data;
}

/**
 * Share a post
 */
export async function sharePost(
  postId: number,
): Promise<{ success: boolean; sharesCount: number }> {
  const response = await api.post<{ success: boolean; sharesCount: number }>(
    `/api/posts/${postId}/share`,
  );
  return response.data;
}

/**
 * Toggle reaction on a post or comment
 */
export async function togglePostReaction(
  postId: number,
  type: string,
): Promise<{
  action: 'added' | 'removed';
  type: string;
  counts: Record<string, number>;
}> {
  const response = await api.post<{
    action: 'added' | 'removed';
    type: string;
    counts: Record<string, number>;
  }>(`/api/posts/${postId}/reactions`, { type });
  return response.data;
}

/**
 * Get reactions for a post or comment
 */
export async function getPostReactions(postId: number): Promise<{
  reactions: Record<string, Array<{ id: number; user: any; createdAt: string }>>;
  total: number;
}> {
  const response = await api.get<{
    reactions: Record<string, Array<{ id: number; user: any; createdAt: string }>>;
    total: number;
  }>(`/api/posts/${postId}/reactions`);
  return response.data;
}

/**
 * Create a reply to a comment (same as createComment but with different parentId)
 */
export async function createReply(parentCommentId: number, content: string): Promise<UserFeedPost> {
  const response = await api.post<UserFeedPost>(`/api/posts/${parentCommentId}/comments`, {
    content,
  });
  return response.data;
}
