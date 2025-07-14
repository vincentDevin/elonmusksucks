// apps/server/src/middleware/socketAuthMiddleware.ts
import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwtHelpers';
import { UserService } from '../services/user.service';

export interface SocketUser {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser; // Will be undefined for guests
}

const userService = new UserService();

export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (typeof socket.handshake.query.token === 'string' ? socket.handshake.query.token : undefined);

    // Allow guests (read-only)
    if (!token) {
      // Don't assign .user -- leave as guest
      return next();
    }

    let userId: number;
    try {
      const verified = verifyAccessToken(token);
      userId = verified.userId;
    } catch (err) {
      // Invalid token = treat as guest
      return next();
    }

    const user = await userService.getPublicSocketUser(userId);
    if (!user) return next();

    (socket as AuthenticatedSocket).user = user;
    next();
  } catch (e) {
    console.log('[socketAuth] Exception, treating as guest:', e);
    return next();
  }
}
