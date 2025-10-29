/**
 * Moderation Request DTOs
 *
 * Request payloads for moderation endpoints
 */

// Note: BanUserRequest is defined in admin.ts to avoid duplication

// ============================================================================
// Mute User
// ============================================================================

export interface MuteUserRequest {
  userId: number;
  duration: number; // Duration in minutes
  reason?: string;
}

// ============================================================================
// Kick User
// ============================================================================

export interface KickUserRequest {
  userId: number;
  reason?: string;
}

// ============================================================================
// Delete Content
// ============================================================================

export interface DeleteContentRequest {
  contentId: number;
  reason?: string;
}
