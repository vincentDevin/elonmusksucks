import BetForm from '../components/BetForm';
import { usePredictions } from '../hooks/usePredictions';

export default function Predictions() {
  const { predictions, loading, error, refresh } = usePredictions();

  if (loading) return <p className="p-4">Loading predictions...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error.toString()}</p>;

  if (Array.isArray(predictions) && predictions.length === 0) {
    return <p className="p-4">No predictions available.</p>;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto bg-background text-content transition-colors duration-300">
      <h1 className="text-3xl font-bold mb-4">Predictions</h1>
      <button onClick={refresh} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded">
        Refresh
      </button>
      <ul className="space-y-4">
        {Array.isArray(predictions)
          ? predictions.map((pred) => (
              <li
                key={pred.id}
                className="bg-surface border border-muted p-4 rounded shadow transition-colors duration-300"
              >
                <h2 className="text-xl font-semibold">{pred.title}</h2>
                <p className="text-muted">{pred.description}</p>
                <p className="text-sm text-secondary">
                  Expires at: {new Date(pred.expiresAt).toLocaleString()}
                </p>
                <p className="text-sm text-content">
                  Status: {pred.resolved ? `Resolved (${pred.outcome})` : 'Open'}
                </p>
                {!pred.resolved && <BetForm predictionId={pred.id} onPlaced={refresh} />}
              </li>
            ))
          : null}
      </ul>
    </div>
  );
}
