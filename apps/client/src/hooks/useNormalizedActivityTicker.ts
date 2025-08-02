// apps/client/src/hooks/useNormalizedActivityTicker.ts
import { useState, useEffect, useCallback } from 'react';
import type { NormalizedActivityEvent } from '@ems/types';
import { useSocket } from '../contexts/SocketContext';

export function useNormalizedActivityTicker(limit = 20) {
  const socket = useSocket();
  const [items, setItems] = useState<NormalizedActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Request initial ticker data
  const requestTicker = useCallback(() => {
    socket.emit('activity:ticker:normalized', limit);
  }, [socket, limit]);

  // Handle ticker data response
  const handleTicker = useCallback((data: NormalizedActivityEvent[]) => {
    setItems(data);
    setLoading(false);
    setError(null);
  }, []);

  // Handle real-time activity updates
  const handleNewsflash = useCallback(
    (item: NormalizedActivityEvent) => {
      setItems((prev) => {
        // Avoid duplicates by ID and ensure chronological order
        const filtered = prev.filter((existingItem) => existingItem.id !== item.id);
        const updated = [item, ...filtered];

        // Sort by timestamp to maintain order
        updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return updated.slice(0, limit);
      });
    },
    [limit],
  );

  // Handle connection errors
  const handleError = useCallback((err: any) => {
    console.error('[normalized-activity] Error:', err);
    setError(new Error('Failed to load activity feed'));
    setLoading(false);
  }, []);

  // Set up event listeners
  useEffect(() => {
    socket.on('connect', requestTicker);
    socket.on('activity:ticker:normalized', handleTicker);
    socket.on('activityNewsflash:normalized', handleNewsflash);
    socket.on('error', handleError);

    // Handle disconnection/reconnection
    socket.on('disconnect', () => {
      console.log('[normalized-activity] Socket disconnected');
      setLoading(true);
    });

    socket.on('reconnect', () => {
      console.log('[normalized-activity] Socket reconnected, refreshing ticker');
      requestTicker();
    });

    // Request initial data if already connected
    if (socket.connected) {
      requestTicker();
    }

    return () => {
      socket.off('connect', requestTicker);
      socket.off('activity:ticker:normalized', handleTicker);
      socket.off('activityNewsflash:normalized', handleNewsflash);
      socket.off('error', handleError);
      socket.off('disconnect');
      socket.off('reconnect');
    };
  }, [socket, requestTicker, handleTicker, handleNewsflash, handleError]);

  // Auto-refresh every 30 seconds to ensure fresh data
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket.connected && !loading) {
        requestTicker();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [socket, loading, requestTicker]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    setLoading(true);
    requestTicker();
  }, [requestTicker]);

  return {
    items,
    loading,
    error,
    refresh,
    // Helper functions for filtering
    getHighPriorityItems: () => items.filter((item) => item.priority === 'high'),
    getItemsByType: (type: string) => items.filter((item) => item.type === type),
  };
}
