// apps/client/src/components/dashboard/ParlayPanel.tsx
// Rollback: git checkout HEAD -- apps/client/src/components/dashboard/ParlayPanel.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { SOCKET_EVENTS } from '@ems/types';
import { useParlay } from '../../contexts/ParlayContext';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatMuskBucks } from '../../utils/formatting';

export default function ParlayPanel() {
  const { state, dispatch, clear } = useParlay();
  const { predictions, placeParlay } = usePredictionMarket();
  const socket = useSocket();
  const { user } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = Number(user?.muskBucks ?? 0);

  /* ---------- Helpers ---------- */
  const findPrediction = (predId: number) => predictions.find((p) => p.id === predId);

  const findOption = (predId: number, optId: number) =>
    findPrediction(predId)?.options.find((o: any) => o.id === optId);

  /** Return current odds for the given leg (falls back to 1). */
  const getLegOdds = (leg: { predictionId: number; optionId: number }) => {
    const opt = findOption(leg.predictionId, leg.optionId);
    return opt?.odds ?? 1;
  };

  /* ---------- Enhanced parlay calculations with bonuses and excitement ---------- */
  const parlayCalculations = useMemo(() => {
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
    const basePayout = Math.floor(state.amount * finalOdds);

    // 🎯 Wager excitement level calculation
    let wagerLevel = 'Conservative';
    let wagerEmoji = '😌';
    let excitementLevel = 'normal';

    if (state.amount > balance * 0.8) {
      wagerLevel = 'YOLO 🚀🚀🚀';
      wagerEmoji = '🚀';
      excitementLevel = 'yolo';
    } else if (state.amount > balance * 0.5) {
      wagerLevel = 'HIGH RISK';
      wagerEmoji = '🔥';
      excitementLevel = 'high';
    } else if (state.amount > balance * 0.3) {
      wagerLevel = 'Aggressive';
      wagerEmoji = '⚡';
      excitementLevel = 'aggressive';
    } else if (state.amount > balance * 0.1) {
      wagerLevel = 'Moderate';
      wagerEmoji = '📈';
      excitementLevel = 'moderate';
    }

    // 🚀 ALL-IN bonus detection for parlays
    const isAllIn = state.amount >= balance * 0.95;
    const allInMultiplier = isAllIn ? 1.5 : 1.0; // Extra 50% bonus for all-in parlays
    const finalPayout = isAllIn ? Math.floor(basePayout * allInMultiplier) : basePayout;
    const profit = finalPayout - state.amount;
    const profitPercent = state.amount > 0 ? (profit / state.amount) * 100 : 0;

    return {
      baseCombinedOdds: baseCombined,
      bonusMultiplier,
      finalOdds,
      payout: finalPayout,
      legCount,
      individualOdds,
      wagerLevel,
      wagerEmoji,
      excitementLevel,
      isAllIn,
      allInMultiplier,
      profit,
      profitPercent,
      balanceAfter: balance - state.amount,
      isYolo: state.amount > balance * 0.8,
      isHugeNumber: finalPayout > Number.MAX_SAFE_INTEGER,
    };
  }, [state.legs, state.amount, balance]);

  /* ---------- Risk level calculation ---------- */
  const getRiskLevel = () => {
    const { legCount } = parlayCalculations;
    if (legCount <= 1) return { level: 'Single', color: 'text-gray-500', emoji: '📈' };
    if (legCount === 2) return { level: 'Low Risk', color: 'text-green-500', emoji: '🟢' };
    if (legCount === 3) return { level: 'Medium Risk', color: 'text-yellow-500', emoji: '🟡' };
    if (legCount === 4) return { level: 'High Risk', color: 'text-orange-500', emoji: '🟠' };
    return { level: 'EXTREME RISK', color: 'text-red-500 font-bold', emoji: '🔥' };
  };

  const riskInfo = getRiskLevel();

  /* ---------- Memoized socket handlers to prevent recreation ---------- */
  const handleBetPlaced = useCallback(() => {
    // When someone places a bet, odds may change - trigger recalculation animation
    setIsCalculating(true);
    setTimeout(() => setIsCalculating(false), 500);
  }, []);

  const handlePredictionUpdate = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => setIsCalculating(false), 500);
  }, []);

  /* ---------- Real-time odds updates ---------- */
  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.BET_PLACED, handleBetPlaced);
    socket.on(SOCKET_EVENTS.PREDICTION_CREATED, handlePredictionUpdate);
    socket.on(SOCKET_EVENTS.PREDICTION_RESOLVED, handlePredictionUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.BET_PLACED, handleBetPlaced);
      socket.off(SOCKET_EVENTS.PREDICTION_CREATED, handlePredictionUpdate);
      socket.off(SOCKET_EVENTS.PREDICTION_RESOLVED, handlePredictionUpdate);
    };
  }, [socket, handleBetPlaced, handlePredictionUpdate]);

  /* ---------- Parlay placement handler ---------- */
  const handlePlaceParlay = async () => {
    if (!state.legs.length || state.amount <= 0) return;
    setPlacing(true);
    setError(null);
    try {
      await placeParlay({ legs: state.legs, amount: state.amount });
      // Clear parlay after successful placement
      clear();
      setIsExpanded(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parlay failed');
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="bg-surface border border-muted rounded-2xl p-4 shadow space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Parlay Builder</h2>
        <div className="flex items-center space-x-2">
          {state.legs.length > 0 && (
            <>
              <div className={`text-sm ${riskInfo.color} flex items-center space-x-1`}>
                <span>{riskInfo.emoji}</span>
                <span>{riskInfo.level}</span>
              </div>
              {parlayCalculations.bonusMultiplier > 1 && (
                <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                  <span>🎉</span>
                  <span>BONUS!</span>
                </div>
              )}
              {parlayCalculations.isAllIn && (
                <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
                  <span>🚀</span>
                  <span>ALL IN!</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {state.legs.length === 0 ? (
        <p className="italic text-tertiary">Add legs from the list →</p>
      ) : (
        <>
          {/* Legs list with remove functionality */}
          <ul
            className={`text-sm space-y-1 overflow-y-auto ${isExpanded ? 'max-h-60' : 'max-h-40'}`}
          >
            {state.legs.map((leg, i) => {
              const odds = getLegOdds(leg);
              const pred = findPrediction(leg.predictionId);
              const opt = findOption(leg.predictionId, leg.optionId);
              const allOptions = pred?.options || [];

              return (
                <li
                  key={`${leg.predictionId}-${leg.optionId}-${i}`}
                  className="flex flex-col space-y-2 py-2 border-b border-muted last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {pred ? pred.title : `Prediction #${leg.predictionId}`}
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_LEG', optionId: leg.optionId })}
                      aria-label="Remove leg"
                      className="ml-2 text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-100 transition"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Option selector for this leg */}
                  {allOptions.length > 1 ? (
                    <select
                      value={leg.optionId}
                      onChange={(e) => {
                        const newOptionId = Number(e.target.value);
                        const newOption = allOptions.find((opt) => opt.id === newOptionId);
                        if (newOption) {
                          dispatch({
                            type: 'ADD_LEG', // This will replace existing leg for same prediction
                            leg: {
                              optionId: newOptionId,
                              predictionId: leg.predictionId,
                              label: newOption.label,
                              predictionTitle: leg.predictionTitle,
                              odds: newOption.odds,
                            },
                          });
                        }
                      }}
                      className="w-full text-sm border border-muted rounded-md px-2 py-1 bg-background text-content focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled={placing}
                    >
                      {allOptions.map((option: any) => (
                        <option key={option.id} value={option.id}>
                          {option.label} (@{option.odds?.toFixed(2) || '1.00'}×)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-tertiary flex items-center justify-between">
                      <span className="truncate">{opt?.label ?? leg.label}</span>
                      <span className="ml-2 flex-shrink-0">@&nbsp;{odds.toFixed(2)}×</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Enhanced wager amount input with percentage buttons */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Wager Amount</label>
            <input
              type="number"
              min={1}
              max={balance}
              value={state.amount}
              onChange={(e) =>
                dispatch({
                  type: 'SET_AMOUNT',
                  amount: Math.min(Number(e.target.value), balance),
                })
              }
              placeholder="Enter amount..."
              className={`w-full border border-muted p-3 rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                parlayCalculations.excitementLevel === 'yolo'
                  ? 'ring-2 ring-red-500 border-red-500'
                  : parlayCalculations.excitementLevel === 'high'
                    ? 'ring-1 ring-orange-500 border-orange-500'
                    : ''
              }`}
              disabled={placing}
            />

            {/* Quick amount percentage buttons */}
            <div className="flex gap-2">
              {[0.1, 0.25, 0.5, 1.0].map((percent) => (
                <button
                  key={percent}
                  onClick={() =>
                    dispatch({
                      type: 'SET_AMOUNT',
                      amount: Math.floor(balance * percent),
                    })
                  }
                  className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-secondary rounded transition-colors"
                  disabled={placing || balance === 0}
                >
                  {percent === 1.0 ? 'ALL IN' : `${percent * 100}%`}
                </button>
              ))}
            </div>

            {/* Balance display */}
            <div className="text-xs text-tertiary">Balance: {formatMuskBucks(balance)} 🪙</div>
          </div>

          {/* Wager level display */}
          {state.amount > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span>Wager Level:</span>
              <div
                className={`font-semibold flex items-center space-x-1 ${
                  parlayCalculations.excitementLevel === 'yolo'
                    ? 'text-red-600'
                    : parlayCalculations.excitementLevel === 'high'
                      ? 'text-orange-600'
                      : parlayCalculations.excitementLevel === 'aggressive'
                        ? 'text-yellow-600'
                        : parlayCalculations.excitementLevel === 'moderate'
                          ? 'text-blue-600'
                          : 'text-green-600'
                }`}
              >
                <span>{parlayCalculations.wagerEmoji}</span>
                <span>{parlayCalculations.wagerLevel}</span>
              </div>
            </div>
          )}

          {/* Odds and payout summary with dynamic styling */}
          <div
            className={`space-y-2 rounded-lg p-3 transition-all duration-300 ${
              state.amount > 0
                ? parlayCalculations.excitementLevel === 'yolo'
                  ? 'bg-red-600/5 border border-red-600/20'
                  : parlayCalculations.excitementLevel === 'high'
                    ? 'bg-orange-600/5 border border-orange-600/20'
                    : parlayCalculations.excitementLevel === 'aggressive'
                      ? 'bg-yellow-600/5 border border-yellow-600/20'
                      : 'bg-muted'
                : 'bg-muted'
            }`}
          >
            <div className="flex justify-between text-sm">
              <span>Base Odds</span>
              <span>{parlayCalculations.baseCombinedOdds.toFixed(2)}×</span>
            </div>

            {parlayCalculations.bonusMultiplier > 1 && (
              <div className="flex justify-between text-sm text-green-600 font-semibold animate-pulse">
                <span className="flex items-center">
                  🎉 {parlayCalculations.legCount}-Leg Bonus
                </span>
                <span>+{((parlayCalculations.bonusMultiplier - 1) * 100).toFixed(0)}%</span>
              </div>
            )}

            {parlayCalculations.isAllIn && (
              <div className="flex justify-between text-sm text-red-600 font-semibold animate-pulse">
                <span className="flex items-center">🚀 ALL-IN BONUS!</span>
                <span>+{((parlayCalculations.allInMultiplier - 1) * 100).toFixed(0)}%</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold border-t border-muted pt-2">
              <span>Final Odds</span>
              <span
                className={`transition-all duration-300 ${
                  isCalculating
                    ? 'scale-110 text-blue-500'
                    : parlayCalculations.excitementLevel === 'yolo'
                      ? 'text-red-600 animate-pulse'
                      : parlayCalculations.bonusMultiplier > 1
                        ? 'text-green-600'
                        : ''
                }`}
              >
                {parlayCalculations.finalOdds.toFixed(2)}×
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Profit:</span>
              <span className="font-bold text-green-600">
                +{parlayCalculations.profitPercent.toFixed(0)}%
              </span>
            </div>

            <div className="flex justify-between text-sm font-medium">
              <span>Potential Payout</span>
              <span
                className={`transition-all duration-300 ${
                  isCalculating
                    ? 'scale-110 text-blue-500'
                    : parlayCalculations.excitementLevel === 'yolo'
                      ? 'text-red-600 font-bold text-lg animate-pulse'
                      : parlayCalculations.excitementLevel === 'high'
                        ? 'text-orange-600 font-bold'
                        : parlayCalculations.bonusMultiplier > 1
                          ? 'text-green-600 font-bold'
                          : ''
                }`}
              >
                {state.amount ? formatMuskBucks(parlayCalculations.payout) : '–'} 🪙
              </span>
            </div>

            {state.amount > 0 && (
              <div className="flex justify-between text-sm text-tertiary">
                <span>Balance After:</span>
                <span
                  className={
                    parlayCalculations.balanceAfter < balance * 0.2
                      ? 'text-orange-600 font-semibold'
                      : ''
                  }
                >
                  {formatMuskBucks(parlayCalculations.balanceAfter)} 🪙
                </span>
              </div>
            )}
          </div>

          {/* Profit potential bar */}
          {state.amount > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-tertiary mb-1">
                <span>Profit Potential</span>
                <span>
                  +{(((parlayCalculations.payout - state.amount) / state.amount) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    parlayCalculations.finalOdds < 2
                      ? 'bg-green-400'
                      : parlayCalculations.finalOdds < 5
                        ? 'bg-yellow-400'
                        : parlayCalculations.finalOdds < 10
                          ? 'bg-orange-400'
                          : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min((parlayCalculations.finalOdds / 20) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Huge number precision warning */}
          {parlayCalculations.isHugeNumber && (
            <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-2">
              <p className="text-xs text-purple-600 font-semibold flex items-center">
                <span className="mr-1">🚀</span>
                ASTRONOMICAL PAYOUT: Numbers this large may have display precision limits!
              </p>
            </div>
          )}

          {/* Market impact warning */}
          {state.amount > 5000 && (
            <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-2">
              <p className="text-xs text-yellow-600 font-semibold flex items-center">
                <span className="mr-1">⚡</span>
                MARKET IMPACT: Your large bet may move the odds!
              </p>
            </div>
          )}

          {/* Error display */}
          {error && <p className="text-sm text-red-500">Error: {error}</p>}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isExpanded ? (
              <button
                onClick={() => setIsExpanded(true)}
                className={`w-full py-2 rounded-lg font-bold disabled:opacity-50 transition-all duration-200 ${
                  parlayCalculations.bonusMultiplier > 1
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700'
                    : 'bg-primary text-surface hover:opacity-90'
                }`}
                disabled={state.legs.length === 0 || placing}
              >
                {parlayCalculations.bonusMultiplier > 1
                  ? '🎉 Review Bonus Parlay'
                  : 'Review & Place'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    clear();
                    setIsExpanded(false);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-tertiary transition"
                  disabled={placing}
                >
                  Clear
                </button>
                <button
                  onClick={handlePlaceParlay}
                  disabled={placing || !state.legs.length || state.amount <= 0}
                  className={`flex-1 px-6 py-2 rounded-lg font-bold disabled:opacity-50 transition-all duration-200 ${
                    parlayCalculations.bonusMultiplier > 1
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700'
                      : 'bg-primary text-surface hover:opacity-90'
                  }`}
                >
                  {placing ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="animate-spin">⏳</span>
                      <span>Placing...</span>
                    </span>
                  ) : parlayCalculations.bonusMultiplier > 1 ? (
                    <span className="flex items-center justify-center space-x-1">
                      <span>🚀</span>
                      <span>Place Bonus Parlay</span>
                    </span>
                  ) : (
                    'Place Parlay'
                  )}
                </button>
              </>
            )}
          </div>

          {/* Detailed view in expanded mode */}
          {isExpanded && state.amount > 0 && (
            <div className="bg-muted rounded-lg p-3 mt-3 space-y-2">
              <div className="text-sm font-semibold mb-2">Parlay Summary</div>
              {state.legs.map((leg, i) => {
                const pred = findPrediction(leg.predictionId);
                const opt = findOption(leg.predictionId, leg.optionId);
                const odds = parlayCalculations.individualOdds[i];
                return (
                  <div key={`summary-${i}`} className="text-xs flex justify-between">
                    <span className="text-tertiary">
                      {pred?.title} - {opt?.label}
                    </span>
                    <span>{odds.toFixed(2)}×</span>
                  </div>
                );
              })}
              <div className="border-t border-muted pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span>Your Stake:</span>
                  <span className="font-bold">{formatMuskBucks(state.amount)} 🪙</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Total Return:</span>
                  <span className="font-bold text-green-600">
                    {formatMuskBucks(parlayCalculations.payout)} 🪙
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
