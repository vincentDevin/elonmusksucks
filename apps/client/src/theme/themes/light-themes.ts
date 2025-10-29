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
    predictionOptions: {
      // Core palette - 8 distinct colors that don't conflict with semantic UI colors
      // Uses indigo, violet, yellow, orange, pink, cyan, purple, lime
      // Can cycle for predictions with more than 8 options
      palette: [
        '#6366F1', // indigo-500 (distinct from info blue #3B82F6)
        '#8B5CF6', // violet-500
        '#FACC15', // yellow-400 (bright yellow, distinct from warning amber #F59E0B)
        '#F97316', // orange-500 (distinct from warning amber #F59E0B)
        '#EC4899', // pink-500 (distinct from error red #EF4444)
        '#06B6D4', // cyan-500
        '#A855F7', // purple-500
        '#84CC16', // lime-500
      ],
      // Type-specific overrides
      binary: ['#10B981', '#EF4444'], // yellow (yes/true), pink (no/false)
      overUnder: ['#6366F1', '#F97316'], // indigo (over), orange (under)
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
          background: 'bg-gradient-to-br from-slate-50/80 to-slate-100/80',
          border: 'border-slate-300/40',
          accent: 'bg-slate-500',
          text: 'text-white',
          leftBorder: 'border-l-slate-400',
          progress: 'bg-slate-400',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/80',
          border: 'border-emerald-300/40',
          accent: 'bg-emerald-500',
          text: 'text-white',
          leftBorder: 'border-l-emerald-400',
          progress: 'bg-emerald-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-50/80 to-blue-100/80',
          border: 'border-blue-300/40',
          accent: 'bg-blue-500',
          text: 'text-white',
          leftBorder: 'border-l-blue-400',
          progress: 'bg-blue-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-purple-50/80 to-purple-100/80',
          border: 'border-purple-300/40',
          accent: 'bg-purple-500',
          text: 'text-white',
          leftBorder: 'border-l-purple-400',
          progress: 'bg-purple-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/80',
          border: 'border-indigo-300/40',
          accent: 'bg-indigo-500',
          text: 'text-white',
          leftBorder: 'border-l-indigo-400',
          progress: 'bg-indigo-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-gray-50/80 to-gray-100/80',
          border: 'border-gray-400/40',
          accent: 'bg-gray-600',
          text: 'text-white',
          leftBorder: 'border-l-gray-500',
          progress: 'bg-gray-500',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-50/80 to-red-100/80',
          border: 'border-red-300/40',
          accent: 'bg-red-500',
          text: 'text-white',
          leftBorder: 'border-l-red-400',
          progress: 'bg-red-400',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'emerald-500' },
        leaderboard: { icon: '🏆', color: 'purple-500' },
        pong: { icon: '🏓', color: 'blue-500' },
        prediction: { icon: '📊', color: 'indigo-500' },
        chat: { icon: '💬', color: 'blue-600' },
        participation: { icon: '🎯', color: 'teal-500' },
        event: { icon: '🎪', color: 'orange-500' },
        secret: { icon: '🔮', color: 'gray-600' },
        shame: { icon: '😱', color: 'red-500' },
      },
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
    predictionOptions: {
      palette: [
        '#6366F1', // indigo-500
        '#8B5CF6', // violet-500
        '#FACC15', // yellow-400
        '#F97316', // orange-500
        '#EC4899', // pink-500
        '#06B6D4', // cyan-500
        '#A855F7', // purple-500
        '#84CC16', // lime-500
      ],
      binary: ['#10B981', '#DC2626'], // emerald-500 (yes), red-600 (no)
      overUnder: ['#6366F1', '#F97316'], // indigo (over), orange (under)
    },
    effects: {
      animations: true,
      particles: false,
      glow: true,
      shadows: 'subtle',
    },
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-amber-50/80 to-amber-100/80',
          border: 'border-amber-300/40',
          accent: 'bg-amber-600',
          text: 'text-white',
          leftBorder: 'border-l-amber-500',
          progress: 'bg-amber-500',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/80',
          border: 'border-emerald-300/40',
          accent: 'bg-emerald-500',
          text: 'text-white',
          leftBorder: 'border-l-emerald-400',
          progress: 'bg-emerald-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-50/80 to-blue-100/80',
          border: 'border-blue-300/40',
          accent: 'bg-blue-600',
          text: 'text-white',
          leftBorder: 'border-l-blue-500',
          progress: 'bg-blue-500',
        },
        legendary: {
          background: 'bg-gradient-to-br from-orange-50/80 to-orange-100/80',
          border: 'border-orange-300/40',
          accent: 'bg-orange-500',
          text: 'text-white',
          leftBorder: 'border-l-orange-400',
          progress: 'bg-orange-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-yellow-50/80 to-yellow-100/80',
          border: 'border-yellow-300/40',
          accent: 'bg-yellow-600',
          text: 'text-white',
          leftBorder: 'border-l-yellow-500',
          progress: 'bg-yellow-500',
        },
        secret: {
          background: 'bg-gradient-to-br from-purple-50/80 to-purple-100/80',
          border: 'border-purple-300/40',
          accent: 'bg-purple-600',
          text: 'text-white',
          leftBorder: 'border-l-purple-500',
          progress: 'bg-purple-500',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-50/80 to-red-100/80',
          border: 'border-red-300/40',
          accent: 'bg-red-600',
          text: 'text-white',
          leftBorder: 'border-l-red-500',
          progress: 'bg-red-500',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'emerald-500' },
        leaderboard: { icon: '🏆', color: 'orange-500' },
        pong: { icon: '🏓', color: 'blue-600' },
        prediction: { icon: '📊', color: 'purple-600' },
        chat: { icon: '💬', color: 'blue-700' },
        participation: { icon: '🎯', color: 'teal-600' },
        event: { icon: '🎪', color: 'amber-600' },
        secret: { icon: '🔮', color: 'purple-700' },
        shame: { icon: '😱', color: 'red-600' },
      },
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
    predictionOptions: {
      palette: [
        '#6366F1', // indigo-500
        '#8B5CF6', // violet-500
        '#FACC15', // yellow-400
        '#F97316', // orange-500
        '#EC4899', // pink-505
        '#06B6D4', // cyan-500
        '#A855F7', // purple-500
        '#84CC16', // lime-500
      ],
      binary: ['#10B981', '#DC2626'], // emerald-500 (yes), red-600 (no)
      overUnder: ['#6366F1', '#F97316'], // indigo (over), orange (under)
    },
    effects: {
      animations: true,
      particles: false,
      glow: false,
      shadows: 'subtle',
    },
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-green-50/80 to-green-100/80',
          border: 'border-green-300/40',
          accent: 'bg-green-600',
          text: 'text-white',
          leftBorder: 'border-l-green-500',
          progress: 'bg-green-500',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/80',
          border: 'border-emerald-300/40',
          accent: 'bg-emerald-500',
          text: 'text-white',
          leftBorder: 'border-l-emerald-400',
          progress: 'bg-emerald-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-sky-50/80 to-sky-100/80',
          border: 'border-sky-300/40',
          accent: 'bg-sky-500',
          text: 'text-white',
          leftBorder: 'border-l-sky-400',
          progress: 'bg-sky-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-teal-50/80 to-teal-100/80',
          border: 'border-teal-300/40',
          accent: 'bg-teal-600',
          text: 'text-white',
          leftBorder: 'border-l-teal-500',
          progress: 'bg-teal-500',
        },
        epic: {
          background: 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/80',
          border: 'border-cyan-300/40',
          accent: 'bg-cyan-600',
          text: 'text-white',
          leftBorder: 'border-l-cyan-500',
          progress: 'bg-cyan-500',
        },
        secret: {
          background: 'bg-gradient-to-br from-slate-50/80 to-slate-100/80',
          border: 'border-slate-300/40',
          accent: 'bg-slate-600',
          text: 'text-white',
          leftBorder: 'border-l-slate-500',
          progress: 'bg-slate-500',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-50/80 to-red-100/80',
          border: 'border-red-300/40',
          accent: 'bg-red-600',
          text: 'text-white',
          leftBorder: 'border-l-red-500',
          progress: 'bg-red-500',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'emerald-500' },
        leaderboard: { icon: '🏆', color: 'teal-600' },
        pong: { icon: '🏓', color: 'sky-500' },
        prediction: { icon: '📊', color: 'cyan-600' },
        chat: { icon: '💬', color: 'blue-600' },
        participation: { icon: '🎯', color: 'teal-500' },
        event: { icon: '🎪', color: 'green-600' },
        secret: { icon: '🔮', color: 'slate-600' },
        shame: { icon: '😱', color: 'red-600' },
      },
    },
  },
];
