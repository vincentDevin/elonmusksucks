/**
 * Prediction Request DTOs
 *
 * Request payloads for prediction endpoints
 */

import type { PredictionType } from '../../shared/enums';

// ============================================================================
// Create Prediction
// ============================================================================

export interface CreatePredictionRequest {
  title: string;
  description: string;
  categoryId: number; // UPDATED: Use categoryId instead of category string
  expiresAt: string;
  options?: Array<{ label: string }>;
  type: PredictionType;
  threshold?: number;
}

// Alias for backwards compatibility
export type CreatePredictionPayload = CreatePredictionRequest;

// ============================================================================
// Resolve Prediction
// ============================================================================

export interface ResolvePredictionRequest {
  winningOptionId: number;
}

// ============================================================================
// Add Source Link
// ============================================================================

export interface AddPredictionSourceRequest {
  articleId?: number;
  tweetId?: string;
  url: string;
  title?: string | null;
  publisher?: string | null;
}
