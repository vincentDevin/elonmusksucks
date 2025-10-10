import React, { useState } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull, BetWithUser } from '@ems/types';
import BetModal from './BetModal';
import { useParlay } from '../../contexts/ParlayContext';
import {
  ChevronRightIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  CurrencyDollarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface SimplePredictionCardProps {
  prediction: PredictionFull;
  onCardClick?: () => void;
  onQuickBet?: (prediction: PredictionFull) => void;
  onAddToParlay?: (prediction: PredictionFull, optionId: number) => void;
  addOptimisticBet?: (bet: BetWithUser) => void;
  className?: string;
}

const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

function SimplePredictionCard({
  prediction,
  onCardClick,
  onQuickBet,
  onAddToParlay,
  addOptimisticBet,
  className = '',
}: SimplePredictionCardProps) {
  const { dispatch: parlayDispatch, state: parlayState } = useParlay();
  const [showBetModal, setShowBetModal] = useState(false);
  const [isAddingToParlay, setIsAddingToParlay] = useState(false);

  // Time calculations
  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  const timeLeft = expires - now;
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);
  const isExpired = now > expires;
  const isEndingSoon = hoursLeft <= 24 && !isExpired;
  const isResolved = prediction.resolved;

  // Engagement metrics
  const totalBets = prediction.bets.length + (prediction.parlayLegs?.length || 0);
  const totalVolume =
    prediction.bets.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0) +
    (prediction.parlayLegs?.reduce<number>((sum, leg) => sum + asNum(leg.stake), 0) || 0);

  // Check if this prediction is in the current parlay
  const isInParlay = parlayState.legs.some((leg) => leg.predictionId === prediction.id);

  // Get best odds option for quick parlay add
  const bestOption = prediction.options.reduce((best, current) =>
    current.odds > best.odds ? current : best,
  );

  // Calculate odds spread for visual display
  const getOddsDisplay = () => {
    if (prediction.options.length === 2) {
      const [opt1, opt2] = prediction.options;
      return `${opt1.odds.toFixed(2)}x vs ${opt2.odds.toFixed(2)}x`;
    } else if (prediction.options.length > 0) {
      const minOdds = Math.min(...prediction.options.map((o) => o.odds));
      const maxOdds = Math.max(...prediction.options.map((o) => o.odds));
      return `${minOdds.toFixed(2)}x - ${maxOdds.toFixed(2)}x`;
    }
    return '';
  };

  const handleQuickParlayAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bestOption || isInParlay || isResolved || isExpired) return;

    setIsAddingToParlay(true);

    if (onAddToParlay) {
      onAddToParlay(prediction, bestOption.id);
    } else {
      parlayDispatch({
        type: 'ADD_LEG',
        leg: {
          predictionId: prediction.id,
          optionId: bestOption.id,
          label: bestOption.label,
          predictionTitle: prediction.title,
          odds: bestOption.odds,
        },
      });
    }

    setTimeout(() => setIsAddingToParlay(false), 1500);
  };

  const handleBetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickBet) {
      onQuickBet(prediction);
    } else {
      setShowBetModal(true);
    }
  };

  const getStatusColor = () => {
    if (isResolved) return 'text-success';
    if (isExpired) return 'text-error';
    if (isEndingSoon) return 'text-warning';
    return 'text-tertiary';
  };

  const getTimeDisplay = () => {
    if (isResolved) return 'Resolved';
    if (isExpired) return 'Expired';
    if (daysLeft > 0) return `${daysLeft}d left`;
    if (hoursLeft > 0) return `${hoursLeft}h left`;
    const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
    return `${minutesLeft}m left`;
  };

  return (
    <>
      <div
        className={`
          group relative bg-surface border border-border hover:border-primary/30
          rounded-xl p-4 transition-all duration-200 hover:shadow-lg cursor-pointer
          ${className}
        `}
        onClick={onCardClick}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-content line-clamp-2 pr-2">
                {prediction.title}
              </h3>
              <ChevronRightIcon className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
            </div>

            {/* Category & Time */}
            <div className="flex items-center gap-4 mb-3 text-sm">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {prediction.categoryId}
              </span>
              <div className={`flex items-center gap-1 ${getStatusColor()}`}>
                <ClockIcon className="w-3.5 h-3.5" />
                <span className="font-medium">{getTimeDisplay()}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm text-tertiary">
              <div className="flex items-center gap-1">
                <UsersIcon className="w-3.5 h-3.5" />
                <span>{totalBets} bets</span>
              </div>
              {totalVolume > 0 && (
                <div className="flex items-center gap-1">
                  <CurrencyDollarIcon className="w-3.5 h-3.5" />
                  <span>${formatMuskBucks(totalVolume)}</span>
                </div>
              )}
              {prediction.options.length > 0 && (
                <div className="flex items-center gap-1">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                  <span className="text-primary font-medium">{getOddsDisplay()}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!isResolved && !isExpired && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleBetClick}
                  className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-surface text-sm font-medium rounded-lg transition-colors"
                >
                  Quick Bet
                </button>
                <button
                  onClick={handleQuickParlayAdd}
                  disabled={isInParlay || isAddingToParlay}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                    ${
                      isInParlay
                        ? 'bg-success/20 text-success cursor-not-allowed'
                        : isAddingToParlay
                          ? 'bg-success text-surface scale-105'
                          : 'bg-secondary/20 text-secondary hover:bg-secondary/30'
                    }
                  `}
                >
                  {isInParlay ? '✓ In Parlay' : isAddingToParlay ? '✓ Added!' : '+ Parlay'}
                </button>
              </div>
            )}
          </div>

          {/* Visual Indicator */}
          {totalBets > 5 && (
            <div className="absolute top-3 right-3" title="Hot prediction">
              <BoltIcon className="w-4 h-4 text-warning animate-pulse" />
            </div>
          )}
        </div>

        {/* Optional: Quick odds preview bar */}
        {prediction.options.length === 2 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              {prediction.options.map((option) => {
                const percentage =
                  prediction.bets.length > 0
                    ? (prediction.bets.filter((b) => b.optionId === option.id).length /
                        prediction.bets.length) *
                      100
                    : 50;
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <span className="text-tertiary">{option.label}</span>
                    <span className="font-medium text-content">{percentage.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
              {prediction.options.map((option, index) => {
                const percentage =
                  prediction.bets.length > 0
                    ? (prediction.bets.filter((b) => b.optionId === option.id).length /
                        prediction.bets.length) *
                      100
                    : 50;
                return (
                  <div
                    key={option.id}
                    className={`h-full transition-all duration-300 ${
                      index === 0 ? 'bg-primary' : 'bg-secondary'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bet Modal */}
      <BetModal
        prediction={prediction}
        isOpen={showBetModal}
        onClose={() => setShowBetModal(false)}
        mode="modal"
        onBetPlaced={addOptimisticBet}
      />
    </>
  );
}

// Custom comparison function to prevent unnecessary re-renders
function arePropsEqual(
  prevProps: SimplePredictionCardProps,
  nextProps: SimplePredictionCardProps,
): boolean {
  // Compare prediction by ID and key fields instead of deep comparison
  if (prevProps.prediction.id !== nextProps.prediction.id) return false;
  if (prevProps.prediction.resolved !== nextProps.prediction.resolved) return false;
  if (prevProps.prediction.bets.length !== nextProps.prediction.bets.length) return false;
  if (prevProps.prediction.expiresAt !== nextProps.prediction.expiresAt) return false;

  // Compare other props (functions and strings are typically stable)
  if (prevProps.className !== nextProps.className) return false;

  return true;
}

export default React.memo(SimplePredictionCard, arePropsEqual);
