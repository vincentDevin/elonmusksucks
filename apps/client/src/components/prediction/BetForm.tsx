// apps/client/src/components/BetForm.tsx
// -----------------------------------------------------------------------------
// Collapsible form for placing a single bet via `bet:place` socket command.
// `addOptimisticBet` is optional; if omitted we rely solely on the
// `betPlaced` broadcast to update the UI.
// -----------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatMuskBucks } from '../../utils/formatting';
import type { PublicPredictionOption, BetWithUser } from '@ems/types';

interface BetFormProps {
  prediction: { id: number; options: PublicPredictionOption[] };
  addOptimisticBet?: (bet: BetWithUser) => void;
  onPlaced?: () => void;
}

export default function BetForm({ prediction, addOptimisticBet, onPlaced }: BetFormProps) {
  const { placeBet } = usePredictionMarket();
  const { user } = useAuth();

  const balance = user?.muskBucks ?? 0;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [optionId, setOptionId] = useState(prediction.options[0]?.id ?? 0);

  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🚀 Enhanced live calculations with excitement factors
  const betCalculations = useMemo(() => {
    const selectedOption = prediction.options.find((opt) => opt.id === optionId);
    if (!selectedOption || amount <= 0) {
      return {
        payout: 0,
        profit: 0,
        riskLevel: 'Conservative',
        marketImpact: false,
        oddsDisplay: selectedOption?.odds?.toFixed(2) || '0.00',
      };
    }

    const payout = Math.floor(amount * selectedOption.odds);
    const profit = payout - amount;

    // Risk level calculation
    let riskLevel = 'Conservative';
    if (amount > balance * 0.5) riskLevel = 'YOLO 🚀';
    else if (amount > balance * 0.3) riskLevel = 'Aggressive';
    else if (amount > balance * 0.1) riskLevel = 'Moderate';

    // Market impact (rough estimate)
    const marketImpact = amount > 100; // Big bets move markets

    return {
      payout,
      profit,
      riskLevel,
      marketImpact,
      oddsDisplay: selectedOption.odds.toFixed(2),
    };
  }, [amount, optionId, balance, prediction.options]);

  const submit = async () => {
    console.log('BetForm submit called', { amount, balance, optionId, placing });
    if (amount <= 0 || amount > balance || placing) {
      console.log('BetForm submit blocked', { amount, balance, placing });
      return;
    }
    console.log('BetForm calling placeBet');
    setPlacing(true);
    setErr(null);
    try {
      await placeBet({ optionId, amount });
      console.log('BetForm placeBet success');

      // optimistic UI update (optional)
      if (user && addOptimisticBet) {
        const optimistic: BetWithUser = {
          id: Date.now(),
          userId: user.id,
          predictionId: prediction.id,
          amount: amount.toString(),
          oddsAtPlacement: 0,
          potentialPayout: '0',
          status: 'PENDING' as any,
          optionId,
          won: null as any,
          payout: '0',
          createdAt: new Date(),
          user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
          },
        };
        addOptimisticBet(optimistic);
      }

      setOpen(false);
      setAmount(0);
      onPlaced?.();
    } catch (e: any) {
      console.error('BetForm placeBet error', e);
      setErr(e.message || 'Bet failed');
    } finally {
      setPlacing(false);
    }
  };

  if (balance === 0) {
    return <p className="mt-2 text-sm text-tertiary italic">You have no MuskBucks to bet.</p>;
  }

  if (open) {
    return (
      <div className="mt-4 p-4 bg-surface border border-muted rounded-lg space-y-4 transition-all duration-300">
        {/* Balance and Risk Level */}
        <div className="flex justify-between items-center">
          <p className="text-sm">
            Balance: <span className="font-semibold">{formatMuskBucks(balance)} 🪙</span>
          </p>
          <div
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              betCalculations.riskLevel === 'YOLO 🚀'
                ? 'bg-red-600/20 text-red-600'
                : betCalculations.riskLevel === 'Aggressive'
                  ? 'bg-orange-600/20 text-orange-600'
                  : betCalculations.riskLevel === 'Moderate'
                    ? 'bg-yellow-600/20 text-yellow-600'
                    : 'bg-green-600/20 text-green-600'
            }`}
          >
            {betCalculations.riskLevel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bet Amount</label>
            <input
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border p-3 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary border-muted transition-all"
              disabled={placing}
              placeholder="Enter amount..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Option</label>
            <select
              value={optionId}
              onChange={(e) => setOptionId(Number(e.target.value))}
              className="w-full border p-3 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary border-muted transition-all"
              disabled={placing}
            >
              {prediction.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} @ {opt.odds.toFixed(2)}×
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Calculations Display */}
        {amount > 0 && (
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Odds:</span>
              <span className="font-semibold">{betCalculations.oddsDisplay}×</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Potential Payout:</span>
              <span className="font-bold text-green-600">
                {formatMuskBucks(betCalculations.payout)} 🪙
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Profit:</span>
              <span
                className={`font-semibold ${betCalculations.profit > 0 ? 'text-green-600' : 'text-tertiary'}`}
              >
                +{formatMuskBucks(betCalculations.profit)} 🪙
              </span>
            </div>
            {betCalculations.marketImpact && (
              <p className="text-xs text-blue-600 font-medium">🔥 Your bet will move the market!</p>
            )}
          </div>
        )}

        {err && <p className="text-xs text-red-600 bg-red-600/10 p-2 rounded">{err}</p>}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={placing}
            className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-tertiary transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={placing || amount <= 0 || amount > balance}
            className={`px-6 py-2 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 ${
              betCalculations.riskLevel === 'YOLO 🚀'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl'
                : betCalculations.riskLevel === 'Aggressive'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {placing ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin">⏳</span>
                <span>Placing...</span>
              </span>
            ) : (
              `Place ${betCalculations.riskLevel === 'YOLO 🚀' ? '🚀' : ''} Bet`
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!placing) setOpen(true);
      }}
      disabled={placing}
      className={`px-6 py-2 rounded-lg font-bold shadow cursor-pointer transition-all duration-200 inline-block ${
        placing
          ? 'opacity-50 cursor-not-allowed bg-accent'
          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 text-white shadow-lg hover:shadow-xl'
      }`}
    >
      <span className="flex items-center space-x-2">
        <span>💰</span>
        <span>{placing ? 'Placing…' : 'Place Bet'}</span>
      </span>
    </button>
  );
}
