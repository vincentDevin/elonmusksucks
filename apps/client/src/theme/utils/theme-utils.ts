// apps/client/src/theme/utils/theme-utils.ts
import type { UnifiedTheme, ThemeCategory } from '../types';

/**
 * Apply theme colors to CSS custom properties
 */
export const applyThemeToDocument = (theme: UnifiedTheme): void => {
  const root = document.documentElement;

  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
    root.style.setProperty(`--theme-${key}`, value); // For compatibility
  });

  // Calculate and apply foreground colors for semantic colors
  const semanticColors = ['primary', 'secondary', 'accent', 'success', 'error', 'warning', 'info'];
  semanticColors.forEach((colorKey) => {
    const backgroundColor = theme.colors[colorKey as keyof typeof theme.colors];
    if (backgroundColor) {
      const foregroundColor = getContrastColor(backgroundColor);
      root.style.setProperty(`--color-${colorKey}-foreground`, foregroundColor);
    }
  });

  // Apply theme class for CSS-based styling
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${theme.id}`);
  document.body.classList.add(`theme-category-${theme.category}`);

  // Apply effects classes
  document.body.classList.toggle('theme-animations', theme.effects.animations);
  document.body.classList.toggle('theme-particles', theme.effects.particles);
  document.body.classList.toggle('theme-glow', theme.effects.glow);

  // Remove old shadow classes and add new one
  document.body.classList.remove(
    'theme-shadows-none',
    'theme-shadows-subtle',
    'theme-shadows-dramatic',
  );
  document.body.classList.add(`theme-shadows-${theme.effects.shadows}`);
};

/**
 * Get theme variables as CSS custom property object
 */
export const getThemeVariables = (theme: UnifiedTheme): Record<string, string> => {
  const variables: Record<string, string> = {};

  Object.entries(theme.colors).forEach(([key, value]) => {
    variables[`--color-${key}`] = value;
    variables[`--theme-${key}`] = value;
  });

  return variables;
};

/**
 * Detect user's preferred color scheme
 */
export const getPreferredColorScheme = (): ThemeCategory => {
  if (typeof window === 'undefined') return 'light';

  // Check for high contrast preference
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    return 'high-contrast';
  }

  // Check for dark mode preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

/**
 * Get theme from localStorage with fallback
 */
export const getStoredThemeId = (userId?: number): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    // User-specific storage if available
    if (userId) {
      const userTheme = localStorage.getItem(`theme_${userId}`);
      if (userTheme) return userTheme;
    }

    // Global theme storage
    const globalTheme = localStorage.getItem('theme');
    if (globalTheme) return globalTheme;

    // Legacy theme storage (for migration)
    const legacyTheme = localStorage.getItem('dashboard_theme');
    return legacyTheme;
  } catch (error) {
    console.warn('Failed to get stored theme:', error);
    return null;
  }
};

/**
 * Store theme preference
 */
export const storeThemeId = (themeId: string, userId?: number): void => {
  if (typeof window === 'undefined') return;

  try {
    // Store both user-specific and global
    if (userId) {
      localStorage.setItem(`theme_${userId}`, themeId);
    }
    localStorage.setItem('theme', themeId);
  } catch (error) {
    console.warn('Failed to store theme:', error);
  }
};

/**
 * Clean up old theme-related localStorage entries
 */
export const cleanupLegacyThemeStorage = (userId?: number): void => {
  if (typeof window === 'undefined') return;

  try {
    // Remove old dashboard customization entries
    if (userId) {
      localStorage.removeItem(`dashboard_prefs_${userId}`);
    }

    // Remove old theme entries
    localStorage.removeItem('dashboard_theme');
  } catch (error) {
    console.warn('Failed to cleanup legacy theme storage:', error);
  }
};

/**
 * Convert theme to CSS string for inline styles
 */
export const themeToCSSString = (theme: UnifiedTheme): string => {
  const variables = getThemeVariables(theme);
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
};

/**
 * Check if theme matches current system preference
 */
export const themeMatchesSystem = (theme: UnifiedTheme): boolean => {
  const systemPreference = getPreferredColorScheme();
  return theme.category === systemPreference;
};

/**
 * Get appropriate text color for background
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast detection - in a real app you might use a more sophisticated algorithm
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
