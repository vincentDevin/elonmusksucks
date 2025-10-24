import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Wait for styles to be ready (works for both dev and production)
async function waitForStyles(): Promise<void> {
  // In development, Vite injects styles as <style> tags
  // In production, styles are in <link> tags
  // We'll wait for either to be present, with a timeout

  const maxWaitTime = 2000; // 2 second timeout
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    // Check for style tags (dev mode) or link tags (production)
    const hasStyles =
      document.querySelector('style') || document.querySelector('link[rel="stylesheet"]');

    if (hasStyles) {
      // Wait a bit more to ensure styles are applied
      await new Promise((resolve) => setTimeout(resolve, 100));
      return;
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Timeout reached, proceed anyway
  console.warn('Stylesheet loading timeout - proceeding with hydration');
}

// Initialize the app with loading animation
async function initializeApp() {
  const root = document.getElementById('root');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!root || !loadingOverlay) {
    console.error('Required elements not found');
    return;
  }

  try {
    // Wait for styles to be ready
    await waitForStyles();

    // Start fade transitions
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');

    // Wait for fade transition to complete before removing overlay
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Remove loading overlay from DOM
    loadingOverlay.remove();

    // Hydrate the app
    hydrateRoot(root, <App />);

    // Enable transitions after hydration completes (prevents flash)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add('transitions-enabled');
      });
    });
  } catch (error) {
    console.error('Error initializing app:', error);
    // Fallback: hydrate anyway to show content
    hydrateRoot(root, <App />);
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');
  }
}

// Start initialization
initializeApp();
