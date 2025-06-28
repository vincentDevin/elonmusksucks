// apps/client/src/hooks/useBetting.ts
import { useState, useCallback } from 'react';
import { placeBet, placeParlay } from '../api/betting';
import type { PlaceBetPayload, PlaceParlayPayload } from '../api/betting';
import type { PublicBet, PublicParlay } from '@ems/types';

/**
 * Hook for placing bets and parlays
 */
export function useBetting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const placeSingleBet = useCallback(
    async (predictionId: number, payload: PlaceBetPayload): Promise<PublicBet> => {
      setLoading(true);
      setError(null);
      try {
        const result = await placeBet(predictionId, payload);
        return result;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const placeParlayBet = useCallback(async (payload: PlaceParlayPayload): Promise<PublicParlay> => {
    setLoading(true);
    setError(null);
    try {
      const result = await placeParlay(payload);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    placeBet: placeSingleBet,
    placeParlay: placeParlayBet,
  };
}
