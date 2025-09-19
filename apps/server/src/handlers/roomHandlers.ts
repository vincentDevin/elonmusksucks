import { Server, Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';

/**
 * Room authorization patterns and their access rules
 */
const ROOM_PATTERNS = {
  // Public rooms - accessible to all authenticated users
  PUBLIC: [
    'predictions',
    'betting',
    'leaderboard',
    'achievements',
    'chat',
    'timeline',
    'leaderboard:daily',
    'leaderboard:allTime',
    'stats:global',
    'pong:lobby',
    'pong:matches',
  ],

  // User-specific rooms - only accessible by the specific user
  USER_SPECIFIC: /^user:(\d+)$/,
  USER_STATS: /^stats:user:(\d+)$/,
  USER_ACTIVITY: /^activity:user:(\d+)$/,
  PONG_USER: /^pong:user:(\d+)$/,

  // Admin-only rooms - only accessible by admin users
  ADMIN: ['admin', 'admin:metrics', 'admin:moderation', 'admin:feeds', 'admin:events'],

  // Game-specific rooms (require additional validation)
  PONG_GAME: /^pong:game:([a-zA-Z0-9]+)$/,
  PREDICTION_GAME: /^prediction:(\d+)$/,
  CHAT_ROOM: /^chat:room:([a-zA-Z0-9]+)$/,
} as const;

/**
 * Authorizes room access based on user permissions and room type
 */
function authorizeRoomAccess(
  socket: AuthenticatedSocket,
  roomName: string,
): {
  authorized: boolean;
  reason?: string;
} {
  const user = socket.user;

  // Require authentication for all rooms
  if (!user?.id) {
    return {
      authorized: false,
      reason: 'Authentication required',
    };
  }

  // Check public rooms first
  if (ROOM_PATTERNS.PUBLIC.includes(roomName as any)) {
    return { authorized: true };
  }

  // Check admin rooms
  if (ROOM_PATTERNS.ADMIN.includes(roomName as any)) {
    if (user.role !== 'ADMIN') {
      return {
        authorized: false,
        reason: 'Admin access required',
      };
    }
    return { authorized: true };
  }

  // Check user-specific rooms
  const userMatch = roomName.match(ROOM_PATTERNS.USER_SPECIFIC);
  if (userMatch) {
    const requestedUserId = parseInt(userMatch[1], 10);
    if (requestedUserId !== user.id && user.role !== 'ADMIN') {
      return {
        authorized: false,
        reason: "Cannot access another user's private room",
      };
    }
    return { authorized: true };
  }

  // Check user stats rooms
  const userStatsMatch = roomName.match(ROOM_PATTERNS.USER_STATS);
  if (userStatsMatch) {
    const requestedUserId = parseInt(userStatsMatch[1], 10);
    if (requestedUserId !== user.id && user.role !== 'ADMIN') {
      return {
        authorized: false,
        reason: "Cannot access another user's stats",
      };
    }
    return { authorized: true };
  }

  // Check user activity rooms
  const userActivityMatch = roomName.match(ROOM_PATTERNS.USER_ACTIVITY);
  if (userActivityMatch) {
    const requestedUserId = parseInt(userActivityMatch[1], 10);
    if (requestedUserId !== user.id && user.role !== 'ADMIN') {
      return {
        authorized: false,
        reason: "Cannot access another user's activity",
      };
    }
    return { authorized: true };
  }

  // Check Pong user rooms
  const pongUserMatch = roomName.match(ROOM_PATTERNS.PONG_USER);
  if (pongUserMatch) {
    const requestedUserId = parseInt(pongUserMatch[1], 10);
    if (requestedUserId !== user.id && user.role !== 'ADMIN') {
      return {
        authorized: false,
        reason: "Cannot access another user's Pong data",
      };
    }
    return { authorized: true };
  }

  // Check Pong game rooms (require game validation)
  const pongGameMatch = roomName.match(ROOM_PATTERNS.PONG_GAME);
  if (pongGameMatch) {
    // Allow any authenticated user to spectate games
    return { authorized: true };
  }

  // Check prediction-specific rooms
  const predictionMatch = roomName.match(ROOM_PATTERNS.PREDICTION_GAME);
  if (predictionMatch) {
    // Allow any authenticated user to join prediction rooms
    return { authorized: true };
  }

  // Check chat room access
  const chatRoomMatch = roomName.match(ROOM_PATTERNS.CHAT_ROOM);
  if (chatRoomMatch) {
    // Allow any authenticated user to join chat rooms
    return { authorized: true };
  }

  // Deny access to unrecognized room patterns
  return {
    authorized: false,
    reason: `Unknown room pattern: ${roomName}`,
  };
}

/**
 * Validates room name format and prevents injection attacks
 */
function validateRoomName(roomName: string): {
  valid: boolean;
  reason?: string;
} {
  if (!roomName || typeof roomName !== 'string') {
    return {
      valid: false,
      reason: 'Room name must be a non-empty string',
    };
  }

  if (roomName.length > 100) {
    return {
      valid: false,
      reason: 'Room name too long (max 100 characters)',
    };
  }

  const validPattern = /^[a-zA-Z0-9:._-]+$/;
  if (!validPattern.test(roomName)) {
    return {
      valid: false,
      reason: 'Room name contains invalid characters',
    };
  }

  const reservedNames = ['__proto__', 'constructor', 'prototype'];
  if (reservedNames.includes(roomName.toLowerCase())) {
    return {
      valid: false,
      reason: 'Room name is reserved',
    };
  }

  return { valid: true };
}

export function registerRoomHandlers(_io: Server, socket: Socket) {
  const authSocket = socket as AuthenticatedSocket;

  // Handle both 'join' and 'joinRoom' events for compatibility
  const handleJoinRoom = (room: string, callback?: (response: any) => void) => {
    const validation = validateRoomName(room);
    if (!validation.valid) {
      const error = `Room validation failed: ${validation.reason}`;
      console.warn(`[room-auth] ${error} - socket: ${socket.id}, room: ${room}`);
      callback?.({ success: false, error: validation.reason });
      return;
    }

    const authorization = authorizeRoomAccess(authSocket, room);
    if (!authorization.authorized) {
      const error = `Room access denied: ${authorization.reason}`;
      console.warn(
        `[room-auth] ${error} - socket: ${socket.id}, room: ${room}, user: ${authSocket.user?.id}`,
      );
      callback?.({ success: false, error: authorization.reason });
      return;
    }

    socket.join(room);
    console.log(
      `[room-auth] User ${authSocket.user?.id} joined room: ${room} - socket: ${socket.id}`,
    );
    callback?.({ success: true, room });
  };

  const handleLeaveRoom = (room: string, callback?: (response: any) => void) => {
    socket.leave(room);
    console.log(
      `[room-auth] User ${authSocket.user?.id} left room: ${room} - socket: ${socket.id}`,
    );
    callback?.({ success: true, room });
  };

  // Support both event names for backward compatibility
  socket.on('join', handleJoinRoom);
  socket.on('joinRoom', handleJoinRoom);
  socket.on('leave', handleLeaveRoom);
  socket.on('leaveRoom', handleLeaveRoom);

  // Debug endpoint for development
  socket.on('rooms', (callback?: (rooms: string[]) => void) => {
    if (process.env.NODE_ENV === 'development') {
      const rooms = Array.from(socket.rooms);
      console.log(`[room-debug] Socket ${socket.id} is in rooms:`, rooms);
      callback?.(rooms);
    }
  });
}
