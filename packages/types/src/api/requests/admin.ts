/**
 * Admin Request DTOs
 *
 * Request payloads for admin endpoints
 */

import type { ArticleStatus } from '../../database/timeline';
import type { BanType } from '../../domain/moderation';

// ============================================================================
// User Management
// ============================================================================

export interface UserSearchParams {
  search?: string;
  role?: ('ADMIN' | 'USER' | 'MODERATOR')[];
  active?: boolean;
  bannedOnly?: boolean;
  page: number;
  limit: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'muskBucks' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface BanUserRequest {
  userId: number;
  reason: string;
  durationDays?: number; // undefined = permanent
  moderatorId: number;
}

export interface CreateBanData {
  userId: number;
  banType: BanType;
  reason: string;
  expiresAt?: Date;
  isActive?: boolean;
}

// ============================================================================
// Prediction Management
// ============================================================================

export interface PredictionSearchParams {
  search?: string;
  category?: string[];
  status?: ('pending' | 'approved' | 'rejected' | 'resolved')[];
  creatorId?: number;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  bettingVolume?: {
    min?: number;
    max?: number;
  };
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'title' | 'category' | 'expiresAt' | 'bettingVolume';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Financial Management
// ============================================================================

export interface FinancialSearchParams {
  search?: string;
  userId?: number;
  predictionId?: number;
  betType?: ('single' | 'parlay')[];
  status?: ('pending' | 'won' | 'lost' | 'refunded')[];
  transactionType?: ('DEBIT' | 'CREDIT')[];
  transactionSubtype?: (
    | 'BET_WAGER'
    | 'BET_PAYOUT'
    | 'PARLAY_WAGER'
    | 'PARLAY_PAYOUT'
    | 'PONG_WAGER'
    | 'PONG_PAYOUT'
  )[];
  includePongTransactions?: boolean;
  includeMetadata?: boolean;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  suspiciousOnly?: boolean;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'amount' | 'potentialPayout' | 'userName' | 'profit';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Badge Management
// ============================================================================

export interface BadgeSearchParams {
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  rarity?: ('common' | 'rare' | 'epic' | 'legendary')[];
  userCount?: {
    min?: number;
    max?: number;
  };
  page: number;
  limit: number;
  sortBy?: 'name' | 'createdAt' | 'userCount' | 'category';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Timeline/Feed Management
// ============================================================================

export interface UpdateArticleRequest {
  status: ArticleStatus;
  tags?: string[];
  modNotes?: string;
}

export interface CreateFeedRequest {
  name: string;
  url: string;
  siteUrl?: string;
  allowImages?: boolean;
}

export interface UpdateFeedRequest {
  name?: string;
  url?: string;
  siteUrl?: string;
  status?: import('../../shared/enums').FeedStatus;
  allowImages?: boolean;
}

// ============================================================================
// OPML Management
// ============================================================================

export interface OPMLImportPayload {
  file: File | string;
  validateFeeds?: boolean;
  autoEnable?: boolean;
  overwriteExisting?: boolean;
  categoryMapping?: Record<string, string>;
}

export interface OPMLExportOptions {
  includeDisabled?: boolean;
  categories?: string[];
  format?: 'opml1' | 'opml2';
  includeStats?: boolean;
}

// ============================================================================
// Bulk Operations
// ============================================================================

export interface BulkOperationRequest {
  userIds?: number[];
  predictionIds?: number[];
  action: string;
  params?: Record<string, any>;
}

export interface CreateModerationLogData {
  moderatorId: number;
  targetUserId?: number;
  action: import('../../prisma').PrismaModerationAction;
  reason?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}
