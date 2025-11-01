import { UnifiedBadge } from '../common/UnifiedBadge';
import { BADGE_TYPES } from '../../types/badges';
import type { BadgeSize } from '../../types/badges';

interface PongTierBadgeProps {
  tier: string;
  eloRating?: number;
  size?: BadgeSize;
  showElo?: boolean;
  className?: string;
}

export const TIER_CONFIG = {
  BRONZE: {
    colors: 'bg-amber-900/20 text-amber-800 dark:text-amber-500 border-amber-600/30',
    icon: '🥉',
    description: 'Beginners',
    range: '400-999',
  },
  SILVER: {
    colors: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/30',
    icon: '🥈',
    description: 'Casual players',
    range: '1000-1399',
  },
  GOLD: {
    colors: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    icon: '🥇',
    description: 'Regular players',
    range: '1400-1799',
  },
  PLATINUM: {
    colors: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
    icon: '💎',
    description: 'Skilled & profitable',
    range: '1800-2199',
  },
  DIAMOND: {
    colors: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    icon: '💠',
    description: 'Elite players',
    range: '2200-2599',
  },
  MASTER: {
    colors: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
    icon: '👑',
    description: 'Top performers',
    range: '2600-2999',
  },
  GRANDMASTER: {
    colors: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
    icon: '⭐',
    description: 'Legendary status',
    range: '3000+',
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

  const text = showElo && eloRating ? `${tier} (${eloRating})` : tier;
  const description = `${tier} Tier (${tierConfig.range} Elo) - ${tierConfig.description}`;

  // Determine animation based on tier rarity
  const animation = tier === 'GRANDMASTER' ? 'shimmer' : tier === 'MASTER' ? 'pulse' : 'none';

  return (
    <UnifiedBadge
      type={BADGE_TYPES.TIER}
      text={text}
      icon={tierConfig.icon}
      color={tierConfig.colors}
      size={size}
      description={description}
      className={className}
      animated={animation}
    />
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
