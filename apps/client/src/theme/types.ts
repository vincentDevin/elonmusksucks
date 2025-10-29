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

  // Prediction option colors
  predictionOptions: {
    // Core palette - 8 distinct colors that don't conflict with semantic UI colors
    palette: string[];
    // Type-specific overrides
    binary: [string, string]; // [yes/true, no/false]
    overUnder: [string, string]; // [over, under]
  };

  // Visual effects
  effects: {
    animations: boolean;
    particles: boolean;
    glow: boolean;
    shadows: 'none' | 'subtle' | 'dramatic';
  };

  // Achievement-specific colors
  achievements: {
    rarities: {
      common: {
        background: string; // Card background gradient
        border: string; // Border color
        accent: string; // Badge background
        text: string; // Badge text color
        leftBorder: string; // Left border accent
        progress: string; // Progress bar color
      };
      uncommon: {
        background: string;
        border: string;
        accent: string;
        text: string;
        leftBorder: string;
        progress: string;
      };
      rare: {
        background: string;
        border: string;
        accent: string;
        text: string;
        leftBorder: string;
        progress: string;
      };
      legendary: {
        background: string;
        border: string;
        accent: string;
        text: string;
        leftBorder: string;
        progress: string;
      };
      epic: {
        background: string;
        border: string;
        accent: string;
        text: string;
        leftBorder: string;
        progress: string;
      };
      secret: {
        background: string;
        border: string;
        accent: string;
        text: string;
        leftBorder: string;
        progress: string;
      };
      shame: {
        background: string;
        border: string;
        accent: string;
        text: string;
        leftBorder: string;
        progress: string;
      };
    };
    categories: {
      [key: string]: {
        icon: string; // Category icon/emoji
        color: string; // Category accent color
      };
    };
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
