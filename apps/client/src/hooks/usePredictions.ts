import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPredictions,
  createPrediction as apiCreatePrediction,
  type PredictionFull,
  type CreatePredictionPayload,
} from '../api/predictions';
import type { BetWithUser, ParlayLegWithUser } from '@ems/types';
import { useSocket } from '../contexts/SocketContext';

export function usePredictions() {
  const socket = useSocket();
  const [data, setData] = useState<PredictionFull[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const preds = await getPredictions();
      setData(preds);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  // Real-time socket updates
  useEffect(() => {
    function onCreated(newPred: PredictionFull) {
      setData((prev) => (prev ? [newPred, ...prev] : [newPred]));
    }
    function onResolved(updatedPred: PredictionFull) {
      setData((prev) =>
        prev ? prev.map((p) => (p.id === updatedPred.id ? updatedPred : p)) : prev,
      );
    }
    function onBetPlaced(bet: BetWithUser) {
      setData((prev) =>
        prev
          ? prev.map((p) =>
              p.id === bet.predictionId ? { ...p, bets: [...(p.bets ?? []), bet] } : p,
            )
          : prev,
      );
    }
    function onParlayPlaced(evt: ParlayLegWithUser & { predictionId: number }) {
      setData((prev) =>
        prev
          ? prev.map((p) =>
              p.id === evt.predictionId ? { ...p, parlayLegs: [...(p.parlayLegs ?? []), evt] } : p,
            )
          : prev,
      );
    }

    socket.on('predictionCreated', onCreated);
    socket.on('predictionResolved', onResolved);
    socket.on('betPlaced', onBetPlaced);
    socket.on('parlayPlaced', onParlayPlaced);

    return () => {
      socket.off('predictionCreated', onCreated);
      socket.off('predictionResolved', onResolved);
      socket.off('betPlaced', onBetPlaced);
      socket.off('parlayPlaced', onParlayPlaced);
    };
  }, [socket]);

  const predictions = useMemo(() => data ?? [], [data]);

  const createPrediction = useCallback(
    async (input: CreatePredictionPayload) => {
      setLoading(true);
      try {
        await apiCreatePrediction(input);
        await fetchPredictions();
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchPredictions],
  );

  const addOptimisticBet = useCallback((bet: BetWithUser) => {
    setData((prev) =>
      prev
        ? prev.map((p) =>
            p.id === bet.predictionId ? { ...p, bets: [...(p.bets ?? []), bet] } : p,
          )
        : prev,
    );
  }, []);

  return {
    predictions,
    loading,
    error,
    refresh: fetchPredictions,
    createPrediction,
    addOptimisticBet,
  };
}
