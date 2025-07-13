// apps/client/src/hooks/usePredictions.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPredictions,
  createPrediction as apiCreatePrediction,
  type PredictionFull,
  type CreatePredictionPayload,
  type BetWithUser,
} from '../api/predictions';
import { useSocket } from '../contexts/SocketContext';

let cache: PredictionFull[] | null = null;

export function usePredictions() {
  const socket = useSocket();
  const [data, setData] = useState<PredictionFull[] | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const preds = await getPredictions();
      cache = preds;
      setData(preds);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!cache) {
      fetchPredictions();
    }
  }, [fetchPredictions]);

  // Real-time updates
  useEffect(() => {
    // New prediction
    function onCreated(newPred: PredictionFull) {
      cache = cache ? [newPred, ...cache] : [newPred];
      setData(cache);
    }

    // Prediction resolved
    function onResolved(updatedPred: PredictionFull) {
      if (!cache) return;
      cache = cache.map((p) => (p.id === updatedPred.id ? updatedPred : p));
      setData(cache);
    }

    // Single bet placed (must include `user` field)
    function onBetPlaced(bet: BetWithUser) {
      if (!cache) return;
      cache = cache.map((p) => (p.id === bet.predictionId ? { ...p, bets: [...p.bets, bet] } : p));
      setData(cache);
    }

    // Parlay leg placed: same shape as PredictionFull.parlayLegs[number] plus predictionId
    type ParlayLegEvent = PredictionFull['parlayLegs'][number] & {
      predictionId: number;
    };
    function onParlayPlaced(evt: ParlayLegEvent) {
      if (!cache) return;
      cache = cache.map((p) =>
        p.id === evt.predictionId ? { ...p, parlayLegs: [...p.parlayLegs, evt] } : p,
      );
      setData(cache);
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
        cache = null;
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

  return {
    predictions,
    loading,
    error,
    refresh: fetchPredictions,
    createPrediction,
  };
}
