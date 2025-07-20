// apps/client/src/components/ParlayModal.tsx
// -----------------------------------------------------------------------------
// Modal to review and place a parlay built in ParlayContext.
// Relies on the unified PredictionContext + ParlayContext.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useParlay } from '../contexts/ParlayContext';
import { usePredictionMarket } from '../contexts/PredictionContext';
import type { PublicPredictionOption } from '@ems/types';

interface ParlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ParlayModal({ isOpen, onClose }: ParlayModalProps) {
  // ⬇️ pull in clear() as well
  const { state, dispatch, clear } = useParlay();
  const { predictions, placeParlay } = usePredictionMarket();

  /* ---------- Local UI state ---------- */
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- Close on Escape ---------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ---------- Submission handler ---------- */
  const handlePlace = async () => {
    if (!state.legs.length || state.amount <= 0) return;
    setPlacing(true);
    setError(null);
    try {
      await placeParlay({ legs: state.legs, amount: state.amount });
      /** instant feedback – clear locally (idempotent even if socket event fires later) */
      clear();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Parlay failed');
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- Helpers ---------- */
  const findPrediction = (predId: number) => predictions.find((p) => p.id === predId);

  const findOption = (predId: number, optId: number): PublicPredictionOption | undefined =>
    findPrediction(predId)?.options.find((o) => o.id === optId);

  /* ---------- UI ---------- */
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 p-6 bg-surface text-content rounded-2xl shadow-xl space-y-4">
      <h2 className="text-lg font-medium">Your Parlay</h2>

      {/* Legs list */}
      <ul className="divide-y divide-muted max-h-60 overflow-y-auto">
        {state.legs.length ? (
          state.legs.map((leg, i) => {
            const pred = findPrediction(leg.predictionId);
            const opt = findOption(leg.predictionId, leg.optionId);
            return (
              <li
                key={`${leg.predictionId}-${leg.optionId}-${i}`}
                className="py-2 flex justify-between items-start space-x-2"
              >
                <div className="flex-1">
                  <div className="font-semibold">
                    {pred ? pred.title : `Prediction #${leg.predictionId}`}
                  </div>
                  <div className="text-sm text-tertiary">{opt?.label ?? leg.label}</div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_LEG', optionId: leg.optionId })}
                  aria-label="Remove leg"
                  className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-100 transition"
                >
                  Remove
                </button>
              </li>
            );
          })
        ) : (
          <li className="py-2 text-center italic text-tertiary">No legs added.</li>
        )}
      </ul>

      {/* Stake input */}
      <div>
        <label className="block text-sm font-medium">Stake (🪙)</label>
        <input
          type="number"
          min={1}
          value={state.amount}
          onChange={(e) =>
            dispatch({
              type: 'SET_AMOUNT',
              amount: Number(e.target.value),
            })
          }
          className="mt-1 w-full border border-muted p-2 rounded bg-background text-content"
        />
      </div>

      {error && <p className="text-sm text-red-500">Error: {error}</p>}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            clear();
            onClose();
          }}
          className="px-4 py-2 bg-muted text-content rounded hover:bg-tertiary transition"
        >
          Clear
        </button>
        <button
          onClick={handlePlace}
          disabled={placing || !state.legs.length || state.amount <= 0}
          className="px-4 py-2 bg-primary text-surface rounded hover:opacity-90 disabled:opacity-50 transition"
        >
          {placing ? 'Placing…' : 'Place Parlay'}
        </button>
      </div>
    </div>
  );
}
