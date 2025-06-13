import { useState } from 'react';
import BetForm from '../components/BetForm';
import CreatePredictionForm from '../components/CreatePredictionForm';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';
import ResolvePrediction from '../components/ResolvePrediction';
import OddsBar from '../components/OddsBar';
import BetsList from '../components/BetsList';

export default function Predictions() {
  const { predictions, loading, error, refresh } = usePredictions();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [creating, setCreating] = useState(false);

  if (loading) {
    return <p className="p-4 text-center">Loading predictions…</p>;
  }
  if (error) {
    return <p className="p-4 text-center text-red-500">Error: {error.toString()}</p>;
  }
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return <p className="p-4 text-center">No predictions available.</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto bg-background rounded-lg">
      {/* Make Prediction */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setCreating((c) => !c)}
          className="
            px-6 py-3 
            bg-green-500 hover:bg-green-600 active:bg-green-700 
            text-white text-lg font-bold 
            rounded-full 
            shadow-xl hover:shadow-2xl 
            transform hover:scale-105 transition
          "
        >
          {creating ? 'Cancel Prediction' : 'Make Prediction'}
        </button>
      </div>

      {creating && (
        <div className="mb-6">
          <CreatePredictionForm onCreated={() => setCreating(false)} />
        </div>
      )}

      {/* Predictions List */}
      <ul className="space-y-6">
        {predictions.map((pred) => (
          <li
            key={pred.id}
            className="
              relative
              bg-surface border border-muted p-6 
              rounded-2xl shadow hover:shadow-lg 
              transition
            "
          >
            {/* Status badge */}
            <span
              className={`
                absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium 
                ${pred.resolved ? 'bg-gray-400 text-white' : new Date() > new Date(pred.expiresAt) ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}
              `}
            >
              {pred.resolved
                ? 'Resolved'
                : new Date() > new Date(pred.expiresAt)
                  ? 'Expired'
                  : 'Open'}
            </span>

            {/* Title & Description */}
            <h2 className="text-2xl font-semibold mb-2">{pred.title}</h2>
            <p className="mb-3 text-base">{pred.description}</p>

            {/* Expires info */}
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

            {/* Odds + Bets */}
            {pred.odds && <OddsBar yesPct={pred.odds.yes} noPct={pred.odds.no} />}
            {Array.isArray(pred.bets) && pred.bets.length > 0 && <BetsList bets={pred.bets} />}

            {/* Actions */}
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
