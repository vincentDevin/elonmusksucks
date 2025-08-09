// apps/client/src/theme/themes/dark-themes.ts
import type { UnifiedTheme } from '../types';

export const darkThemes: UnifiedTheme[] = [
  {
    id: 'dark-professional',
    name: 'Dark Professional',
    description: 'Professional dark theme with green accents for trading',
    category: 'dark',
    preview: '🖤',
    colors: {
      primary: '#10B981', // Emerald 500
      secondary: '#059669', // Emerald 600
      accent: '#34D399', // Emerald 400
      background: '#111827', // Gray 900
      surface: '#1F2937', // Gray 800
      muted: '#374151', // Gray 700
      content: '#F9FAFB', // Gray 50
      tertiary: '#9CA3AF', // Gray 400
      success: '#10B981', // Emerald 500
      warning: '#F59E0B', // Amber 500
      error: '#EF4444', // Red 500
      info: '#3B82F6', // Blue 500
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
    description: 'Vibrant dark theme with glowing effects and neon colors',
    category: 'dark',
    preview: '🌈',
    colors: {
      primary: '#8B5CF6', // Violet 500
      secondary: '#A78BFA', // Violet 400
      accent: '#F59E0B', // Amber 500
      background: '#0F0F23', // Very dark blue
      surface: '#1E1B4B', // Indigo 900
      muted: '#312E81', // Indigo 800
      content: '#F8FAFC', // Slate 50
      tertiary: '#C4B5FD', // Violet 300
      success: '#00FF88', // Bright green
      warning: '#FFAA00', // Bright orange
      error: '#FF3366', // Bright red
      info: '#00AAFF', // Bright blue
    },
    effects: {
      animations: true,
      particles: true,
      glow: true,
      shadows: 'dramatic',
    },
  },

  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Deep blue dark theme for comfortable night trading',
    category: 'dark',
    preview: '🌙',
    colors: {
      primary: '#3B82F6', // Blue 500
      secondary: '#60A5FA', // Blue 400
      accent: '#10B981', // Emerald 500
      background: '#0C1426', // Very dark blue
      surface: '#1E293B', // Slate 800
      muted: '#334155', // Slate 700
      content: '#F1F5F9', // Slate 100
      tertiary: '#94A3B8', // Slate 400
      success: '#10B981', // Emerald 500
      warning: '#F59E0B', // Amber 500
      error: '#F87171', // Red 400
      info: '#60A5FA', // Blue 400
    },
    effects: {
      animations: true,
      particles: false,
      glow: true,
      shadows: 'subtle',
    },
  },

  {
    id: 'forest-dark',
    name: 'Forest Dark',
    description: 'Nature-inspired dark theme with forest green tones',
    category: 'dark',
    preview: '🌲',
    colors: {
      primary: '#22C55E', // Green 500
      secondary: '#16A34A', // Green 600
      accent: '#FACC15', // Yellow 400
      background: '#0F1B0F', // Very dark green
      surface: '#1C2E1C', // Dark green
      muted: '#2D4A2D', // Medium green
      content: '#F0FDF4', // Green 50
      tertiary: '#86EFAC', // Green 300
      success: '#22C55E', // Green 500
      warning: '#EAB308', // Yellow 500
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
