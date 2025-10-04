/**
 * Socket.IO Callback Response Types
 *
 * Typed responses for socket event acknowledgment callbacks
 */

import type { PublicContent } from '../../database/content.js';
import type { PublicParlay } from '../../database/betting.js';
import type { BetWithUser } from '../../prisma.js';

// ============================================================================
// Base Response Types
// ============================================================================

export interface SuccessResponse {
  success: true;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type BaseResponse<T = void> = T extends void
  ? SuccessResponse | ErrorResponse
  : (SuccessResponse & { data: T }) | ErrorResponse;

// ============================================================================
// Post & Content Callbacks
// ============================================================================

export interface CreatePostResponse {
  success: boolean;
  post?: PublicContent;
  error?: string;
}

export interface EditPostResponse {
  success: boolean;
  post?: PublicContent;
  error?: string;
}

export interface DeletePostResponse {
  success: boolean;
  error?: string;
}

export interface ReactToPostResponse {
  success: boolean;
  error?: string;
}

export interface SharePostResponse {
  success: boolean;
  sharesCount?: number;
  error?: string;
}

export interface CreateCommentResponse {
  success: boolean;
  comment?: PublicContent;
  error?: string;
}

export interface DeleteCommentResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Room Management Callbacks
// ============================================================================

export interface JoinRoomResponse {
  success: boolean;
  room?: string;
  error?: string;
}

export interface LeaveRoomResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Betting Callbacks
// ============================================================================

export interface PlaceBetResponse {
  success: boolean;
  bet?: BetWithUser;
  error?: string;
  code?: string; // Error code for specific bet errors
}

export interface PlaceParlayResponse {
  success: boolean;
  parlay?: PublicParlay;
  error?: string;
  code?: string; // Error code for specific parlay errors
}

// ============================================================================
// Chat Callbacks
// ============================================================================

export interface SendMessageResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface DeleteMessageResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Moderation Callbacks
// ============================================================================

export interface BanUserResponse {
  success: boolean;
  error?: string;
}

export interface MuteUserResponse {
  success: boolean;
  error?: string;
}

export interface KickUserResponse {
  success: boolean;
  error?: string;
}

export interface DeleteContentResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Pong Game Callbacks
// ============================================================================

export interface CreatePongGameResponse {
  success: boolean;
  gameId?: string;
  error?: string;
}

export interface JoinPongGameResponse {
  success: boolean;
  error?: string;
}

export interface PongInputResponse {
  success: boolean;
  error?: string;
}

// ============================================================================
// Generic Callback Type
// ============================================================================

export type SocketCallback<T = SuccessResponse | ErrorResponse> = (response: T) => void;
