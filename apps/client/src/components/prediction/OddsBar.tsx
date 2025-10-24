// apps/client/src/components/OddsBar.tsx
// Unified odds bar component merging regular and compact variants
import { useState, useEffect } from 'react';
import type { PublicPredictionOption, PublicBet } from '@ems/types';
import { PredictionType, REDIS_CHANNELS } from '@ems/types';
import { useEventBusCore } from '../../contexts/EventBusCoreContext';
import { getOptionClasses } from '../../utils/predictionColors';
import { useUnifiedTheme } from '../../theme/hooks/useUnifiedTheme';

interface FlattenedParlayLeg {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
}

interface OddsBarProps {
  variant?: 'full' | 'compact' | 'mini' | 'pool';
  type: PredictionType;
  options: PublicPredictionOption[];
  bets?: PublicBet[];
  parlayLegs?: FlattenedParlayLeg[];
  predictionId?: number;
  expiresAt?: string;
  className?: string;
}

export default function OddsBar({
  variant = 'full',
  type,
  options,
  bets = [],
  parlayLegs = [],
  predictionId,
  expiresAt,
  className = '',
}: OddsBarProps) {
  const { currentTheme } = useUnifiedTheme();
  const { subscribe } = useEventBusCore();
  const [currentOptions, setCurrentOptions] = useState(options);
  const [oddsAnimations, setOddsAnimations] = useState<Record<number, 'up' | 'down' | null>>({});
  const [hotMarket, setHotMarket] = useState(false);

  const isCompact = variant === 'compact';
  const isMini = variant === 'mini';
  const isFullSize = variant === 'full';
  const isPool = variant === 'pool';

  // Listen for enhanced odds updates via EventBusCore
  useEffect(() => {
    if (!predictionId) return;

    const handleEnhancedOddsUpdate = (data: {
      predictionId: number;
      hotMarket: boolean;
      options: Array<{
        id: number;
        odds: number;
        label: string;
        change: number;
        changePercent: number;
      }>;
    }) => {
      if (data.predictionId === predictionId) {
        const updatedOptions = currentOptions.map((option) => {
          const updated = data.options.find((opt) => opt.id === option.id);
          if (updated) {
            if (updated.odds !== option.odds) {
              setOddsAnimations((prev) => ({
                ...prev,
                [option.id]: updated.odds > option.odds ? 'up' : 'down',
              }));

              const animationDuration = isMini ? 1000 : isCompact ? 1500 : 2000;
              setTimeout(() => {
                setOddsAnimations((prev) => ({ ...prev, [option.id]: null }));
              }, animationDuration);
            }

            return { ...option, odds: updated.odds };
          }
          return option;
        });

        setCurrentOptions(updatedOptions);
        setHotMarket(data.hotMarket || false);
      }
    };

    return subscribe(REDIS_CHANNELS.ODDS_UPDATE_ENHANCED, handleEnhancedOddsUpdate);
  }, [subscribe, predictionId, currentOptions, isMini, isCompact]);

  // Calculate excitement level
  const getExcitementLevel = () => {
    const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
    const totalPool =
      bets.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0) +
      parlayLegs.reduce<number>((sum, leg) => sum + asNum(leg.stake), 0);
    const timeLeft = expiresAt
      ? (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
      : 24;
    const recentActivity =
      bets.filter((bet) => new Date(bet.createdAt).getTime() > Date.now() - 10 * 60 * 1000).length +
      parlayLegs.filter((leg) => new Date(leg.createdAt).getTime() > Date.now() - 10 * 60 * 1000)
        .length;

    if (hotMarket || (recentActivity >= 5 && timeLeft <= 2)) return 'blazing';
    if (
      (hotMarket && recentActivity >= 2) ||
      (recentActivity >= 3 && timeLeft <= 6) ||
      totalPool > 2000
    )
      return 'hot';
    if (recentActivity >= 2 || timeLeft <= 24 || totalPool > 500) return 'warm';
    return 'normal';
  };

  const excitementLevel = getExcitementLevel();

  // Calculate total staked
  const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);
  const totalStaked =
    bets.reduce<number>((sum, b) => sum + asNum(b.amount), 0) +
    parlayLegs.reduce<number>((sum, l) => sum + asNum(l.stake), 0);

  // No bets yet state
  if (totalStaked === 0 || currentOptions.length === 0) {
    return (
      <div className={`mt-${isMini ? '1' : isCompact ? '2' : '3'} ${className}`}>
        <p className={`text-xs italic text-tertiary mb-2 ${isMini ? 'hidden' : ''}`}>
          {isMini ? '' : 'No bets yet'}
        </p>

        <div
          className={`grid gap-${isMini ? '1' : '2'} ${
            isMini
              ? 'grid-cols-2'
              : isCompact
                ? 'grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {currentOptions.map((option, optionIndex) => {
            // Get theme-aware color classes
            const colorClasses = getOptionClasses(currentTheme, type, optionIndex);

            return (
              <div
                key={option.id}
                className={`relative border-2 ${colorClasses.bgTint} hover:shadow-sm transition-all duration-300 ${
                  isMini
                    ? 'p-1.5 rounded'
                    : isCompact
                      ? 'p-2 rounded-md'
                      : 'p-3 rounded-lg hover:shadow-md'
                }`}
                style={{ borderColor: colorClasses.hex }}
              >
                <div
                  className={`font-semibold truncate text-content ${
                    isMini ? 'text-xs' : isCompact ? 'text-sm' : 'text-lg'
                  }`}
                >
                  {option.label}
                </div>
                <div
                  className={`font-bold text-primary ${
                    isMini ? 'text-sm' : isCompact ? 'text-lg' : 'text-2xl'
                  }`}
                >
                  {option.odds.toFixed(isMini ? 1 : 2)}x
                </div>
                {!isMini && !isCompact && (
                  <div className="text-xs text-tertiary mt-1">🎯 Early Bird Bonus Available!</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Build pool data for visualization
  let cumPct = 0;
  const pools = currentOptions.map((opt, i) => {
    const singles = bets
      .filter((b) => b.optionId === opt.id)
      .reduce<number>((s, b) => s + asNum(b.amount), 0);
    const parlays = parlayLegs
      .filter((l) => l.optionId === opt.id)
      .reduce<number>((s, l) => s + asNum(l.stake), 0);
    const stake = singles + parlays;
    const pct = stake / totalStaked;
    const left = cumPct;
    cumPct += pct;
    const colorClasses = getOptionClasses(currentTheme, type, i);
    return { label: opt.label, pct, left, colorClasses, odds: opt.odds };
  });

  // Pool-only variant - just show the distribution bar (for list views)
  if (isPool) {
    if (totalStaked === 0 || currentOptions.length === 0) {
      return null; // Don't show anything if no bets yet
    }

    return (
      <div className={className}>
        {/* Option labels with percentages */}
        <div className="flex items-center justify-between text-xs mb-2">
          {pools.map((pool) => {
            const percentage = pool.pct * 100;
            return (
              <div key={pool.label} className="flex items-center gap-2">
                <span className="text-tertiary truncate max-w-[100px]">{pool.label}</span>
                <span className="font-medium text-content">{percentage.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>

        {/* Pool distribution bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
          {pools.map((pool) => {
            const percentage = pool.pct * 100;

            return (
              <div
                key={pool.label}
                className="h-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: pool.colorClasses.hex,
                }}
                title={`${pool.label}: ${percentage.toFixed(1)}%`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-${isMini ? '1' : isCompact ? '2' : '3'} transition-all duration-300 ${
        excitementLevel === 'blazing'
          ? 'ring-2 ring-error ring-opacity-50 bg-error/5'
          : excitementLevel === 'hot'
            ? 'ring-2 ring-warning ring-opacity-50 bg-warning/5'
            : excitementLevel === 'warm'
              ? 'ring-2 ring-info ring-opacity-50 bg-info/5'
              : ''
      } ${isMini ? 'p-1 rounded' : isCompact ? 'p-2 rounded-md' : 'p-3 rounded-lg'} ${className}`}
    >
      {/* Market Heat Indicator */}
      {excitementLevel !== 'normal' && !isMini && (
        <div className={`flex items-center justify-between mb-${isCompact ? '2' : '3'}`}>
          <div className="flex items-center space-x-2">
            <span className={`animate-pulse ${isCompact ? 'text-sm' : 'text-lg'}`}>
              {excitementLevel === 'blazing' ? '🔥🔥🔥' : excitementLevel === 'hot' ? '🔥🔥' : '🔥'}
            </span>
            <span
              className={`font-semibold ${isCompact ? 'text-xs' : 'text-sm'} ${
                excitementLevel === 'blazing'
                  ? 'text-error'
                  : excitementLevel === 'hot'
                    ? 'text-warning'
                    : 'text-info'
              }`}
            >
              {excitementLevel === 'blazing'
                ? 'BLAZING HOT!'
                : excitementLevel === 'hot'
                  ? 'HOT MARKET!'
                  : 'WARMING UP!'}
            </span>
          </div>
          {hotMarket && (
            <span
              className={`bg-error/20 text-error rounded-full font-semibold animate-pulse ${
                isCompact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
              }`}
            >
              {isCompact ? 'LIVE' : '🚀 LIVE ODDS CHANGING'}
            </span>
          )}
        </div>
      )}

      {/* Mini heat indicator */}
      {excitementLevel !== 'normal' && isMini && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs animate-pulse">
            {excitementLevel === 'blazing' ? '🔥🔥' : '🔥'}
          </span>
          {hotMarket && (
            <span className="px-1 py-0.5 bg-error/20 text-error text-xs rounded font-semibold animate-pulse">
              LIVE
            </span>
          )}
        </div>
      )}

      {/* Odds Display Grid */}
      <div
        className={`grid gap-${isMini ? '1' : isCompact ? '2' : '3'} mb-${isMini ? '1' : isCompact ? '2' : '4'} ${
          isMini
            ? 'grid-cols-2'
            : isCompact
              ? 'grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {currentOptions.map((option, optionIndex) => {
          const animation = oddsAnimations[option.id];
          const optionStake =
            bets
              .filter((b) => b.optionId === option.id)
              .reduce<number>((s, b) => s + asNum(b.amount), 0) +
            parlayLegs
              .filter((l) => l.optionId === option.id)
              .reduce<number>((s, l) => s + asNum(l.stake), 0);
          const marketShare = optionStake / totalStaked;

          // Get theme-aware color classes
          const colorClasses = getOptionClasses(currentTheme, type, optionIndex);

          // Determine if this option is "hot" - high market share, recent changes, or blazing market
          const isHotOption =
            marketShare > 0.4 ||
            animation !== null ||
            (excitementLevel === 'blazing' && marketShare > 0.25);

          return (
            <div
              key={option.id}
              className={`relative border-2 transition-all duration-300 ${colorClasses.bgTint} ${
                isHotOption ? `${colorClasses.glow} animate-pulse` : ''
              } hover:scale-105 hover:brightness-110 ${
                isMini ? 'p-1.5 rounded' : isCompact ? 'p-2 rounded-md' : 'p-3 rounded-lg'
              }`}
              style={{ borderColor: colorClasses.hex }}
            >
              {/* Option Label */}
              <div
                className={`font-semibold truncate ${
                  isMini ? 'text-xs' : isCompact ? 'text-sm' : 'text-lg'
                }`}
              >
                {option.label}
              </div>

              {/* Animated Odds Display */}
              <div
                className={`font-bold transition-all duration-500 ${
                  animation === 'up'
                    ? 'text-success scale-110'
                    : animation === 'down'
                      ? 'text-error scale-110'
                      : 'text-info'
                } ${isMini ? 'text-sm' : isCompact ? 'text-lg' : 'text-2xl'}`}
              >
                {option.odds.toFixed(isMini ? 1 : 2)}x{/* Change Indicator */}
                {animation && !isMini && (
                  <span
                    className={`ml-1 ${isCompact ? 'text-xs' : 'text-sm'} ${
                      animation === 'up' ? 'text-success' : 'text-error'
                    }`}
                  >
                    {animation === 'up' ? '↗' : '↘'}
                  </span>
                )}
              </div>

              {/* Market Share */}
              {!isMini && (
                <div className={`text-tertiary mt-1 ${isCompact ? 'text-xs' : 'text-xs'}`}>
                  {(marketShare * 100).toFixed(isCompact ? 0 : 1)}% of pool
                </div>
              )}

              {/* Excitement Badges */}
              {!isMini && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {option.odds > 5.0 && (
                    <span
                      className={`bg-info/20 text-info rounded font-semibold ${
                        isCompact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
                      }`}
                    >
                      🎯{isCompact ? '' : ' UNDERDOG'}
                    </span>
                  )}
                  {marketShare < 0.1 && option.odds > 3.0 && (
                    <span
                      className={`bg-warning/20 text-warning rounded font-semibold ${
                        isCompact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
                      }`}
                    >
                      ⚡{isCompact ? '' : ' HERO BONUS'}
                    </span>
                  )}
                  {excitementLevel === 'blazing' && (
                    <span
                      className={`bg-error/20 text-error rounded font-semibold animate-pulse ${
                        isCompact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-xs'
                      }`}
                    >
                      🔥{isCompact ? '' : ' HOT'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool Distribution Bar (only for full size) */}
      {isFullSize && (
        <div className="mt-2">
          <div className="text-xs text-tertiary mb-1 flex items-center justify-between">
            <span>Pool Distribution</span>
            <span className="text-xs font-semibold text-content">
              Total: ${(totalStaked / 1000).toFixed(1)}k
            </span>
          </div>
          <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden border border-border">
            {pools.map((p, idx) => {
              const isLargeSegment = p.pct > 0.4;

              return (
                <div
                  key={p.label}
                  className={`absolute top-0 h-full transition-all duration-500 ${
                    isLargeSegment ? 'opacity-90' : 'opacity-80'
                  } hover:opacity-100`}
                  style={{
                    left: `${p.left * 100}%`,
                    width: `${p.pct * 100}%`,
                    backgroundColor: p.colorClasses.hex,
                  }}
                  title={`${p.label}: ${(p.pct * 100).toFixed(1)}%`}
                >
                  {/* Add a subtle border between segments */}
                  {idx > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-background/50" />
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2">
            {pools.map((p) => {
              return (
                <div key={p.label} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{
                      backgroundColor: p.colorClasses.hex,
                      borderColor: p.colorClasses.hex,
                    }}
                  />
                  <span className="text-xs text-content font-medium">{p.label}</span>
                  <span className="text-xs text-tertiary">({(p.pct * 100).toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
