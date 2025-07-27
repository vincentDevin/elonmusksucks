// apps/client/src/components/ParlayModal.tsx
// -----------------------------------------------------------------------------
// Modal to review and place a parlay built in ParlayContext.
// Relies on the unified PredictionContext + ParlayContext.
// -----------------------------------------------------------------------------

import { useState, useEffect, useMemo } from 'react';
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

  /* ---------- Helpers ---------- */
  const findPrediction = (predId: number) => predictions.find((p) => p.id === predId);

  const findOption = (predId: number, optId: number): PublicPredictionOption | undefined =>
    findPrediction(predId)?.options.find((o) => o.id === optId);

  /* ---------- Enhanced parlay calculations ---------- */
  const parlayCalculations = useMemo(() => {
    const individualOdds = state.legs.map(leg => {
      const option = findOption(leg.predictionId, leg.optionId);
      return option?.odds ?? 1;
    });
    
    const baseCombined = individualOdds.reduce((acc, odds) => acc * odds, 1);
    const legCount = state.legs.length;
    
    let bonusMultiplier = 1;
    if (legCount >= 2) {
      bonusMultiplier = Math.pow(1.15, legCount - 1);
      bonusMultiplier = Math.min(bonusMultiplier, 2.0);
    }
    
    const finalOdds = baseCombined * bonusMultiplier;
    
    return {
      baseCombinedOdds: baseCombined,
      bonusMultiplier,
      finalOdds,
      payout: Math.floor(state.amount * finalOdds),
      legCount
    };
  }, [state.legs, state.amount, predictions, findOption]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parlay failed');
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 p-6 bg-surface text-content rounded-2xl shadow-xl space-y-4 border border-muted">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your Parlay</h2>
        {parlayCalculations.bonusMultiplier > 1 && (
          <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
            <span>🎉</span>
            <span>BONUS!</span>
          </div>
        )}
      </div>

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

      {/* Stake display (read-only, managed in parlay builder) */}
      <div className="bg-muted rounded-lg p-3">
        <div className="flex justify-between text-sm font-medium">
          <span>Your Stake:</span>
          <span className="text-lg font-bold">{state.amount} 🪙</span>
        </div>
        <p className="text-xs text-tertiary mt-1">
          💡 Adjust amount in the Parlay Builder →
        </p>
      </div>

      {/* Enhanced payout summary */}
      {state.amount > 0 && state.legs.length > 0 && (
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Odds:</span>
            <span>{parlayCalculations.baseCombinedOdds.toFixed(2)}×</span>
          </div>
          {parlayCalculations.bonusMultiplier > 1 && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
              <span>🎉 {parlayCalculations.legCount}-Leg Bonus:</span>
              <span>+{((parlayCalculations.bonusMultiplier - 1) * 100).toFixed(0)}%</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-muted pt-2">
            <span>Final Payout:</span>
            <span className="text-green-600">{parlayCalculations.payout.toLocaleString()} 🪙</span>
          </div>
        </div>
      )}

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
          className={`px-6 py-2 rounded font-bold disabled:opacity-50 transition-all duration-200 ${
            parlayCalculations.bonusMultiplier > 1
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700'
              : 'bg-primary text-surface hover:opacity-90'
          }`}
        >
          {placing ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin">⏳</span>
              <span>Placing...</span>
            </span>
          ) : parlayCalculations.bonusMultiplier > 1 ? (
            <span className="flex items-center space-x-1">
              <span>🚀</span>
              <span>Place Bonus Parlay</span>
            </span>
          ) : (
            'Place Parlay'
          )}
        </button>
      </div>
    </div>
  );
}
