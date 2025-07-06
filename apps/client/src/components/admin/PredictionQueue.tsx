// apps/client/src/components/admin/PredictionQueue.tsx
import { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import * as adminApi from '../../api/admin';
import type { PublicPrediction, PublicPredictionOption } from '@ems/types';
import { format } from 'date-fns';

interface AdminPrediction extends PublicPrediction {
  options: PublicPredictionOption[];
}

export default function PredictionQueue() {
  const { approvePrediction, rejectPrediction, resolvePrediction } = useAdmin();

  const [allPredictions, setAllPredictions] = useState<AdminPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<Record<number, number>>({});

  // fetch all predictions
  const load = async () => {
    setLoading(true);
    try {
      const preds = await adminApi.listPredictions();
      // cast into AdminPrediction locally
      setAllPredictions(preds as AdminPrediction[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = allPredictions.filter((p) => !p.approved);
  const resolvable = allPredictions.filter((p) => p.approved && !p.resolved);

  if (loading) {
    return <p className="p-4 text-center">Loading…</p>;
  }

  return (
    <section className="space-y-8">
      {/* Approval Queue */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Approval Queue</h2>
        <ul className="space-y-2">
          {pending.length > 0 ? (
            pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border border-[var(--color-muted)] p-2 rounded bg-[var(--color-surface)]"
              >
                <span>{p.title}</span>
                <div className="space-x-2">
                  <button
                    onClick={async () => {
                      await approvePrediction(p.id);
                      await load();
                    }}
                    className="px-3 py-1 bg-green-500 text-[var(--color-surface)] rounded hover:opacity-90 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      await rejectPrediction(p.id);
                      await load();
                    }}
                    className="px-3 py-1 bg-red-500 text-[var(--color-surface)] rounded hover:opacity-90 transition"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-[var(--color-tertiary)]">No pending predictions.</li>
          )}
        </ul>
      </div>

      {/* Resolution Queue */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Resolution Queue</h2>
        {resolvable.length > 0 ? (
          <ul className="space-y-4">
            {resolvable.map((p) => {
              const isExpired = new Date(p.expiresAt) < new Date();
              return (
                <li key={p.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{p.title}</h3>
                    <span
                      className={`px-2 py-1 text-sm rounded-full ${
                        isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {isExpired ? 'Expired' : 'Open'} until{' '}
                      {format(new Date(p.expiresAt), 'yyyy-MM-dd')}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-tertiary)] mb-3">{p.description}</p>
                  {/* Options */}
                  {/* Options */}
                  <div className="flex space-x-3 overflow-x-auto py-2">
                    {p.options.map((opt: PublicPredictionOption) => {
                      const isSelected = selectedOption[p.id] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex-shrink-0 cursor-pointer select-none
                            flex flex-col items-center px-4 py-2 border rounded-lg transition
                            ${
                              isSelected
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-surface)]'
                                : 'border-[var(--color-muted)] bg-background text-content hover:shadow-md'
                            }
                          `}
                        >
                          {/* visually-hidden native input for form semantics */}
                          <input
                            type="radio"
                            name={`winner-${p.id}`}
                            value={opt.id}
                            checked={isSelected}
                            onChange={() =>
                              setSelectedOption((m) => ({
                                ...m,
                                [p.id]: opt.id,
                              }))
                            }
                            className="sr-only"
                          />
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-sm text-tertiary">{opt.odds.toFixed(2)}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Resolve button */}
                  <button
                    onClick={async () => {
                      const win = selectedOption[p.id];
                      if (!win) return;
                      setResolvingId(p.id);
                      try {
                        await resolvePrediction(p.id, win);
                        await load();
                      } finally {
                        setResolvingId(null);
                      }
                    }}
                    disabled={resolvingId === p.id || !selectedOption[p.id]}
                    className={`mt-3 w-full py-2 rounded font-medium transition
                      ${
                        selectedOption[p.id]
                          ? 'bg-[var(--color-primary)] text-[var(--color-surface)] hover:opacity-90'
                          : 'bg-[var(--color-muted)] text-[var(--color-tertiary)] cursor-not-allowed'
                      }
                    `}
                  >
                    {resolvingId === p.id ? 'Resolving…' : 'Resolve Prediction'}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[var(--color-tertiary)]">
            No approved predictions awaiting resolution.
          </p>
        )}
      </div>
    </section>
  );
}
