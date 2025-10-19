import { hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Hydrate the app
hydrateRoot(document.getElementById('root')!, <App />);

// Enable transitions after hydration completes (prevents flash)
// Wait for next tick to ensure theme is fully applied
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add('transitions-enabled');
  });
});
