// apps/client/src/theme/types.ts

export type ThemeCategory = 'light' | 'dark' | 'high-contrast';

export interface UnifiedTheme {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory;
  preview: string; // Emoji or icon

  // Core semantic colors
  colors: {
    // Primary brand colors
    primary: string; // Main brand color
    secondary: string; // Secondary actions
    accent: string; // Highlights & emphasis

    // Surface colors
    background: string; // Page background
    surface: string; // Card/panel backgrounds
    muted: string; // Borders & dividers

    // Content colors
    content: string; // Primary text
    tertiary: string; // Secondary text

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // Visual effects
  effects: {
    animations: boolean;
    particles: boolean;
    glow: boolean;
    shadows: 'none' | 'subtle' | 'dramatic';
  };
}

export interface ThemePreferences {
  themeId: string;
  preferredCategory: ThemeCategory;

  // User-specific preferences
  notifications: {
    achievements: boolean;
    rankChanges: boolean;
    friendActivity: boolean;
    bigBets: boolean;
    predictionAlerts: boolean;
    soundEnabled: boolean;
  };

  privacy: {
    showRealName: boolean;
    showStats: boolean;
    showActivity: boolean;
  };

  performance: {
    reducedAnimations: boolean;
    reducedData: boolean;
  };
}

export interface UnifiedThemeContextValue {
  // Current theme state
  currentTheme: UnifiedTheme;
  preferences: ThemePreferences;

  // Theme management
  availableThemes: UnifiedTheme[];
  getThemesByCategory: (category: ThemeCategory) => UnifiedTheme[];

  // Theme switching
  setTheme: (themeId: string) => void;
  setThemeCategory: (category: ThemeCategory) => void; // For simple light/dark toggle
  toggleLightDark: () => void; // For navbar compatibility

  // Preferences management
  updatePreferences: (updates: Partial<ThemePreferences>) => void;
  resetToDefaults: () => void;

  // Utilities
  applyTheme: (theme: UnifiedTheme) => void;
  getThemeVariables: () => Record<string, string>;

  // State
  loading: boolean;
  error: string | null;
}
