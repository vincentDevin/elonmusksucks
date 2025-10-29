import { getTierProgress, TIER_CONFIG } from './PongTierBadge';

interface EloProgressBarProps {
  currentElo: number;
  currentTier: string;
  showDetails?: boolean;
  className?: string;
  animated?: boolean;
}

const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER'];

const TIER_REQUIREMENTS = {
  BRONZE: { min: 400, max: 999 },
  SILVER: { min: 1000, max: 1399 },
  GOLD: { min: 1400, max: 1799 },
  PLATINUM: { min: 1800, max: 2199 },
  DIAMOND: { min: 2200, max: 2599 },
  MASTER: { min: 2600, max: 2999 },
  GRANDMASTER: { min: 3000, max: 10000 },
};

export default function EloProgressBar({
  currentElo,
  currentTier,
  showDetails = true,
  className = '',
  animated = true,
}: EloProgressBarProps) {
  const tierIndex = TIER_ORDER.indexOf(currentTier);
  const nextTier = tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1] : null;

  const currentTierRequirements = TIER_REQUIREMENTS[currentTier as keyof typeof TIER_REQUIREMENTS];
  const nextTierRequirements = nextTier
    ? TIER_REQUIREMENTS[nextTier as keyof typeof TIER_REQUIREMENTS]
    : null;

  const progress = getTierProgress(currentElo, currentTier);
  const pointsToNextTier = nextTierRequirements ? nextTierRequirements.min - currentElo : 0;
  const pointsInCurrentTier = currentTierRequirements
    ? currentElo - currentTierRequirements.min
    : 0;
  const totalPointsInTier = currentTierRequirements
    ? currentTierRequirements.max - currentTierRequirements.min + 1
    : 1;

  const isMaxTier = currentTier === 'GRANDMASTER';

  // Get tier color for progress bar
  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'BRONZE':
        return 'bg-orange-500';
      case 'SILVER':
        return 'bg-gray-500';
      case 'GOLD':
        return 'bg-yellow-500';
      case 'PLATINUM':
        return 'bg-green-500';
      case 'DIAMOND':
        return 'bg-blue-500';
      case 'MASTER':
        return 'bg-red-500';
      case 'GRANDMASTER':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const tierColor = getTierColor(currentTier);

  if (isMaxTier) {
    return (
      <div className={`${className}`}>
        {showDetails && (
          <div className="flex justify-between text-sm text-tertiary mb-2">
            <span>Grandmaster Achieved!</span>
            <span>{currentElo.toLocaleString()} Elo</span>
          </div>
        )}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full ${tierColor} ${animated ? 'transition-all duration-500' : ''}`}
            style={{ width: '100%' }}
          />
        </div>
        {showDetails && (
          <div className="text-center text-xs text-accent font-medium mt-1">
            🌟 Maximum Tier Reached
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showDetails && nextTier && (
        <div className="flex justify-between text-sm text-tertiary mb-2">
          <span>Progress to {nextTier}</span>
          <span>
            {pointsToNextTier > 0 ? `${pointsToNextTier} points needed` : 'Ready for promotion!'}
          </span>
        </div>
      )}

      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full ${tierColor} ${animated ? 'transition-all duration-500' : ''}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {showDetails && (
        <div className="flex justify-between text-xs text-tertiary mt-1">
          <span>{currentTierRequirements?.min.toLocaleString()}</span>
          <span className="font-medium text-content">
            {pointsInCurrentTier.toLocaleString()} / {totalPointsInTier.toLocaleString()}
          </span>
          <span>{currentTierRequirements?.max.toLocaleString()}</span>
        </div>
      )}

      {showDetails && (
        <div className="text-center text-xs text-tertiary mt-2">
          <span>Current: </span>
          <span className="font-medium text-content">{currentElo.toLocaleString()} Elo</span>
          {nextTier && pointsToNextTier > 0 && (
            <>
              <span> • Next: </span>
              <span className="font-medium text-content">
                {nextTierRequirements?.min.toLocaleString()} Elo
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Utility component for a mini progress bar without details
export function MiniEloProgressBar({
  currentElo,
  currentTier,
  className = '',
}: Pick<EloProgressBarProps, 'currentElo' | 'currentTier' | 'className'>) {
  return (
    <EloProgressBar
      currentElo={currentElo}
      currentTier={currentTier}
      showDetails={false}
      className={className}
      animated={false}
    />
  );
}
