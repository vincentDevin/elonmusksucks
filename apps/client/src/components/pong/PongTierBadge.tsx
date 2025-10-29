interface PongTierBadgeProps {
  tier: string;
  eloRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showElo?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  BRONZE: {
    colors: 'bg-amber-900/20 text-black dark:text-amber-500 border-amber-600/30',
    icon: '🥉',
    description: 'Beginners',
    range: '400-999',
  },
  SILVER: {
    colors: 'bg-slate-500/20 text-black dark:text-slate-300 border-slate-400/30',
    icon: '🥈',
    description: 'Casual players',
    range: '1000-1399',
  },
  GOLD: {
    colors: 'bg-yellow-500/20 text-black dark:text-yellow-400 border-yellow-500/30',
    icon: '🥇',
    description: 'Regular players',
    range: '1400-1799',
  },
  PLATINUM: {
    colors: 'bg-cyan-500/20 text-black dark:text-cyan-400 border-cyan-500/30',
    icon: '💎',
    description: 'Skilled & profitable',
    range: '1800-2199',
  },
  DIAMOND: {
    colors: 'bg-blue-500/20 text-black dark:text-blue-400 border-blue-500/30',
    icon: '💠',
    description: 'Elite players',
    range: '2200-2599',
  },
  MASTER: {
    colors: 'bg-purple-500/20 text-black dark:text-purple-400 border-purple-500/30',
    icon: '👑',
    description: 'Top performers',
    range: '2600-2999',
  },
  GRANDMASTER: {
    colors: 'bg-orange-500/20 text-black dark:text-orange-400 border-orange-500/30',
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
