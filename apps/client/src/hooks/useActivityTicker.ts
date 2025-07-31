import { useState, useEffect } from 'react';
import type { UserActivity } from '@ems/types';
import { useSocket } from '../contexts/SocketContext';

export function useActivityTicker(limit = 20) {
  const socket = useSocket();
  const [items, setItems] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    const requestTicker = () => socket.emit('activity:ticker', limit);
    const handleTicker = (data: UserActivity[]) => {
      setItems(data);
      setLoading(false);
    };

    socket.on('connect', requestTicker);
    requestTicker();
    socket.on('activity:ticker', handleTicker);

    return () => {
      socket.off('connect', requestTicker);
      socket.off('activity:ticker', handleTicker);
    };
  }, [socket, limit]);

  useEffect(() => {
    const handleNewsflash = (item: UserActivity) => {
      setItems((prev) => [item, ...prev].slice(0, limit));
    };
    socket.on('activityNewsflash', handleNewsflash);
    return () => {
      socket.off('activityNewsflash', handleNewsflash);
    };
  }, [socket, limit]);

  return { items, loading, error };
}
