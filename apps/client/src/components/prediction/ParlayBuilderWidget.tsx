// apps/client/src/components/prediction/ParlayBuilderWidget.tsx
import React, { useState, useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
  ArrowTrendingUpIcon as TrendingUp,
  TrashIcon as Trash2,
  CurrencyDollarIcon as DollarSign,
  BoltIcon as Zap,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle,
  ArrowRightIcon as ArrowRight,
} from '@heroicons/react/24/outline';
import { useParlay } from '../../contexts/ParlayContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatMuskBucks } from '../../utils/formatting';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

interface ParlayBuilderWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left';
  hideOnMobile?: boolean;
}

/**
 * Floating Parlay Builder Widget following the QuickThemeSwitcher pattern
 * Collapsible circular button when minimized, expands to show full builder
 */
export const ParlayBuilderWidget: React.FC<ParlayBuilderWidgetProps> = ({
  className = '',
  position = 'bottom-right',
  hideOnMobile = false,
}) => {
  const { state: parlayState, dispatch: parlayDispatch } = useParlay();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [stake, setStake] = useState<string>('10');
  const [isPlacing, setIsPlacing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Calculate parlay odds and potential payout
  const calculateParlayOdds = useCallback(() => {
    if (parlayState.legs.length === 0) return 0;
    return parlayState.legs.reduce((total, leg) => total * leg.odds, 1);
  }, [parlayState.legs]);

  const parlayOdds = calculateParlayOdds();
  const potentialPayout = parseFloat(stake || '0') * parlayOdds;

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
        toast.success(`Parlay placed! Potential win: ${formatMuskBucks(totalPayout)} 🪙`);
        parlayDispatch({ type: 'CLEAR' });
        setStake('10');
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          setIsOpen(false);
        }, 2000);
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

  // Position classes - stacked above FloatingCreatePredictionWidget (at 70px) and QuickThemeSwitcher
  const getPositionClasses = () => {
    return {
      'bottom-right': 'bottom-[132px] right-4', // 70px (Create) + 48px (widget) + 14px (gap)
      'bottom-left': 'bottom-[132px] left-4',
    }[position];
  };

  const getPanelPositionClasses = () => {
    return {
      'bottom-right': 'bottom-16 right-0',
      'bottom-left': 'bottom-16 left-0',
    }[position];
  };

  // Don't render if no legs
  if (parlayState.legs.length === 0) return null;

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} ${hideOnMobile ? 'hidden sm:block' : ''} ${className}`}
    >
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-12 h-12 rounded-full transition-all duration-200
          flex items-center justify-center backdrop-blur-sm
          relative
          ${
            isOpen
              ? 'bg-secondary text-secondary-foreground rotate-0'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
          }
          border-2 ${isOpen ? 'border-secondary/60' : 'border-secondary/40'}
          hover:scale-110
        `}
        style={{
          boxShadow:
            '0 0 20px color-mix(in srgb, var(--color-secondary) 30%, transparent), 0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="Parlay builder"
        title={`Parlay Builder (${parlayState.legs.length} selections)`}
      >
        {isOpen ? (
          <FaTimes />
        ) : (
          <>
            <TrendingUp className="w-5 h-5" />
            {/* Badge showing number of selections */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">
              {parlayState.legs.length}
            </div>
          </>
        )}
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={`
              absolute ${getPanelPositionClasses()}
              bg-surface border-2 border-secondary/40 rounded-xl backdrop-blur-sm
              w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto
              transform transition-all duration-300
              ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
            `}
            style={{
              boxShadow:
                '0 0 20px color-mix(in srgb, var(--color-secondary) 30%, transparent), 0 10px 25px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  <h3 className="font-semibold text-content">Parlay Builder</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors text-tertiary hover:text-content"
                  title="Close"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-tertiary">{parlayState.legs.length} selections</span>
                {bonusPercentage > 0 && (
                  <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" />+{bonusPercentage}% bonus
                  </span>
                )}
              </div>
            </div>

            {/* Legs List */}
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {parlayState.legs.map((leg, index) => (
                <div
                  key={`${leg.predictionId}-${leg.optionId}`}
                  className="flex items-start justify-between p-2 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center text-xs font-bold text-secondary flex-shrink-0 mt-0.5">
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
              <div className="space-y-2">
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  min="1"
                  max={user?.muskBucks ? Number(user.muskBucks) : 10000}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-content focus:outline-none focus:border-secondary"
                  placeholder="Enter amount"
                />
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setStake(amount.toString())}
                      className="flex-1 px-2 py-1 text-xs bg-muted hover:bg-secondary/20 rounded transition-colors"
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
                <span className="font-bold text-secondary">{parlayOdds.toFixed(2)}x</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-tertiary">Potential Win</span>
                <span className="font-medium text-content">
                  {formatMuskBucks(potentialPayout)} 🪙
                </span>
              </div>
              {bonusPercentage > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tertiary flex items-center gap-1">
                    <Zap className="w-3 h-3 text-warning" />
                    Parlay Bonus ({bonusPercentage}%)
                  </span>
                  <span className="font-medium text-success">
                    +{formatMuskBucks(bonusAmount)} 🪙
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-content">Total Payout</span>
                  <span className="text-lg font-bold text-success">
                    {formatMuskBucks(totalPayout)} 🪙
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
                      : 'bg-secondary hover:bg-secondary-hover text-secondary-foreground hover:scale-105'
                  }
                `}
              >
                {isPlacing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                <div className="text-center text-white p-6">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-lg font-bold mb-1">Parlay Placed!</h3>
                  <p className="text-sm opacity-90">
                    Good luck! Potential win: {formatMuskBucks(totalPayout)} 🪙
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ParlayBuilderWidget;
