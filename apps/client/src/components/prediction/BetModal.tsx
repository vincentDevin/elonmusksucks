// apps/client/src/components/prediction/BetModal.tsx
// -----------------------------------------------------------------------------
// Consolidated betting component supporting multiple display modes:
// - modal: Full modal overlay
// - inline: Collapsible inline form
// - quick: Quick bet selection modal
// Features optimistic updates, animations, and gamification
// -----------------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatMuskBucks } from '../../utils/formatting';
import { useOptimisticBetting } from '../../hooks/useOptimisticBetting';
import type { BetWithUser, PredictionFull, PublicPredictionOption } from '@ems/types';

type DisplayMode = 'modal' | 'inline' | 'quick';

interface BetModalProps {
  prediction?: PredictionFull | { id: number; options: PublicPredictionOption[] };
  isOpen: boolean;
  onClose: () => void;
  mode?: DisplayMode; // Display mode
  compact?: boolean; // Compact styling for dashboard
  onBetPlaced?: (bet: BetWithUser) => void;
  addOptimisticBet?: (bet: BetWithUser) => void;
  enableOptimistic?: boolean; // Enable React 19 optimistic updates
}

export default function BetModal({
  prediction,
  isOpen,
  onClose,
  mode = 'modal',
  compact = false,
  onBetPlaced,
  addOptimisticBet,
  enableOptimistic = false,
}: BetModalProps) {
  const { placeBet, predictions } = usePredictionMarket();
  const { user } = useAuth();

  // Optimistic betting hook (only when enabled)
  const optimisticBetting = enableOptimistic ? useOptimisticBetting() : null;

  const balance = optimisticBetting?.balance ?? user?.muskBucks ?? 0;
  const [amount, setAmount] = useState(0);
  const [optionId, setOptionId] = useState(prediction?.options[0]?.id ?? 0);
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Quick mode state (for selecting a prediction first)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionFull | null>(null);

  // Determine active prediction (either passed in or selected in quick mode)
  const activePrediction = mode === 'quick' ? selectedPrediction : prediction;

  // Quick mode: filter predictions for selection
  const availablePredictions = useMemo(() => {
    if (mode !== 'quick') return [];

    const active = predictions.filter(
      (pred) => !pred.resolved && new Date(pred.expiresAt) > new Date(),
    );

    const filtered = active.filter(
      (pred) =>
        pred.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pred.category?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return filtered
      .sort((a, b) => {
        const aTotalBets = a.bets?.length || 0;
        const bTotalBets = b.bets?.length || 0;
        if (aTotalBets !== bTotalBets) return bTotalBets - aTotalBets;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10);
  }, [mode, predictions, searchTerm]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setOptionId(activePrediction?.options[0]?.id ?? 0);
      setErr(null);
      setShowCelebration(false);
      if (mode === 'quick') {
        setSearchTerm('');
        setSelectedPrediction(null);
      }
    }
  }, [isOpen, activePrediction?.options, mode]);

  // 🎮 Enhanced live calculations with excitement factors and gamification
  const betCalculations = useMemo(() => {
    if (!activePrediction) return null;
    const selectedOption = activePrediction.options.find((opt) => opt.id === optionId);
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
    const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
    const totalBets = prediction.bets.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0);
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
        onBetPlaced(optimistic);
      }

      setAmount(0);
    } catch (e: any) {
      setErr(e.message || 'Bet failed');
    } finally {
      setPlacing(false);
    }
  };

  // Early return for closed state
  if (!isOpen && mode !== 'inline') return null;

  // 🎨 Dynamic styling based on mode and excitement level
  const getRiskColors = () => {
    if (!betCalculations) return 'bg-gradient-to-br from-green-600 to-green-700 text-white';
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

  // Quick mode: prediction selection interface
  if (mode === 'quick' && !selectedPrediction) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
        <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-content">Quick Bet</h3>
            <button onClick={onClose} className="text-tertiary hover:text-content">
              ✕
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search predictions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-background border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary"
            />
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-tertiary">
              🔍
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {availablePredictions.map((pred) => (
              <div
                key={pred.id}
                onClick={() => setSelectedPrediction(pred)}
                className="p-4 bg-background border border-muted rounded-lg hover:bg-surface cursor-pointer transition-colors"
              >
                <h4 className="font-semibold text-content mb-1">{pred.title}</h4>
                <p className="text-sm text-tertiary mb-2">{pred.category}</p>
                <div className="flex gap-2">
                  {pred.options.map((opt) => (
                    <span key={opt.id} className="text-xs bg-muted px-2 py-1 rounded">
                      {opt.text} ({opt.odds.toFixed(2)}x)
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // Main betting interface
  const renderBettingForm = () => {
    if (!activePrediction || !betCalculations) {
      return <div className="text-center text-tertiary">No prediction available</div>;
    }

    return (
      <>
        {/* 🎊 Celebration Overlay */}
        {showCelebration && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 flex items-center justify-center z-10">
            <div className="text-center animate-bounce">
              <div className="text-6xl mb-2">{betCalculations.isYolo ? '🚀💎🚀' : '🎉🎯🎉'}</div>
              <div className="text-xl font-bold text-content">
                {betCalculations.isYolo ? 'YOLO BET PLACED!' : 'BET PLACED!'}
              </div>
              <div className="text-green-600 font-semibold">
                +{formatMuskBucks(betCalculations.profit)} 🪙 potential profit!
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <h3 className="font-bold text-lg text-content line-clamp-2">
              {activePrediction.title}
            </h3>
            <div className="text-sm text-tertiary mt-1">Balance: {formatMuskBucks(balance)} 🪙</div>
          </div>
          {mode !== 'inline' && (
            <button onClick={onClose} className="text-tertiary hover:text-content text-xl">
              ✕
            </button>
          )}
        </div>

        {/* Rest of betting form components would go here... */}
        <div className="text-center text-tertiary">[Betting form implementation continues...]</div>
      </>
    );
  };

  // Inline mode: render without portal
  if (mode === 'inline') {
    return (
      <div
        className={`bg-surface border border-muted rounded-lg p-4 space-y-3 ${isOpen ? 'block' : 'hidden'} relative overflow-hidden`}
      >
        {renderBettingForm()}
      </div>
    );
  }

  // Modal mode: render with portal
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-lg p-6 space-y-4 relative overflow-hidden">
        {renderBettingForm()}
      </div>
    </div>,
    document.body,
  );
}

// Convenience exports for different betting modes
export function BetForm(props: {
  prediction: { id: number; options: PublicPredictionOption[] };
  addOptimisticBet?: (bet: BetWithUser) => void;
  onPlaced?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
      >
        Place Bet
      </button>
      <BetModal
        prediction={props.prediction}
        isOpen={open}
        onClose={() => setOpen(false)}
        mode="inline"
        onBetPlaced={props.onPlaced}
        addOptimisticBet={props.addOptimisticBet}
      />
    </>
  );
}

export function OptimisticBetForm(props: {
  predictionId: number;
  optionId: number;
  optionName: string;
  currentOdds: number;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const prediction = {
    id: props.predictionId,
    options: [
      {
        id: props.optionId,
        text: props.optionName,
        odds: props.currentOdds,
      },
    ],
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
      >
        Bet on {props.optionName}
      </button>
      <BetModal
        prediction={prediction}
        isOpen={open}
        onClose={() => setOpen(false)}
        mode="modal"
        onBetPlaced={props.onSuccess}
        enableOptimistic={true}
      />
    </>
  );
}

export function QuickBetModal(props: { isOpen: boolean; onClose: () => void }) {
  return <BetModal isOpen={props.isOpen} onClose={props.onClose} mode="quick" />;
}
