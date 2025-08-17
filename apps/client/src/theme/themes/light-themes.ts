// apps/client/src/theme/themes/light-themes.ts
import type { UnifiedTheme } from '../types';

export const lightThemes: UnifiedTheme[] = [
  {
    id: 'clean-professional',
    name: 'Clean Professional',
    description: 'Minimal light theme for clarity and focus',
    category: 'light',
    preview: '🤍',
    colors: {
      primary: '#3B82F6', // Blue 600
      secondary: '#60A5FA', // Blue 400
      accent: '#10B981', // Emerald 500
      background: '#FFFFFF', // Pure white
      surface: '#F8FAFC', // Slate 50
      muted: '#E2E8F0', // Slate 200
      content: '#1E293B', // Slate 800
      tertiary: '#64748B', // Slate 500
      success: '#10B981', // Emerald 500
      warning: '#F59E0B', // Amber 500
      error: '#EF4444', // Red 500
      info: '#3B82F6', // Blue 500
    },
    effects: {
      animations: false,
      particles: false,
      glow: false,
      shadows: 'subtle',
    },
  },

  {
    id: 'warm-light',
    name: 'Warm Light',
    description: 'Comfortable light theme with warm tones',
    category: 'light',
    preview: '☀️',
    colors: {
      primary: '#F59E0B', // Amber 500
      secondary: '#FCD34D', // Amber 300
      accent: '#10B981', // Emerald 500
      background: '#FFFBEB', // Amber 50
      surface: '#FEF3C7', // Amber 100
      muted: '#F3E8FF', // Purple 50
      content: '#92400E', // Amber 800
      tertiary: '#D97706', // Amber 600
      success: '#10B981', // Emerald 500
      warning: '#F59E0B', // Amber 500
      error: '#DC2626', // Red 600
      info: '#2563EB', // Blue 600
    },
    effects: {
      animations: true,
      particles: false,
      glow: true,
      shadows: 'subtle',
    },
  },

  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    description: 'Clean light theme with green accents',
    category: 'light',
    preview: '🌿',
    colors: {
      primary: '#10B981', // Emerald 500
      secondary: '#34D399', // Emerald 400
      accent: '#3B82F6', // Blue 500
      background: '#F0FDF4', // Green 50
      surface: '#DCFCE7', // Green 100
      muted: '#D1FAE5', // Green 200
      content: '#14532D', // Green 900
      tertiary: '#166534', // Green 800
      success: '#10B981', // Emerald 500
      warning: '#F59E0B', // Amber 500
      error: '#DC2626', // Red 600
      info: '#0EA5E9', // Sky 500
    },
    effects: {
      animations: true,
      particles: false,
      glow: false,
      shadows: 'subtle',
    },
  },
];
