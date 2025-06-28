// apps/client/src/pages/Predictions.tsx
import { useState, useMemo } from 'react';
import BetForm from '../components/BetForm';
import CreatePredictionForm from '../components/CreatePredictionForm';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';
import ResolvePrediction from '../components/ResolvePrediction';
import OddsBar from '../components/OddsBar';
import BetsList from '../components/BetsList';
import type { PublicPrediction, PublicBet } from '@ems/types';

// Extend PublicPrediction to include bets array with nested user info
type BetWithUser = PublicBet & { user: { id: number; name: string } };
type PredictionWithBets = PublicPrediction & { bets: BetWithUser[] };

export default function Predictions() {
  const { predictions: rawPredictions, loading, error, refresh } = usePredictions();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [creating, setCreating] = useState(false);

  // Map raw predictions to include bets and compute odds
  const predictions = useMemo((): Array<
    PredictionWithBets & { odds: { yes: number; no: number } }
  > => {
    return rawPredictions.map((pred) => {
      // Extract bets array coming from API
      const bets = ((pred as any).bets as BetWithUser[]) || [];
      const total = bets.reduce((sum, b) => sum + b.amount, 0);
      // Assume optionId === 1 is YES
      const yesAmount = bets.filter((b) => b.optionId === 1).reduce((sum, b) => sum + b.amount, 0);
      const noAmount = total - yesAmount;
      const yesPct = total ? yesAmount / total : 0;
      const noPct = total ? noAmount / total : 0;

      return { ...pred, bets, odds: { yes: yesPct, no: noPct } };
    });
  }, [rawPredictions]);

  if (loading) {
    return <p className="p-4 text-center">Loading predictions…</p>;
  }
  if (error) {
    return <p className="p-4 text-center text-red-500">Error: {error.toString()}</p>;
  }
  if (!predictions.length) {
    return <p className="p-4 text-center">No predictions available.</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto bg-background rounded-lg">
      {/* Toggle create form */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setCreating((c) => !c)}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-lg font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition"
        >
          {creating ? 'Cancel Prediction' : 'Make Prediction'}
        </button>
      </div>

      {creating && (
        <div className="mb-6">
          <CreatePredictionForm onCreated={() => setCreating(false)} />
        </div>
      )}

      <ul className="space-y-6">
        {predictions.map((pred) => (
          <li
            key={pred.id}
            className="relative bg-surface border border-muted p-6 rounded-2xl shadow hover:shadow-lg transition"
          >
            <span
              className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                pred.resolved
                  ? 'bg-gray-400 text-white'
                  : new Date() > new Date(pred.expiresAt)
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
              }`}
            >
              {pred.resolved
                ? 'Resolved'
                : new Date() > new Date(pred.expiresAt)
                  ? 'Expired'
                  : 'Open'}
            </span>

            <h2 className="text-2xl font-semibold mb-2">{pred.title}</h2>
            <p className="mb-3 text-base">{pred.description}</p>

            {!pred.resolved &&
              (new Date() > new Date(pred.expiresAt) ? (
                <p className="text-sm text-red-600 font-medium mb-4">
                  Expired at: {new Date(pred.expiresAt).toLocaleString()}
                </p>
              ) : (
                <p className="text-sm text-green-500 font-medium mb-4">
                  Expires at: {new Date(pred.expiresAt).toLocaleString()}
                </p>
              ))}

            <OddsBar yesPct={pred.odds.yes} noPct={pred.odds.no} />
            {pred.bets.length > 0 && <BetsList bets={pred.bets} />}

            <div className="mt-6 flex flex-wrap gap-3">
              {!pred.resolved && <BetForm predictionId={pred.id} onPlaced={refresh} />}
              {isAdmin && !pred.resolved && (
                <ResolvePrediction predictionId={pred.id} onResolved={refresh} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
