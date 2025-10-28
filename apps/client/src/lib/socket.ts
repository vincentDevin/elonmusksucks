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

/**
 * Keep-alive heartbeat mechanism
 *
 * CRITICAL: Prevents server from disconnecting idle users
 * - Server tracks activity via socket.onAny() and ping/pong events
 * - This provides redundancy in case Socket.IO internals change
 * - Sends lightweight heartbeat every 4 minutes (well under 15min timeout)
 */
let heartbeatInterval: NodeJS.Timeout | null = null;
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

/**
 * Start sending periodic heartbeat events to server
 * Called by AuthContext when user connects
 */
export function startHeartbeat(sock: Socket = socket): void {
  // Clear any existing interval
  stopHeartbeat();

  // Only start if socket is connected
  if (!sock.connected) {
    console.log('[socket] Skipping heartbeat - socket not connected');
    return;
  }

  console.log('[socket] Starting keep-alive heartbeat (every 4 minutes)');

  // Send initial heartbeat immediately
  sock.emit('heartbeat', { timestamp: Date.now() });

  // Set up periodic heartbeat
  heartbeatInterval = setInterval(() => {
    if (sock.connected) {
      sock.emit('heartbeat', { timestamp: Date.now() });
      console.log('[socket] Heartbeat sent');
    } else {
      console.log('[socket] Skipping heartbeat - socket disconnected');
      stopHeartbeat();
    }
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * Stop sending heartbeat events
 * Called by AuthContext when user disconnects
 */
export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[socket] Keep-alive heartbeat stopped');
  }
}
