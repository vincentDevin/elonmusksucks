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
 *
 * RECONNECTION STRATEGY:
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 attempts)
 * - Prevents reconnection storms on server issues
 * - Randomization factor reduces thundering herd on multi-instance deployments
 */
export const socket: Socket = io(env.SOCKET_URL || undefined, {
  withCredentials: true,
  autoConnect: false,

  // Reconnection configuration
  reconnection: true, // Enable automatic reconnection
  reconnectionAttempts: 10, // Max 10 attempts before giving up
  reconnectionDelay: 1000, // Start with 1s delay
  reconnectionDelayMax: 10000, // Max 10s between attempts
  randomizationFactor: 0.5, // Add ±50% jitter to prevent thundering herd

  // Connection timeout
  timeout: 20000, // 20s timeout for initial connection

  // Transport options (prefer WebSocket, fallback to polling)
  transports: ['websocket', 'polling'],
});
