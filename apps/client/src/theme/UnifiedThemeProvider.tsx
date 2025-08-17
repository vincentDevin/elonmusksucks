// apps/client/src/theme/UnifiedThemeProvider.tsx
import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  UnifiedTheme,
  ThemeCategory,
  ThemePreferences,
  UnifiedThemeContextValue,
} from './types';
import {
  allThemes,
  getThemesByCategory,
  getThemeById,
  getDefaultThemeForCategory,
  DEFAULT_LIGHT_THEME,
} from './themes';
import {
  applyThemeToDocument,
  getThemeVariables,
  getPreferredColorScheme,
  getStoredThemeId,
  storeThemeId,
  cleanupLegacyThemeStorage,
} from './utils/theme-utils';
import { migrateLegacyThemeId } from './utils/theme-migration';
import { setUnifiedThemeContext } from './hooks/useUnifiedTheme';
import { updateTheme as updateThemeAPI } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

// Default preferences
const DEFAULT_PREFERENCES: ThemePreferences = {
  themeId: DEFAULT_LIGHT_THEME.id,
  preferredCategory: 'light',
  notifications: {
    achievements: true,
    rankChanges: true,
    friendActivity: true,
    bigBets: false,
    predictionAlerts: true,
    soundEnabled: false,
  },
  privacy: {
    showRealName: false,
    showStats: true,
    showActivity: true,
  },
  performance: {
    reducedAnimations: false,
    reducedData: false,
  },
};

// Create the context
const UnifiedThemeContext = createContext<UnifiedThemeContextValue | undefined>(undefined);

// Register the context with the hook
setUnifiedThemeContext(UnifiedThemeContext);

interface UnifiedThemeProviderProps {
  children: ReactNode;
  userId?: number; // For user-specific preferences
}

