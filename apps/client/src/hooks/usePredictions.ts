// apps/client/src/hooks/usePredictions.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPredictions, createPrediction } from '../api/predictions';
import type { PublicPrediction } from '@ems/types';

// module-level cache of fetched predictions
let cachedPredictions: PublicPrediction[] | null = null;

/**
 * Hook for fetching and managing predictions list
 */
export function usePredictions() {
  const [data, setData] = useState<PublicPrediction[] | null>(cachedPredictions);
  const [loading, setLoading] = useState(!cachedPredictions);
  const [error, setError] = useState<Error | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (cachedPredictions) {
      setData(cachedPredictions);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPredictions();
      cachedPredictions = result;
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

  const predictions = useMemo(() => data ?? [], [data]);

  const createNewPrediction = useCallback(
    async (input: { title: string; description: string; category: string; expiresAt: Date }) => {
      setLoading(true);
      setError(null);
      try {
        await createPrediction(input);
        cachedPredictions = null; // invalidate cache
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
    createPrediction: createNewPrediction,
  };
}
