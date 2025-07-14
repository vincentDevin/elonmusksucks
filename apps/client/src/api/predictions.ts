import api from './axios';
import type {
  PublicPrediction,
  PublicPredictionOption,
  PredictionType,
  BetWithUser,
  ParlayLegWithUser, // <-- use from @ems/types!
} from '@ems/types';

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
