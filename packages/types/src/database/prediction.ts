/**
 * Prediction Database Types
 *
 * Types for Prediction, PredictionOption, PredictionSourceLink models
 */

import type {
  PrismaPrediction,
  PrismaPredictionOption,
  PrismaPredictionSourceLink,
} from '../prisma';

// ============================================================================
// Prediction Types
// ============================================================================

export type DbPrediction = PrismaPrediction;

export type PublicPrediction = Pick<
  PrismaPrediction,
  | 'id'
  | 'title'
  | 'description'
  | 'categoryId'
  | 'expiresAt'
  | 'resolved'
  | 'resolvedAt'
  | 'approved'
  | 'type'
  | 'threshold'
  | 'creatorId'
  | 'createdAt'
> & {
  /** which option actually won when resolved */
  winningOptionId?: number | null;
};

// ============================================================================
// Prediction Option Types
// ============================================================================

export type DbPredictionOption = PrismaPredictionOption;

export type PublicPredictionOption = Pick<
  PrismaPredictionOption,
  'id' | 'label' | 'odds' | 'predictionId' | 'createdAt'
>;

// ============================================================================
// Prediction Source Link Types
// ============================================================================

export type DbPredictionSourceLink = PrismaPredictionSourceLink;

export type PublicPredictionSourceLink = {
  id: number;
  predictionId: number;
  articleId: number | null;
  tweetId: string | null;
  url: string;
  title: string | null;
  publisher: string | null;
  capturedAt: string;
  prediction?: PublicPrediction;
  article?: {
    id: number;
    title: string;
    url: string;
    feedId: number;
  };
};

// ============================================================================
// User Activity Tracking Types
// ============================================================================

export interface DbPredictionActivityMetadata {
  predictionId?: number;
  optionId?: number;
  amount?: number;
  odds?: number;
  result?: string;
  winnings?: number;
  [key: string]: unknown;
}

export interface DbPredictionActivity {
  activityType: string;
  metadata: DbPredictionActivityMetadata;
  occurredAt: Date;
}

// ============================================================================
// Parlay Leg with User - Moved to api/responses/prediction.ts
// ============================================================================

// ParlayLegWithUser is now exported from api/responses/prediction.ts as it's an API-specific type
