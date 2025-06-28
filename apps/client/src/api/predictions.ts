// apps/client/src/api/predictions.ts
import api from './axios';
import type {
  PublicPrediction,
  PublicLeaderboardEntry,
  PublicBet,
} from '@ems/types';

/**
 * A bet with its user’s id+name, as returned by the API.
 */
export interface BetWithUser extends PublicBet {
  user: { id: number; name: string };
}

/**
 * A prediction plus its list of bets.
 */
export type PredictionWithBets = PublicPrediction & {
  bets: BetWithUser[];
};

/**
 * Fetch all predictions, each with its bets.
 */
export async function getPredictions(): Promise<PredictionWithBets[]> {
  const { data } = await api.get<PredictionWithBets[]>('/api/predictions');
  return data;
}

/**
 * Fetch a single prediction by ID (with its bets).
 */
export async function getPredictionById(
  id: number
): Promise<PredictionWithBets> {
  const { data } = await api.get<PredictionWithBets>(
    `/api/predictions/${id}`
  );
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
 * Create a new prediction (returns it with an empty bets[]).
 */
export async function createPrediction(
  payload: CreatePredictionPayload
): Promise<PredictionWithBets> {
  const { data } = await api.post<PredictionWithBets>('/api/predictions', {
    ...payload,
    expiresAt: payload.expiresAt.toISOString(),
  });
  return data;
}

/**
 * Resolve a prediction (returns the updated prediction with bets[]).
 */
export async function resolvePrediction(
  predictionId: number,
  winningOptionId: number
): Promise<PredictionWithBets> {
  const { data } = await api.post<PredictionWithBets>(
    `/api/predictions/${predictionId}/resolve`,
    { winningOptionId }
  );
  return data;
}

/**
 * Fetch the leaderboard
 */
export async function getLeaderboard(
  limit?: number
): Promise<PublicLeaderboardEntry[]> {
  const url = limit
    ? `/api/predictions/leaderboard?limit=${limit}`
    : '/api/predictions/leaderboard';
  const { data } = await api.get<PublicLeaderboardEntry[]>(url);
  return data;
}
