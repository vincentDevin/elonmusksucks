import { useEffect, useRef, useState } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull } from '@ems/types';
import { getOptionColor } from '../../utils/predictionColors';
import { useUnifiedTheme } from '../../theme/hooks/useUnifiedTheme';
import {
  ClockIcon as Clock,
  ArrowTrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  CurrencyDollarIcon as DollarSign,
  ChartBarIcon as BarChart3,
  EyeIcon as Target,
  CalendarIcon as Calendar,
} from '@heroicons/react/24/outline';
import { PredictionSourceList } from './PredictionSourceList';

interface PredictionPreviewProps {
  prediction: PredictionFull;
  triggerRef: React.RefObject<HTMLElement>;
  isVisible: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  className?: string;
}

const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

export default function PredictionPreview({
  prediction,
  triggerRef,
  isVisible,
  placement = 'right',
  offset = 8,
  className = '',
}: PredictionPreviewProps) {
  const { currentTheme } = useUnifiedTheme();
  const previewRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);

  // Calculate position based on trigger element
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !previewRef.current) return;

    const calculatePosition = () => {
      if (!triggerRef.current || !previewRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const previewRect = previewRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;
      let finalPlacement = placement;

      // Calculate initial position based on placement
      switch (placement) {
        case 'right':
          left = triggerRect.right + offset;
          top = triggerRect.top;
          // Check if it would overflow right
          if (left + previewRect.width > viewportWidth - 20) {
            // Try left side instead
            left = triggerRect.left - previewRect.width - offset;
            finalPlacement = 'left';
          }
          break;
        case 'left':
          left = triggerRect.left - previewRect.width - offset;
          top = triggerRect.top;
          // Check if it would overflow left
          if (left < 20) {
            // Try right side instead
            left = triggerRect.right + offset;
            finalPlacement = 'right';
          }
          break;
        case 'top':
          left = triggerRect.left + (triggerRect.width - previewRect.width) / 2;
          top = triggerRect.top - previewRect.height - offset;
          // Check if it would overflow top
          if (top < 20) {
            // Try bottom instead
            top = triggerRect.bottom + offset;
            finalPlacement = 'bottom';
          }
          break;
        case 'bottom':
          left = triggerRect.left + (triggerRect.width - previewRect.width) / 2;
          top = triggerRect.bottom + offset;
          // Check if it would overflow bottom
          if (top + previewRect.height > viewportHeight - 20) {
            // Try top instead
            top = triggerRect.top - previewRect.height - offset;
            finalPlacement = 'top';
          }
          break;
      }

      // Ensure preview doesn't overflow viewport edges
      left = Math.max(20, Math.min(left, viewportWidth - previewRect.width - 20));
      top = Math.max(20, Math.min(top, viewportHeight - previewRect.height - 20));

      setPosition({ top, left });
      setActualPlacement(finalPlacement);
    };

    // Calculate position immediately
    calculatePosition();

    // Recalculate on scroll or resize
    const handleRecalculate = () => calculatePosition();
    window.addEventListener('scroll', handleRecalculate, true);
    window.addEventListener('resize', handleRecalculate);

    return () => {
      window.removeEventListener('scroll', handleRecalculate, true);
      window.removeEventListener('resize', handleRecalculate);
    };
  }, [isVisible, triggerRef, placement, offset]);

  if (!isVisible) return null;

  // Time calculations
  const now = Date.now();
  const expires = new Date(prediction.expiresAt).getTime();
  const createdAt = new Date(prediction.createdAt).getTime();
  const timeLeft = expires - now;
  const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);
  const duration = expires - createdAt;
  const progress = ((now - createdAt) / duration) * 100;

  // Engagement metrics
  const totalBets = prediction.bets.length + (prediction.parlayLegs?.length || 0);
  const totalVolume =
    prediction.bets.reduce<number>((sum, bet) => sum + asNum(bet.amount), 0) +
    (prediction.parlayLegs?.reduce<number>((sum, leg) => sum + asNum(leg.stake), 0) || 0);

  // Recent activity (last 30 minutes)
  const recentBets = prediction.bets.filter(
    (bet) => new Date(bet.createdAt).getTime() > now - 30 * 60 * 1000,
  );

  // Calculate leading option
  const optionBets = prediction.options.map((option) => ({
    option,
    count: prediction.bets.filter((b) => b.optionId === option.id).length,
    volume: prediction.bets
      .filter((b) => b.optionId === option.id)
      .reduce((sum, b) => sum + asNum(b.amount), 0),
  }));
  const leadingOption = optionBets.reduce((max, curr) => (curr.volume > max.volume ? curr : max));

  const getStatusBadge = () => {
    if (prediction.resolved) return { text: 'Resolved', color: 'bg-success text-surface' };
    if (now > expires) return { text: 'Expired', color: 'bg-error text-surface' };
    if (hoursLeft <= 24) return { text: 'Ending Soon', color: 'bg-warning text-surface' };
    if (recentBets.length > 3) return { text: 'Hot', color: 'bg-secondary text-surface' };
    return { text: 'Active', color: 'bg-primary text-surface' };
  };

  const status = getStatusBadge();

  return (
    <div
      ref={previewRef}
      className={`
        fixed z-50 w-96 max-w-[calc(100vw-40px)]
        bg-surface border border-border rounded-xl shadow-2xl
        animate-in fade-in zoom-in-95 duration-200
        ${className}
      `}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transformOrigin:
          actualPlacement === 'left'
            ? 'right center'
            : actualPlacement === 'right'
              ? 'left center'
              : actualPlacement === 'top'
                ? 'center bottom'
                : 'center top',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-content line-clamp-2">{prediction.title}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
            {status.text}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-tertiary">
          {prediction.category && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs inline-flex items-center gap-1">
              {prediction.category.icon && <span>{prediction.category.icon}</span>}
              <span>{prediction.category.name}</span>
            </span>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(prediction.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {prediction.description && (
        <div className="p-4 border-b border-border">
          <p className="text-sm text-content line-clamp-3">{prediction.description}</p>
        </div>
      )}

      {/* Time Progress */}
      {!prediction.resolved && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium text-content">
                {now > expires
                  ? 'Expired'
                  : daysLeft > 0
                    ? `${daysLeft} days remaining`
                    : `${hoursLeft} hours remaining`}
              </span>
            </div>
            <span className="text-xs text-tertiary">{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                now > expires ? 'bg-error' : hoursLeft <= 24 ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-4 border-b border-border">
        <div>
          <div className="flex items-center gap-1 text-tertiary mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">Total Bets</span>
          </div>
          <p className="text-lg font-semibold text-content">{totalBets}</p>
          {recentBets.length > 0 && (
            <p className="text-xs text-success">+{recentBets.length} in last 30m</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1 text-tertiary mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-xs">Total Volume</span>
          </div>
          <p className="text-lg font-semibold text-content">{formatMuskBucks(totalVolume)} 🪙</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-tertiary mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">Leading Option</span>
          </div>
          <p className="text-sm font-medium text-content line-clamp-1">
            {leadingOption.option.label}
          </p>
          <p className="text-xs text-tertiary">
            {leadingOption.count} bets (
            {((leadingOption.count / Math.max(1, totalBets)) * 100).toFixed(0)}%)
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-tertiary mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-xs">Odds Range</span>
          </div>
          <p className="text-sm font-medium text-content">
            {Math.min(...prediction.options.map((o) => o.odds)).toFixed(2)}x -{' '}
            {Math.max(...prediction.options.map((o) => o.odds)).toFixed(2)}x
          </p>
        </div>
      </div>

      {/* Options Preview */}
      <div className="p-4 border-b border-border">
        <div className="text-xs text-tertiary mb-2 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Options ({prediction.options.length})</span>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {optionBets.map(({ option, count, volume }) => {
            const percentage = totalBets > 0 ? (count / totalBets) * 100 : 0;
            return (
              <div key={option.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-content truncate pr-2">{option.label}</span>
                    <span className="text-primary font-medium">{option.odds.toFixed(2)}x</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getOptionColor(
                          currentTheme,
                          prediction.type,
                          optionBets.findIndex((o) => o.option.id === option.id),
                        ),
                      }}
                    />
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-xs text-tertiary">{count} bets</p>
                  <p className="text-xs font-medium text-content">{formatMuskBucks(volume)} 🪙</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Source Links */}
      {prediction.sourceLinks && prediction.sourceLinks.length > 0 && (
        <div className="p-4">
          <div className="text-xs text-tertiary mb-2">Sources</div>
          <PredictionSourceList sources={prediction.sourceLinks} compact />
        </div>
      )}

      {/* Footer Actions Hint */}
      <div className="px-4 py-3 bg-muted/30 rounded-b-xl">
        <p className="text-xs text-tertiary text-center">
          Click to view details • Right-click for actions
        </p>
      </div>
    </div>
  );
}
