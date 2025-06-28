import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPredictions, createPrediction } from '../api/predictions';
import type { PredictionFull } from '../api/predictions';

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

  const createNew = useCallback(
    async (input: {
      title: string;
      description: string;
      category: string;
      expiresAt: Date;
      options: Array<{ label: string }>;
    }) => {
      setLoading(true);
      try {
        await createPrediction(input);
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
    createPrediction: createNew,
  };
}
