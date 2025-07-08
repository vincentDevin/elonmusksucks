import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getPredictions,
  createPrediction as apiCreatePrediction,
  type PredictionFull,
  type CreatePredictionPayload,
} from '../api/predictions';

let cache: PredictionFull[] | null = null;

export function usePredictions() {
  const [data, setData] = useState<PredictionFull[] | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (cache) {
      setData(cache);
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

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
