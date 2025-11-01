import { UnifiedBadge } from '../common/UnifiedBadge';
import { BADGE_TYPES, BADGE_RARITIES, type BadgeSize, type BadgeRarity } from '../../types/badges';
import { getTierTokens } from '../../theme/tokens/badge';

interface PongTierBadgeProps {
  tier: string;
  eloRating?: number;
  size?: BadgeSize;
  showElo?: boolean;
  className?: string;
}

interface TierConfig {
  icon: string;
  description: string;
  range: string;
  rarity: BadgeRarity;
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  BRONZE: {
    icon: '🥉',
    description: 'Beginners',
    range: '400-999',
    rarity: BADGE_RARITIES.COMMON,
  },
  SILVER: {
    icon: '🥈',
    description: 'Casual players',
    range: '1000-1399',
    rarity: BADGE_RARITIES.COMMON,
  },
  GOLD: {
    icon: '🥇',
    description: 'Regular players',
    range: '1400-1799',
    rarity: BADGE_RARITIES.UNCOMMON,
  },
  PLATINUM: {
    icon: '💎',
    description: 'Skilled & profitable',
    range: '1800-2199',
    rarity: BADGE_RARITIES.RARE,
  },
  DIAMOND: {
    icon: '💠',
    description: 'Elite players',
    range: '2200-2599',
    rarity: BADGE_RARITIES.EPIC,
  },
  MASTER: {
    icon: '👑',
    description: 'Top performers',
    range: '2600-2999',
    rarity: BADGE_RARITIES.EPIC,
  },
  GRANDMASTER: {
    icon: '⭐',
    description: 'Legendary status',
    range: '3000+',
    rarity: BADGE_RARITIES.LEGENDARY,
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
  const tokens = getTierTokens(tier);

  const text = showElo && eloRating ? `${tier} (${eloRating})` : tier;
  const description = `${tier} Tier (${tierConfig.range} Elo) - ${tierConfig.description}`;

  const customColors = {
    background: tokens.background,
    ...(tokens.gradient ? { gradient: tokens.gradient } : {}),
    border: tokens.border,
    text: tokens.text,
    glow: tokens.glow,
    shadow: tokens.shadow,
    lightSweep: tokens.lightSweep,
  };

  return (
    <UnifiedBadge
      type={BADGE_TYPES.TIER}
      text={text}
      icon={tierConfig.icon}
      rarity={tierConfig.rarity}
      size={size}
      description={description}
      className={`uppercase tracking-[0.12em] leading-tight whitespace-nowrap ${className}`}
      customColors={customColors}
      variant="glass"
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
