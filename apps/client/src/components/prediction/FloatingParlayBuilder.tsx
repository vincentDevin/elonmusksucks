import React, { useState, useEffect, useRef } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import { useParlay } from '../../contexts/ParlayContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  XMarkIcon as X,
  ArrowTrendingUpIcon as TrendingUp,
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown,
  TrashIcon as Trash2,
  CurrencyDollarIcon as DollarSign,
  BoltIcon as Zap,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle,
  ArrowRightIcon as ArrowRight,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

interface FloatingParlayBuilderProps {
  className?: string;
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

function FloatingParlayBuilder({
  className = '',
  onClose,
  isMinimized: controlledMinimized,
  onToggleMinimize,
}: FloatingParlayBuilderProps) {
  const { state: parlayState, dispatch: parlayDispatch } = useParlay();
  const { user } = useAuth();
  const [localMinimized, setLocalMinimized] = useState(false);
  const [stake, setStake] = useState<string>('10');
  const [isPlacing, setIsPlacing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use controlled state if provided, otherwise use local state
  const isMinimized = controlledMinimized !== undefined ? controlledMinimized : localMinimized;
  const toggleMinimize = onToggleMinimize || (() => setLocalMinimized(!localMinimized));

  // Calculate parlay odds and potential payout
  const calculateParlayOdds = () => {
    if (parlayState.legs.length === 0) return 0;
    return parlayState.legs.reduce((total, leg) => {
      // Assuming we have odds in the leg data
      return total * leg.odds;
    }, 1);
  };

  const parlayOdds = calculateParlayOdds();
  const potentialPayout = parseFloat(stake) * parlayOdds;

  // Bonus calculations based on number of legs
  const getBonusPercentage = () => {
    const legCount = parlayState.legs.length;
    if (legCount >= 5) return 20;
    if (legCount >= 4) return 15;
    if (legCount >= 3) return 10;
    return 0;
  };

  const bonusPercentage = getBonusPercentage();
  const bonusAmount = (potentialPayout * bonusPercentage) / 100;
  const totalPayout = potentialPayout + bonusAmount;

  // Handle parlay submission
  const handlePlaceParlay = async () => {
    if (!user || parlayState.legs.length < 2) return;

    setIsPlacing(true);
    try {
      const response = await api.post('/api/parlays', {
        legs: parlayState.legs.map((leg) => ({
          predictionId: leg.predictionId,
          optionId: leg.optionId,
        })),
        stake: parseFloat(stake),
      });

      if (response.data.success) {
        toast.success(`Parlay placed! Potential win: $${formatMuskBucks(totalPayout)}`);
        parlayDispatch({ type: 'CLEAR' });
        setStake('10');
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 3000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place parlay');
    } finally {
      setIsPlacing(false);
    }
  };

  // Remove a leg from parlay
  const handleRemoveLeg = (optionId: number) => {
    parlayDispatch({ type: 'REMOVE_LEG', optionId });
  };

  // Clear all selections
  const handleClearAll = () => {
    parlayDispatch({ type: 'CLEAR' });
    setStake('10');
  };

  // Auto-hide when empty
  useEffect(() => {
    if (parlayState.legs.length === 0 && isMinimized) {
      toggleMinimize();
    }
  }, [parlayState.legs.length]);

  // Don't render if no legs
  if (parlayState.legs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`
        fixed bottom-4 right-4 z-40
        bg-surface border border-border rounded-xl shadow-2xl
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'w-auto' : 'w-96 max-w-[calc(100vw-2rem)]'}
        ${className}
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between p-3 border-b border-border
          ${isMinimized ? 'cursor-pointer' : ''}
        `}
        onClick={isMinimized ? toggleMinimize : undefined}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold text-content">Parlay Builder ({parlayState.legs.length})</h3>
          {bonusPercentage > 0 && !isMinimized && (
            <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full font-medium">
              +{bonusPercentage}% bonus
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Minimized View */}
      {isMinimized && (
        <div className="p-3 flex items-center gap-3">
          <div className="flex -space-x-2">
            {parlayState.legs.slice(0, 3).map((leg, index) => (
              <div
                key={leg.predictionId}
                className="w-8 h-8 bg-primary/20 border-2 border-surface rounded-full flex items-center justify-center text-xs font-bold text-primary"
              >
                {index + 1}
              </div>
            ))}
            {parlayState.legs.length > 3 && (
              <div className="w-8 h-8 bg-secondary/20 border-2 border-surface rounded-full flex items-center justify-center text-xs font-bold text-secondary">
                +{parlayState.legs.length - 3}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-content">{parlayOdds.toFixed(2)}x odds</p>
            <p className="text-xs text-tertiary">Win ${formatMuskBucks(totalPayout)}</p>
          </div>
          <Zap className="w-5 h-5 text-warning animate-pulse" />
        </div>
      )}

      {/* Expanded View */}
      {!isMinimized && (
        <>
          {/* Legs List */}
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {parlayState.legs.map((leg, index) => (
              <div
                key={`${leg.predictionId}-${leg.optionId}`}
                className="flex items-start justify-between p-2 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2 flex-1">
                  <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content line-clamp-1">
                      {leg.predictionTitle || `Prediction #${leg.predictionId}`}
                    </p>
                    <p className="text-xs text-tertiary">
                      {leg.label} • {leg.odds.toFixed(2)}x
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveLeg(leg.optionId)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-error/20 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-error" />
                </button>
              </div>
            ))}
          </div>

          {/* Stake Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-tertiary" />
              <label className="text-sm font-medium text-content">Stake Amount</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                min="1"
                max={user?.muskBucks ? Number(user.muskBucks) : 10000}
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-content focus:outline-none focus:border-primary"
                placeholder="Enter amount"
              />
              <div className="flex gap-1">
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setStake(amount.toString())}
                    className="px-2 py-1 text-xs bg-muted hover:bg-primary/20 rounded transition-colors"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payout Calculation */}
          <div className="p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-tertiary">Combined Odds</span>
              <span className="font-bold text-primary">{parlayOdds.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-tertiary">Potential Win</span>
              <span className="font-medium text-content">${formatMuskBucks(potentialPayout)}</span>
            </div>
            {bonusPercentage > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-tertiary flex items-center gap-1">
                  <Zap className="w-3 h-3 text-warning" />
                  Parlay Bonus ({bonusPercentage}%)
                </span>
                <span className="font-medium text-success">+${formatMuskBucks(bonusAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-content">Total Payout</span>
                <span className="text-lg font-bold text-success">
                  ${formatMuskBucks(totalPayout)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t border-border flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-content rounded-lg transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handlePlaceParlay}
              disabled={
                isPlacing ||
                parlayState.legs.length < 2 ||
                parseFloat(stake) <= 0 ||
                parseFloat(stake) > Number(user?.muskBucks || 0)
              }
              className={`
                flex-1 px-4 py-2 font-medium rounded-lg transition-all
                flex items-center justify-center gap-2
                ${
                  isPlacing || parlayState.legs.length < 2
                    ? 'bg-muted text-tertiary cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover text-surface hover:scale-105'
                }
              `}
            >
              {isPlacing ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Placing...</span>
                </>
              ) : parlayState.legs.length < 2 ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Need {2 - parlayState.legs.length} more</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Place Parlay</span>
                </>
              )}
            </button>
          </div>

          {/* Success Confirmation */}
          {showConfirmation && (
            <div className="absolute inset-0 bg-success/95 rounded-xl flex items-center justify-center animate-in fade-in zoom-in-95">
              <div className="text-center text-surface p-6">
                <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-1">Parlay Placed!</h3>
                <p className="text-sm opacity-90">
                  Good luck! Potential win: ${formatMuskBucks(totalPayout)}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Custom comparison function to prevent unnecessary re-renders
function arePropsEqual(
  prevProps: FloatingParlayBuilderProps,
  nextProps: FloatingParlayBuilderProps,
): boolean {
  // Check if minimized state changed
  if (prevProps.isMinimized !== nextProps.isMinimized) return false;

  // Check if className changed
  if (prevProps.className !== nextProps.className) return false;

  // Function props are typically stable, so we skip them
  // The component re-renders when parlay state changes via useParlay hook
  return true;
}

export default React.memo(FloatingParlayBuilder, arePropsEqual);
