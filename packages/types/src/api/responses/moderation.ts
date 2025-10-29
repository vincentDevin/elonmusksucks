/**
 * Moderation Response DTOs
 *
 * Response types for moderation endpoints
 */

// ============================================================================
// User Ban
// ============================================================================

export interface UserBanResponse {
  id: number;
  userId: number;
  reason: string;
  banType: 'TEMPORARY' | 'PERMANENT' | 'CHAT_ONLY';
  expiresAt: string | null;
  createdAt: string;
  createdBy: number;
  isActive: boolean;
  user?: {
    id: number;
    name: string;
    email?: string;
  };
}

// ============================================================================
// Moderation Log Entry
// ============================================================================

export interface ModerationLogEntryResponse {
  id: number;
  action: string;
  targetUserId: number | null;
  targetContentId: number | null;
  moderatorId: number;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  moderator?: {
    id: number;
    name: string;
  };
  targetUser?: {
    id: number;
    name: string;
  };
}
