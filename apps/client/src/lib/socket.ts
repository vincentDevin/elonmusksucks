// apps/client/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import env from '../config/env';

/**
 * Socket.IO client instance
 *
 * SECURITY: Socket.IO authentication using JWT
 * - Authenticated via JWT token in socket.auth object (see AuthContext.tsx)
 * - withCredentials: true allows HTTP-only cookies to be sent
 * - autoConnect: false prevents connection before authentication
 *
 * ENVIRONMENT CONFIGURATION:
 * - Development: URL = '' or undefined (uses Vite proxy at localhost:3000)
 * - Production: URL = VITE_SOCKET_URL (e.g., https://api.elonmusksucks.net)
 */
export const socket: Socket = io(env.SOCKET_URL || undefined, {
  withCredentials: true,
  autoConnect: false,
});
