import React, { useState } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull, BetWithUser } from '@ems/types';
import BetModal from './BetModal';
import { useParlay } from '../../contexts/ParlayContext';
import PredictionReactions from './PredictionReactions';
import { PredictionSourceList } from './PredictionSourceList';
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
    setShowBetModal(true);
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
          rounded-xl p-4 md:p-6 transition-all duration-200 hover:shadow-lg cursor-pointer
          ${className}
        `}
        onClick={onCardClick}
      >
        {/* Main Layout - Stacks on mobile, horizontal on desktop */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
          {/* Left: Title & Metadata */}
          <div className="flex-1 min-w-0 space-y-2 md:space-y-3">
            <h3 className="text-lg md:text-xl font-bold text-content line-clamp-2 md:line-clamp-1">
              {prediction.title}
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              {prediction.category && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                  {prediction.category.icon && (
                    <span className="text-base">{prediction.category.icon}</span>
                  )}
                  <span>{prediction.category.name}</span>
                </span>
              )}
              {prediction.creator && (
                <div className="flex items-center gap-2 text-sm text-tertiary">
                  {prediction.creator.avatarUrl && (
                    <img
                      src={prediction.creator.avatarUrl}
                      alt={prediction.creator.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  <span>
                    by <span className="text-content font-semibold">{prediction.creator.name}</span>
                  </span>
                </div>
              )}
              <PredictionReactions predictionId={prediction.id} compact />
            </div>

            {/* Source Links */}
            {prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
              <div className="mt-2">
                <PredictionSourceList sources={prediction.sourceLinks} compact />
              </div>
            )}
          </div>

          {/* Center: Stats - Hidden on mobile, shown on tablet+ */}
          <div className="hidden md:flex items-center gap-4 lg:gap-8 text-sm md:text-base">
            <div className="flex items-center gap-2 text-tertiary">
              <UsersIcon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-semibold">{totalBets}</span>
              <span className="text-xs md:text-sm hidden lg:inline">bets</span>
            </div>
            {totalVolume > 0 && (
              <div className="flex items-center gap-2 text-tertiary">
                <CurrencyDollarIcon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-semibold text-success">
                  {formatMuskBucks(totalVolume)} 🪙
                </span>
              </div>
            )}
            {prediction.options.length > 0 && (
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <span className="text-primary font-bold">{getOddsDisplay()}</span>
              </div>
            )}
          </div>

          {/* Right: Actions & Status - Responsive layout */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 w-full sm:w-auto">
            {/* Action Buttons */}
            {!isResolved && !isExpired && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleBetClick}
                  className="flex-1 sm:flex-none px-4 sm:px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold rounded-lg transition-colors"
                >
                  <span className="hidden sm:inline">Quick Bet</span>
                  <span className="sm:hidden">Bet</span>
                </button>
                <button
                  onClick={handleQuickParlayAdd}
                  disabled={isInParlay || isAddingToParlay}
                  className={`
                    flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-all
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

            {/* Time Display & Status Indicators */}
            <div className="flex items-center gap-2 justify-between sm:justify-start">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${getStatusColor()} bg-opacity-10`}
              >
                <ClockIcon className="w-4 h-4" />
                <span className="font-bold text-sm whitespace-nowrap">{getTimeDisplay()}</span>
              </div>

              {/* Hot Indicator */}
              {totalBets > 5 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded-lg">
                  <BoltIcon className="w-4 h-4 text-warning animate-pulse" />
                  <span className="font-semibold text-warning text-xs">Hot</span>
                </div>
              )}

              {/* Navigate Icon - Hidden on mobile */}
              <ChevronRightIcon className="hidden md:block w-6 h-6 text-tertiary group-hover:text-primary transition-colors" />
            </div>
          </div>
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

  // Compare creator info
  if (prevProps.prediction.creator?.id !== nextProps.prediction.creator?.id) return false;
  if (prevProps.prediction.creator?.name !== nextProps.prediction.creator?.name) return false;

  // Compare other props (functions and strings are typically stable)
  if (prevProps.className !== nextProps.className) return false;

  return true;
}

export default React.memo(SimplePredictionCard, arePropsEqual);
