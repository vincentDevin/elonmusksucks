// apps/client/src/api/predictions.ts
import api from './axios';
import type { PublicPrediction, PublicLeaderboardEntry } from '@ems/types';

/**
 * Fetch all predictions
 */
export async function getPredictions(): Promise<PublicPrediction[]> {
  const { data } = await api.get<PublicPrediction[]>('/api/predictions');
  return data;
}

/**
 * Fetch a single prediction by ID
 */
export async function getPredictionById(id: number): Promise<PublicPrediction> {
  const { data } = await api.get<PublicPrediction>(`/api/predictions/${id}`);
  return data;
}

/**
 * Payload for creating a prediction
 */
export interface CreatePredictionPayload {
  title: string;
  description: string;
  category: string;
  expiresAt: Date;
}

/**
 * Create a new prediction
 */
export async function createPrediction(
  payload: CreatePredictionPayload,
): Promise<PublicPrediction> {
  const { data } = await api.post<PublicPrediction>('/api/predictions', {
    ...payload,
    expiresAt: payload.expiresAt.toISOString(),
  });
  return data;
}

/**
 * Resolve a prediction
 */
export async function resolvePrediction(
  predictionId: number,
  winningOptionId: number,
): Promise<PublicPrediction> {
  const { data } = await api.post<PublicPrediction>(`/api/predictions/${predictionId}/resolve`, {
    winningOptionId,
  });
  return data;
}

/**
 * Fetch the leaderboard
 */
export async function getLeaderboard(limit?: number): Promise<PublicLeaderboardEntry[]> {
  const url = limit
    ? `/api/predictions/leaderboard?limit=${limit}`
    : '/api/predictions/leaderboard';
  const { data } = await api.get<PublicLeaderboardEntry[]>(url);
  return data;
}
