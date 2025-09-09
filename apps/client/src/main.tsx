import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Apply theme immediately from localStorage to prevent flash
(() => {
  try {
    // Try to get theme from localStorage
    const storedTheme =
      localStorage.getItem('theme') || localStorage.getItem('unified_theme_id') || 'dark'; // Default to dark

    // Apply dark class if theme is dark or contains 'dark'
    if (storedTheme === 'dark' || storedTheme.includes('dark')) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    console.log('🎨 Theme applied immediately:', storedTheme);
  } catch (e) {
    // Fallback to dark theme
    document.documentElement.classList.add('dark');
    console.log('🎨 Theme fallback: dark');
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
