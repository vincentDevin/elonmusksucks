import type { PredictionView, PrismaCategory, PrismaReactionType } from '@ems/types';

/**
 * Safely converts Date objects or ISO strings to ISO string format
 * Handles cached data where dates are already strings
 */
function toISOStringSafe(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date; // Already a string, return as-is
  if (date instanceof Date) return date.toISOString(); // Date object, convert
  return null; // Fallback for unexpected types
}

/**
 * Maps database prediction result to standardized PredictionView DTO
 * Handles BigInt → string conversion for bet amounts and Date → ISO string
 * Includes enrichment data (activity, difficulty, views, reactions, comments)
 */
export const toPredictionView = (prediction: {
  id: number;
  title: string;
  description: string;
  categoryId: number | null; // UPDATED: Use categoryId instead of category string
  category?: PrismaCategory | null; // Include full category object
  type: any; // PredictionType enum
  threshold: number | null;
  createdAt: Date | string;
  expiresAt: Date | string;
  resolved: boolean;
  approved: boolean;
  resolvedAt: Date | string | null;
  creatorId: number;
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
    amount: bigint;
    potentialPayout: bigint | null;
    payout: bigint | null;
    status: string;
    createdAt: Date | string;
    user: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
  }>;
  sourceLinks?: Array<{
    id: number;
    predictionId: number;
    articleId: number | null;
    tweetId: string | null;
    url: string;
    title: string | null;
    publisher: string | null;
    capturedAt: string;
  }>;
  // Enrichment data (added by service layer)
  activityLevel?: 'high' | 'medium' | 'low';
  activityMetrics?: any;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  viewStats?: any;
  reactionCounts?: Record<PrismaReactionType, number>;
  userReaction?: PrismaReactionType;
  commentCount?: number;
}): PredictionView => ({
  id: prediction.id,
  title: prediction.title,
  description: prediction.description,
  categoryId: prediction.categoryId, // UPDATED: Use categoryId instead of category string
  category: prediction.category || null, // Include full category object
  status: prediction.resolved ? 'RESOLVED' : prediction.approved ? 'APPROVED' : 'PENDING',
  type: prediction.type,
  threshold: prediction.threshold,
  createdAt: toISOStringSafe(prediction.createdAt)!,
  expiresAt: toISOStringSafe(prediction.expiresAt)!,
  resolvedAt: toISOStringSafe(prediction.resolvedAt),
  creatorUserId: prediction.creatorId,
  winningOptionId: prediction.winningOptionId,
  creator: prediction.creator,
  options: prediction.options,
  bets: prediction.bets.map((bet) => ({
    id: bet.id,
    userId: bet.userId,
    optionId: bet.optionId,
    userName: bet.user.name,
    avatarUrl: bet.user.avatarUrl,
    amount: bet.amount.toString(),
    potentialPayout: bet.potentialPayout ? bet.potentialPayout.toString() : null,
    payout: bet.payout ? bet.payout.toString() : null,
    status: bet.status,
    createdAt: toISOStringSafe(bet.createdAt)!,
  })),
  sourceLinks: prediction.sourceLinks?.map((link) => ({
    id: link.id,
    url: link.url,
    title: link.title || '',
    description: link.publisher,
  })),

  // Enrichment data (pass through from service layer)
  activityLevel: prediction.activityLevel || 'low',
  activityMetrics: prediction.activityMetrics || {
    totalBets: 0,
    totalParlayLegs: 0,
    bettingVelocity: 0,
    popularityScore: 0,
    lastActivityAt: null,
  },
  difficulty: prediction.difficulty || 'medium',
  viewStats: prediction.viewStats || {
    totalViews: 0,
    uniqueUserViews: 0,
    viewToEngagementRatio: 0,
  },
  reactionCounts: prediction.reactionCounts || {
    LIKE: 0,
    LOVE: 0,
    LAUGH: 0,
    WOW: 0,
    SAD: 0,
    ANGRY: 0,
  },
  ...(prediction.userReaction && { userReaction: prediction.userReaction }),
  commentCount: prediction.commentCount || 0,
});
