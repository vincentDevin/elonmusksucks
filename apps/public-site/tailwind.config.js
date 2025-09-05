/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(59 130 246)', // blue-500
        'primary-hover': 'rgb(37 99 235)', // blue-600
        background: 'rgb(255 255 255)', // white
        surface: 'rgb(249 250 251)', // gray-50
        content: 'rgb(17 24 39)', // gray-900
        muted: 'rgb(209 213 219)', // gray-300
        border: 'rgb(229 231 235)', // gray-200
        tertiary: 'rgb(107 114 128)', // gray-500
      },
    },
  },
  plugins: [],
};
