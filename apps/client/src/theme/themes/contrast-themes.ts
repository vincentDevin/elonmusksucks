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
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-gray-800 to-gray-700',
          border: 'border-gray-500',
          accent: 'bg-gray-400',
          text: 'text-black',
          leftBorder: 'border-l-gray-400',
          progress: 'bg-gray-400',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-green-800 to-green-700',
          border: 'border-green-500',
          accent: 'bg-green-400',
          text: 'text-black',
          leftBorder: 'border-l-green-400',
          progress: 'bg-green-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-cyan-800 to-cyan-700',
          border: 'border-cyan-500',
          accent: 'bg-cyan-400',
          text: 'text-black',
          leftBorder: 'border-l-cyan-400',
          progress: 'bg-cyan-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-yellow-800 to-yellow-700',
          border: 'border-yellow-500',
          accent: 'bg-yellow-400',
          text: 'text-black',
          leftBorder: 'border-l-yellow-400',
          progress: 'bg-yellow-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-orange-800 to-orange-700',
          border: 'border-orange-500',
          accent: 'bg-orange-400',
          text: 'text-black',
          leftBorder: 'border-l-orange-400',
          progress: 'bg-orange-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-purple-800 to-purple-700',
          border: 'border-purple-500',
          accent: 'bg-purple-400',
          text: 'text-black',
          leftBorder: 'border-l-purple-400',
          progress: 'bg-purple-400',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-800 to-red-700',
          border: 'border-red-500',
          accent: 'bg-red-400',
          text: 'text-white',
          leftBorder: 'border-l-red-400',
          progress: 'bg-red-400',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'green-400' },
        leaderboard: { icon: '🏆', color: 'yellow-400' },
        pong: { icon: '🏓', color: 'cyan-400' },
        prediction: { icon: '📊', color: 'blue-400' },
        chat: { icon: '💬', color: 'cyan-300' },
        participation: { icon: '🎯', color: 'green-300' },
        event: { icon: '🎪', color: 'orange-400' },
        secret: { icon: '🔮', color: 'purple-400' },
        shame: { icon: '😱', color: 'red-400' },
      },
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
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-gray-200 to-gray-300',
          border: 'border-gray-600',
          accent: 'bg-gray-800',
          text: 'text-white',
          leftBorder: 'border-l-gray-800',
          progress: 'bg-gray-800',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-green-200 to-green-300',
          border: 'border-green-800',
          accent: 'bg-green-800',
          text: 'text-white',
          leftBorder: 'border-l-green-800',
          progress: 'bg-green-800',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-200 to-blue-300',
          border: 'border-blue-800',
          accent: 'bg-blue-800',
          text: 'text-white',
          leftBorder: 'border-l-blue-800',
          progress: 'bg-blue-800',
        },
        legendary: {
          background: 'bg-gradient-to-br from-orange-200 to-orange-300',
          border: 'border-orange-800',
          accent: 'bg-orange-800',
          text: 'text-white',
          leftBorder: 'border-l-orange-800',
          progress: 'bg-orange-800',
        },
        epic: {
          background: 'bg-gradient-to-br from-purple-200 to-purple-300',
          border: 'border-purple-800',
          accent: 'bg-purple-800',
          text: 'text-white',
          leftBorder: 'border-l-purple-800',
          progress: 'bg-purple-800',
        },
        secret: {
          background: 'bg-gradient-to-br from-indigo-200 to-indigo-300',
          border: 'border-indigo-800',
          accent: 'bg-indigo-800',
          text: 'text-white',
          leftBorder: 'border-l-indigo-800',
          progress: 'bg-indigo-800',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-200 to-red-300',
          border: 'border-red-800',
          accent: 'bg-red-800',
          text: 'text-white',
          leftBorder: 'border-l-red-800',
          progress: 'bg-red-800',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'green-800' },
        leaderboard: { icon: '🏆', color: 'orange-800' },
        pong: { icon: '🏓', color: 'blue-800' },
        prediction: { icon: '📊', color: 'indigo-800' },
        chat: { icon: '💬', color: 'blue-700' },
        participation: { icon: '🎯', color: 'green-700' },
        event: { icon: '🎪', color: 'orange-700' },
        secret: { icon: '🔮', color: 'indigo-700' },
        shame: { icon: '😱', color: 'red-800' },
      },
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
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-gray-800 to-gray-700',
          border: 'border-gray-500',
          accent: 'bg-gray-400',
          text: 'text-black',
          leftBorder: 'border-l-gray-400',
          progress: 'bg-gray-400',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-orange-800 to-orange-700',
          border: 'border-orange-500',
          accent: 'bg-orange-400',
          text: 'text-black',
          leftBorder: 'border-l-orange-400',
          progress: 'bg-orange-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-800 to-blue-700',
          border: 'border-blue-500',
          accent: 'bg-blue-400',
          text: 'text-black',
          leftBorder: 'border-l-blue-400',
          progress: 'bg-blue-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-purple-800 to-purple-700',
          border: 'border-purple-500',
          accent: 'bg-purple-400',
          text: 'text-black',
          leftBorder: 'border-l-purple-400',
          progress: 'bg-purple-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-cyan-800 to-cyan-700',
          border: 'border-cyan-500',
          accent: 'bg-cyan-400',
          text: 'text-black',
          leftBorder: 'border-l-cyan-400',
          progress: 'bg-cyan-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-indigo-800 to-indigo-700',
          border: 'border-indigo-500',
          accent: 'bg-indigo-400',
          text: 'text-black',
          leftBorder: 'border-l-indigo-400',
          progress: 'bg-indigo-400',
        },
        shame: {
          background: 'bg-gradient-to-br from-pink-800 to-pink-700',
          border: 'border-pink-500',
          accent: 'bg-pink-400',
          text: 'text-black',
          leftBorder: 'border-l-pink-400',
          progress: 'bg-pink-400',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'orange-400' },
        leaderboard: { icon: '🏆', color: 'purple-400' },
        pong: { icon: '🏓', color: 'blue-400' },
        prediction: { icon: '📊', color: 'cyan-400' },
        chat: { icon: '💬', color: 'blue-300' },
        participation: { icon: '🎯', color: 'orange-300' },
        event: { icon: '🎪', color: 'purple-300' },
        secret: { icon: '🔮', color: 'indigo-400' },
        shame: { icon: '😱', color: 'pink-400' },
      },
    },
  },
];
