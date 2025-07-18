// apps/client/src/components/dashboard/ParlayPanel.tsx
import { useState, useMemo } from 'react';
import { useParlay } from '../../contexts/ParlayContext';
import { usePredictionMarket } from '../../contexts/PredictionMarketContext';
import ParlayModal from '../ParlayModal';

export default function ParlayPanel() {
  const { state } = useParlay();
  const { predictions } = usePredictionMarket();
  const [open, setOpen] = useState(false);

  /* ---------- Helpers ---------- */
  const getLegOdds = (leg: { predictionId: number; optionId: number }) => {
    const pred = predictions.find((p) => p.id === leg.predictionId);
    const opt = pred?.options.find((o) => o.id === leg.optionId);
    return opt?.odds ?? 1;
  };

  /* ---------- Derived numbers ---------- */
  const { combinedOdds, payout } = useMemo(() => {
    const oddsProduct = state.legs.reduce((acc, leg) => acc * getLegOdds(leg), 1);
    return {
      combinedOdds: oddsProduct,
      payout: Math.floor(state.amount * oddsProduct),
    };
  }, [state.legs, state.amount, predictions.length]);

  /* ---------- UI ---------- */
  return (
    <>
      <div className="bg-surface border border-muted rounded-2xl p-4 shadow space-y-3">
        <h2 className="text-lg font-semibold">Parlay Builder</h2>

        {state.legs.length === 0 ? (
          <p className="italic text-tertiary">Add legs from the list →</p>
        ) : (
          <>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {state.legs.map((leg, i) => {
                const odds = getLegOdds(leg);
                return (
                  <li key={i} className="flex justify-between">
                    <span>#{leg.predictionId}</span>
                    <span>@ {odds.toFixed(2)}×</span>
                  </li>
                );
              })}
            </ul>

            {/* summary rows */}
            <div className="flex justify-between text-sm font-medium">
              <span>Stake</span>
              <span>{state.amount || '–'} 🪙</span>
            </div>

            <div className="flex justify-between text-sm font-medium">
              <span>Combined&nbsp;Odds</span>
              <span>{combinedOdds.toFixed(2)}×</span>
            </div>

            <div className="flex justify-between text-sm font-medium">
              <span>Payout</span>
              <span>{state.amount ? payout : '–'} 🪙</span>
            </div>

            <button
              onClick={() => setOpen(true)}
              className="w-full mt-2 py-2 rounded-lg bg-primary text-surface font-bold disabled:opacity-50"
              disabled={state.legs.length === 0}
            >
              Review&nbsp;&amp;&nbsp;Place
            </button>
          </>
        )}
      </div>

      <ParlayModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
