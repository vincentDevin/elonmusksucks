// apps/client/src/components/dashboard/PredictionsPanel.tsx
import { usePredictionMarket } from '../../contexts/PredictionContext';
import UnifiedPredictionCard from '../UnifiedPredictionCard';

export default function PredictionsPanel() {
  const { predictions, loading, error } = usePredictionMarket();

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="text-red-500">Error: {String(error)}</p>;

  // Filter for only open predictions (approved, not resolved, not expired)
  const openPredictions = predictions.filter((p) => {
    const now = Date.now();
    const expires = new Date(p.expiresAt).getTime();
    return p.approved && !p.resolved && now <= expires;
  });

  return (
    <section className="bg-surface border border-muted rounded-2xl p-4 shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-content">Open Predictions</h2>
      
      {/* Scrollable container with max height */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60">
        {openPredictions.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <div className="text-4xl mb-2">📊</div>
            <p>No open predictions available</p>
          </div>
        ) : (
          <div className="space-y-4 pr-2">
            {openPredictions.map((p) => (
              <UnifiedPredictionCard 
                key={p.id} 
                prediction={p} 
                variant="compact"
                showParlayActions={true}
                showBetsList={false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
