import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { socket } from '../lib/socket';

const SocketContext = createContext(socket);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const sock = useMemo(() => socket, []);
  return <SocketContext.Provider value={sock}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
