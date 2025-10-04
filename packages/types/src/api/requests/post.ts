/**
 * Post Request DTOs
 *
 * Request payloads for post/content creation endpoints
 */

// ============================================================================
// Create Post
// ============================================================================

export interface CreatePostRequest {
  content: string;
  mediaUrls?: string[];
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
  parentId?: number; // For replies/comments
  visibility?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';
}

// ============================================================================
// Get Posts Options
// ============================================================================

export interface GetPostsOptionsRequest {
  userId?: number;
  limit?: number;
  offset?: number;
  includeReplies?: boolean;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';
}
