/**
 * User Request DTOs
 *
 * Request payloads for user endpoints
 */

import type { PostContentType, PostVisibility } from '../../shared/enums';

// ============================================================================
// Profile Updates
// ============================================================================

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  profileImageUrl?: string;
}

// Alias for backwards compatibility
export type UpdateProfilePayload = UpdateProfileRequest;

// ============================================================================
// User Posts (legacy - will migrate to Content)
// ============================================================================

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface CreateUserPostRequest {
  content: string;
  parentId?: number;
  contentType?: PostContentType;
  visibility?: PostVisibility;
  mediaUrls?: string[];
  linkPreview?: LinkPreview;
}

// Alias for backwards compatibility
export type CreateUserPostPayload = CreateUserPostRequest;
