import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CacheProvider } from './contexts/CacheContext';
import './index.css';

// ══════════════════════════════════════════════════════════════════════════════
// Environment Validation
// ══════════════════════════════════════════════════════════════════════════════
// Import environment configuration to validate on startup
// This will throw an error if required environment variables are missing
import './config/env';

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

// Initialize app with loading animation
async function initializeApp() {
  const root = document.getElementById('root');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!root || !loadingOverlay) {
    console.error('Required elements not found');
    return;
  }

  try {
    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start fade transitions
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');

    // Wait for fade transition to complete
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Remove loading overlay from DOM
    loadingOverlay.remove();

    // Render React app
    createRoot(root).render(
      <StrictMode>
        <CacheProvider>
          <App />
        </CacheProvider>
      </StrictMode>,
    );
  } catch (error) {
    console.error('Error initializing app:', error);
    // Fallback: render anyway
    createRoot(root).render(
      <StrictMode>
        <CacheProvider>
          <App />
        </CacheProvider>
      </StrictMode>,
    );
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');
  }
}

// Start initialization
initializeApp();
