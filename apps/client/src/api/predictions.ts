import api from './axios';
import type { PredictionFull, PredictionType } from '@ems/types';

// Re-export for compatibility
export type { PredictionFull } from '@ems/types';

/**
 * Fetch all predictions (with their options, bets & parlay legs).
 */
export async function getPredictions(): Promise<PredictionFull[]> {
  const { data } = await api.get<PredictionFull[]>('/api/predictions');
  return data;
}

/**
 * Fetch one prediction (with its options, bets & parlay legs).
 */
export async function getPredictionById(id: number): Promise<PredictionFull> {
  const { data } = await api.get<PredictionFull>(`/api/predictions/${id}`);
  return data;
}

export interface CreatePredictionPayload {
  title: string;
  description: string;
  category: string;
  expiresAt: Date;
  options?: Array<{ label: string }>;
  type: PredictionType;
  threshold?: number;
}

/**
 * Create a new prediction (returns it with options & empty bets/parlays).
 */
export async function createPrediction(payload: CreatePredictionPayload): Promise<PredictionFull> {
  const { data } = await api.post<PredictionFull>('/api/predictions', {
    ...payload,
    expiresAt: payload.expiresAt.toISOString(),
    options: payload.options,
  });
  return data;
}
