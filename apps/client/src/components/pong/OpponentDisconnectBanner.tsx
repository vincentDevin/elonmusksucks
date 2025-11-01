// apps/client/src/components/pong/OpponentDisconnectBanner.tsx
// -----------------------------------------------------------------------------
// Alert banner showing opponent disconnection with reconnection countdown
// Features: cancel button, slide-in animation, auto-dismiss on reconnect
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface OpponentDisconnectBannerProps {
  onCancel: () => void;
  reconnectTime: number; // Seconds until auto-forfeit
}

export default function OpponentDisconnectBanner({
  onCancel,
  reconnectTime,
}: OpponentDisconnectBannerProps) {
  const [timeLeft, setTimeLeft] = useState(reconnectTime);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  return (
    <div
      className="bg-warning/20 border-l-4 border-warning px-4 py-3 mb-4 animate-slideDown"
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-warning flex-shrink-0" />
          <div>
            <p className="font-semibold text-content">Opponent Disconnected</p>
            <p className="text-sm text-tertiary">
              {timeLeft > 0
                ? `Waiting for reconnection... (${timeLeft}s remaining)`
                : 'Opponent failed to reconnect'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-error text-white rounded-lg text-sm font-semibold hover:bg-error/90 transition flex-shrink-0"
        >
          Cancel Match
        </button>
      </div>
    </div>
  );
}
