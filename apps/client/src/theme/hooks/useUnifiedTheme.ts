// apps/client/src/theme/hooks/useUnifiedTheme.ts
import { useContext } from 'react';
import type { UnifiedThemeContextValue } from '../types';

// This will be implemented after we create the UnifiedThemeProvider
let UnifiedThemeContext: React.Context<UnifiedThemeContextValue | undefined>;

/**
 * Hook to access the unified theme system
 * Provides both simple light/dark toggle and advanced theme selection
 */
export const useUnifiedTheme = (): UnifiedThemeContextValue => {
  if (!UnifiedThemeContext) {
    throw new Error(
      'UnifiedThemeContext not yet initialized. Import and use UnifiedThemeProvider first.',
    );
  }

  const context = useContext(UnifiedThemeContext);
  if (!context) {
    throw new Error('useUnifiedTheme must be used within UnifiedThemeProvider');
  }

  return context;
};

/**
 * Hook for simple light/dark mode (navbar compatibility)
 * Maps to the full theme system but provides simple interface
 */
export const useLightDark = () => {
  const { currentTheme, setThemeCategory, toggleLightDark } = useUnifiedTheme();

  const isDark = currentTheme.category === 'dark';
  const theme = isDark ? 'dark' : 'light';

  return {
    theme,
    isDark,
    toggleTheme: toggleLightDark,
    setThemeCategory,
  };
};

/**
 * Hook for advanced theme selection (dashboard settings)
 */
export const useAdvancedThemes = () => {
  const {
    currentTheme,
    availableThemes,
    getThemesByCategory,
    setTheme,
    preferences,
    updatePreferences,
  } = useUnifiedTheme();

  return {
    currentTheme,
    availableThemes,
    getThemesByCategory,
    setTheme,
    preferences,
    updatePreferences,
  };
};

/**
 * Hook to access theme variables for styling
 */
export const useThemeVariables = () => {
  const { currentTheme, getThemeVariables } = useUnifiedTheme();

  return {
    theme: currentTheme,
    variables: getThemeVariables(),
    colors: currentTheme.colors,
    effects: currentTheme.effects,
  };
};

// Export context setter (will be called by UnifiedThemeProvider)
export const setUnifiedThemeContext = (
  context: React.Context<UnifiedThemeContextValue | undefined>,
) => {
  UnifiedThemeContext = context;
};
