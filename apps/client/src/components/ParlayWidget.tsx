// apps/client/src/components/ParlayWidget.tsx
import { useState, useMemo } from 'react';
import { useParlay } from '../contexts/ParlayContext';
import { usePredictions } from '../hooks/usePredictions';
import { useBetting } from '../hooks/useBetting';
import ParlayModal from './ParlayModal';

export default function ParlayWidget() {
  const { state } = useParlay();
  const { predictions } = usePredictions();
  const { placeParlay } = useBetting();
  const [isOpen, setIsOpen] = useState(false);

  const { combinedOdds, potentialPayout } = useMemo(() => {
    let odds = 1;
    for (const leg of state.legs) {
      const pred = predictions.find((p) => p.id === leg.predictionId);
      const opt = pred?.options.find((o) => o.id === leg.optionId);
      if (opt) odds *= opt.odds;
    }
    return {
      combinedOdds: odds,
      potentialPayout: Math.floor(state.amount * odds),
    };
  }, [state.legs, state.amount, predictions]);

  // hide if nothing to show
  if (state.legs.length === 0) return null;

  return (
    <>
      {/* absolutely positioned under the nav at top-right */}
      <button
        onClick={() => setIsOpen(true)}
        className="
          absolute top-4 right-10
          bg-indigo-600 text-white 
          px-4 py-2 rounded-full 
          shadow-lg hover:bg-indigo-700 
          transition cursor-pointer
        "
      >
        Parlay: {state.legs.length} leg{state.legs.length > 1 ? 's' : ''}
        {` — Stake: ${state.amount || '-'} 🪙 — Payout: ${potentialPayout || '-'} 🪙`}
      </button>

      {isOpen && (
        <ParlayModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          combinedOdds={combinedOdds}
          potentialPayout={potentialPayout}
          placeParlay={() =>
            placeParlay({
              legs: state.legs.map((l) => ({ optionId: l.optionId })),
              amount: state.amount,
            }).then(() => setIsOpen(false))
          }
        />
      )}
    </>
  );
}
