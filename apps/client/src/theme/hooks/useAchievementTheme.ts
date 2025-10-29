// apps/client/src/theme/hooks/useAchievementTheme.ts

import { useUnifiedTheme } from './useUnifiedTheme';
import {
  getAchievementColors,
  getCategoryColor,
  getCategoryIcon,
  getRarityClasses,
  getCategoryClasses,
  getAchievementCardClasses,
  isValidRarity,
  getRarityDisplayName,
  getCategoryDisplayName,
  type AchievementRarity,
} from '../utils/achievement-colors';

/**
 * Hook that provides theme-aware achievement styling utilities
 *
 * @example
 * ```tsx
 * function AchievementCard({ rarity, category }) {
 *   const { getRarityColors, getCategoryColor } = useAchievementTheme();
 *
 *   const colors = getRarityColors(rarity);
 *   const categoryColor = getCategoryColor(category);
 *
 *   return (
 *     <div className={colors.card}>
 *       <span className={colors.badge}>{rarity}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAchievementTheme() {
  const { currentTheme } = useUnifiedTheme();

  return {
    /**
     * Get the complete color scheme for a specific achievement rarity
     */
    getRarityColors: (rarity: AchievementRarity) => getAchievementColors(currentTheme, rarity),

    /**
     * Get the theme color for a specific achievement category
     */
    getCategoryColor: (category: string) => getCategoryColor(currentTheme, category),

    /**
     * Get the icon for a specific achievement category
     */
    getCategoryIcon: (category: string) => getCategoryIcon(currentTheme, category),

    /**
     * Get pre-built CSS classes for a specific rarity
     */
    getRarityClasses: (rarity: AchievementRarity) => getRarityClasses(currentTheme, rarity),

    /**
     * Get category-specific styling classes
     */
    getCategoryClasses: (category: string) => getCategoryClasses(currentTheme, category),

    /**
     * Get complete card classes with both rarity and category styling
     */
    getCardClasses: (rarity: AchievementRarity, category?: string) =>
      getAchievementCardClasses(currentTheme, rarity, category),

    /**
     * Validation and utility functions
     */
    utils: {
      isValidRarity,
      getRarityDisplayName,
      getCategoryDisplayName,
    },

    /**
     * Current theme reference (for advanced usage)
     */
    theme: currentTheme,

    /**
     * Quick access to all available rarities
     */
    rarities: ['common', 'uncommon', 'rare', 'legendary', 'epic', 'secret', 'shame'] as const,

    /**
     * Quick access to available categories with their icons
     */
    categories: Object.keys(currentTheme.achievements.categories).map((category) => ({
      key: category,
      name: getCategoryDisplayName(category),
      icon: getCategoryIcon(currentTheme, category),
      color: getCategoryColor(currentTheme, category),
    })),
  };
}

/**
 * Simplified hook for basic rarity styling - most common use case
 *
 * @example
 * ```tsx
 * function SimpleAchievementBadge({ rarity }) {
 *   const classes = useRarityClasses(rarity);
 *   return <span className={classes.badge}>{rarity}</span>;
 * }
 * ```
 */
export function useRarityClasses(rarity: AchievementRarity) {
  const { getRarityClasses } = useAchievementTheme();
  return getRarityClasses(rarity);
}

/**
 * Hook for getting category-specific styling - useful for category filters/displays
 *
 * @example
 * ```tsx
 * function CategoryFilter({ category, isSelected }) {
 *   const { icon, accent } = useCategoryStyle(category);
 *
 *   return (
 *     <button className={`${accent} ${isSelected ? 'ring-2' : ''}`}>
 *       {icon} {category}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCategoryStyle(category: string) {
  const { getCategoryClasses } = useAchievementTheme();
  return getCategoryClasses(category);
}
