// apps/client/src/components/UnifiedPredictionCard.tsx
// Unified prediction card component merging full and compact variants
import React, { useState } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import {
  PlusIcon as Plus,
  CheckIcon as Check,
  ArrowTrendingUpIcon as TrendingUp,
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  ChevronRightIcon,
  ClockIcon,
  UsersIcon,
  CurrencyDollarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
import type {
  PublicPredictionOption,
  BetWithUser,
  ParlayLegWithUser,
  PredictionType,
  PredictionFull,
} from '@ems/types';
import OddsBar from './OddsBar';
import BetsList from './BetsList';
import BetModal from './BetModal';
import { useParlay } from '../../contexts/ParlayContext';
import { PredictionSourceList } from './PredictionSourceList';
import PredictionReactions from './PredictionReactions';

interface UnifiedPredictionCardProps {
  prediction: PredictionFull;
  variant?: 'full' | 'compact' | 'mini' | 'list';
  showActions?: boolean;
  showBetsList?: boolean;
  showParlayActions?: boolean;
  addOptimisticBet?: (bet: BetWithUser) => void;
  className?: string;
  hideInlineParlaySelector?: boolean; // Hide inline parlay selector but keep parlay button
  onCardView?: () => void; // Callback when card is viewed (not when buttons are clicked)
  onQuickBet?: (prediction: PredictionFull) => void; // Callback for quick bet action
  onAddToParlay?: (prediction: PredictionFull, optionId: number) => void; // Callback for adding to parlay
}

function UnifiedPredictionCard({
  prediction,
  variant = 'full',
  showActions = true,
  showBetsList = true,
  showParlayActions = false,
  addOptimisticBet,
  className = '',
  hideInlineParlaySelector = false,
  onCardView,
  onQuickBet,
  onAddToParlay,
}: UnifiedPredictionCardProps) {
  const { dispatch: parlayDispatch, state: parlayState } = useParlay();
  const [showBetModal, setShowBetModal] = useState(false);
  const [addingToParlay, setAddingToParlay] = useState<number | null>(null);
  const [showParlaySelector, setShowParlaySelector] = useState(false);
  const [isAddingToParlay, setIsAddingToParlay] = useState(false);

  const flatParlays: ParlayLegWithUser[] = prediction.parlayLegs ?? [];
  const isCompact = variant === 'compact';
  const isMini = variant === 'mini';
  const isFullSize = variant === 'full';
  const isList = variant === 'list';

  // Check if prediction is already in parlay
  const isInParlay = parlayState.legs.some((leg) => leg.predictionId === prediction.id);
  const parlayOption = parlayState.legs.find((leg) => leg.predictionId === prediction.id);

  // Time calculations
  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  const timeLeft = expires - now;
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

  // Status badge logic using theme tokens
  const getStatusBadge = () => {
    if (prediction.resolved) {
      return { color: 'bg-accent', text: 'Resolved', icon: '✅' };
    } else if (now > expires) {
      return { color: 'bg-error', text: 'Expired', icon: '⏰' };
    } else if (hoursLeft <= 2) {
      return { color: 'bg-warning', text: 'Ending Soon', icon: '🔥' };
    } else if (hoursLeft <= 24) {
      return { color: 'bg-info', text: 'Final Day', icon: '⚡' };
    } else {
      return { color: 'bg-success', text: 'Open', icon: '🟢' };
    }
  };

  const statusBadge = getStatusBadge();

  // Engagement metrics
  const totalBets = prediction.bets.length + flatParlays.length;
  const totalVolume =
    prediction.bets.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0) +
    flatParlays.reduce<number>((sum, leg) => sum + asNum(leg.stake), 0);
  const recentActivity = prediction.bets.filter(
    (bet: BetWithUser) => new Date(bet.createdAt).getTime() > Date.now() - 30 * 60 * 1000,
  ).length;

  // Parlay handlers
  const handleAddToParlay = (optionId: number) => {
    if (!prediction.options.length) return;

    const selectedOption = prediction.options.find((opt: any) => opt.id === optionId);
    if (!selectedOption) return;

    setAddingToParlay(optionId);

    parlayDispatch({
      type: 'ADD_LEG',
      leg: {
        predictionId: prediction.id,
        optionId,
        label: selectedOption.label,
        predictionTitle: prediction.title,
        odds: selectedOption.odds,
      },
    });

    setTimeout(() => {
      setAddingToParlay(null);
      setShowParlaySelector(false);
    }, 1200);
  };

  const toggleParlaySelector = () => {
    setShowParlaySelector(!showParlaySelector);
  };

  // Add default/best option to parlay (for Dashboard)
  const handleAddDefaultToParlay = () => {
    // Add the option with the best odds (highest odds typically)
    const bestOption = prediction.options.reduce((best, current) =>
      current.odds > best.odds ? current : best,
    );

    if (bestOption) {
      handleAddToParlay(bestOption.id);
    }
  };

  // Quick parlay add handler (for list variant)
  const handleQuickParlayAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const bestOption = prediction.options.reduce((best, current) =>
      current.odds > best.odds ? current : best,
    );

    if (!bestOption || isInParlay || prediction.resolved || now > expires) return;

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

  // Quick bet handler (for list variant)
  const handleQuickBet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickBet) {
      onQuickBet(prediction);
    } else {
      setShowBetModal(true);
    }
  };

  // Helper functions for list variant
  const getStatusColor = () => {
    if (prediction.resolved) return 'text-success';
    if (now > expires) return 'text-error';
    if (hoursLeft <= 24 && !prediction.resolved) return 'text-warning';
    return 'text-tertiary';
  };

  const getTimeDisplay = () => {
    if (prediction.resolved) return 'Resolved';
    if (now > expires) return 'Expired';
    const daysLeft = Math.floor(hoursLeft / 24);
    if (daysLeft > 0) return `${daysLeft}d left`;
    if (hoursLeft > 0) return `${hoursLeft}h left`;
    const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
    return `${minutesLeft}m left`;
  };

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

  // Responsive classes based on variant
  const cardClasses = `
    relative bg-surface border border-muted shadow-sm hover:shadow-md transition-all duration-200 hover:border-muted/60
    ${isFullSize ? 'p-5 rounded-2xl shadow hover:shadow-lg' : ''}
    ${isCompact ? 'p-4 rounded-xl' : ''}
    ${isMini ? 'p-3 rounded-lg' : ''}
    ${className}
  `.trim();

  const titleClasses = `
    font-semibold mb-2 text-content
    ${isFullSize ? 'text-xl pr-24' : ''}
    ${isCompact ? 'text-lg pr-16 line-clamp-2' : ''}
    ${isMini ? 'text-base pr-12 line-clamp-1' : ''}
  `.trim();

  const badgeClasses = `
    absolute px-2 py-1 rounded-full text-xs font-medium text-surface flex items-center gap-1
    ${isFullSize ? 'top-4 right-4 px-3' : ''}
    ${isCompact ? 'top-3 right-3' : ''}
    ${isMini ? 'top-2 right-2 px-1.5 text-xs' : ''}
    ${statusBadge.color}
  `.trim();

  return (
    <>
      {isList ? (
        /* List Variant - Horizontal layout for list views */
        <div
          className={`
            group relative bg-surface border border-border hover:border-primary/30
            rounded-xl p-4 md:p-6 transition-all duration-200 hover:shadow-lg cursor-pointer
            ${className}
          `}
          onClick={onCardView}
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
                      by{' '}
                      <span className="text-content font-semibold">{prediction.creator.name}</span>
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
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  <span className="text-primary font-bold">{getOddsDisplay()}</span>
                </div>
              )}
            </div>

            {/* Right: Actions & Status - Responsive layout */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 w-full sm:w-auto">
              {/* Action Buttons */}
              {!prediction.resolved && now <= expires && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleQuickBet}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span className="hidden sm:inline">Quick Bet</span>
                    <span className="sm:hidden">Bet</span>
                  </button>
                  {showParlayActions && (
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
                  )}
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

          {/* Pool distribution bar using OddsBar with 'pool' variant */}
          {prediction.options.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <OddsBar
                variant="pool"
                type={prediction.type as PredictionType}
                options={prediction.options as PublicPredictionOption[]}
                bets={prediction.bets.map((bet) => ({
                  ...bet,
                  amount: bet.amount.toString(),
                  potentialPayout: bet.potentialPayout?.toString() ?? null,
                  payout: bet.payout?.toString() ?? null,
                }))}
                parlayLegs={flatParlays.map((leg) => ({
                  ...leg,
                  stake: asNum(leg.stake),
                  createdAt:
                    leg.createdAt instanceof Date ? leg.createdAt.toISOString() : leg.createdAt,
                }))}
                predictionId={prediction.id}
                expiresAt={
                  typeof prediction.expiresAt === 'string'
                    ? prediction.expiresAt
                    : prediction.expiresAt.toISOString()
                }
              />
            </div>
          )}
        </div>
      ) : isFullSize ? (
        <li className={cardClasses}>
          {/* Full Size Status Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className={badgeClasses}>
              <span>{statusBadge.icon}</span>
              {statusBadge.text}
            </span>
            {recentActivity > 0 && (
              <span className="px-2 py-1 bg-secondary text-primary text-xs rounded-full font-semibold animate-pulse">
                🔥 Hot
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={titleClasses}>{prediction.title}</h3>

          {/* Creator Info */}
          {prediction.creator && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              {prediction.creator.avatarUrl && (
                <img
                  src={prediction.creator.avatarUrl}
                  alt={prediction.creator.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <span className="text-tertiary">
                Created by{' '}
                <span className="text-content font-medium">{prediction.creator.name}</span>
              </span>
            </div>
          )}

          {/* Engagement metrics */}
          <div className="flex items-center gap-4 text-sm text-tertiary mb-3">
            <span className="flex items-center gap-1">
              <span className="text-primary">📊</span>
              {totalBets} bets
            </span>
            {totalVolume > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-primary">💰</span>
                {formatMuskBucks(totalVolume)} 🪙 volume
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="text-primary">📈</span>
              {flatParlays.length} parlays
            </span>
            <PredictionReactions predictionId={prediction.id} />
          </div>

          {/* Source Links */}
          {prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
            <div className="mb-3">
              <PredictionSourceList sources={prediction.sourceLinks} />
            </div>
          )}

          {/* Time remaining */}
          {!prediction.resolved && (
            <div
              className={`text-sm font-medium flex items-center gap-2 mb-4 ${
                now > expires
                  ? 'text-error'
                  : hoursLeft <= 2
                    ? 'text-warning'
                    : hoursLeft <= 24
                      ? 'text-info'
                      : 'text-success'
              }`}
            >
              <span>{statusBadge.icon}</span>
              {now > expires
                ? `Expired ${new Date(prediction.expiresAt).toLocaleString()}`
                : hoursLeft <= 24
                  ? `${hoursLeft}h ${Math.ceil((timeLeft % (1000 * 60 * 60)) / (1000 * 60))}m remaining`
                  : `Expires ${new Date(prediction.expiresAt).toLocaleString()}`}
            </div>
          )}

          {/* Odds visual */}
          <OddsBar
            variant="full"
            type={prediction.type as PredictionType}
            options={prediction.options as PublicPredictionOption[]}
            bets={prediction.bets.map((bet) => ({
              ...bet,
              amount: bet.amount.toString(),
              potentialPayout: bet.potentialPayout?.toString() ?? null,
              payout: bet.payout?.toString() ?? null,
            }))}
            parlayLegs={flatParlays.map((leg) => ({
              ...leg,
              stake: asNum(leg.stake),
              createdAt:
                leg.createdAt instanceof Date ? leg.createdAt.toISOString() : leg.createdAt,
            }))}
            predictionId={prediction.id}
            expiresAt={
              typeof prediction.expiresAt === 'string'
                ? prediction.expiresAt
                : prediction.expiresAt.toISOString()
            }
          />

          {/* Recent bets */}
          {showBetsList && (prediction.bets.length > 0 || flatParlays.length > 0) && (
            <BetsList
              type={prediction.type as PredictionType}
              bets={prediction.bets}
              parlayLegs={flatParlays}
              options={prediction.options as PublicPredictionOption[]}
            />
          )}

          {/* Action button */}
          {showActions && !prediction.resolved && (
            <div className="mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to card view handler
                  setShowBetModal(true);
                }}
                className="w-full py-3 px-6 bg-info hover:bg-info/90 text-surface font-bold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>🎯</span>
                  <span>Place Your Bet</span>
                  <span>💰</span>
                </span>
              </button>

              <div className="mt-2 text-xs text-tertiary text-center">
                💡 Use the dashboard parlay builder for multi-prediction bets
              </div>
            </div>
          )}
        </li>
      ) : (
        <div className={cardClasses} onClick={onCardView}>
          {/* Compact/Mini Status Badge */}
          <span className={badgeClasses}>
            {!isMini && <span>{statusBadge.icon}</span>}
            {statusBadge.text}
          </span>

          {/* Title */}
          <h3 className={titleClasses}>{prediction.title}</h3>

          {/* Creator Info */}
          {prediction.creator && !isMini && (
            <div className="flex items-center gap-2 mb-2 text-sm">
              {prediction.creator.avatarUrl && (
                <img
                  src={prediction.creator.avatarUrl}
                  alt={prediction.creator.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              )}
              <span className="text-tertiary text-xs">
                by <span className="text-content font-medium">{prediction.creator.name}</span>
              </span>
            </div>
          )}

          {/* Quick stats */}
          <div
            className={`flex items-center gap-3 mb-3 text-sm text-tertiary ${isMini ? 'text-xs gap-2' : ''}`}
          >
            <span className="flex items-center gap-1">
              <span className="text-primary">📊</span>
              {totalBets} {isMini ? '' : 'bets'}
            </span>
            {totalVolume > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-primary">💰</span>
                {formatMuskBucks(totalVolume)} 🪙
              </span>
            )}
            {!prediction.resolved && (
              <span className={`text-xs ${now > expires ? 'text-error' : 'text-tertiary'}`}>
                {now > expires
                  ? 'Expired'
                  : `${Math.ceil((expires - now) / (1000 * 60 * 60))}h left`}
              </span>
            )}
            {!isMini && <PredictionReactions predictionId={prediction.id} compact />}
          </div>

          {/* Source Links - Compact */}
          {!isMini && prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
            <div className="mb-2">
              <PredictionSourceList sources={prediction.sourceLinks} compact />
            </div>
          )}

          {/* Compact Odds */}
          <OddsBar
            variant={isCompact ? 'compact' : 'mini'}
            type={prediction.type as PredictionType}
            options={prediction.options as PublicPredictionOption[]}
            bets={prediction.bets.map((bet) => ({
              ...bet,
              amount: bet.amount.toString(),
              potentialPayout: bet.potentialPayout?.toString() ?? null,
              payout: bet.payout?.toString() ?? null,
            }))}
            parlayLegs={flatParlays.map((leg) => ({
              ...leg,
              stake: asNum(leg.stake),
              createdAt:
                leg.createdAt instanceof Date ? leg.createdAt.toISOString() : leg.createdAt,
            }))}
            predictionId={prediction.id}
            expiresAt={
              typeof prediction.expiresAt === 'string'
                ? prediction.expiresAt
                : prediction.expiresAt.toISOString()
            }
          />

          {/* Enhanced Parlay Option Selector */}
          {showParlayActions &&
            showParlaySelector &&
            !hideInlineParlaySelector &&
            !prediction.resolved &&
            now <= expires && (
              <div className="mt-3 p-3 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg border border-secondary/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-content flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    {isInParlay ? 'Update parlay selection:' : 'Add to parlay:'}
                  </div>
                  {isInParlay && (
                    <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                      Already in parlay
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {prediction.options.map((option: any) => {
                    const isSelected = parlayOption?.optionId === option.id;
                    const isAdding = addingToParlay === option.id;

                    return (
                      <button
                        key={option.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToParlay(option.id);
                        }}
                        disabled={addingToParlay !== null || isSelected}
                        className={`
                          w-full p-3 rounded-lg text-sm transition-all duration-200 text-left
                          flex items-center justify-between group
                          ${
                            isAdding
                              ? 'bg-success text-surface scale-105 shadow-lg'
                              : isSelected
                                ? 'bg-success/20 text-success border-2 border-success cursor-not-allowed'
                                : 'bg-surface border border-muted hover:border-primary hover:scale-102 hover:shadow-md'
                          }
                        `}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-success" />}
                          </div>
                          {(isAdding || isSelected) && (
                            <div className="text-xs mt-1 opacity-90">
                              {isAdding ? '✨ Adding to parlay...' : '✓ Currently selected'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold text-lg">
                            {option.odds.toFixed(2)}×
                          </span>
                          {!isSelected && !isAdding && (
                            <Plus className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Compact Actions */}
          {showActions && !prediction.resolved && now <= expires && (
            <div className={`mt-3 flex gap-2 ${isMini ? 'flex-col' : ''}`}>
              {/* Bet Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling to card view handler
                  setShowBetModal(true);
                }}
                className={`${isMini ? 'w-full' : 'flex-1'} px-3 py-2 bg-info hover:bg-info/90 text-surface text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <span>🎯</span>
                  <span>Bet</span>
                </span>
              </button>

              {/* Enhanced Parlay Button */}
              {showParlayActions && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hideInlineParlaySelector) {
                      handleAddDefaultToParlay();
                    } else {
                      toggleParlaySelector();
                    }
                  }}
                  disabled={addingToParlay !== null || isInParlay}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    flex items-center gap-1.5
                    ${
                      isInParlay
                        ? 'bg-success/20 text-success border border-success cursor-not-allowed'
                        : showParlaySelector && !hideInlineParlaySelector
                          ? 'bg-secondary text-surface border-2 border-secondary'
                          : addingToParlay !== null
                            ? 'bg-success text-surface scale-105'
                            : 'bg-secondary hover:bg-secondary-hover text-surface hover:scale-105'
                    }
                  `}
                >
                  {isInParlay ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>In Parlay</span>
                    </>
                  ) : addingToParlay !== null ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added!</span>
                    </>
                  ) : hideInlineParlaySelector ? (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Parlay</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Parlay</span>
                      {showParlaySelector ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Recent activity indicator */}
          {totalBets > 0 && !isMini && (
            <div className="mt-2 flex items-center justify-between text-xs text-tertiary">
              <span>
                Latest: {prediction.bets[prediction.bets.length - 1]?.user?.name || 'Anonymous'}
              </span>
              <span className="flex items-center gap-1">
                {prediction.options.find((opt: any) =>
                  prediction.bets.some(
                    (bet: BetWithUser) => bet.optionId === opt.id && asNum(bet.amount) > 500,
                  ),
                ) && <span title="High-stakes activity">🔥</span>}
                {flatParlays.length > 0 && <span title="Parlay activity">📈</span>}
              </span>
            </div>
          )}
        </div>
      )}

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

function arePropsEqual(
  prev: UnifiedPredictionCardProps,
  next: UnifiedPredictionCardProps,
): boolean {
  // Core prediction data
  if (prev.prediction.id !== next.prediction.id) return false;
  if (prev.prediction.resolved !== next.prediction.resolved) return false;
  if (prev.prediction.bets.length !== next.prediction.bets.length) return false;

  // Creator info
  if (prev.prediction.creator?.id !== next.prediction.creator?.id) return false;
  if (prev.prediction.creator?.name !== next.prediction.creator?.name) return false;

  // Category info
  if (prev.prediction.category?.id !== next.prediction.category?.id) return false;

  // Variant and display settings
  if (prev.variant !== next.variant) return false;
  if (prev.showActions !== next.showActions) return false;
  if (prev.showBetsList !== next.showBetsList) return false;
  if (prev.showParlayActions !== next.showParlayActions) return false;
  if (prev.hideInlineParlaySelector !== next.hideInlineParlaySelector) return false;

  // For efficiency, check only shallow props
  // Deep comparison of bets array would be expensive
  return true;
}

export default React.memo(UnifiedPredictionCard, arePropsEqual);
