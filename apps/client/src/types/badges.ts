/**
 * Badge Type System
 * Defines types and configurations for unified badge components
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

export interface BadgeConfig {
  color: string;
  icon?: string;
  description?: string;
}

export interface BadgeData {
  type: BadgeType;
  text: string;
  icon?: string;
  color?: string;
  description?: string;
  size?: BadgeSize;
  // Tier-specific data (for TIER type)
  tier?: string;
  elo?: number;
}

/**
 * Common badge configurations with PongTierBadge-inspired styling
 * Using theme-aware colors with semi-transparent backgrounds and high-contrast text
 */
export const COMMON_BADGE_CONFIGS: Record<string, BadgeConfig> = {
  [BADGE_TYPES.BOT]: {
    color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
    icon: '🤖',
    description: 'AI Player',
  },
  [BADGE_TYPES.STREAK]: {
    color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
    icon: '🔥',
    description: 'Current Win Streak',
  },
  [BADGE_TYPES.HIGH_ROLLER]: {
    color: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
    icon: '🎲',
    description: 'High Stakes Player',
  },
  [BADGE_TYPES.BAN_PERMANENT]: {
    color: 'bg-red-600/20 text-red-800 dark:text-red-400 border-red-600/30',
    icon: '🚫',
    description: 'Permanently Banned',
  },
  [BADGE_TYPES.BAN_TEMPORARY]: {
    color: 'bg-orange-600/20 text-orange-800 dark:text-orange-400 border-orange-600/30',
    icon: '⏰',
    description: 'Temporarily Banned',
  },
  [BADGE_TYPES.BAN_COUNT]: {
    color: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30',
    icon: '📊',
    description: 'Total Bans',
  },
};

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
