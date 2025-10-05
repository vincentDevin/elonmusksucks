import api from './axios';
import type { PredictionView, PredictionType } from '@ems/types';

// Re-export for compatibility
export type { PredictionView } from '@ems/types';

/**
 * Fetch all predictions (with their options, bets & parlay legs).
 */
export async function getPredictions(): Promise<PredictionView[]> {
  const { data } = await api.get<PredictionView[]>('/api/predictions');
  return data;
}

/**
 * Fetch one prediction (with its options, bets & parlay legs).
 */
export async function getPredictionById(id: number): Promise<PredictionView> {
  const { data } = await api.get<PredictionView>(`/api/predictions/${id}`);
  return data;
}

// Local version kept due to API contract differences
// TODO: Reconcile with CreatePredictionRequest in @ems/types (uses categoryId: number instead of category: string)
export interface CreatePredictionPayload {
  title: string;
  description: string;
  categoryId: number; // Use categoryId instead of category string
  expiresAt: Date;
  options?: Array<{ label: string }>;
  type: PredictionType;
  threshold?: number;
}

/**
 * Create a new prediction (returns it with options & empty bets/parlays).
 */
export async function createPrediction(payload: CreatePredictionPayload): Promise<PredictionView> {
  const { data } = await api.post<PredictionView>('/api/predictions', {
    ...payload,
    expiresAt: payload.expiresAt.toISOString(),
    options: payload.options,
  });
  return data;
}

/**
 * Get detailed analytics for a prediction
 */
export async function getPredictionAnalytics(predictionId: number): Promise<{
  totalBets: number;
  totalVolume: number;
  uniqueBettors: number;
  controversyScore: number;
  popularityScore: number;
  viewStats: {
    totalViews: number;
    uniqueUserViews: number;
    viewToEngagementRatio: number;
  };
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert';
  activityLevel: 'high' | 'medium' | 'low';
}> {
  const { data } = await api.get(`/api/predictions/${predictionId}/analytics`);
  return data;
}

/**
 * Get comments for a prediction
 */
export async function getPredictionComments(
  predictionId: number,
  options: { cursor?: number; limit?: number } = {},
): Promise<{ comments: any[]; nextCursor?: number }> {
  const params = new URLSearchParams();
  if (options.cursor) params.append('cursor', options.cursor.toString());
  if (options.limit) params.append('limit', options.limit.toString());

  const { data } = await api.get(`/api/predictions/${predictionId}/comments?${params.toString()}`);
  return data;
}

/**
 * Create a comment on a prediction
 */
export async function createPredictionComment(predictionId: number, content: string): Promise<any> {
  const { data } = await api.post(`/api/predictions/${predictionId}/comments`, { content });
  return data;
}
