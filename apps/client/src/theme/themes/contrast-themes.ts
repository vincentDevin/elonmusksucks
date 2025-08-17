// apps/client/src/theme/themes/contrast-themes.ts
import type { UnifiedTheme } from '../types';

export const contrastThemes: UnifiedTheme[] = [
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Accessibility-focused high contrast theme for better visibility',
    category: 'high-contrast',
    preview: '⚫',
    colors: {
      primary: '#FFFF00', // Bright yellow
      secondary: '#FFA500', // Orange
      accent: '#00FF00', // Bright green
      background: '#000000', // Pure black
      surface: '#1A1A1A', // Very dark gray
      muted: '#333333', // Dark gray
      content: '#FFFFFF', // Pure white
      tertiary: '#CCCCCC', // Light gray
      success: '#00FF00', // Bright green
      warning: '#FFFF00', // Bright yellow
      error: '#FF0000', // Bright red
      info: '#00FFFF', // Bright cyan
    },
    effects: {
      animations: false,
      particles: false,
      glow: false,
      shadows: 'none',
    },
  },

  {
    id: 'high-contrast-light',
    name: 'High Contrast Light',
    description: 'Light version of high contrast theme for users who prefer bright backgrounds',
    category: 'high-contrast',
    preview: '⚪',
    colors: {
      primary: '#0000FF', // Pure blue
      secondary: '#4444AA', // Dark blue
      accent: '#008800', // Dark green
      background: '#FFFFFF', // Pure white
      surface: '#F0F0F0', // Light gray
      muted: '#CCCCCC', // Medium gray
      content: '#000000', // Pure black
      tertiary: '#666666', // Dark gray
      success: '#008800', // Dark green
      warning: '#CC6600', // Dark orange
      error: '#CC0000', // Dark red
      info: '#0066CC', // Dark blue
    },
    effects: {
      animations: false,
      particles: false,
      glow: false,
      shadows: 'none',
    },
  },

  {
    id: 'deuteranopia-friendly',
    name: 'Deuteranopia Friendly',
    description: 'Optimized for users with green color blindness',
    category: 'high-contrast',
    preview: '🔵',
    colors: {
      primary: '#0073E6', // Strong blue
      secondary: '#FFB300', // Strong orange
      accent: '#7B2CBF', // Purple
      background: '#000000', // Black
      surface: '#1A1A1A', // Dark gray
      muted: '#444444', // Medium gray
      content: '#FFFFFF', // White
      tertiary: '#BBBBBB', // Light gray
      success: '#FFB300', // Orange (instead of green)
      warning: '#FFFF00', // Yellow
      error: '#FF3366', // Pink-red
      info: '#00CCFF', // Cyan
    },
    effects: {
      animations: false,
      particles: false,
      glow: false,
      shadows: 'subtle',
    },
  },
];
