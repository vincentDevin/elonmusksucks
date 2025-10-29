// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Custom breakpoints for responsive grid
      screens: {
        xs: '480px',
        sm: '640px',
        md: '800px', // Tablet starts here (2-col grid)
        lg: '1100px', // Desktop starts here (3-col grid)
        xl: '1400px', // Large desktop (4-col grid)
        '2xl': '1600px',
      },
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        content: 'var(--color-content)',
        tertiary: 'var(--color-tertiary)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        medium: 'var(--shadow-medium)',
        dramatic: 'var(--shadow-dramatic)',
        glow: 'var(--glow-primary)',
        'glow-success': 'var(--glow-success)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, var(--gradient-primary-start), var(--gradient-primary-end))',
        'gradient-secondary':
          'linear-gradient(135deg, var(--gradient-secondary-start), var(--gradient-secondary-end))',
        'gradient-radial':
          'radial-gradient(circle, var(--gradient-primary-start), var(--gradient-primary-end))',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(-100%)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
        100: '25rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [],
};
