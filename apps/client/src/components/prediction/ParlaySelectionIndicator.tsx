import { useEffect, useState } from 'react';
import {
  CheckIcon as Check,
  PlusIcon as Plus,
  ArrowTrendingUpIcon as TrendingUp,
} from '@heroicons/react/24/outline';
import { useParlay } from '../../contexts/ParlayContext';

interface ParlaySelectionIndicatorProps {
  predictionId: number;
  optionId?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export default function ParlaySelectionIndicator({
  predictionId,
  optionId,
  size = 'md',
  showLabel = true,
  animated = true,
  className = '',
}: ParlaySelectionIndicatorProps) {
  const { state: parlayState } = useParlay();
  const [isNewlyAdded, setIsNewlyAdded] = useState(false);

  // Check if this prediction is in the parlay
  const parlayLeg = parlayState.legs.find((leg) => leg.predictionId === predictionId);
  const isInParlay = !!parlayLeg;
  const isCorrectOption = optionId ? parlayLeg?.optionId === optionId : true;
  const isFullySelected = isInParlay && isCorrectOption;

  // Animate when newly added
  useEffect(() => {
    if (isFullySelected) {
      setIsNewlyAdded(true);
      const timer = setTimeout(() => setIsNewlyAdded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isFullySelected]);

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'w-3 h-3',
      badge: 'w-5 h-5',
      text: 'text-xs',
      padding: 'p-0.5',
    },
    md: {
      icon: 'w-4 h-4',
      badge: 'w-6 h-6',
      text: 'text-sm',
      padding: 'p-1',
    },
    lg: {
      icon: 'w-5 h-5',
      badge: 'w-8 h-8',
      text: 'text-base',
      padding: 'p-1.5',
    },
  };

  const config = sizeConfig[size];

  if (!isInParlay && !showLabel) return null;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Icon Badge */}
      {isInParlay && (
        <div
          className={`
            ${config.badge} ${config.padding}
            rounded-full flex items-center justify-center
            transition-all duration-300
            ${
              isFullySelected
                ? 'bg-success text-surface'
                : 'bg-warning/20 text-warning border border-warning'
            }
            ${isNewlyAdded && animated ? 'animate-bounce scale-110' : ''}
          `}
        >
          {isFullySelected ? (
            <Check className={config.icon} strokeWidth={3} />
          ) : (
            <TrendingUp className={config.icon} />
          )}
        </div>
      )}

      {/* Label */}
      {showLabel && (
        <span
          className={`
            ${config.text} font-medium
            ${isFullySelected ? 'text-success' : isInParlay ? 'text-warning' : 'text-tertiary'}
            ${isNewlyAdded && animated ? 'animate-pulse' : ''}
          `}
        >
          {isFullySelected
            ? 'In Parlay'
            : isInParlay
              ? 'Different Option Selected'
              : 'Add to Parlay'}
        </span>
      )}

      {/* Add Button (when not in parlay) */}
      {!isInParlay && !showLabel && (
        <div
          className={`
            ${config.badge} ${config.padding}
            rounded-full flex items-center justify-center
            bg-muted hover:bg-primary/20 text-tertiary hover:text-primary
            transition-all duration-200 cursor-pointer
          `}
        >
          <Plus className={config.icon} />
        </div>
      )}
    </div>
  );
}

// Floating indicator that shows at the corner of a card
export function FloatingParlayIndicator({
  predictionId,
  position = 'top-right',
  className = '',
}: {
  predictionId: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}) {
  const { state: parlayState } = useParlay();
  const isInParlay = parlayState.legs.some((leg) => leg.predictionId === predictionId);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (isInParlay) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInParlay]);

  if (!isInParlay) return null;

  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  return (
    <div className={`absolute ${positionClasses[position]} ${className}`}>
      <div className="relative">
        {/* Pulse animation */}
        {showPulse && <div className="absolute inset-0 bg-success rounded-full animate-ping" />}

        {/* Main badge */}
        <div className="relative bg-success text-surface rounded-full p-1.5 shadow-lg">
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>

        {/* Label */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap">
          <span className="text-xs bg-surface/90 text-success px-2 py-0.5 rounded-full shadow-md font-medium">
            In Parlay
          </span>
        </div>
      </div>
    </div>
  );
}

// Strip indicator for list items
export function ParlayStripIndicator({
  predictionId,
  className = '',
}: {
  predictionId: number;
  className?: string;
}) {
  const { state: parlayState } = useParlay();
  const parlayLeg = parlayState.legs.find((leg) => leg.predictionId === predictionId);
  const legIndex = parlayState.legs.findIndex((leg) => leg.predictionId === predictionId);

  if (!parlayLeg) return null;

  return (
    <div
      className={`
        absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-success via-success/80 to-success
        ${className}
      `}
    >
      {/* Position number badge */}
      <div className="absolute -right-2 top-1/2 transform translate-x-full -translate-y-1/2">
        <div className="bg-success text-surface w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
          {legIndex + 1}
        </div>
      </div>
    </div>
  );
}
