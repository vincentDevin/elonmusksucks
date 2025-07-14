// apps/client/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

// With proxy, you can just use the current origin (no need for http://127.0.0.1:5000)
export const socket: Socket = io({
  withCredentials: true,
  autoConnect: false,
});
