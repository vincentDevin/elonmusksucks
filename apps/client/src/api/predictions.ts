import api from './axios';
import type {
  PublicPrediction,
  PublicPredictionOption,
  PublicLeaderboardEntry,
  PublicBet,
  PredictionType,
} from '@ems/types';

/** A bet with its user’s id+name */
export interface BetWithUser extends PublicBet {
  user: { id: number; name: string };
}

/** A parlay‐leg with exactly the fields your API now returns */
export type ParlayLegWithUser = {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
};

/**
 * A prediction plus its dynamic options, single bets, and parlay legs.
 */
export type PredictionFull = PublicPrediction & {
  options: PublicPredictionOption[];
  bets: BetWithUser[];
  parlayLegs: ParlayLegWithUser[];
};

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

/**
 * Resolve a prediction (returns fresh options, bets & parlays).
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
