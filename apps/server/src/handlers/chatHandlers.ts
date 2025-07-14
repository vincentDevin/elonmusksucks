// apps/server/src/handlers/chatHandlers.ts

import { Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import { createMessage, getRecentMessages } from '../services/message.service';
import type { MessageWithUser } from '../repositories/IMessageRepository';
import { UserService } from '../services/user.service';
import redisClient from '../lib/redis';

const GLOBAL_CHAT_ROOM = 'global';
const GLOBAL_ROOM_ID = 1;

// Redis keys for online tracking
const ONLINE_USERS_SET_KEY = 'global:chat:onlineUsers'; // Set of user IDs (strings)
const USER_INFO_HASH_KEY = 'global:chat:userInfo'; // Hash: { [userId]: {name, avatarUrl, role} }

// In-memory for per-process (not global, just for rate-limiting typing)
const typingUsers = new Set<number>();
const typingTimeouts = new Map<number, NodeJS.Timeout>();

export type ChatMessageDTO = {
  id: number;
  user: {
    id: number;
    name: string | null;
    avatarUrl: string | null;
    role: string;
  };
  message: string;
  timestamp: string;
};

const userService = new UserService();

export async function registerChatHandlers(socket: Socket) {
  const authSocket = socket as AuthenticatedSocket;
  socket.join(GLOBAL_CHAT_ROOM);

  // 1. Only add to Redis sets/hashes if authenticated user
  if (authSocket.user) {
    const userId = String(authSocket.user.id);

    // Add user ID to Redis set
    await redisClient.sadd(ONLINE_USERS_SET_KEY, userId);

    // Add/update user info in Redis hash
    await redisClient.hset(
      USER_INFO_HASH_KEY,
      userId,
      JSON.stringify({
        name: authSocket.user.name,
        avatarUrl: authSocket.user.avatarUrl ?? null,
        role: authSocket.user.role ?? 'USER',
      }),
    );

    // Publish new online users list (for all)
    await publishOnlineUsers();

    // Still publish userJoined for UX (optional)
    await redisClient.publish(
      'chat:userJoined',
      JSON.stringify({
        id: authSocket.user.id,
        name: authSocket.user.name,
        avatarUrl: authSocket.user.avatarUrl ?? null,
        role: authSocket.user.role ?? 'USER',
      }),
    );
  } else {
    // Guests: do NOT add to online set/hash, but send current online count
    await publishOnlineUsers();
  }

  // --- 2. Send Chat History ---
  socket.on('chat:history', async () => {
    try {
      const history: MessageWithUser[] = await getRecentMessages(GLOBAL_ROOM_ID, 50);
      const messages: ChatMessageDTO[] = await Promise.all(
        history.map(async (msg) => {
          let avatarUrl: string | null = null;
          if (msg.user?.profilePictureKey) {
            try {
              avatarUrl = await userService.getCachedProfileImageUrl(
                msg.userId,
                msg.user.profilePictureKey,
                3600,
              );
            } catch {
              avatarUrl = null;
            }
          } else if (msg.user?.avatarUrl) {
            avatarUrl = msg.user.avatarUrl;
          }
          return {
            id: msg.id,
            user: {
              id: msg.userId,
              name: msg.user?.name ?? `User ${msg.userId}`,
              avatarUrl,
              role: msg.user?.role ?? 'USER',
            },
            message: msg.content,
            timestamp:
              msg.timestamp instanceof Date ? msg.timestamp.toISOString() : `${msg.timestamp}`,
          };
        }),
      );
      socket.emit('chat:history', messages);
    } catch (err) {
      console.error('[chat] Failed to fetch history:', err);
      socket.emit('chat:error', { message: 'Failed to fetch chat history' });
    }
  });

  // --- 3. Handle Sending New Messages ---
  socket.on('chat:sendMessage', async (payload: { message: string }) => {
    try {
      if (!authSocket.user) {
        socket.emit('chat:error', { message: 'You must be logged in to send messages.' });
        return;
      }
      if (
        !payload.message ||
        typeof payload.message !== 'string' ||
        payload.message.length > 1000
      ) {
        socket.emit('chat:error', { message: 'Invalid message' });
        return;
      }
      const saved = await createMessage(authSocket.user.id, GLOBAL_ROOM_ID, payload.message);
      const chatMsg: ChatMessageDTO = {
        id: saved.id,
        user: {
          id: authSocket.user.id,
          name: authSocket.user.name ?? `User ${authSocket.user.id}`,
          avatarUrl: authSocket.user.avatarUrl ?? null,
          role: authSocket.user.role ?? 'USER',
        },
        message: saved.content,
        timestamp:
          saved.timestamp instanceof Date ? saved.timestamp.toISOString() : `${saved.timestamp}`,
      };

      // ONLY publish to Redis. NO direct emit!
      await redisClient.publish('chat:newMessage', JSON.stringify(chatMsg));

      // Remove typing state for this user when message sent (emit via Redis)
      typingUsers.delete(authSocket.user.id);
      await redisClient.publish('chat:stopTyping', JSON.stringify({ id: authSocket.user.id }));
    } catch (err) {
      console.error('[chat] Error sending message:', err);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  // --- 4. Typing Indicator ---
  socket.on('chat:typing', () => {
    if (!authSocket.user) return;
    const userId = authSocket.user.id;
    const userName = authSocket.user.name;

    // Only broadcast typing if new
    if (!typingUsers.has(userId)) {
      typingUsers.add(userId);
      redisClient.publish('chat:typing', JSON.stringify({ id: userId, name: userName }));
    }

    // Debounce: Reset timer for this user
    if (typingTimeouts.has(userId)) {
      clearTimeout(typingTimeouts.get(userId));
    }
    const timeout = setTimeout(() => {
      typingUsers.delete(userId);
      redisClient.publish('chat:stopTyping', JSON.stringify({ id: userId }));
      typingTimeouts.delete(userId);
    }, 4000);
    typingTimeouts.set(userId, timeout);
  });

  socket.on('chat:stopTyping', () => {
    if (!authSocket.user) return;
    const userId = authSocket.user.id;
    if (typingUsers.has(userId)) {
      typingUsers.delete(userId);
      redisClient.publish('chat:stopTyping', JSON.stringify({ id: userId }));
      if (typingTimeouts.has(userId)) {
        clearTimeout(typingTimeouts.get(userId));
        typingTimeouts.delete(userId);
      }
    }
  });

  // --- 5. User Left Notification ---
  socket.on('disconnect', async () => {
    if (authSocket.user) {
      const userId = String(authSocket.user.id);

      // 1. Remove from online set and hash
      await redisClient.srem(ONLINE_USERS_SET_KEY, userId);
      await redisClient.hdel(USER_INFO_HASH_KEY, userId);

      // 2. Publish new online users list (for all)
      await publishOnlineUsers();

      // 3. Publish user left (for notification UX)
      await redisClient.publish(
        'chat:userLeft',
        JSON.stringify({
          id: authSocket.user.id,
          name: authSocket.user.name,
        }),
      );

      typingUsers.delete(authSocket.user.id);
      if (typingTimeouts.has(authSocket.user.id)) {
        clearTimeout(typingTimeouts.get(authSocket.user.id));
        typingTimeouts.delete(authSocket.user.id);
      }
      redisClient.publish('chat:stopTyping', JSON.stringify({ id: authSocket.user.id }));
    }
  });
}

// --- Helper: publish all online users to all sockets ---
async function publishOnlineUsers() {
  const ids: string[] = await redisClient.smembers(ONLINE_USERS_SET_KEY);
  const userInfoArr: (string | null)[] = ids.length
    ? await redisClient.hmget(USER_INFO_HASH_KEY, ...ids)
    : [];
  const usersParsed = ids.map((id, idx) => {
    const info = userInfoArr[idx] ? JSON.parse(userInfoArr[idx]!) : {};
    return {
      id: Number(id),
      name: info.name ?? `User ${id}`,
      avatarUrl: info.avatarUrl ?? null,
      role: info.role ?? 'USER',
    };
  });
  await redisClient.publish('chat:usersOnline', JSON.stringify(usersParsed));
}
