import api from './axios';
import type { PredictionView, PredictionType } from '@ems/types';

// Re-export for compatibility
export type { PredictionView } from '@ems/types';

/**
 * Category interface matching backend response
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  sortOrder: number;
}

/**
 * Paginated predictions response
 */
export interface PaginatedPredictionsResponse {
  predictions: PredictionView[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Fetch predictions with optional filtering and pagination
 * @param options - Optional filters (status, limit, offset, search, categoryId, timeRemaining, activity)
 * @returns Paginated predictions response
 */
export async function getPredictions(options?: {
  status?: 'open' | 'pending' | 'expired' | 'resolved' | 'all';
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: number;
  timeRemaining?: '1h' | '1d' | '1w';
  activity?: 'high' | 'medium' | 'low';
}): Promise<PaginatedPredictionsResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit !== undefined) params.append('limit', options.limit.toString());
  if (options?.offset !== undefined) params.append('offset', options.offset.toString());
  if (options?.search) params.append('search', options.search);
  if (options?.categoryId !== undefined) params.append('categoryId', options.categoryId.toString());
  if (options?.timeRemaining) params.append('timeRemaining', options.timeRemaining);
  if (options?.activity) params.append('activity', options.activity);

  const queryString = params.toString();
  const { data } = await api.get<PaginatedPredictionsResponse>(
    `/api/predictions${queryString ? `?${queryString}` : ''}`,
  );

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
    expiresAt:
      payload.expiresAt instanceof Date ? payload.expiresAt.toISOString() : payload.expiresAt,
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

/**
 * Get all active categories for prediction creation
 */
export async function getCategories(): Promise<Category[]> {
  const response = await api.get('/api/predictions/categories');
  return response.data.categories;
}

/**
 * Toggle a reaction on a prediction
 */
export async function togglePredictionReaction(
  predictionId: number,
  reactionType: string,
): Promise<{
  action: 'added' | 'removed' | 'changed';
  reaction?: any;
  counts: Record<string, number>;
}> {
  const { data } = await api.post(`/api/predictions/${predictionId}/reactions`, {
    type: reactionType,
  });
  return data;
}

// getPredictionReactions removed - reaction counts and userReaction now included in PredictionView
