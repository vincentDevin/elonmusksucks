import type { PredictionView } from '@ems/types';

/**
 * Maps database prediction result to standardized PredictionView DTO
 * Handles BigInt → string conversion for bet amounts and Date → ISO string
 */
export const toPredictionView = (prediction: {
  id: number;
  title: string;
  description: string;
  categoryId: number | null; // UPDATED: Use categoryId instead of category string
  type: any; // PredictionType enum
  threshold: number | null;
  createdAt: Date;
  expiresAt: Date;
  resolved: boolean;
  approved: boolean;
  resolvedAt: Date | null;
  creatorId: number;
  winningOptionId: number | null;
  options: Array<{
    id: number;
    label: string;
    odds: number;
    predictionId: number;
  }>;
  bets: Array<{
    id: number;
    userId: number;
    amount: bigint;
    potentialPayout: bigint | null;
    payout: bigint | null;
    status: string;
    createdAt: Date;
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
}): PredictionView => ({
  id: prediction.id,
  title: prediction.title,
  description: prediction.description,
  categoryId: prediction.categoryId, // UPDATED: Use categoryId instead of category string
  status: prediction.resolved ? 'RESOLVED' : prediction.approved ? 'APPROVED' : 'PENDING',
  type: prediction.type,
  threshold: prediction.threshold,
  createdAt: prediction.createdAt.toISOString(),
  expiresAt: prediction.expiresAt.toISOString(),
  resolvedAt: prediction.resolvedAt ? prediction.resolvedAt.toISOString() : null,
  creatorUserId: prediction.creatorId,
  winningOptionId: prediction.winningOptionId,
  options: prediction.options,
  bets: prediction.bets.map((bet) => ({
    id: bet.id,
    userId: bet.userId,
    userName: bet.user.name,
    amount: bet.amount.toString(),
    potentialPayout: bet.potentialPayout ? bet.potentialPayout.toString() : null,
    payout: bet.payout ? bet.payout.toString() : null,
    status: bet.status,
    createdAt: bet.createdAt.toISOString(),
  })),
  sourceLinks: prediction.sourceLinks?.map((link) => ({
    id: link.id,
    url: link.url,
    title: link.title || '',
    description: link.publisher,
  })),
});
