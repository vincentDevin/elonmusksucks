import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize theme before React hydration to prevent flash
const initializeTheme = () => {
  const stored = localStorage.getItem('theme');
  const theme = stored || 'dark'; // Default to dark theme

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  if (!stored) {
    localStorage.setItem('theme', 'dark');
  }
};

// Initialize theme immediately
initializeTheme();

// Get server-side data from window
const serverData = (window as any).__SERVER_DATA__ || {};

// Hydrate the root
hydrateRoot(document.getElementById('root')!, <App {...serverData} />);
