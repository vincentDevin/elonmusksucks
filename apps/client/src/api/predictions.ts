// apps/client/src/api/predictions.ts
import api from './axios';

export interface Prediction {
  id: number;
  title: string;
  description: string;
  category: string;
  expiresAt: string;
  resolved: boolean;
  outcome?: string;
  createdAt: string;
}

export async function getPredictions(): Promise<Prediction[]> {
  const { data } = await api.get<Prediction[]>('/predictions');
  return data;
}

export interface CreatePredictionPayload {
  title: string;
  description: string;
  category: string;
  expiresAt: Date;
}
export async function createPrediction(payload: CreatePredictionPayload): Promise<Prediction> {
  const { data } = await api.post<Prediction>(
    '/predictions',
    { ...payload, expiresAt: payload.expiresAt.toISOString() }
  );
  return data;
}

export interface Bet {
  id: number;
  userId: number;
  predictionId: number;
  amount: number;
  option: string;
  won?: boolean;
  payout?: number;
  createdAt: string;
}
export async function placeBet(
  predictionId: number,
  userId: number,
  amount: number,
  option: string
): Promise<Bet> {
  const { data } = await api.post<Bet>(`/predictions/${predictionId}/bet`, {
    userId,
    amount,
    option,
  });
  return data;
}

export async function resolvePrediction(
  predictionId: number,
  outcome: string
): Promise<Prediction> {
  const { data } = await api.post<Prediction>(`/predictions/${predictionId}/resolve`, {
    outcome,
  });
  return data;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  muskBucks: number;
}
export async function getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
  const url = limit ? `/predictions/leaderboard?limit=${limit}` : '/predictions/leaderboard';
  const { data } = await api.get<LeaderboardEntry[]>(url);
  return data;
}