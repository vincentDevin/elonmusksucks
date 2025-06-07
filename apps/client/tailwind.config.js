// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        muted: 'var(--color-muted)',
        tertiary: 'var(--color-tertiary)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        secondary: 'var(--color-secondary)',
        content: 'var(--color-content)',
        background: 'var(--color-background)',
      },
    },
  },
  plugins: [],
};
