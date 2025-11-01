// apps/client/src/theme/utils/badge-colors.ts

import type { UnifiedTheme, ThemeCategory } from '../types';
import type { BadgeRarity, BadgeAnimation, BadgeType } from '../../types/badges';

export interface BadgeColorScheme {
  background: string;
  gradient?: string;
  border: string;
  text: string;
  glow: string;
  lightSweep?: string;
}

/**
 * Default dark theme badge colors
 */
const DARK_BADGE_DEFAULTS: Record<BadgeRarity, BadgeColorScheme> = {
  common: {
    background: '#374151', // Gray 700
    border: '#6B7280', // Gray 500
    text: '#E5E7EB', // Gray 200
    glow: '#9CA3AF', // Gray 400
    lightSweep: 'rgba(255, 255, 255, 0.18)',
  },
  uncommon: {
    background: '#065F46', // Emerald 800
    gradient: 'linear-gradient(135deg, #065F46 0%, #059669 50%, #10B981 100%)',
    border: '#10B981', // Emerald 500
    text: '#D1FAE5', // Emerald 100
    glow: '#6EE7B7', // Brighter emerald glow
    lightSweep: 'rgba(222, 247, 236, 0.24)',
  },
  rare: {
    background: '#164E63', // Cyan 800
    gradient: 'linear-gradient(135deg, #164E63 0%, #0891B2 50%, #22D3EE 100%)',
    border: '#06B6D4', // Cyan 500
    text: '#CFFAFE', // Brighter cyan text
    glow: '#67E8F9', // Brighter cyan glow
    lightSweep: 'rgba(207, 250, 254, 0.28)',
  },
  epic: {
    background: '#581C87', // Purple 800
    gradient: 'linear-gradient(135deg, #581C87 0%, #7C3AED 33%, #A78BFA 66%, #6366F1 100%)',
    border: '#8B5CF6', // Brighter purple border
    text: '#E9D5FF', // Purple 200
    glow: '#C084FC', // Purple 400
    lightSweep: 'rgba(216, 180, 254, 0.28)',
  },
  legendary: {
    background: '#92400E', // Amber 800
    gradient:
      'linear-gradient(135deg, #92400E 0%, #EA580C 25%, #FBBF24 50%, #F59E0B 75%, #DC2626 100%)',
    border: '#FBBF24', // Gold
    text: '#FEF3C7', // Lighter amber
    glow: '#FCD34D', // Bright gold glow
    lightSweep: 'rgba(254, 243, 199, 0.32)',
  },
};

/**
 * Default light theme badge colors
 */
const LIGHT_BADGE_DEFAULTS: Record<BadgeRarity, BadgeColorScheme> = {
  common: {
    background: '#F3F4F6', // Gray 100
    border: '#6B7280', // Gray 500
    text: '#374151', // Gray 700
    glow: '#9CA3AF', // Gray 400
    lightSweep: 'rgba(148, 163, 184, 0.18)',
  },
  uncommon: {
    background: '#D1FAE5', // Emerald 100
    gradient: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #6EE7B7 100%)',
    border: '#10B981', // Emerald 500
    text: '#065F46', // Emerald 800
    glow: '#34D399', // Emerald 400
    lightSweep: 'rgba(52, 211, 153, 0.24)',
  },
  rare: {
    background: '#CFFAFE', // Cyan 100
    gradient: 'linear-gradient(135deg, #CFFAFE 0%, #A5F3FC 50%, #67E8F9 100%)',
    border: '#0891B2', // Cyan 600
    text: '#164E63', // Cyan 800
    glow: '#22D3EE', // Cyan 400
    lightSweep: 'rgba(34, 211, 238, 0.26)',
  },
  epic: {
    background: '#F3E8FF', // Purple 100
    gradient: 'linear-gradient(135deg, #F3E8FF 0%, #DDD6FE 33%, #C4B5FD 66%, #A78BFA 100%)',
    border: '#9333EA', // Purple 600
    text: '#581C87', // Purple 800
    glow: '#C084FC', // Purple 400
    lightSweep: 'rgba(192, 132, 252, 0.28)',
  },
  legendary: {
    background: '#FEF3C7', // Amber 100
    gradient:
      'linear-gradient(135deg, #FEF3C7 0%, #FDE047 25%, #FBBF24 50%, #F59E0B 75%, #F87171 100%)',
    border: '#D97706', // Amber 600
    text: '#92400E', // Amber 800
    glow: '#FCD34D', // Bright gold glow
    lightSweep: 'rgba(252, 211, 77, 0.32)',
  },
};

/**
 * Default badge type icons
 */
const DEFAULT_BADGE_TYPE_ICONS = {
  bot: '🤖',
  streak: '🔥',
  highRoller: '🎲',
  banPermanent: '🚫',
  banTemporary: '⏰',
  banCount: '📊',
};

/**
 * Get default badge colors based on theme category
 */
function getDefaultBadgeColors(category: ThemeCategory): Record<BadgeRarity, BadgeColorScheme> {
  if (category === 'light') {
    return LIGHT_BADGE_DEFAULTS;
  }
  // 'dark' and 'high-contrast' both use dark defaults
  return DARK_BADGE_DEFAULTS;
}

