// apps/client/src/hooks/useBetting.ts
import { useState, useCallback, useEffect } from 'react';
import { placeBet, placeParlay } from '../api/betting';
import type { PlaceBetPayload, PlaceParlayPayload } from '../api/betting';
import type { PublicBet, PublicParlay } from '@ems/types';
import { useSocket } from '../contexts/SocketContext';

/**
 * Hook for placing single bets and parlays,
 * plus receiving live updates when any bet/parlay is placed.
 */
export function useBetting() {
  const socket = useSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Live events
  const [latestBet, setLatestBet] = useState<PublicBet | null>(null);
  const [latestParlay, setLatestParlay] = useState<PublicParlay | null>(null);

  // Subscribe to server push events
  useEffect(() => {
    function onBetPlaced(bet: PublicBet) {
      setLatestBet(bet);
    }
    function onParlayPlaced(parlay: PublicParlay) {
      setLatestParlay(parlay);
    }

    socket.on('betPlaced', onBetPlaced);
    socket.on('parlayPlaced', onParlayPlaced);
    return () => {
      socket.off('betPlaced', onBetPlaced);
      socket.off('parlayPlaced', onParlayPlaced);
    };
  }, [socket]);

  // Mutation methods
  const placeBetAsync = useCallback(async (payload: PlaceBetPayload): Promise<PublicBet> => {
    setLoading(true);
    setError(null);
    try {
      const result = await placeBet(payload);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const placeParlayAsync = useCallback(
    async (payload: PlaceParlayPayload): Promise<PublicParlay> => {
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
    },
    [],
  );

  return {
    loading,
    error,
    placeBet: placeBetAsync,
    placeParlay: placeParlayAsync,
    // Live updates you can hook into
    latestBet,
    latestParlay,
  };
}
