// apps/client/src/hooks/usePredictions.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPredictions, placeBet, createPrediction } from '../api/predictions';
import type { Prediction } from '../api/predictions';

// module‐level cache
let cachedPredictions: Prediction[] | null = null;

export function usePredictions() {
  const [data, setData] = useState<Prediction[] | null>(cachedPredictions);
  const [loading, setLoading] = useState(!cachedPredictions);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    // if we already have a cache, don’t re-fetch
    if (cachedPredictions) {
      setData(cachedPredictions);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getPredictions();
      cachedPredictions = result; // store in module cache
      setData(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const predictions = useMemo(() => {
    if (!data) return [];
    return data.map((pred) => {
      const total = pred.bets.reduce((sum, b) => sum + b.amount, 0);
      const yes = pred.bets.filter((b) => b.option === 'YES').reduce((sum, b) => sum + b.amount, 0);
      const no = total - yes;
      return {
        ...pred,
        odds: total ? { yes: yes / total, no: no / total } : { yes: 0, no: 0 },
      };
    });
  }, [data]);

  const placeBetOnPrediction = async (
    predictionId: number,
    userId: number,
    amount: number,
    option: 'YES' | 'NO',
  ) => {
    await placeBet(predictionId, userId, amount, option);
    cachedPredictions = null; // invalidate cache
    await fetchPredictions();
  };

  const createNewPrediction = async (input: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }) => {
    await createPrediction(input);
    cachedPredictions = null; // invalidate cache
    await fetchPredictions();
  };

  return {
    predictions,
    loading,
    error,
    refresh: fetchPredictions,
    placeBet: placeBetOnPrediction,
    createPrediction: createNewPrediction,
  };
}
