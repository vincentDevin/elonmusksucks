// apps/client/src/hooks/useDashboardCustomization.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface DashboardTheme {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    muted: string;
    content: string;
    tertiary: string;
  };
  effects: {
    animations: boolean;
    particles: boolean;
    glow: boolean;
    shadows: 'none' | 'subtle' | 'dramatic';
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  preview: string;
  columns: 'single' | 'two-column' | 'three-column';
  panelSizes: {
    analytics: 'small' | 'medium' | 'large';
    predictions: 'small' | 'medium' | 'large';
    activity: 'small' | 'medium' | 'large';
  };
  panelOrder: string[];
  sidebarPosition: 'left' | 'right';
}

export interface DashboardPreferences {
  theme: string;
  layout: string;
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
    autoRefresh: boolean;
    refreshInterval: number; // seconds
  };
}

const DEFAULT_THEMES: DashboardTheme[] = [
  {
    id: 'dark-trader',
    name: 'Dark Trader',
    description: 'Professional dark theme with green accents',
    preview: '🖤',
    colors: {
      primary: '#10B981',
      secondary: '#059669',
      accent: '#34D399',
      background: '#111827',
      surface: '#1F2937',
      muted: '#374151',
      content: '#F9FAFB',
      tertiary: '#9CA3AF',
    },
    effects: {
      animations: true,
      particles: false,
      glow: true,
      shadows: 'subtle',
    },
  },
  {
    id: 'neon-gaming',
    name: 'Neon Gaming',
    description: 'Vibrant colors with glowing effects',
    preview: '🌈',
    colors: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#F59E0B',
      background: '#0F0F23',
      surface: '#1E1B4B',
      muted: '#312E81',
      content: '#F8FAFC',
      tertiary: '#C4B5FD',
    },
    effects: {
      animations: true,
      particles: true,
      glow: true,
      shadows: 'dramatic',
    },
  },
  {
    id: 'clean-professional',
    name: 'Clean Professional',
    description: 'Minimal light theme for clarity',
    preview: '🤍',
    colors: {
      primary: '#3B82F6',
      secondary: '#60A5FA',
      accent: '#10B981',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      muted: '#E2E8F0',
      content: '#1E293B',
      tertiary: '#64748B',
    },
    effects: {
      animations: false,
      particles: false,
      glow: false,
      shadows: 'subtle',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Accessibility-focused high contrast theme',
    preview: '⚫',
    colors: {
      primary: '#FFFF00',
      secondary: '#FFA500',
      accent: '#00FF00',
      background: '#000000',
      surface: '#1A1A1A',
      muted: '#333333',
      content: '#FFFFFF',
      tertiary: '#CCCCCC',
    },
    effects: {
      animations: false,
      particles: false,
      glow: false,
      shadows: 'none',
    },
  },
];

const DEFAULT_LAYOUTS: DashboardLayout[] = [
  {
    id: 'casual-bettor',
    name: 'Casual Bettor',
    description: 'Simple, clean layout for occasional users',
    preview: '📱',
    columns: 'two-column',
    panelSizes: {
      analytics: 'medium',
      predictions: 'large',
      activity: 'small',
    },
    panelOrder: ['analytics', 'predictions', 'activity'],
    sidebarPosition: 'right',
  },
  {
    id: 'day-trader',
    name: 'Day Trader',
    description: 'Dense information for active traders',
    preview: '📊',
    columns: 'three-column',
    panelSizes: {
      analytics: 'large',
      predictions: 'large',
      activity: 'medium',
    },
    panelOrder: ['analytics', 'predictions', 'activity'],
    sidebarPosition: 'right',
  },
  {
    id: 'social-player',
    name: 'Social Player',
    description: 'Focus on community and friend activity',
    preview: '👥',
    columns: 'two-column',
    panelSizes: {
      analytics: 'small',
      predictions: 'medium',
      activity: 'large',
    },
    panelOrder: ['activity', 'predictions', 'analytics'],
    sidebarPosition: 'left',
  },
  {
    id: 'analytics-pro',
    name: 'Analytics Pro',
    description: 'Maximum charts and statistics',
    preview: '📈',
    columns: 'two-column',
    panelSizes: {
      analytics: 'large',
      predictions: 'medium',
      activity: 'small',
    },
    panelOrder: ['analytics', 'predictions', 'activity'],
    sidebarPosition: 'right',
  },
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  theme: 'dark-trader',
  layout: 'casual-bettor',
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
    autoRefresh: true,
    refreshInterval: 30,
  },
};

