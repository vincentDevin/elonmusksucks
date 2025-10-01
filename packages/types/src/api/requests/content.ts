/**
 * Content Request DTOs
 *
 * Request payloads for unified content system
 */

import type { ContentType } from '../../database/content';

// ============================================================================
// Create Content (unified comments/posts)
// ============================================================================

export interface CreateContentRequest {
  body: string;
  type: ContentType;
  articleId?: number | null;
  predictionId?: number | null;
  parentId?: number | null;
}

// ============================================================================
// Update Content
// ============================================================================

export interface UpdateContentRequest {
  body: string;
}

// ============================================================================
// Create Reaction
// ============================================================================

export interface CreateReactionRequest {
  type: import('../../shared/enums').ReactionTypeName;
  contentId?: number;
  articleId?: number;
  predictionId?: number;
}
