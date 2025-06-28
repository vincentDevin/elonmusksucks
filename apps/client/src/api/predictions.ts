import api from './axios';
import type {
  PublicPrediction,
  PublicPredictionOption,
  PublicLeaderboardEntry,
  PublicBet,
} from '@ems/types';

/** A bet with its user’s id+name */
export interface BetWithUser extends PublicBet {
  user: { id: number; name: string };
}

/** A prediction plus its bets and its dynamic options */
export type PredictionFull = PublicPrediction & {
  options: PublicPredictionOption[];
  bets: BetWithUser[];
};

/**
 * Fetch all predictions (with their options & bets).
 */
export async function getPredictions(): Promise<PredictionFull[]> {
  const { data } = await api.get<PredictionFull[]>('/api/predictions');
  return data;
}

/**
 * Fetch one prediction (with its options & bets).
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
  options: Array<{ label: string }>; // ← new
}

/**
 * Create a new prediction (returns it with options & empty bets).
 */
export async function createPrediction(payload: CreatePredictionPayload): Promise<PredictionFull> {
  const { data } = await api.post<PredictionFull>('/api/predictions', {
    ...payload,
    expiresAt: payload.expiresAt.toISOString(),
    options: payload.options,
  });
  return data;
}

/**
 * Resolve a prediction (returns fresh options & bets).
 */
export async function resolvePrediction(
  predictionId: number,
  winningOptionId: number,
): Promise<PredictionFull> {
  const { data } = await api.post<PredictionFull>(`/api/predictions/${predictionId}/resolve`, {
    winningOptionId,
  });
  return data;
}

export async function getLeaderboard(limit?: number): Promise<PublicLeaderboardEntry[]> {
  const url = limit
    ? `/api/predictions/leaderboard?limit=${limit}`
    : '/api/predictions/leaderboard';
  const { data } = await api.get<PublicLeaderboardEntry[]>(url);
  return data;
}
