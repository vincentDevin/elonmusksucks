import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Apply theme from localStorage before hydration to prevent flash
(() => {
  try {
    const storedTheme = localStorage.getItem('theme') || 'dark';
    if (storedTheme === 'dark' || storedTheme.includes('dark')) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();

hydrateRoot(document.getElementById('root')!, <App />);
