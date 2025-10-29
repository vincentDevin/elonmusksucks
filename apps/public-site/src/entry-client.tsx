import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize the app with loading animation
async function initializeApp() {
  const root = document.getElementById('root');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!root || !loadingOverlay) {
    console.error('Required elements not found');
    return;
  }

  // Maximum timeout to force show content (prevents infinite loading on webkit/mobile)
  const forceShowTimeout = setTimeout(() => {
    console.warn('[INIT] Force showing content after timeout');
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');
    setTimeout(() => loadingOverlay.remove(), 500);
  }, 5000); // 5 second absolute maximum

  try {
    // Simple delay to ensure DOM is ready (especially on webkit browsers)
    // We have inline critical CSS, so we don't need to wait for external stylesheets
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Hydrate the app first
    hydrateRoot(root, <App />);

    // Clear the force-show timeout since hydration succeeded
    clearTimeout(forceShowTimeout);

    // Start fade transitions after hydration
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');

    // Wait for fade transition to complete before removing overlay
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Remove loading overlay from DOM
    loadingOverlay.remove();

    // Enable transitions after hydration completes (prevents flash)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add('transitions-enabled');
      });
    });
  } catch (error) {
    console.error('Error initializing app:', error);

    // Clear timeout and force show content on error
    clearTimeout(forceShowTimeout);

    // Fallback: try to hydrate and show content anyway
    try {
      hydrateRoot(root, <App />);
    } catch (hydrationError) {
      console.error('Hydration failed:', hydrationError);
    }

    // Always show content, even if hydration failed
    loadingOverlay.classList.add('fade-out');
    root.classList.add('ready');
    setTimeout(() => loadingOverlay.remove(), 500);
  }
}

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}
