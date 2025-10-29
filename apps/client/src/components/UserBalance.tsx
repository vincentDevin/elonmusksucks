// apps/client/src/components/UserBalance.tsx
import { useState, useEffect, useRef, startTransition } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { REDIS_CHANNELS } from '@ems/types';
import type { BalanceUpdatePayload } from '@ems/types';
import { formatMuskBucks, getMuskBucksColorClasses } from '../utils/formatting';

/**
 * Independent balance display component that subscribes to real-time updates
 * Rerenders only itself without causing parent component rerenders
 */
export function UserBalance() {
  const { user } = useAuth();
  const { subscribe } = useEventBusCore();

  // Local state for balance - independent of AuthContext
  const [balance, setBalance] = useState<string>(() => user?.muskBucks || '0');

  // Sync with user prop ONLY on initial mount or user change (not on every muskBucks change)
  // This prevents overwriting real-time balance updates with stale AuthContext data
  const userIdRef = useRef(user?.id);
  useEffect(() => {
    if (user?.id && user.id !== userIdRef.current) {
      // User changed (login/logout), reset balance
      userIdRef.current = user.id;
      setBalance(user.muskBucks);
    }
  }, [user?.id, user?.muskBucks]);

  // Subscribe to real-time balance updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribe(
      REDIS_CHANNELS.BALANCE_UPDATE,
      (payload: BalanceUpdatePayload) => {
        // Only update if this event is for the current user
        if (payload.userId === user.id) {
          // Use startTransition for non-blocking update
          startTransition(() => {
            setBalance(String(payload.newBalance));
          });
        }
      },
    );

    return unsubscribe;
  }, [user?.id, subscribe]);

  if (!user) return null;

  return (
    <div
      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${getMuskBucksColorClasses(balance)}`}
    >
      <span>{formatMuskBucks(balance)}</span>
      <span>🪙</span>
    </div>
  );
}
