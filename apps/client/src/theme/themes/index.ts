// apps/client/src/theme/themes/index.ts
import { lightThemes } from './light-themes';
import { darkThemes } from './dark-themes';
import { contrastThemes } from './contrast-themes';
import type { UnifiedTheme, ThemeCategory } from '../types';

// Combine all themes
export const allThemes: UnifiedTheme[] = [...lightThemes, ...darkThemes, ...contrastThemes];

// Helper functions to filter themes by category
export const getThemesByCategory = (category: ThemeCategory): UnifiedTheme[] => {
  return allThemes.filter((theme) => theme.category === category);
};

// Get theme by ID
export const getThemeById = (themeId: string): UnifiedTheme | null => {
  return allThemes.find((theme) => theme.id === themeId) || null;
};

// Get default theme for each category
export const getDefaultThemeForCategory = (category: ThemeCategory): UnifiedTheme => {
  const themes = getThemesByCategory(category);
  if (themes.length === 0) {
    // Fallback to clean professional if category not found
    return lightThemes[0];
  }

  // Return first theme in category as default
  return themes[0];
};

// Theme categories with metadata
export const themeCategories = [
  {
    id: 'light' as ThemeCategory,
    name: 'Light Themes',
    description: 'Clean, bright themes for daylight use',
    icon: '☀️',
    count: lightThemes.length,
  },
  {
    id: 'dark' as ThemeCategory,
    name: 'Dark Themes',
    description: 'Professional dark themes for low-light environments',
    icon: '🌙',
    count: darkThemes.length,
  },
  {
    id: 'high-contrast' as ThemeCategory,
    name: 'High Contrast',
    description: 'Accessibility themes with enhanced visibility',
    icon: '♿',
    count: contrastThemes.length,
  },
];

// Export individual theme collections
export { lightThemes, darkThemes, contrastThemes };

// Default themes
export const DEFAULT_LIGHT_THEME = lightThemes[0]; // clean-professional
export const DEFAULT_DARK_THEME = darkThemes[0]; // dark-professional
export const DEFAULT_CONTRAST_THEME = contrastThemes[0]; // high-contrast

// Map from old theme IDs to new theme IDs (for migration)
export const themeIdMigrationMap: Record<string, string> = {
  'dark-trader': 'dark-professional',
  'clean-professional': 'clean-professional',
  'neon-gaming': 'neon-gaming',
  'high-contrast': 'high-contrast',
};
