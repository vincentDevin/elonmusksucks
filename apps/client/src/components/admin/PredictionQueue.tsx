import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';

const PredictionQueue: React.FC = () => {
  const { pendingPredictions, approvePrediction, rejectPrediction } = useAdmin();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">Prediction Approval Queue</h2>
      <ul className="space-y-2">
        {pendingPredictions.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between border border-[var(--color-muted)] p-2 rounded bg-[var(--color-surface)]"
          >
            <span>{p.title}</span>
            <div className="space-x-2">
              <button
                className="px-3 py-1 bg-green-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                onClick={() => approvePrediction(p.id)}
              >
                Approve
              </button>
              <button
                className="px-3 py-1 bg-red-500 text-[var(--color-surface)] rounded cursor-pointer hover:opacity-90 transition"
                onClick={() => rejectPrediction(p.id)}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
        {pendingPredictions.length === 0 && (
          <li className="text-[var(--color-tertiary)]">No pending predictions.</li>
        )}
      </ul>
    </section>
  );
};

export default PredictionQueue;
