// apps/client/src/components/UnifiedPredictionCard.tsx
// Unified prediction card component merging full and compact variants
import { useState } from 'react';
import type {
  PublicPredictionOption,
  BetWithUser,
  ParlayLegWithUser,
  PredictionType,
} from '@ems/types';
import type { PredictionFull } from '../api/predictions';
import UnifiedOddsBar from './UnifiedOddsBar';
import BetsList from './BetsList';
import BetModal from './BetModal';
import { useParlay } from '../contexts/ParlayContext';
import { PredictionSourceList } from './prediction/PredictionSourceList';

interface UnifiedPredictionCardProps {
  prediction: PredictionFull;
  variant?: 'full' | 'compact' | 'mini';
  showActions?: boolean;
  showBetsList?: boolean;
  showParlayActions?: boolean;
  addOptimisticBet?: (bet: BetWithUser) => void;
  className?: string;
  hideInlineParlaySelector?: boolean; // Hide inline parlay selector but keep parlay button
  onCardView?: () => void; // Callback when card is viewed (not when buttons are clicked)
}

export default function UnifiedPredictionCard({
  prediction,
  variant = 'full',
  showActions = true,
  showBetsList = true,
  showParlayActions = false,
  addOptimisticBet,
  className = '',
  hideInlineParlaySelector = false,
  onCardView,
}: UnifiedPredictionCardProps) {
  const { dispatch: parlayDispatch } = useParlay();
  const [showBetModal, setShowBetModal] = useState(false);
  const [addingToParlay, setAddingToParlay] = useState<number | null>(null);
  const [showParlaySelector, setShowParlaySelector] = useState(false);

  const flatParlays: ParlayLegWithUser[] = prediction.parlayLegs ?? [];
  const isCompact = variant === 'compact';
  const isMini = variant === 'mini';
  const isFullSize = variant === 'full';

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
    prediction.bets.reduce((sum: number, bet: BetWithUser) => sum + bet.amount, 0) +
    flatParlays.reduce((sum: number, leg: ParlayLegWithUser) => sum + leg.stake, 0);
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
      {isFullSize ? (
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

          {/* Engagement metrics */}
          <div className="flex items-center gap-4 text-sm text-tertiary mb-3">
            <span className="flex items-center gap-1">
              <span className="text-primary">📊</span>
              {totalBets} bets
            </span>
            {totalVolume > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-primary">💰</span>${totalVolume.toLocaleString()} volume
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="text-primary">📈</span>
              {flatParlays.length} parlays
            </span>
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
          <UnifiedOddsBar
            variant="full"
            type={prediction.type as PredictionType}
            options={prediction.options as PublicPredictionOption[]}
            bets={prediction.bets}
            parlayLegs={flatParlays.map((leg) => ({
              ...leg,
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
                <span className="text-primary">💰</span>$
                {isMini ? Math.round(totalVolume / 1000) + 'k' : totalVolume.toLocaleString()}
              </span>
            )}
            {!prediction.resolved && (
              <span className={`text-xs ${now > expires ? 'text-error' : 'text-tertiary'}`}>
                {now > expires
                  ? 'Expired'
                  : `${Math.ceil((expires - now) / (1000 * 60 * 60))}h left`}
              </span>
            )}
          </div>

          {/* Source Links - Compact */}
          {!isMini && prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
            <div className="mb-2">
              <PredictionSourceList sources={prediction.sourceLinks} compact />
            </div>
          )}

          {/* Compact Odds */}
          <UnifiedOddsBar
            variant={isCompact ? 'compact' : 'mini'}
            type={prediction.type as PredictionType}
            options={prediction.options as PublicPredictionOption[]}
            bets={prediction.bets}
            parlayLegs={flatParlays.map((leg) => ({
              ...leg,
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

          {/* Parlay Option Selector */}
          {showParlayActions &&
            showParlaySelector &&
            !hideInlineParlaySelector &&
            !prediction.resolved &&
            now <= expires && (
              <div className="mt-3 p-3 bg-secondary/20 rounded-lg border border-secondary">
                <div className="text-sm font-medium text-content mb-2">
                  Choose option for parlay:
                </div>
                <div className="space-y-2">
                  {prediction.options.map((option: any) => (
                    <button
                      key={option.id}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling to card view handler
                        handleAddToParlay(option.id);
                      }}
                      disabled={addingToParlay !== null}
                      className={`w-full p-2 rounded-lg text-sm transition-all duration-200 text-left ${
                        addingToParlay === option.id
                          ? 'bg-success text-surface scale-105'
                          : 'bg-surface border border-muted hover:border-primary hover:scale-102'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-primary font-bold">{option.odds.toFixed(2)}×</span>
                      </div>
                      {addingToParlay === option.id && (
                        <div className="text-xs mt-1 opacity-90">✅ Added to parlay!</div>
                      )}
                    </button>
                  ))}
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

              {/* Parlay Button */}
              {showParlayActions && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling to card view handler
                    if (hideInlineParlaySelector) {
                      handleAddDefaultToParlay();
                    } else {
                      toggleParlaySelector();
                    }
                  }}
                  disabled={addingToParlay !== null}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    showParlaySelector && !hideInlineParlaySelector
                      ? 'bg-secondary text-content border-2 border-secondary'
                      : addingToParlay !== null
                        ? 'bg-success text-surface scale-105'
                        : 'bg-warning hover:bg-warning/90 text-surface hover:scale-105'
                  }`}
                >
                  {addingToParlay !== null ? (
                    <span className="flex items-center space-x-1">
                      <span>✅</span>
                    </span>
                  ) : hideInlineParlaySelector ? (
                    <span className="flex items-center space-x-1">
                      <span>📈</span>
                      <span>+</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1">
                      <span>📈</span>
                      <span>{showParlaySelector ? '^' : 'v'}</span>
                    </span>
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
                    (bet: BetWithUser) => bet.optionId === opt.id && bet.amount > 500,
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
        mode="full"
        onBetPlaced={addOptimisticBet}
      />
    </>
  );
}
