import { useApi } from './useApi';
import { getPredictions, placeBet, createPrediction } from '../api/predictions';
import type { Prediction } from '../api/predictions';

export function usePredictions() {
  const { data, loading, error, refresh } = useApi<Prediction[]>(getPredictions, []);

  const dataWithOdds = (data ?? []).map((pred) => {
    const total = pred.bets.reduce((sum, b) => sum + b.amount, 0);
    const yes = pred.bets.filter((b) => b.option === 'YES').reduce((sum, b) => sum + b.amount, 0);
    const no = total - yes;
    return {
      ...pred,
      odds: { yes: yes / total, no: no / total },
    };
  });

  const placeBetOnPrediction = async (
    predictionId: number,
    userId: number,
    amount: number,
    option: 'YES' | 'NO',
  ) => {
    await placeBet(predictionId, userId, amount, option);
    await refresh();
  };

  const createNewPrediction = async (input: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }) => {
    await createPrediction(input);
    await refresh();
  };

  return {
    //predictions: data,
    predictions: dataWithOdds,
    loading,
    error,
    refresh,
    placeBet: placeBetOnPrediction,
    createPrediction: createNewPrediction,
  };
}
