// apps/client/src/lib/socketRequest.ts
// -----------------------------------------------------------------------------
// Helper to emit a socket.io command with ACK semantics and a timeout.
// Usage:
//   const data = await socketRequest<{ myData: string }>('bet:place', payload);
// If the server-side ACK passes an error string, it throws.
// -----------------------------------------------------------------------------

import { socket } from './socket';

/**
 * Emit a socket event that expects an ACK function `(err, data)`.
 * @param event   socket.io event name (present‑tense command, e.g. "bet:place")
 * @param payload arbitrary payload sent to server
 * @param timeout ms before rejecting with SOCKET_TIMEOUT (default 5000)
 */
export function socketRequest<T = unknown>(
  event: string,
  payload: any,
  timeout = 5000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SOCKET_TIMEOUT')), timeout);

    socket.emit(event, payload, (err: string | null, data?: T) => {
      clearTimeout(timer);
      if (err) return reject(new Error(err));
      resolve(data as T);
    });
  });
}
