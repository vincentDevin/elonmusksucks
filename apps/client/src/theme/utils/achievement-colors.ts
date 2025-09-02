// apps/client/src/theme/utils/achievement-colors.ts

import type { UnifiedTheme } from '../types';

export interface AchievementColorScheme {
  background: string;
  border: string;
  accent: string;
  text: string;
  leftBorder: string;
  progress: string;
}

export type AchievementRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'legendary'
  | 'epic'
  | 'secret'
  | 'shame';

/**
 * Get the color scheme for a specific achievement rarity
 */
export function getAchievementColors(
  theme: UnifiedTheme,
  rarity: AchievementRarity,
): AchievementColorScheme {
  return theme.achievements.rarities[rarity];
}

/**
 * Get the color for a specific achievement category
 */
export function getCategoryColor(theme: UnifiedTheme, category: string): string {
  return theme.achievements.categories[category]?.color || theme.colors.muted;
}

/**
 * Get the icon for a specific achievement category
 */
export function getCategoryIcon(theme: UnifiedTheme, category: string): string {
  return theme.achievements.categories[category]?.icon || '🏅';
}

/**
 * Pre-built CSS class generators for different achievement elements
 */
export function getRarityClasses(theme: UnifiedTheme, rarity: AchievementRarity) {
  const colors = getAchievementColors(theme, rarity);

  return {
    // Main card styling
    card: `${colors.background} ${colors.border} shadow-sm hover:shadow-md transition-shadow duration-200`,

    // Badge styling
    badge: `${colors.accent} ${colors.text} px-2 py-1 rounded-full text-xs font-bold`,

    // Left border accent (for progress cards)
    leftBorder: `border-l-4 ${colors.leftBorder}`,

    // Progress bar styling
    progress: `${colors.progress} transition-all duration-700 ease-out`,

    // Celebration/notification styling
    celebration: `${colors.background} ${colors.border} shadow-2xl backdrop-blur-sm`,

    // Hover states
    cardHover: `hover:scale-[1.02] transition-transform duration-200`,
  };
}

/**
 * Get category-specific styling classes
 */
export function getCategoryClasses(theme: UnifiedTheme, category: string) {
  const color = getCategoryColor(theme, category);

  return {
    icon: getCategoryIcon(theme, category),
    accent: `text-${color}`,
    background: `bg-${color}/10`,
    border: `border-${color}/20`,
  };
}

/**
 * Generate achievement card classes with rarity and category styling
 */
export function getAchievementCardClasses(
  theme: UnifiedTheme,
  rarity: AchievementRarity,
  category?: string,
) {
  const rarityClasses = getRarityClasses(theme, rarity);
  const categoryClasses = category ? getCategoryClasses(theme, category) : null;

  return {
    container: `${rarityClasses.card} ${rarityClasses.cardHover} rounded-xl p-4 border-2`,
    badge: rarityClasses.badge,
    leftBorder: rarityClasses.leftBorder,
    progress: rarityClasses.progress,
    categoryIcon: categoryClasses?.icon || '🏅',
    categoryAccent: categoryClasses?.accent || '',
  };
}

/**
 * Validation helper to check if a rarity is valid
 */
export function isValidRarity(rarity: string): rarity is AchievementRarity {
  const validRarities: AchievementRarity[] = [
    'common',
    'uncommon',
    'rare',
    'legendary',
    'epic',
    'secret',
    'shame',
  ];
  return validRarities.includes(rarity as AchievementRarity);
}

/**
 * Get rarity display name (capitalized)
 */
export function getRarityDisplayName(rarity: AchievementRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

/**
 * Get category display name (capitalized)
 */
export function getCategoryDisplayName(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
