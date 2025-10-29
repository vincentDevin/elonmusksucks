/**
 * Prediction Response DTOs
 *
 * Response types for prediction endpoints
 */

import type { PublicPrediction, PublicPredictionOption } from '../../database/prediction';
import type { BetWithUser, PrismaCategory, PrismaReactionType } from '../../prisma';

// ============================================================================
// API-Specific Types
// ============================================================================

export interface ParlayLegWithUser {
  parlayId: number;
  user: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey?: string | null;
  };
  stake: string;
  optionId: number;
  createdAt: Date;
  /** parent prediction id for context */
  predictionId?: number;
  optionLabel?: string;
  predictionTitle?: string;
  /** Enhanced with activity metrics for real-time events */
  activityMetrics?: {
    activityLevel: 'high' | 'medium' | 'low';
    totalBets: number;
    totalParlayLegs: number;
    bettingVelocity: number;
    lastActivityAt: Date | null;
    popularityScore: number;
  };
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  viewStats?: {
    totalViews: number;
    uniqueViewers: number;
    viewsLast24h: number;
    viewsLast7d: number;
  };
}

// ============================================================================
// Prediction View
// ============================================================================

export interface PredictionView {
  id: number;
  title: string;
  description: string;
  categoryId: number | null; // Nullable as per Prisma schema
  category?: PrismaCategory | null; // Full category object from relation
  categoryName?: string; // Optional category name if we want to include it
  status: string; // 'PENDING' | 'APPROVED' | 'RESOLVED'
  type: string;
  threshold?: number | null;
  createdAt: string; // Date → ISO string
  expiresAt: string; // Date → ISO string
  resolvedAt: string | null; // Date → ISO string
  creatorUserId: number;
  winningOptionId: number | null;
  creator?: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  options: Array<{
    id: number;
    label: string;
    odds: number;
    predictionId: number;
  }>;
  bets: Array<{
    id: number;
    userId: number;
    optionId: number | null;
    userName: string;
    avatarUrl: string | null;
    amount: string; // BigInt → string
    potentialPayout: string | null; // BigInt → string
    payout: string | null; // BigInt → string
    status: string;
    createdAt: string; // Date → ISO string
  }>;
  parlayLegs?: Array<{
    parlayId: number;
    user: {
      id: number;
      name: string;
      avatarUrl: string | null;
      profilePictureKey?: string | null;
    };
    stake: string;
    optionId: number;
    createdAt: string; // Date → ISO string
  }>;
  sourceLinks?: Array<{
    id: number;
    url: string;
    title: string;
    description: string | null;
  }>;

  // Enrichment data (included in all prediction responses)
  activityLevel: 'high' | 'medium' | 'low';
  activityMetrics: {
    totalBets: number;
    totalParlayLegs: number;
    bettingVelocity: number;
    popularityScore: number;
    lastActivityAt: string | null; // Date → ISO string
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  viewStats: {
    totalViews: number;
    uniqueUserViews: number;
    viewToEngagementRatio: number;
  };
  reactionCounts: Record<PrismaReactionType, number>;
  userReaction?: PrismaReactionType; // Only if userId provided in request
  commentCount: number;
}

// ============================================================================
// Prediction Full (with all related data)
// ============================================================================

export interface PredictionFull extends PublicPrediction {
  category?: PrismaCategory | null; // Full category object from relation
  options: PublicPredictionOption[];
  bets: BetWithUser[];
  parlayLegs?: ParlayLegWithUser[];
  sourceLinks?: any[];
  creator?: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };

  // Enrichment data (same as PredictionView)
  activityLevel?: 'high' | 'medium' | 'low';
  activityMetrics?: {
    totalBets: number;
    totalParlayLegs: number;
    bettingVelocity: number;
    popularityScore: number;
    lastActivityAt: string | null;
  };
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  viewStats?: {
    totalViews: number;
    uniqueUserViews: number;
    viewToEngagementRatio: number;
  };
  reactionCounts?: Record<PrismaReactionType, number>;
  userReaction?: PrismaReactionType;
  commentCount?: number;
}

// ============================================================================
// Enhanced Prediction Event Types (for real-time)
// ============================================================================

export interface EnhancedPredictionCreatePayload extends PublicPrediction {
  options: PublicPredictionOption[];
  bets: BetWithUser[];
  parlayLegs: ParlayLegWithUser[];
  activityMetrics: {
    activityLevel: 'high' | 'medium' | 'low';
    totalBets: number;
    totalParlayLegs: number;
    bettingVelocity: number;
    lastActivityAt: Date | null;
    popularityScore: number;
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  viewStats: {
    totalViews: number;
    uniqueViewers: number;
    viewsLast24h: number;
    viewsLast7d: number;
  };
}

export interface EnhancedOddsUpdatePayload {
  predictionId: number;
  timestamp: string;
  significantChanges: number;
  hotMarket: boolean;
  activityMetrics: {
    activityLevel: 'high' | 'medium' | 'low';
    totalBets: number;
    totalParlayLegs: number;
    bettingVelocity: number;
    lastActivityAt: Date | null;
    popularityScore: number;
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  viewStats: {
    totalViews: number;
    uniqueViewers: number;
    viewsLast24h: number;
    viewsLast7d: number;
  };
  options: Array<{
    id: number;
    label: string;
    odds: number;
    previousOdds: number;
    change: number;
    changePercent: number;
  }>;
}
