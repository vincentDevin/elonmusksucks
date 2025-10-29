// apps/client/src/contexts/SocketContext.tsx
// Rollback: Remove socket event constants import and restore string literals
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { socket } from '../lib/socket';

const SocketContext = createContext(socket);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  // Socket connection lifecycle is managed by AuthProvider
  // This provider just makes the singleton socket instance available via context
  // DO NOT disconnect on unmount - socket persists across navigation/hot reloads

  const sock = useMemo(() => socket, []);
  return <SocketContext.Provider value={sock}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
