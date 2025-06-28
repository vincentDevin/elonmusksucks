// apps/client/src/components/PredictionsComponent.tsx
import { useMemo } from 'react';
import type { PublicPredictionOption, PublicBet } from '@ems/types';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';
import BetForm from './BetForm';
import ResolvePrediction from './ResolvePrediction';
import OddsBar from './OddsBar';

interface OptionPool extends PublicPredictionOption {
  pool: number;
  pct: number;
}

export function PredictionsComponent() {
  const { predictions: raw, loading, error, refresh } = usePredictions();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  if (loading) {
    return <p className="p-4 text-center">Loading predictions…</p>;
  }
  if (error) {
    return <p className="p-4 text-center text-red-500">Error: {error.toString()}</p>;
  }
  if (raw.length === 0) {
    return <p className="p-4 text-center">No predictions available.</p>;
  }

  const predictions = useMemo(() => {
    return raw.map((pred) => {
      const opts = (pred as any).options as PublicPredictionOption[];
      const bets = (pred as any).bets as PublicBet[];
      const totalPool = bets.reduce((sum, b) => sum + b.amount, 0);

      const optionPools: OptionPool[] = opts.slice(0, 4).map((opt) => {
        const pool = bets
          .filter((b) => b.optionId === opt.id)
          .reduce((sum, b) => sum + b.amount, 0);
        return {
          ...opt,
          pool,
          pct: totalPool ? pool / totalPool : 0,
        };
      });

      return { ...pred, optionPools, bets };
    });
  }, [raw]);

  return (
    <div className="space-y-4">
      {predictions.map((pred) => {
        const expired = new Date() > new Date(pred.expiresAt);
        return (
          <div
            key={pred.id}
            className="p-4 bg-background rounded-lg hover:bg-surface transition shadow"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-lg font-semibold">{pred.title}</h3>
                <p className="text-sm text-gray-500">{pred.description}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pred.resolved
                    ? 'bg-gray-400 text-white'
                    : expired
                      ? 'bg-red-500 text-white'
                      : 'bg-blue-500 text-white'
                }`}
              >
                {pred.resolved ? 'Resolved' : expired ? 'Expired' : 'Open'}
              </span>
            </div>

            {/* Odds Bar */}
            <OddsBar options={pred.optionPools} />

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {!pred.resolved && <BetForm prediction={pred} onPlaced={refresh} />}
              {isAdmin && !pred.resolved && (
                <ResolvePrediction predictionId={pred.id} onResolved={refresh} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
