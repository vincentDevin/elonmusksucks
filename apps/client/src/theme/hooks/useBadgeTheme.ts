// apps/client/src/theme/hooks/useBadgeTheme.ts

import { useUnifiedTheme } from './useUnifiedTheme';
import {
  getBadgeColors,
  getBadgeIcon,
  getBadgeAnimations,
  getRarityClasses,
  getBadgeClasses,
  getBadgeCSSVariables,
  isValidBadgeRarity,
  getRarityDisplayName,
  getRarityAnimationTypes,
  type BadgeColorScheme,
} from '../utils/badge-colors';
import type { BadgeRarity, BadgeType } from '../../types/badges';

/**
 * Hook that provides theme-aware badge styling utilities
 *
 * @example
 * ```tsx
 * function Badge({ rarity, type }) {
 *   const { getBadgeClasses, getBadgeIcon, shouldAnimate } = useBadgeTheme();
 *
 *   const { container, colors, animations } = getBadgeClasses(rarity, 'md');
 *   const icon = getBadgeIcon(type);
 *
 *   return (
 *     <span className={container} style={{ background: colors.background }}>
 *       {icon} {rarity}
 *     </span>
 *   );
 * }
 * ```
 */
export function useBadgeTheme() {
  const { currentTheme, preferences } = useUnifiedTheme();
  const reducedAnimations = preferences?.performance?.reducedAnimations || false;

  return {
    /**
     * Get the complete color scheme for a specific badge rarity
     */
    getRarityColors: (rarity: BadgeRarity): BadgeColorScheme =>
      getBadgeColors(currentTheme, rarity),

    /**
     * Get the icon for a specific badge type
     */
    getBadgeTypeIcon: (badgeType: BadgeType): string => getBadgeIcon(currentTheme, badgeType),

    /**
     * Get animation class names based on rarity and user preferences
     */
    getAnimations: (rarity: BadgeRarity): string[] =>
      getBadgeAnimations(currentTheme, rarity, reducedAnimations),

    /**
     * Get pre-built CSS classes for a specific rarity
     */
    getRarityClasses: (rarity: BadgeRarity) =>
      getRarityClasses(currentTheme, rarity, reducedAnimations),

    /**
     * Get complete badge classes with size and rarity styling
     */
    getBadgeClasses: (rarity: BadgeRarity, size: 'sm' | 'md' | 'lg' = 'md') =>
      getBadgeClasses(currentTheme, rarity, size, reducedAnimations),

    /**
     * Get CSS custom properties for inline styling
     */
    getCSSVariables: (rarity: BadgeRarity): Record<string, string> =>
      getBadgeCSSVariables(currentTheme, rarity),

    /**
     * Get the animation types that should be applied for a given rarity
     */
    getAnimationTypes: (rarity: BadgeRarity) => getRarityAnimationTypes(rarity),

    /**
     * Check if animations should be displayed (respects theme + user preferences)
     */
    shouldAnimate: (): boolean => currentTheme.effects.animations && !reducedAnimations,

    /**
     * Check if glow effects should be displayed
     */
    shouldGlow: (): boolean => currentTheme.effects.glow,

    /**
     * Validation and utility functions
     */
    utils: {
      isValidRarity: isValidBadgeRarity,
      getDisplayName: getRarityDisplayName,
    },

    /**
     * Current theme reference (for advanced usage)
     */
    theme: currentTheme,

    /**
     * User preferences reference
     */
    preferences: preferences,

    /**
     * Quick access to all available rarities
     */
    rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const,
  };
}

/**
 * Simplified hook for basic rarity styling - most common use case
 *
 * @example
 * ```tsx
 * function SimpleBadge({ rarity }) {
 *   const { container, colors } = useBadgeRarityClasses(rarity, 'md');
 *   return <span className={container} style={{ background: colors.background }}>{rarity}</span>;
 * }
 * ```
 */
export function useBadgeRarityClasses(rarity: BadgeRarity, size: 'sm' | 'md' | 'lg' = 'md') {
  const { getBadgeClasses } = useBadgeTheme();
  return getBadgeClasses(rarity, size);
}

/**
 * Hook for getting badge colors only - useful for custom styling
 *
 * @example
 * ```tsx
 * function CustomBadge({ rarity }) {
 *   const colors = useBadgeColors(rarity);
 *   return <div style={{ backgroundColor: colors.background, color: colors.text }}>...</div>;
 * }
 * ```
 */
export function useBadgeColors(rarity: BadgeRarity): BadgeColorScheme {
  const { getRarityColors } = useBadgeTheme();
  return getRarityColors(rarity);
}
