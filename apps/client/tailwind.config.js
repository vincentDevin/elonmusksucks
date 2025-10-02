// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground, #ffffff)',
          hover: 'var(--color-primary-hover, var(--color-primary))',
        },
        border: 'var(--color-border, #e2e8f0)',
        muted: 'var(--color-muted)',
        tertiary: 'var(--color-tertiary)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        secondary: 'var(--color-secondary)',
        content: 'var(--color-content)',
        background: 'var(--color-background)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
        info: 'var(--color-info)',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
      },
    },
  },
  plugins: [],
};