/**
 * Get the color scheme for a specific badge rarity
 * Falls back to category-based defaults if theme doesn't specify
 */
export function getBadgeColors(theme: UnifiedTheme, rarity: BadgeRarity): BadgeColorScheme {
  // Use theme-specific colors if available
  if (theme.badges?.rarities?.[rarity]) {
    return theme.badges.rarities[rarity];
  }

  // Fall back to category defaults
  const defaults = getDefaultBadgeColors(theme.category);
  return defaults[rarity];
}

/**
 * Get the icon for a specific badge type
 * Falls back to defaults if theme doesn't specify
 */
export function getBadgeIcon(theme: UnifiedTheme, badgeType: BadgeType): string {
  const typeMap: Record<BadgeType, keyof typeof DEFAULT_BADGE_TYPE_ICONS> = {
    BOT: 'bot',
    STREAK: 'streak',
    HIGH_ROLLER: 'highRoller',
    BAN_PERMANENT: 'banPermanent',
    BAN_TEMPORARY: 'banTemporary',
    BAN_COUNT: 'banCount',
    TIER: 'bot', // Fallback, tier badges have their own icons
  };

  const mappedType = typeMap[badgeType];

  // Use theme-specific icon if available
  if (theme.badges?.types?.[mappedType]?.icon) {
    return theme.badges.types[mappedType].icon;
  }

  // Fall back to default icon
  return DEFAULT_BADGE_TYPE_ICONS[mappedType] || '🏅';
}

/**
 * Get animation class names based on rarity and theme preferences
 */
export function getBadgeAnimations(
  theme: UnifiedTheme,
  rarity: BadgeRarity,
  reducedAnimations: boolean = false,
): string[] {
  // Respect theme effects and user preferences
  if (!theme.effects.animations || reducedAnimations) {
    return [];
  }

  // Map rarity to animation intensity
  const animationMap: Record<BadgeRarity, string[]> = {
    common: [],
    uncommon: [],
    rare: ['badge-animation-border-glow'],
    epic: ['badge-animation-light-sweep'],
    legendary: ['badge-animation-border-glow', 'badge-animation-light-sweep'],
  };

  return animationMap[rarity] || [];
}

/**
 * Pre-built CSS class generators for badge elements
 */
export function getRarityClasses(
  theme: UnifiedTheme,
  rarity: BadgeRarity,
  reducedAnimations: boolean = false,
) {
  const colors = getBadgeColors(theme, rarity);
  const animations = getBadgeAnimations(theme, rarity, reducedAnimations);

  return {
    // Container styling with inline styles support
    container: `inline-flex items-center rounded-full border font-medium transition-all duration-200 ${animations.join(' ')}`,

    // Color properties (use with inline styles)
    colors: {
      background: colors.background,
      gradient: colors.gradient,
      border: colors.border,
      text: colors.text,
      glow: colors.glow,
      lightSweep: colors.lightSweep,
    },

    // Animation classes
    animations: animations.join(' '),

    // Size variants
    sizes: {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-3 py-1 text-sm gap-1.5',
      lg: 'px-4 py-1.5 text-base gap-2',
    },
  };
}

/**
 * Generate complete badge styling with colors and animations
 */
export function getBadgeClasses(
  theme: UnifiedTheme,
  rarity: BadgeRarity,
  size: 'sm' | 'md' | 'lg' = 'md',
  reducedAnimations: boolean = false,
) {
  const rarityClasses = getRarityClasses(theme, rarity, reducedAnimations);

  return {
    container: `${rarityClasses.container} ${rarityClasses.sizes[size]}`,
    colors: rarityClasses.colors,
    animations: rarityClasses.animations,
  };
}

/**
 * Get CSS custom properties for badge styling
 */
export function getBadgeCSSVariables(
  theme: UnifiedTheme,
  rarity: BadgeRarity,
): Record<string, string> {
  const colors = getBadgeColors(theme, rarity);

  return {
    '--badge-bg-color': colors.background,
    '--badge-border-color': colors.border,
    '--badge-text-color': colors.text,
    '--badge-glow-color': colors.glow,
    '--badge-complementary-color': colors.glow, // Use glow as complementary
    '--badge-light-sweep': colors.lightSweep ?? colors.glow,
  };
}

/**
 * Validation helper to check if a rarity is valid
 */
export function isValidBadgeRarity(rarity: string): rarity is BadgeRarity {
  const validRarities: BadgeRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  return validRarities.includes(rarity as BadgeRarity);
}

/**
 * Get rarity display name (capitalized)
 */
export function getRarityDisplayName(rarity: BadgeRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

/**
 * Map BadgeRarity to animation types for consistency
 */
export function getRarityAnimationTypes(rarity: BadgeRarity): BadgeAnimation[] {
  const animationMap: Record<BadgeRarity, BadgeAnimation[]> = {
    common: ['none'],
    uncommon: ['none'],
    rare: ['border-glow'],
    epic: ['light-sweep'],
    legendary: ['border-glow', 'light-sweep'],
  };

  return animationMap[rarity] || ['none'];
}
