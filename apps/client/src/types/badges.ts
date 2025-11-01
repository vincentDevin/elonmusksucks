/**
 * Badge Type System
 * Comprehensive badge system with rarity tiers, animations, and advanced color schemes
 */

export const BADGE_TYPES = {
  TIER: 'TIER',
  BOT: 'BOT',
  STREAK: 'STREAK',
  HIGH_ROLLER: 'HIGH_ROLLER',
  BAN_PERMANENT: 'BAN_PERMANENT',
  BAN_TEMPORARY: 'BAN_TEMPORARY',
  BAN_COUNT: 'BAN_COUNT',
} as const;

export type BadgeType = (typeof BADGE_TYPES)[keyof typeof BADGE_TYPES];

export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge Rarity System
 * Determines visual complexity and animation intensity
 */
export const BADGE_RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export type BadgeRarity = (typeof BADGE_RARITIES)[keyof typeof BADGE_RARITIES];

/**
 * Animation Types
 * Each animation can be applied to specific badge layers
 */
export const BADGE_ANIMATIONS = {
  NONE: 'none',
  BORDER_GLOW: 'border-glow',
  FLOAT: 'float',
  LIGHT_SWEEP: 'light-sweep',
} as const;

export type BadgeAnimation = (typeof BADGE_ANIMATIONS)[keyof typeof BADGE_ANIMATIONS];

export interface BadgeColorOverrides {
  background?: string;
  gradient?: string;
  border?: string;
  text?: string;
  glow?: string;
  shadow?: string;
  lightSweep?: string;
}

/**
 * Badge Data Interface
 * Simplified interface for badge rendering - colors and animations are now handled by theme system
 */
export interface BadgeData {
  type: BadgeType;
  text: string;
  icon?: string;
  description?: string;
  size?: BadgeSize;
  rarity?: BadgeRarity;
  // Tier-specific data (for TIER type)
  tier?: string;
  elo?: number;
  customColors?: BadgeColorOverrides;
  variant?: 'solid' | 'glass';
}

/**
 * Default size configuration per badge type
 */
export const BADGE_SIZE_CONFIG: Record<BadgeType, BadgeSize> = {
  [BADGE_TYPES.TIER]: 'md', // More prominent for rank badges
  [BADGE_TYPES.BOT]: 'sm',
  [BADGE_TYPES.STREAK]: 'sm',
  [BADGE_TYPES.HIGH_ROLLER]: 'sm',
  [BADGE_TYPES.BAN_PERMANENT]: 'sm',
  [BADGE_TYPES.BAN_TEMPORARY]: 'sm',
  [BADGE_TYPES.BAN_COUNT]: 'sm',
};
