// apps/client/src/components/HydrationMarker.tsx
// Component that marks hydration as complete when React is fully loaded
// SAFETY: Ensures event system doesn't process events until app is ready

import { useEffect } from 'react';
import { hydrationWatermark } from '../lib/hydrationWatermark';

export default function HydrationMarker() {
  useEffect(() => {
    // Mark hydration as complete when this component mounts
    // This ensures React has finished hydrating and the app is ready
    hydrationWatermark.markHydrationComplete();

    console.log('[HydrationMarker] React hydration complete, events now processing');

    // Log hydration metrics in development
    if (process.env.NODE_ENV === 'development') {
      const metrics = hydrationWatermark.getMetrics();
      console.log('[HydrationMarker] Hydration metrics:', metrics);
    }
  }, []);

  // This component renders nothing - it's just for side effects
  return null;
}
