import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Get server-side data from window
const serverData = (window as any).__SERVER_DATA__ || {};

// Hydrate the root, but don't interfere with navigation
// This SSR site uses server-side navigation, not client-side routing
hydrateRoot(document.getElementById('root')!, <App {...serverData} />);

// Ensure all links work as normal browser navigation
// Remove any React event handlers that might interfere
document.addEventListener('DOMContentLoaded', () => {
  // Force all internal links to use full page navigation
  const links = document.querySelectorAll('a[href^="/"]');
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = (e.currentTarget as HTMLAnchorElement).href;
      if (href !== window.location.href) {
        window.location.href = href;
      }
    });
  });
});
