import { useApi } from './useApi';
import { getPredictions, placeBet } from '../api/predictions';
import type { Prediction } from '../api/predictions';

export function usePredictions() {
  const { data, loading, error, refresh } = useApi<Prediction[]>(getPredictions, []);

  const placeBetOnPrediction = async (
    predictionId: number,
    userId: number,
    amount: number,
    option: 'YES' | 'NO',
  ) => {
    await placeBet(predictionId, userId, amount, option);
    await refresh();
  };

  return {
    predictions: data,
    loading,
    error,
    refresh,
    placeBet: placeBetOnPrediction,
  };
}
