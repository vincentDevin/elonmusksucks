import { useApi } from './useApi';
import { getPredictions } from '../api/predictions';
import type { Prediction } from '../api/predictions';

export function usePredictions() {
  const { data, loading, error, refresh } = useApi<Prediction[]>(
    getPredictions,
    []
  );
  return {
    predictions: data,
    loading,
    error,
    refresh,
  };
}