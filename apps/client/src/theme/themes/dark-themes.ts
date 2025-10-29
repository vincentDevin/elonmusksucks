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
      background: '#0a0f1e',
      surface: '#181f2aff', // Gray 800
      muted: '#374151', // Gray 700
      content: '#F9FAFB', // Gray 50
      tertiary: '#9CA3AF', // Gray 400
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
      animations: true,
      particles: false,
      glow: true,
      shadows: 'subtle',
    },
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-gray-800/80 to-gray-700/80',
          border: 'border-gray-600/40',
          accent: 'bg-gray-500',
          text: 'text-white',
          leftBorder: 'border-l-gray-400',
          progress: 'bg-gray-400',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-emerald-900/80 to-emerald-800/80',
          border: 'border-emerald-600/40',
          accent: 'bg-emerald-500',
          text: 'text-white',
          leftBorder: 'border-l-emerald-400',
          progress: 'bg-emerald-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-900/80 to-blue-800/80',
          border: 'border-blue-600/40',
          accent: 'bg-blue-500',
          text: 'text-white',
          leftBorder: 'border-l-blue-400',
          progress: 'bg-blue-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-purple-900/80 to-purple-800/80',
          border: 'border-purple-600/40',
          accent: 'bg-purple-500',
          text: 'text-white',
          leftBorder: 'border-l-purple-400',
          progress: 'bg-purple-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-indigo-900/80 to-indigo-800/80',
          border: 'border-indigo-600/40',
          accent: 'bg-indigo-500',
          text: 'text-white',
          leftBorder: 'border-l-indigo-400',
          progress: 'bg-indigo-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-slate-800/80 to-slate-700/80',
          border: 'border-slate-600/40',
          accent: 'bg-slate-400',
          text: 'text-gray-900',
          leftBorder: 'border-l-slate-400',
          progress: 'bg-slate-400',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-900/80 to-red-800/80',
          border: 'border-red-600/40',
          accent: 'bg-red-500',
          text: 'text-white',
          leftBorder: 'border-l-red-400',
          progress: 'bg-red-400',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'emerald-400' },
        leaderboard: { icon: '🏆', color: 'purple-400' },
        pong: { icon: '🏓', color: 'blue-400' },
        prediction: { icon: '📊', color: 'indigo-400' },
        chat: { icon: '💬', color: 'blue-300' },
        participation: { icon: '🎯', color: 'teal-400' },
        event: { icon: '🎪', color: 'orange-400' },
        secret: { icon: '🔮', color: 'slate-400' },
        shame: { icon: '😱', color: 'red-400' },
      },
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
      binary: ['#00FF88', '#FF3366'], // bright green (yes), bright red (no)
      overUnder: ['#6366F1', '#F97316'], // indigo (over), orange (under)
    },
    effects: {
      animations: true,
      particles: true,
      glow: true,
      shadows: 'dramatic',
    },
    achievements: {
      rarities: {
        common: {
          background: 'bg-gradient-to-br from-slate-900/90 to-slate-800/90',
          border: 'border-slate-600/50',
          accent: 'bg-slate-400',
          text: 'text-slate-900',
          leftBorder: 'border-l-slate-400',
          progress: 'bg-slate-400',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-green-900/90 to-green-800/90',
          border: 'border-green-400/50',
          accent: 'bg-green-400',
          text: 'text-green-900',
          leftBorder: 'border-l-green-400',
          progress: 'bg-green-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-900/90 to-cyan-900/90',
          border: 'border-cyan-400/50',
          accent: 'bg-cyan-400',
          text: 'text-cyan-900',
          leftBorder: 'border-l-cyan-400',
          progress: 'bg-cyan-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-violet-900/90 to-purple-900/90',
          border: 'border-violet-400/50',
          accent: 'bg-violet-400',
          text: 'text-violet-900',
          leftBorder: 'border-l-violet-400',
          progress: 'bg-violet-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-amber-900/90 to-yellow-900/90',
          border: 'border-amber-400/50',
          accent: 'bg-amber-400',
          text: 'text-amber-900',
          leftBorder: 'border-l-amber-400',
          progress: 'bg-amber-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-indigo-900/90 to-purple-900/90',
          border: 'border-indigo-400/50',
          accent: 'bg-indigo-400',
          text: 'text-indigo-900',
          leftBorder: 'border-l-indigo-400',
          progress: 'bg-indigo-400',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-900/90 to-pink-900/90',
          border: 'border-red-400/50',
          accent: 'bg-red-400',
          text: 'text-red-900',
          leftBorder: 'border-l-red-400',
          progress: 'bg-red-400',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'green-400' },
        leaderboard: { icon: '🏆', color: 'violet-400' },
        pong: { icon: '🏓', color: 'cyan-400' },
        prediction: { icon: '📊', color: 'indigo-400' },
        chat: { icon: '💬', color: 'blue-400' },
        participation: { icon: '🎯', color: 'teal-400' },
        event: { icon: '🎪', color: 'amber-400' },
        secret: { icon: '🔮', color: 'indigo-500' },
        shame: { icon: '😱', color: 'red-400' },
      },
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
      binary: ['#10B981', '#F87171'], // emerald (yes), red-400 (no)
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
          background: 'bg-gradient-to-br from-slate-800/80 to-slate-700/80',
          border: 'border-slate-600/40',
          accent: 'bg-slate-500',
          text: 'text-white',
          leftBorder: 'border-l-slate-400',
          progress: 'bg-slate-400',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-emerald-900/80 to-emerald-800/80',
          border: 'border-emerald-500/40',
          accent: 'bg-emerald-500',
          text: 'text-white',
          leftBorder: 'border-l-emerald-400',
          progress: 'bg-emerald-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-blue-900/80 to-blue-800/80',
          border: 'border-blue-500/40',
          accent: 'bg-blue-500',
          text: 'text-white',
          leftBorder: 'border-l-blue-400',
          progress: 'bg-blue-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-indigo-900/80 to-indigo-800/80',
          border: 'border-indigo-500/40',
          accent: 'bg-indigo-500',
          text: 'text-white',
          leftBorder: 'border-l-indigo-400',
          progress: 'bg-indigo-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-cyan-900/80 to-cyan-800/80',
          border: 'border-cyan-500/40',
          accent: 'bg-cyan-500',
          text: 'text-white',
          leftBorder: 'border-l-cyan-400',
          progress: 'bg-cyan-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-purple-900/80 to-purple-800/80',
          border: 'border-purple-500/40',
          accent: 'bg-purple-500',
          text: 'text-white',
          leftBorder: 'border-l-purple-400',
          progress: 'bg-purple-400',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-900/80 to-red-800/80',
          border: 'border-red-400/40',
          accent: 'bg-red-400',
          text: 'text-white',
          leftBorder: 'border-l-red-400',
          progress: 'bg-red-400',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'emerald-400' },
        leaderboard: { icon: '🏆', color: 'indigo-400' },
        pong: { icon: '🏓', color: 'blue-400' },
        prediction: { icon: '📊', color: 'cyan-400' },
        chat: { icon: '💬', color: 'blue-300' },
        participation: { icon: '🎯', color: 'teal-400' },
        event: { icon: '🎪', color: 'purple-400' },
        secret: { icon: '🔮', color: 'purple-500' },
        shame: { icon: '😱', color: 'red-400' },
      },
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
      binary: ['#22C55E', '#DC2626'], // green-500 (yes), red-600 (no)
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
          background: 'bg-gradient-to-br from-green-900/80 to-green-800/80',
          border: 'border-green-600/40',
          accent: 'bg-green-600',
          text: 'text-white',
          leftBorder: 'border-l-green-500',
          progress: 'bg-green-500',
        },
        uncommon: {
          background: 'bg-gradient-to-br from-emerald-900/80 to-emerald-800/80',
          border: 'border-emerald-500/40',
          accent: 'bg-emerald-500',
          text: 'text-white',
          leftBorder: 'border-l-emerald-400',
          progress: 'bg-emerald-400',
        },
        rare: {
          background: 'bg-gradient-to-br from-sky-900/80 to-sky-800/80',
          border: 'border-sky-500/40',
          accent: 'bg-sky-500',
          text: 'text-white',
          leftBorder: 'border-l-sky-400',
          progress: 'bg-sky-400',
        },
        legendary: {
          background: 'bg-gradient-to-br from-yellow-900/80 to-yellow-800/80',
          border: 'border-yellow-500/40',
          accent: 'bg-yellow-500',
          text: 'text-yellow-900',
          leftBorder: 'border-l-yellow-400',
          progress: 'bg-yellow-400',
        },
        epic: {
          background: 'bg-gradient-to-br from-amber-900/80 to-amber-800/80',
          border: 'border-amber-500/40',
          accent: 'bg-amber-500',
          text: 'text-amber-900',
          leftBorder: 'border-l-amber-400',
          progress: 'bg-amber-400',
        },
        secret: {
          background: 'bg-gradient-to-br from-slate-900/80 to-slate-800/80',
          border: 'border-slate-600/40',
          accent: 'bg-slate-500',
          text: 'text-white',
          leftBorder: 'border-l-slate-400',
          progress: 'bg-slate-400',
        },
        shame: {
          background: 'bg-gradient-to-br from-red-900/80 to-red-800/80',
          border: 'border-red-600/40',
          accent: 'bg-red-600',
          text: 'text-white',
          leftBorder: 'border-l-red-500',
          progress: 'bg-red-500',
        },
      },
      categories: {
        betting: { icon: '💰', color: 'emerald-400' },
        leaderboard: { icon: '🏆', color: 'yellow-400' },
        pong: { icon: '🏓', color: 'sky-400' },
        prediction: { icon: '📊', color: 'green-400' },
        chat: { icon: '💬', color: 'emerald-300' },
        participation: { icon: '🎯', color: 'teal-400' },
        event: { icon: '🎪', color: 'amber-400' },
        secret: { icon: '🔮', color: 'slate-500' },
        shame: { icon: '😱', color: 'red-500' },
      },
    },
  },
];
