// apps/client/src/components/dashboard/PredictionsPanel.tsx
import { usePredictions } from '../../hooks/usePredictions';
import PredictionCard from '../PredictionCard'; // thin wrapper around your existing <li> markup

export default function PredictionsPanel() {
  const { predictions, loading, error } = usePredictions();

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="text-red-500">Error: {String(error)}</p>;

  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Open Predictions</h2>
      <ul className="space-y-4">
        {predictions
          .filter((p) => p.approved && !p.resolved)
          .map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
      </ul>
    </section>
  );
}
