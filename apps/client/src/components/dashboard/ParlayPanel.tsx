// apps/client/src/components/dashboard/ParlayPanel.tsx
import { useState, useMemo, useEffect } from 'react';
import { useParlay } from '../../contexts/ParlayContext';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import { useSocket } from '../../contexts/SocketContext';
import ParlayModal from '../ParlayModal';

export default function ParlayPanel() {
  const { state, dispatch } = useParlay();
  const { predictions } = usePredictionMarket();
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  /* ---------- Helpers ---------- */
  /** Return current odds for the given leg (falls back to 1). */
  const getLegOdds = (leg: { predictionId: number; optionId: number }) => {
    const pred = predictions.find((p) => p.id === leg.predictionId);
    const opt = pred?.options.find((o: any) => o.id === leg.optionId);
    return opt?.odds ?? 1;
  };

  /* ---------- Lookup helpers ---------- */
  const findPrediction = (predId: number) => predictions.find((p) => p.id === predId);

  const findOption = (predId: number, optId: number) =>
    findPrediction(predId)?.options.find((o: any) => o.id === optId);

  /* ---------- Enhanced parlay calculations with bonuses ---------- */
  const { baseCombinedOdds, bonusMultiplier, finalOdds, payout, legCount } = useMemo(() => {
    const individualOdds = state.legs.map((leg) => getLegOdds(leg));
    const baseCombined = individualOdds.reduce((acc, odds) => acc * odds, 1);
    const legCount = state.legs.length;

    // Apply exciting bonus multipliers for more legs!
    let bonusMultiplier = 1;
    if (legCount >= 2) {
      bonusMultiplier = Math.pow(1.15, legCount - 1);
      bonusMultiplier = Math.min(bonusMultiplier, 2.0); // Cap at 2.0x
    }

    const finalOdds = baseCombined * bonusMultiplier;

    return {
      baseCombinedOdds: baseCombined,
      bonusMultiplier,
      finalOdds,
      payout: Math.floor(state.amount * finalOdds),
      legCount,
    };
  }, [state.legs, state.amount, getLegOdds]);

  /* ---------- Risk level calculation ---------- */
  const getRiskLevel = () => {
    if (legCount <= 1) return { level: 'Single', color: 'text-gray-500', emoji: '📈' };
    if (legCount === 2) return { level: 'Low Risk', color: 'text-green-500', emoji: '🟢' };
    if (legCount === 3) return { level: 'Medium Risk', color: 'text-yellow-500', emoji: '🟡' };
    if (legCount === 4) return { level: 'High Risk', color: 'text-orange-500', emoji: '🟠' };
    return { level: 'EXTREME RISK', color: 'text-red-500 font-bold', emoji: '🔥' };
  };

  const riskInfo = getRiskLevel();

  /* ---------- Real-time odds updates ---------- */
  useEffect(() => {
    if (!socket) return;

    const handleBetPlaced = () => {
      // When someone places a bet, odds may change - trigger recalculation animation
      setIsCalculating(true);
      setTimeout(() => setIsCalculating(false), 500);
      // The prediction context already handles the actual data refresh
    };

    const handlePredictionUpdate = () => {
      setIsCalculating(true);
      setTimeout(() => setIsCalculating(false), 500);
    };

    socket.on('betPlaced', handleBetPlaced);
    socket.on('predictionCreated', handlePredictionUpdate);
    socket.on('predictionResolved', handlePredictionUpdate);

    return () => {
      socket.off('betPlaced', handleBetPlaced);
      socket.off('predictionCreated', handlePredictionUpdate);
      socket.off('predictionResolved', handlePredictionUpdate);
    };
  }, [socket]);

  /* ---------- UI ---------- */
  return (
    <>
      <div className="bg-surface border border-muted rounded-2xl p-4 shadow space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Parlay Builder</h2>
          {state.legs.length > 0 && (
            <div className={`text-sm ${riskInfo.color} flex items-center space-x-1`}>
              <span>{riskInfo.emoji}</span>
              <span>{riskInfo.level}</span>
            </div>
          )}
        </div>

        {state.legs.length === 0 ? (
          <p className="italic text-tertiary">Add legs from the list →</p>
        ) : (
          <>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {state.legs.map((leg, i) => {
                const odds = getLegOdds(leg);
                const pred = findPrediction(leg.predictionId);
                const opt = findOption(leg.predictionId, leg.optionId);

                return (
                  <li key={i} className="flex justify-between">
                    <div className="flex flex-col pr-2">
                      <span className="font-medium truncate">
                        {pred ? pred.title : `Prediction #${leg.predictionId}`}
                      </span>
                      <span className="text-xs text-tertiary truncate">
                        {opt?.label ?? leg.label}
                      </span>
                    </div>
                    <span>@&nbsp;{odds.toFixed(2)}×</span>
                  </li>
                );
              })}
            </ul>

            {/* Enhanced wager amount input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Wager Amount</label>
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
                placeholder="Enter amount..."
                className="w-full border border-muted p-3 rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div className="flex justify-between text-sm">
              <span>Base Odds</span>
              <span>{baseCombinedOdds.toFixed(2)}×</span>
            </div>

            {bonusMultiplier > 1 && (
              <div className="flex justify-between text-sm text-green-600 font-semibold animate-pulse">
                <span className="flex items-center">🎉 {legCount}-Leg Bonus</span>
                <span>+{((bonusMultiplier - 1) * 100).toFixed(0)}%</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold border-t border-muted pt-2">
              <span>Final Odds</span>
              <span
                className={`transition-all duration-300 ${
                  isCalculating
                    ? 'scale-110 text-blue-500'
                    : bonusMultiplier > 1
                      ? 'text-green-600'
                      : ''
                }`}
              >
                {finalOdds.toFixed(2)}×
              </span>
            </div>

            <div className="flex justify-between text-sm font-medium">
              <span>Potential Payout</span>
              <span
                className={`transition-all duration-300 ${
                  isCalculating
                    ? 'scale-110 text-blue-500'
                    : bonusMultiplier > 1
                      ? 'text-green-600 font-bold'
                      : ''
                }`}
              >
                {state.amount ? payout.toLocaleString() : '–'} 🪙
              </span>
            </div>

            {/* Profit potential bar */}
            {state.amount > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-tertiary mb-1">
                  <span>Profit Potential</span>
                  <span>+{(((payout - state.amount) / state.amount) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      finalOdds < 2
                        ? 'bg-green-400'
                        : finalOdds < 5
                          ? 'bg-yellow-400'
                          : finalOdds < 10
                            ? 'bg-orange-400'
                            : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min((finalOdds / 20) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setOpen(true)}
              className={`w-full mt-2 py-2 rounded-lg font-bold disabled:opacity-50 transition-all duration-200 ${
                bonusMultiplier > 1
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700'
                  : 'bg-primary text-surface hover:opacity-90'
              }`}
              disabled={state.legs.length === 0}
            >
              {bonusMultiplier > 1 ? '🎉 Review Bonus Parlay' : 'Review & Place'}
            </button>
          </>
        )}
      </div>

      <ParlayModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