export const UnifiedThemeProvider: React.FC<UnifiedThemeProviderProps> = ({ children, userId }) => {
  const { user } = useAuth(); // Get user from auth context instead of making API calls
  const [currentTheme, setCurrentTheme] = useState<UnifiedTheme>(DEFAULT_LIGHT_THEME);
  const [preferences, setPreferences] = useState<ThemePreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializedFromUser, setInitializedFromUser] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Try to get stored theme
        let storedThemeId = getStoredThemeId(userId);

        // 2. Migrate legacy theme ID if needed
        if (storedThemeId) {
          storedThemeId = migrateLegacyThemeId(storedThemeId);
        }

        // 3. Try to load stored preferences
        let storedPreferences: ThemePreferences | null = null;
        if (userId) {
          try {
            const stored = localStorage.getItem(`theme_preferences_${userId}`);
            if (stored) {
              storedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
            }
          } catch (e) {
            console.warn('Failed to parse stored theme preferences:', e);
          }
        }

        // 4. Try to load theme from user context (no API call needed)
        // let userTheme: string | null = null;
        // Get theme from user context instead of making API call
        // The AuthContext has already loaded user data
        // We'll check for it after the component has user prop
        // This will be handled in the useEffect dependency on user prop

        // 5. Determine initial theme (prioritize localStorage > system for now)
        // User theme will be handled in a separate useEffect when user context loads
        let initialTheme: UnifiedTheme;

        if (storedThemeId) {
          // Use stored theme if available
          const theme = getThemeById(storedThemeId);
          initialTheme = theme || DEFAULT_LIGHT_THEME;
        } else {
          // No stored theme - detect system preference
          const systemCategory = getPreferredColorScheme();
          initialTheme = getDefaultThemeForCategory(systemCategory);
        }

        // 6. Set initial state
        setCurrentTheme(initialTheme);
        setPreferences(
          storedPreferences || {
            ...DEFAULT_PREFERENCES,
            themeId: initialTheme.id,
            preferredCategory: initialTheme.category,
          },
        );

        // 7. Apply theme to document
        applyThemeToDocument(initialTheme);

        // 8. Clean up legacy storage
        cleanupLegacyThemeStorage(userId);

        console.log(`🎨 Theme initialized: ${initialTheme.name} (${initialTheme.id})`);
      } catch (e) {
        console.error('Failed to initialize theme:', e);
        setError('Failed to load theme preferences');

        // Fallback to default theme
        setCurrentTheme(DEFAULT_LIGHT_THEME);
        setPreferences(DEFAULT_PREFERENCES);
        applyThemeToDocument(DEFAULT_LIGHT_THEME);
      } finally {
        setLoading(false);
      }
    };

    initializeTheme();
  }, [userId]);

  // Load theme from user context when user data becomes available (no API call)
  useEffect(() => {
    if (user && user.theme && !initializedFromUser) {
      const userTheme = getThemeById(user.theme);
      if (userTheme) {
        console.log(`🎨 Applied theme from user context: ${user.theme}`);
        setCurrentTheme(userTheme);
        setPreferences((prev) => ({
          ...prev,
          themeId: userTheme.id,
          preferredCategory: userTheme.category,
        }));
        setInitializedFromUser(true);

        // Also store in localStorage for future use
        storeThemeId(userTheme.id, user.id);
      }
    }
  }, [user, initializedFromUser]);

  // Apply theme whenever currentTheme changes
  useEffect(() => {
    applyThemeToDocument(currentTheme);

    // Handle reduced animations preference
    if (preferences.performance.reducedAnimations) {
      document.body.classList.add('reduced-animations');
    } else {
      document.body.classList.remove('reduced-animations');
    }
  }, [currentTheme, preferences.performance.reducedAnimations]);

  // Save preferences when they change
  useEffect(() => {
    if (!loading && userId) {
      try {
        localStorage.setItem(`theme_preferences_${userId}`, JSON.stringify(preferences));
      } catch (e) {
        console.warn('Failed to save theme preferences:', e);
      }
    }
  }, [preferences, userId, loading]);

  // Theme management functions
  const setTheme = useCallback(
    async (themeId: string) => {
      const theme = getThemeById(themeId);
      if (!theme) {
        console.warn(`Theme not found: ${themeId}`);
        return;
      }

      setCurrentTheme(theme);
      setPreferences((prev) => ({
        ...prev,
        themeId: theme.id,
        preferredCategory: theme.category,
      }));

      // Store theme preference locally
      storeThemeId(theme.id, userId);

      // Save to database if user is logged in
      if (userId) {
        try {
          await updateThemeAPI(theme.id);
          console.log(`🎨 Theme saved to database: ${theme.name} (${theme.id})`);
        } catch (error) {
          console.warn('Failed to save theme to database:', error);
          // Theme still works locally via localStorage, so don't throw
        }
      }

      console.log(`🎨 Theme changed to: ${theme.name} (${theme.id})`);
    },
    [userId],
  );

  const setThemeCategory = useCallback(
    (category: ThemeCategory) => {
      const theme = getDefaultThemeForCategory(category);
      setTheme(theme.id);
    },
    [setTheme],
  );

  const toggleLightDark = useCallback(() => {
    const newCategory: ThemeCategory = currentTheme.category === 'dark' ? 'light' : 'dark';
    setThemeCategory(newCategory);
  }, [currentTheme.category, setThemeCategory]);

  const updatePreferences = useCallback(
    async (updates: Partial<ThemePreferences>) => {
      setPreferences((prev) => {
        const newPrefs = { ...prev, ...updates };

        // If theme ID changed, update current theme and save to database
        if (updates.themeId && updates.themeId !== prev.themeId) {
          const theme = getThemeById(updates.themeId);
          if (theme) {
            setCurrentTheme(theme);
            storeThemeId(theme.id, userId);

            // Save to database if user is logged in
            if (userId) {
              updateThemeAPI(theme.id).catch((error) => {
                console.warn('Failed to save theme to database:', error);
              });
            }
          }
        }

        return newPrefs;
      });
    },
    [userId],
  );

  const resetToDefaults = useCallback(() => {
    const defaultTheme = DEFAULT_LIGHT_THEME;
    setCurrentTheme(defaultTheme);
    setPreferences(DEFAULT_PREFERENCES);
    storeThemeId(defaultTheme.id, userId);

    // Clear stored preferences
    if (userId) {
      try {
        localStorage.removeItem(`theme_preferences_${userId}`);
      } catch (e) {
        console.warn('Failed to clear theme preferences:', e);
      }
    }

    console.log('🎨 Theme reset to defaults');
  }, [userId]);

  const applyTheme = useCallback((theme: UnifiedTheme) => {
    applyThemeToDocument(theme);
  }, []);

  const getThemeVars = useCallback(() => {
    return getThemeVariables(currentTheme);
  }, [currentTheme]);

  // Context value
  const contextValue: UnifiedThemeContextValue = {
    // Current state
    currentTheme,
    preferences,

    // Available themes
    availableThemes: allThemes,
    getThemesByCategory,

    // Theme switching
    setTheme,
    setThemeCategory,
    toggleLightDark,

    // Preferences management
    updatePreferences,
    resetToDefaults,

    // Utilities
    applyTheme,
    getThemeVariables: getThemeVars,

    // State
    loading,
    error,
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const hasExplicitPreference = getStoredThemeId(userId) !== null;
      if (!hasExplicitPreference) {
        const systemCategory = e.matches ? 'dark' : 'light';
        setThemeCategory(systemCategory);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setThemeCategory, userId]);

  return (
    <UnifiedThemeContext.Provider value={contextValue}>
      <div
        className={`theme-${currentTheme.id} theme-category-${currentTheme.category}`}
        style={getThemeVariables(currentTheme)}
      >
        {children}
      </div>
    </UnifiedThemeContext.Provider>
  );
};

export default UnifiedThemeProvider;
