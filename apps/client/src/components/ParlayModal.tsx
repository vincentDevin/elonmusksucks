// apps/client/src/components/ParlayModal.tsx
import React, { useEffect } from 'react';
import { useParlay } from '../contexts/ParlayContext';
import { usePredictions } from '../hooks/usePredictions';

interface ParlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  combinedOdds: number;
  potentialPayout: number;
  placeParlay: () => Promise<any>;
}

export default function ParlayModal({
  isOpen,
  onClose,
  combinedOdds,
  potentialPayout,
  placeParlay,
}: ParlayModalProps) {
  const { state, dispatch } = useParlay();
  const { predictions } = usePredictions();
  const [placing, setPlacing] = React.useState(false);

  // close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handlePlace() {
    if (!state.legs.length || state.amount <= 0) return;
    setPlacing(true);
    try {
      await placeParlay();
      dispatch({ type: 'CLEAR' });
      onClose();
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={onClose}
    >
      <div
        className="bg-surface text-content rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium">Your Parlay</h2>

        <ul className="divide-y divide-muted">
          {state.legs.length ? (
            state.legs.map((leg, i) => {
              const pred = predictions.find((p) => p.id === leg.predictionId);
              const opt = pred?.options.find((o) => o.id === leg.optionId);
              return (
                <li
                  key={`${leg.predictionId}-${leg.optionId}-${i}`}
                  className="py-2 flex justify-between items-start space-x-2"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{pred?.title || `#${leg.predictionId}`}</div>
                    {opt && <div className="text-sm text-tertiary">{opt.label}</div>}
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_LEG', optionId: leg.optionId })}
                    aria-label="Remove leg"
                    className="
                      text-red-600 
                      hover:text-red-800 
                      px-2 py-1 
                      rounded 
                      hover:bg-red-100 
                      cursor-pointer
                      transition
                    "
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

        <div>
          <label className="block text-sm font-medium">Stake (🪙)</label>
          <input
            type="number"
            min={1}
            value={state.amount}
            onChange={(e) => dispatch({ type: 'SET_AMOUNT', amount: Number(e.target.value) })}
            className="mt-1 w-full border border-muted p-2 rounded bg-background text-content"
          />
        </div>

        <p className="text-sm">
          Combined odds: <strong>{combinedOdds.toFixed(2)}</strong>
        </p>
        <p className="text-sm">
          Potential payout: <strong>{potentialPayout.toLocaleString()} 🪙</strong>
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              dispatch({ type: 'CLEAR' });
              onClose();
            }}
            className="px-4 py-2 bg-muted text-content rounded hover:bg-tertiary transition cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={handlePlace}
            disabled={placing || !state.legs.length || state.amount <= 0}
            className="
              px-4 py-2 
              bg-primary text-surface 
              rounded 
              hover:opacity-90 
              disabled:opacity-50 
              transition
              cursor-pointer
            "
          >
            {placing ? 'Placing…' : 'Place Parlay'}
          </button>
        </div>
      </div>
    </div>
  );
}
