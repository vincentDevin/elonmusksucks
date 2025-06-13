import BetForm from './BetForm';
import { usePredictions } from '../hooks/usePredictions';
import { useAuth } from '../contexts/AuthContext';
import ResolvePrediction from './ResolvePrediction';
import OddsBar from './OddsBar';

export function PredictionsComponent() {
  const { predictions, loading, error, refresh } = usePredictions();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

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
    <div className="space-y-2">
      {predictions.map((pred) => {
        const isExpired = new Date() > new Date(pred.expiresAt);
        return (
          <div
            key={pred.id}
            className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-surface transition"
          >
            <div className="flex-1 pr-4">
              <h3 className="font-medium text-base">{pred.title}</h3>
              <p className="text-sm text-gray-400">{pred.description}</p>
              <p className={`text-xs mt-1 ${isExpired ? 'text-red-500' : 'text-green-500'}`}>
                Expires at: {new Date(pred.expiresAt).toLocaleString()}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end">
              {pred.odds && <OddsBar yesPct={pred.odds.yes} noPct={pred.odds.no} />}
              <p className="text-xs text-gray-400 mt-1">
                {Array.isArray(pred.bets) ? pred.bets.length : 0} total bets
              </p>
            </div>
            <div className="flex-shrink-0 ml-4 flex flex-col gap-2">
              {!pred.resolved && <BetForm predictionId={pred.id} onPlaced={refresh} />}
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
