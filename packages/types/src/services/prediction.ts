/**
 * Services Layer - Prediction Service Types
 *
 * Types for prediction service operations, validation, and business logic
 */

import type { PredictionType, PredictionStatus } from '../shared/enums';
import type { PublicPrediction, PublicPredictionOption } from '../database/prediction';

// ============================================================================
// Prediction Service Input Types
// ============================================================================

/**
 * Create Prediction Service Input
 */
export interface CreatePredictionInput {
  userId: number;
  title: string;
  description: string;
  categoryId: number;
  expiresAt: Date;
  type: PredictionType;
  threshold?: number;
  options?: Array<{ label: string }>;
  sourceLinks?: Array<{ url: string; title?: string }>;
}

/**
 * Update Prediction Service Input
 */
export interface UpdatePredictionInput {
  predictionId: number;
  userId: number; // For authorization
  title?: string;
  description?: string;
  categoryId?: number;
  expiresAt?: Date;
  sourceLinks?: Array<{ url: string; title?: string }>;
}

/**
 * Resolve Prediction Service Input
 */
export interface ResolvePredictionInput {
  predictionId: number;
  adminId: number;
  winningOptionId?: number;
  cancelReason?: string;
  isCancelled?: boolean;
}

/**
 * Approve Prediction Service Input
 */
export interface ApprovePredictionInput {
  predictionId: number;
  adminId: number;
  approved: boolean;
  rejectionReason?: string;
}

// ============================================================================
// Prediction Service Output Types
// ============================================================================

/**
 * Prediction Service Result
 */
export interface PredictionServiceResult {
  prediction: PublicPrediction;
  options: PublicPredictionOption[];
}

/**
 * Prediction Validation Result
 */
export interface PredictionValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Prediction Resolution Result
 */
export interface PredictionResolutionResult {
  predictionId: number;
  winningOptionId: number | null;
  totalBets: number;
  totalPayout: string; // BigInt as string
  affectedUsers: number;
  status: PredictionStatus;
  resolvedAt: Date;
}

// ============================================================================
// Prediction Analytics Types
// ============================================================================

/**
 * Prediction Statistics
 */
export interface PredictionStats {
  totalBets: number;
  totalVolume: string; // BigInt as string
  uniqueBettors: number;
  optionDistribution: Array<{
    optionId: number;
    optionLabel: string;
    betCount: number;
    volume: string; // BigInt as string
    percentage: number;
  }>;
  impliedProbabilities: Array<{
    optionId: number;
    probability: number;
  }>;
  momentum?: {
    last24h: number;
    last7d: number;
    trending: boolean;
  };
}

/**
 * Prediction Metadata
 */
export interface PredictionMetadata {
  isExpired: boolean;
  isResolved: boolean;
  isPending: boolean;
  canBet: boolean;
  canResolve: boolean;
  timeRemaining?: number; // milliseconds
  daysUntilExpiry?: number;
}

// ============================================================================
// Prediction Query Types
// ============================================================================

/**
 * Prediction Filters
 */
export interface PredictionFilters {
  categoryId?: number;
  status?: PredictionStatus;
  type?: PredictionType;
  userId?: number; // Created by user
  hasBetByUserId?: number; // User has bet on this prediction
  search?: string;
  minVolume?: number;
  maxVolume?: number;
  expiresAfter?: Date;
  expiresBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
}

/**
 * Prediction Sort Options
 */
export const PredictionSortBy = {
  CREATED_AT_DESC: 'createdAt:desc',
  CREATED_AT_ASC: 'createdAt:asc',
  EXPIRES_AT_DESC: 'expiresAt:desc',
  EXPIRES_AT_ASC: 'expiresAt:asc',
  VOLUME_DESC: 'volume:desc',
  VOLUME_ASC: 'volume:asc',
  BET_COUNT_DESC: 'betCount:desc',
  BET_COUNT_ASC: 'betCount:asc',
  TRENDING: 'trending',
  POPULAR: 'popular',
} as const;

export type PredictionSortBy = (typeof PredictionSortBy)[keyof typeof PredictionSortBy];

/**
 * Prediction Query Options
 */
export interface PredictionQueryOptions {
  filters?: PredictionFilters;
  sortBy?: PredictionSortBy;
  page?: number;
  limit?: number;
  includeOptions?: boolean;
  includeBets?: boolean;
  includeStats?: boolean;
  includeSourceLinks?: boolean;
  includeCategory?: boolean;
}

// ============================================================================
// Prediction Business Logic Types
// ============================================================================

/**
 * Odds Calculation Input
 */
export interface OddsCalculationInput {
  predictionId: number;
  options: Array<{
    optionId: number;
    totalVolume: string; // BigInt as string
  }>;
  totalPredictionVolume: string; // BigInt as string
}

/**
 * Odds Calculation Result
 */
export interface OddsCalculationResult {
  options: Array<{
    optionId: number;
    odds: number; // Decimal odds (e.g., 2.5)
    impliedProbability: number; // Percentage (e.g., 40.0)
    potentialPayout: string; // BigInt as string
  }>;
  overround: number; // Sum of implied probabilities (should be > 100 for vig)
  vig: number; // House edge percentage
}

/**
 * Prediction Lifecycle Events
 */
export const PredictionLifecycleEvent = {
  CREATED: 'prediction:created',
  APPROVED: 'prediction:approved',
  REJECTED: 'prediction:rejected',
  UPDATED: 'prediction:updated',
  EXPIRED: 'prediction:expired',
  RESOLVED: 'prediction:resolved',
  CANCELLED: 'prediction:cancelled',
} as const;

export type PredictionLifecycleEvent =
  (typeof PredictionLifecycleEvent)[keyof typeof PredictionLifecycleEvent];