export function useDashboardCustomization() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [loading, _setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    if (user?.id) {
      const savedPrefs = localStorage.getItem(`dashboard_prefs_${user.id}`);
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch (err) {
          console.error('Failed to parse dashboard preferences:', err);
        }
      }
    }
  }, [user?.id]);

  // Save preferences to localStorage
  const savePreferences = useCallback(
    (newPrefs: Partial<DashboardPreferences>) => {
      if (!user?.id) return;

      const updatedPrefs = { ...preferences, ...newPrefs };
      setPreferences(updatedPrefs);

      try {
        localStorage.setItem(`dashboard_prefs_${user.id}`, JSON.stringify(updatedPrefs));
      } catch (err) {
        console.error('Failed to save dashboard preferences:', err);
        setError('Failed to save preferences');
      }
    },
    [user?.id, preferences],
  );

  // Apply theme to document
  useEffect(() => {
    const theme = DEFAULT_THEMES.find((t) => t.id === preferences.theme);
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply theme class for CSS-based styling
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme.id}`);

    // Apply effects
    if (theme.effects.animations === false || preferences.performance.reducedAnimations) {
      document.body.classList.add('reduced-animations');
    } else {
      document.body.classList.remove('reduced-animations');
    }

    if (theme.effects.glow) {
      document.body.classList.add('theme-glow');
    } else {
      document.body.classList.remove('theme-glow');
    }

    document.body.classList.toggle('theme-particles', theme.effects.particles);
    document.body.classList.add(`theme-shadows-${theme.effects.shadows}`);
  }, [preferences.theme, preferences.performance.reducedAnimations]);

  // Get current theme
  const currentTheme = DEFAULT_THEMES.find((t) => t.id === preferences.theme) || DEFAULT_THEMES[0];
  const currentLayout =
    DEFAULT_LAYOUTS.find((l) => l.id === preferences.layout) || DEFAULT_LAYOUTS[0];

  // Update specific preference sections
  const updateTheme = useCallback(
    (themeId: string) => {
      savePreferences({ theme: themeId });
    },
    [savePreferences],
  );

  const updateLayout = useCallback(
    (layoutId: string) => {
      savePreferences({ layout: layoutId });
    },
    [savePreferences],
  );

  const updateNotifications = useCallback(
    (notifications: Partial<DashboardPreferences['notifications']>) => {
      savePreferences({ notifications: { ...preferences.notifications, ...notifications } });
    },
    [savePreferences, preferences.notifications],
  );

  const updatePrivacy = useCallback(
    (privacy: Partial<DashboardPreferences['privacy']>) => {
      savePreferences({ privacy: { ...preferences.privacy, ...privacy } });
    },
    [savePreferences, preferences.privacy],
  );

  const updatePerformance = useCallback(
    (performance: Partial<DashboardPreferences['performance']>) => {
      savePreferences({ performance: { ...preferences.performance, ...performance } });
    },
    [savePreferences, preferences.performance],
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    if (user?.id) {
      localStorage.removeItem(`dashboard_prefs_${user.id}`);
    }
  }, [user?.id]);

  // Get CSS variables for current theme
  const getThemeVariables = useCallback(() => {
    const theme = currentTheme;
    return Object.entries(theme.colors).reduce(
      (acc, [key, value]) => {
        acc[`--color-${key}`] = value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [currentTheme]);

  return {
    preferences,
    currentTheme,
    currentLayout,
    availableThemes: DEFAULT_THEMES,
    availableLayouts: DEFAULT_LAYOUTS,
    loading,
    error,
    updateTheme,
    updateLayout,
    updateNotifications,
    updatePrivacy,
    updatePerformance,
    savePreferences,
    resetToDefaults,
    getThemeVariables,
  };
}
