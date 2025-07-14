// apps/client/src/contexts/SocketContext.tsx
import { createContext, useContext, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { socket } from '../lib/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(socket);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken } = useAuth();

  useEffect(() => {
    // Always overwrite .auth with an object
    socket.auth = accessToken ? { token: accessToken } : {};
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  const sock = useMemo(() => socket, []);
  return <SocketContext.Provider value={sock}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
