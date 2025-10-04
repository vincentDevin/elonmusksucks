interface PongTierBadgeProps {
  tier: string;
  eloRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showElo?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  BRONZE: {
    colors: 'bg-muted text-tertiary border-muted',
    icon: '🥉',
    description: 'Beginners',
    range: '400-999',
  },
  SILVER: {
    colors: 'bg-surface text-content border-accent/20',
    icon: '🥈',
    description: 'Casual players',
    range: '1000-1399',
  },
  GOLD: {
    colors: 'bg-accent/10 text-accent border-accent/30',
    icon: '🥇',
    description: 'Regular players',
    range: '1400-1799',
  },
  PLATINUM: {
    colors: 'bg-success/10 text-success border-success/30',
    icon: '💎',
    description: 'Skilled & profitable',
    range: '1800-2199',
  },
  DIAMOND: {
    colors: 'bg-primary/10 text-primary border-primary/30',
    icon: '💠',
    description: 'Elite players',
    range: '2200-2599',
  },
  MASTER: {
    colors: 'bg-error/10 text-error border-error/30',
    icon: '👑',
    description: 'Top performers',
    range: '2600-2999',
  },
  GRANDMASTER: {
    colors: 'bg-accent/20 text-accent border-accent/50',
    icon: '⭐',
    description: 'Legendary status',
    range: '3000+',
  },
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'text-sm',
    text: 'font-medium',
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'text-base',
    text: 'font-semibold',
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'text-lg',
    text: 'font-bold',
  },
};

export default function PongTierBadge({
  tier,
  eloRating,
  size = 'md',
  showElo = false,
  className = '',
}: PongTierBadgeProps) {
  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.SILVER;
  const sizeConfig = SIZE_CLASSES[size];

  return (
    <div
      className={`
        inline-flex items-center space-x-1.5 rounded-full border transition-all duration-200
        ${tierConfig.colors}
        ${sizeConfig.container}
        ${className}
      `}
      title={`${tier} Tier (${tierConfig.range} Elo) - ${tierConfig.description}`}
    >
      <span className={sizeConfig.icon}>{tierConfig.icon}</span>
      <span className={sizeConfig.text}>{tier}</span>
      {showElo && eloRating && <span className="opacity-75">({eloRating})</span>}
    </div>
  );
}

// Export tier utilities for use in other components
export const getTierFromElo = (elo: number): string => {
  if (elo >= 3000) return 'GRANDMASTER';
  if (elo >= 2600) return 'MASTER';
  if (elo >= 2200) return 'DIAMOND';
  if (elo >= 1800) return 'PLATINUM';
  if (elo >= 1400) return 'GOLD';
  if (elo >= 1000) return 'SILVER';
  return 'BRONZE';
};

export const getTierProgress = (elo: number, tier: string): number => {
  const tierRanges = {
    BRONZE: { min: 400, max: 999 },
    SILVER: { min: 1000, max: 1399 },
    GOLD: { min: 1400, max: 1799 },
    PLATINUM: { min: 1800, max: 2199 },
    DIAMOND: { min: 2200, max: 2599 },
    MASTER: { min: 2600, max: 2999 },
    GRANDMASTER: { min: 3000, max: 10000 },
  };

  const range = tierRanges[tier as keyof typeof tierRanges];
  if (!range) return 100;

  return Math.min(100, ((elo - range.min) / (range.max - range.min)) * 100);
};

export { TIER_CONFIG };
