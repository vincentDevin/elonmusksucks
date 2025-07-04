// apps/client/src/api/betting.ts
import api from './axios';
import type { PublicBet, PublicParlay } from '@ems/types';

/**
 * Payload for placing a single bet
 */
export interface PlaceBetPayload {
  optionId: number;
  amount: number;
}

/**
 * Place a single bet
 */
export async function placeBet(payload: PlaceBetPayload): Promise<PublicBet> {
  const { data } = await api.post<PublicBet>('/api/betting/bet', payload);
  return data;
}

/**
 * Payload for placing a parlay (multi-leg bet)
 */
export interface PlaceParlayPayload {
  legs: Array<{ optionId: number }>;
  amount: number;
}

/**
 * Place a parlay bet
 */
export async function placeParlay(payload: PlaceParlayPayload): Promise<PublicParlay> {
  const { data } = await api.post<PublicParlay>('/api/betting/parlay', payload);
  return data;
}
