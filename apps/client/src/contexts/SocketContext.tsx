// apps/client/src/contexts/SocketContext.tsx
// Rollback: Remove socket event constants import and restore string literals
import { createContext, useContext, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { socket } from '../lib/socket';

const SocketContext = createContext(socket);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // Initialize socket without auth - auth will be set by AuthProvider
    socket.auth = {};
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  const sock = useMemo(() => socket, []);
  return <SocketContext.Provider value={sock}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
