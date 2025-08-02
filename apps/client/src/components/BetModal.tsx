// apps/client/src/components/BetModal.tsx
// -----------------------------------------------------------------------------
// Unified betting modal that works in both dashboard (compact) and predictions page (full) contexts
// Features exciting animations, real-time calculations, and gamification elements
// -----------------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react';
import { usePredictionMarket } from '../contexts/PredictionContext';
import { useAuth } from '../contexts/AuthContext';
import type { BetWithUser, PredictionFull } from '@ems/types';

interface BetModalProps {
  prediction: PredictionFull;
  isOpen: boolean;
  onClose: () => void;
  mode: 'compact' | 'full'; // Dashboard vs Predictions page
  onBetPlaced?: (bet: BetWithUser) => void;
}

export default function BetModal({
  prediction,
  isOpen,
  onClose,
  mode,
  onBetPlaced,
}: BetModalProps) {
  const { placeBet } = usePredictionMarket();
  const { user } = useAuth();

  const balance = user?.muskBucks ?? 0;
  const [amount, setAmount] = useState(0);
  const [optionId, setOptionId] = useState(prediction.options[0]?.id ?? 0);
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setOptionId(prediction.options[0]?.id ?? 0);
      setErr(null);
      setShowCelebration(false);
    }
  }, [isOpen, prediction.options]);

  // 🎮 Enhanced live calculations with excitement factors and gamification
  const betCalculations = useMemo(() => {
    const selectedOption = prediction.options.find((opt) => opt.id === optionId);
    if (!selectedOption || amount <= 0) {
      return {
        payout: 0,
        profit: 0,
        riskLevel: 'Conservative',
        riskEmoji: '😌',
        marketImpact: false,
        profitPercent: 0,
        oddsDisplay: selectedOption?.odds?.toFixed(2) || '0.00',
        balanceAfter: balance,
        isYolo: false,
        excitementLevel: 'normal',
      };
    }

    const payout = Math.floor(amount * selectedOption.odds);
    const balanceAfter = balance - amount;

    // 🎯 Risk level calculation with emojis
    let riskLevel = 'Conservative';
    let riskEmoji = '😌';
    let excitementLevel = 'normal';

    if (amount > balance * 0.8) {
      riskLevel = 'YOLO 🚀🚀🚀';
      riskEmoji = '🚀';
      excitementLevel = 'yolo';
    } else if (amount > balance * 0.5) {
      riskLevel = 'HIGH RISK';
      riskEmoji = '🔥';
      excitementLevel = 'high';
    } else if (amount > balance * 0.3) {
      riskLevel = 'Aggressive';
      riskEmoji = '⚡';
      excitementLevel = 'aggressive';
    } else if (amount > balance * 0.1) {
      riskLevel = 'Moderate';
      riskEmoji = '📈';
      excitementLevel = 'moderate';
    }

    // Market impact calculation
    const totalBets = prediction.bets.reduce((sum, bet) => sum + bet.amount, 0);
    const marketImpact = amount > Math.max(100, totalBets * 0.1);

    // 🚀 ALL-IN bonus detection
    const isAllIn = amount >= balance * 0.95;
    const allInMultiplier = isAllIn ? 2.5 : 1.0;
    const allInPayout = isAllIn ? Math.floor(payout * allInMultiplier) : payout;
    const allInProfit = allInPayout - amount;

    return {
      payout: allInPayout,
      profit: allInProfit,
      riskLevel,
      riskEmoji,
      marketImpact,
      profitPercent: (allInProfit / amount) * 100,
      oddsDisplay: selectedOption.odds.toFixed(2),
      balanceAfter,
      isYolo: amount > balance * 0.8,
      isAllIn,
      allInMultiplier,
      excitementLevel,
    };
  }, [amount, optionId, balance, prediction.options, prediction.bets]);

  // 🎊 Bet submission with celebration
  const submit = async () => {
    if (amount <= 0 || amount > balance || placing) return;

    setPlacing(true);
    setErr(null);

    try {
      await placeBet({ optionId, amount });

      // 🎉 Celebration animation
      setShowCelebration(true);
      setTimeout(
        () => {
          setShowCelebration(false);
          onClose();
        },
        betCalculations.isYolo ? 2000 : 1500,
      );

      // Optimistic UI update
      if (user && onBetPlaced) {
        const optimistic: BetWithUser = {
          id: Date.now(),
          userId: user.id,
          predictionId: prediction.id,
          amount,
          oddsAtPlacement: 0,
          potentialPayout: 0,
          status: 'PENDING' as any,
          optionId,
          won: null as any,
          payout: 0,
          createdAt: new Date(),
          user: {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
          },
        };
        onBetPlaced(optimistic);
      }

      setAmount(0);
    } catch (e: any) {
      setErr(e.message || 'Bet failed');
    } finally {
      setPlacing(false);
    }
  };

  if (!isOpen) return null;

  // 🎨 Dynamic styling based on mode and excitement level
  const modalSize = mode === 'compact' ? 'max-w-md' : 'max-w-lg';
  const spacing = mode === 'compact' ? 'p-4 space-y-3' : 'p-6 space-y-4';

  const getRiskColors = () => {
    switch (betCalculations.excitementLevel) {
      case 'yolo':
        return 'bg-gradient-to-br from-red-600 to-red-700 text-white';
      case 'high':
        return 'bg-gradient-to-br from-orange-600 to-orange-700 text-white';
      case 'aggressive':
        return 'bg-gradient-to-br from-yellow-600 to-yellow-700 text-white';
      case 'moderate':
        return 'bg-gradient-to-br from-blue-600 to-blue-700 text-white';
      default:
        return 'bg-gradient-to-br from-green-600 to-green-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className={`bg-surface border border-muted rounded-2xl shadow-2xl ${modalSize} ${spacing} relative overflow-hidden`}
      >
        {/* 🎊 Celebration Overlay */}
        {showCelebration && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 flex items-center justify-center z-10">
            <div className="text-center animate-bounce">
              <div className="text-6xl mb-2">{betCalculations.isYolo ? '🚀💎🚀' : '🎉🎯🎉'}</div>
              <div className="text-xl font-bold text-content">
                {betCalculations.isYolo ? 'YOLO BET PLACED!' : 'BET PLACED!'}
              </div>
              <div className="text-green-600 font-semibold">
                +{betCalculations.profit.toLocaleString()} 🪙 potential profit!
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h3
              className={`font-bold ${mode === 'compact' ? 'text-lg' : 'text-xl'} text-content line-clamp-2`}
            >
              {prediction.title}
            </h3>
            <div className="text-sm text-tertiary mt-1">
              Balance:{' '}
              <span className="font-semibold text-primary">{balance.toLocaleString()} 🪙</span>
            </div>
          </div>

          {/* Risk Level Badge */}
          {amount > 0 && (
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                betCalculations.excitementLevel === 'yolo'
                  ? 'bg-red-600/20 text-red-600 animate-pulse'
                  : betCalculations.excitementLevel === 'high'
                    ? 'bg-orange-600/20 text-orange-600'
                    : betCalculations.excitementLevel === 'aggressive'
                      ? 'bg-yellow-600/20 text-yellow-600'
                      : betCalculations.excitementLevel === 'moderate'
                        ? 'bg-blue-600/20 text-blue-600'
                        : 'bg-green-600/20 text-green-600'
              }`}
            >
              {betCalculations.riskEmoji} {betCalculations.riskLevel}
            </div>
          )}

          <button
            onClick={onClose}
            className="ml-2 text-tertiary hover:text-content transition-colors text-xl"
          >
            ×
          </button>
        </div>

        {/* Betting Form */}
        <div className={`grid ${mode === 'compact' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          <div>
            <label className="block text-sm font-medium mb-2">Bet Amount</label>
            <input
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={`w-full border border-muted p-3 rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                betCalculations.excitementLevel === 'yolo'
                  ? 'ring-2 ring-red-500 border-red-500'
                  : ''
              }`}
              disabled={placing}
              placeholder="Enter amount..."
            />

            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-2">
              {[0.1, 0.25, 0.5, 1.0].map((percent) => (
                <button
                  key={percent}
                  onClick={() => setAmount(Math.floor(balance * percent))}
                  className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-secondary rounded transition-colors"
                  disabled={placing}
                >
                  {percent === 1.0 ? 'ALL IN' : `${percent * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Choose Option</label>
            <select
              value={optionId}
              onChange={(e) => setOptionId(Number(e.target.value))}
              className="w-full border border-muted p-3 rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary transition-all"
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
          <div
            className={`rounded-lg p-4 space-y-3 transition-all duration-300 ${
              betCalculations.excitementLevel === 'yolo'
                ? 'bg-red-600/5 border border-red-600/20'
                : betCalculations.excitementLevel === 'high'
                  ? 'bg-orange-600/5 border border-orange-600/20'
                  : 'bg-muted'
            }`}
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Odds:</span>
                <span className="font-semibold">{betCalculations.oddsDisplay}×</span>
              </div>
              <div className="flex justify-between">
                <span>Profit:</span>
                <span className="font-bold text-green-600">
                  +{betCalculations.profitPercent.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between text-base font-bold border-t border-muted pt-2">
              <span>Potential Payout:</span>
              <span
                className={`transition-all duration-300 ${
                  betCalculations.excitementLevel === 'yolo'
                    ? 'text-red-600 animate-pulse text-lg'
                    : betCalculations.excitementLevel === 'high'
                      ? 'text-orange-600'
                      : 'text-green-600'
                }`}
              >
                {betCalculations.payout.toLocaleString()} 🪙
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Balance After:</span>
              <span
                className={
                  betCalculations.balanceAfter < balance * 0.2
                    ? 'text-orange-600 font-semibold'
                    : 'text-tertiary'
                }
              >
                {betCalculations.balanceAfter.toLocaleString()} 🪙
              </span>
            </div>

            {/* ALL-IN Bonus Indicator */}
            {betCalculations.isAllIn && (
              <div className="text-center py-3 bg-gradient-to-r from-red-600/10 to-orange-600/10 border border-red-600/20 rounded-lg">
                <div className="text-red-600 font-bold text-lg animate-pulse">
                  🚀 ALL-IN BONUS: {((betCalculations.allInMultiplier - 1) * 100).toFixed(0)}% EXTRA
                  PAYOUT! 🚀
                </div>
                <div className="text-sm text-red-600/80 mt-1">
                  You're betting {((amount / balance) * 100).toFixed(0)}% of your balance!
                </div>
              </div>
            )}

            {/* Market Impact Indicator */}
            {betCalculations.marketImpact && (
              <div className="text-center py-2 bg-blue-600/10 rounded-lg">
                <span className="text-blue-600 font-medium text-sm">
                  🌊 Your bet will move the market odds!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {err && <div className="text-xs text-red-600 bg-red-600/10 p-3 rounded-lg">{err}</div>}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={placing}
            className="flex-1 px-4 py-3 bg-muted text-content rounded-lg hover:bg-tertiary transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={placing || amount <= 0 || amount > balance}
            className={`flex-2 px-6 py-3 rounded-lg font-bold transition-all duration-200 disabled:opacity-50 ${getRiskColors()}`}
          >
            {placing ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin">⏳</span>
                <span>Placing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span>{betCalculations.riskEmoji}</span>
                <span>
                  {betCalculations.isYolo
                    ? 'SEND IT! 🚀'
                    : betCalculations.excitementLevel === 'high'
                      ? 'HIGH RISK BET!'
                      : betCalculations.excitementLevel === 'aggressive'
                        ? 'AGGRESSIVE BET!'
                        : 'Place Bet'}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
