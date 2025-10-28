// apps/server/src/handlers/chatHandlers.ts
// -----------------------------------------------------------------------------
// Socket → Redis command handlers for chat domain
// Channel naming rules:
//   • Commands (client → server)  : present‑tense `chat:<action>`
//   • Redis channel published     : same as command
//   • Broadcasts (server → client): camelCase, handled in redisChatEventHandlers.ts
// -----------------------------------------------------------------------------

import { Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import { createMessage, getRecentMessages } from '../services/message.service';
import type { MessageWithUser } from '../repositories/interfaces/IMessageRepository';
import { UserService } from '../services/user.service';
import redisClient from '../lib/redis';
import { socketCleanupManager } from '../lib/SocketCleanupManager';
import { chatRateLimiter, createRateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import {
  InputSizeLimits,
  REDIS_CHANNELS,
  SOCKET_EVENTS,
  SOCKET_ROOMS,
  CHAT_REDIS_KEYS,
  CHAT_CONSTANTS,
  type ChatMessageDTO,
  type ChatMessageSendRequest,
  type ChatHistoryResponse,
  type ChatErrorResponse,
  type ChatJoinPayload,
  type ChatLeavePayload,
  type ChatTypingPayload,
  type ChatStopTypingPayload,
  type ChatUsersOnlinePayload,
} from '@ems/types';
import { eventBus } from '../lib/EventBus';
import { CACHE_TTL } from '../lib/cacheTTL';

// Per‑process typing debounce maps
const typingUsers = new Set<number>();
const typingTimeout = new Map<number, NodeJS.Timeout>();
let typingSweepInitialized = false;
const PRESENCE_HEARTBEAT_INTERVAL_MS = CACHE_TTL.USER_ONLINE_STATUS * 1000;
let presenceHeartbeatInitialized = false;

const userService = new UserService();

export async function registerChatHandlers(socket: Socket) {
  const authSock = socket as AuthenticatedSocket;
  socket.join(SOCKET_ROOMS.CHAT_GLOBAL);

  ensureTypingSweep();
  ensurePresenceHeartbeat();

  // Track listeners for memory leak prevention
  let listenerCount = 0;

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Presence handling (join)
  // ────────────────────────────────────────────────────────────────────────────
  if (authSock.user) {
    const uid = String(authSock.user.id);
    const after = await redisClient.incr(CHAT_REDIS_KEYS.CONNECTIONS_PREFIX + uid);
    if (after === 1) {
      await redisClient.sadd(CHAT_REDIS_KEYS.ONLINE_USERS_SET, uid);
      await redisClient.hset(
        CHAT_REDIS_KEYS.USER_INFO_HASH,
        uid,
        JSON.stringify({
          name: authSock.user.name,
          avatarUrl: authSock.user.avatarUrl ?? null,
          role: authSock.user.role ?? 'USER',
        }),
      );
    }
    await publishOnlineUsers(uid);

    const joinPayload: ChatJoinPayload = {
      id: authSock.user.id,
      name: authSock.user.name,
      avatarUrl: authSock.user.avatarUrl ?? null,
      role: authSock.user.role ?? 'USER',
    };
    await eventBus.publish(REDIS_CHANNELS.CHAT_JOIN, joinPayload);
  } else {
    await publishOnlineUsers(); // guest connects
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. History request (no Redis needed)
  // ────────────────────────────────────────────────────────────────────────────
  const historyHandler = async () => {
    console.log(
      `[chat] History request received from socket ${socket.id} (user: ${authSock.user?.id})`,
    );
    try {
      const history: MessageWithUser[] = await getRecentMessages(CHAT_CONSTANTS.GLOBAL_ROOM_ID, 50);
      console.log(`[chat] Retrieved ${history.length} messages from database`);

      // Extract unique users from message history
      const uniqueUsers = new Map<
        number,
        { id: number; profilePictureKey: string | null; avatarUrl: string | null }
      >();
      for (const msg of history) {
        if (!uniqueUsers.has(msg.userId) && msg.user) {
          uniqueUsers.set(msg.userId, {
            id: msg.userId,
            profilePictureKey: msg.user.profilePictureKey,
            avatarUrl: msg.user.avatarUrl,
          });
        }
      }

      // Batch fetch avatar URLs (single MGET + parallel S3 calls)
      const avatarUrlMap = await userService.getBatchedAvatarUrls(Array.from(uniqueUsers.values()));

      // Map avatar URLs back to messages
      const messages: ChatHistoryResponse = history.map((msg) => ({
        id: msg.id,
        user: {
          id: msg.userId,
          name: msg.user?.name ?? `User ${msg.userId}`,
          avatarUrl: avatarUrlMap.get(msg.userId) || null,
          role: msg.user?.role ?? 'USER',
        },
        message: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : `${msg.timestamp}`,
      }));

      console.log(
        `[chat] Sending ${messages.length} messages to socket ${socket.id} via event: ${SOCKET_EVENTS.CHAT_HISTORY_RESPONSE}`,
      );
      socket.emit(SOCKET_EVENTS.CHAT_HISTORY_RESPONSE, messages);
    } catch (err) {
      console.error('[chat] Failed to fetch history:', err);
      const errorResponse: ChatErrorResponse = { message: 'Failed to fetch chat history' };
      socket.emit(SOCKET_EVENTS.CHAT_ERROR_RESPONSE, errorResponse);
    }
  };
  console.log(
    `[chat] Registering history handler on event: ${SOCKET_EVENTS.CHAT_HISTORY_REQUEST} for socket ${socket.id}`,
  );
  socket.on(SOCKET_EVENTS.CHAT_HISTORY_REQUEST, historyHandler);
  socketCleanupManager.registerHandler(
    socket.id,
    SOCKET_EVENTS.CHAT_HISTORY_REQUEST,
    historyHandler,
  );
  listenerCount++;

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Send message → publish `chat:message`
  // ────────────────────────────────────────────────────────────────────────────
  const messageHandler = async (payload: ChatMessageSendRequest) => {
    try {
      if (!authSock.user) {
        const errorResponse: ChatErrorResponse = { message: 'NOT_AUTHENTICATED' };
        return socket.emit(SOCKET_EVENTS.CHAT_ERROR_RESPONSE, errorResponse);
      }

      // Apply rate limiting
      const rateLimitCheck = createRateLimitMiddleware(chatRateLimiter, 'chat:message');
      await new Promise<void>((resolve, reject) => {
        rateLimitCheck(authSock.user!.id, (error?: string) => {
          if (error) {
            console.warn(`[chat] Rate limit exceeded for user ${authSock.user!.id}: ${error}`);
            const errorResponse: ChatErrorResponse = { message: error };
            socket.emit(SOCKET_EVENTS.CHAT_ERROR_RESPONSE, errorResponse);
            reject(new Error(error));
          } else {
            resolve();
          }
        });
      });

      if (!payload.message || typeof payload.message !== 'string') {
        const errorResponse: ChatErrorResponse = { message: 'INVALID_MESSAGE' };
        return socket.emit(SOCKET_EVENTS.CHAT_ERROR_RESPONSE, errorResponse);
      }

      // Input size validation
      if (payload.message.length > InputSizeLimits.ChatMessage) {
        console.warn(
          `[input-caps] Chat message rejected: ${payload.message.length} chars (limit: ${InputSizeLimits.ChatMessage})`,
        );
        const errorResponse: ChatErrorResponse = {
          message: 'MESSAGE_TOO_LONG',
          limit: InputSizeLimits.ChatMessage,
          actual: payload.message.length,
        };
        return socket.emit(SOCKET_EVENTS.CHAT_ERROR_RESPONSE, errorResponse);
      }

      const saved = await createMessage(
        authSock.user.id,
        CHAT_CONSTANTS.GLOBAL_ROOM_ID,
        payload.message,
      );
      const chatMsg: ChatMessageDTO = {
        id: saved.id,
        user: {
          id: authSock.user.id,
          name: authSock.user.name ?? `User ${authSock.user.id}`,
          avatarUrl: authSock.user.avatarUrl ?? null,
          role: authSock.user.role ?? 'USER',
        },
        message: saved.content,
        timestamp:
          saved.timestamp instanceof Date ? saved.timestamp.toISOString() : `${saved.timestamp}`,
      };

      await eventBus.publish(REDIS_CHANNELS.CHAT_MESSAGE, chatMsg);

      // clear typing state
      typingUsers.delete(authSock.user.id);
      if (typingTimeout.has(authSock.user.id)) {
        clearTimeout(typingTimeout.get(authSock.user.id));
        typingTimeout.delete(authSock.user.id);
      }
      await clearUserTyping(authSock.user.id);
      const stopTypingPayload: ChatStopTypingPayload = { id: authSock.user.id };
      await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, stopTypingPayload);
    } catch (err) {
      console.error('[chat] send error:', err);
      const errorResponse: ChatErrorResponse = { message: 'SEND_FAILED' };
      socket.emit(SOCKET_EVENTS.CHAT_ERROR_RESPONSE, errorResponse);
    }
  };
  socket.on(SOCKET_EVENTS.CHAT_MESSAGE_SEND, messageHandler);
  socketCleanupManager.registerHandler(socket.id, SOCKET_EVENTS.CHAT_MESSAGE_SEND, messageHandler);
  listenerCount++;

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Typing indicators
  // ────────────────────────────────────────────────────────────────────────────
  const typingHandler = async () => {
    if (!authSock.user) return;
    const uid = authSock.user.id;

    await markUserTyping(uid);

    if (!typingUsers.has(uid)) {
      typingUsers.add(uid);
      const typingPayload: ChatTypingPayload = { id: uid, name: authSock.user.name };
      await eventBus.publish(REDIS_CHANNELS.CHAT_TYPING, typingPayload);

      // Publish JSON rule achievement event for typing start
      try {
        await eventBus.publish(REDIS_CHANNELS.CHAT_TYPING_START, {
          key: 'chat:typing:start',
          userId: uid,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `chat:typing:${uid}:${Date.now()}`,
          payload: {
            roomId: CHAT_CONSTANTS.GLOBAL_ROOM_ID,
          },
        });
      } catch (achievementError) {
        console.error('[chat] Error publishing typing achievement event:', achievementError);
      }
    }

    if (typingTimeout.has(uid)) clearTimeout(typingTimeout.get(uid));

    const t = setTimeout(() => {
      void (async () => {
        typingUsers.delete(uid);
        typingTimeout.delete(uid);
        await clearUserTyping(uid);
        const stopTypingPayload: ChatStopTypingPayload = { id: uid };
        await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, stopTypingPayload);

        // Publish JSON rule achievement event for typing stop
        try {
          await eventBus.publish(REDIS_CHANNELS.CHAT_TYPING_STOP, {
            key: 'chat:typing:stop',
            userId: uid,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `chat:typing:stop:${uid}:${Date.now()}`,
            payload: {
              roomId: CHAT_CONSTANTS.GLOBAL_ROOM_ID,
            },
          });
        } catch (achievementError) {
          console.error('[chat] Error publishing typing stop achievement event:', achievementError);
        }
      })();
    }, CHAT_CONSTANTS.TYPING_TTL_MS);

    typingTimeout.set(uid, t);
  };
  socket.on(SOCKET_EVENTS.CHAT_TYPING_SEND, typingHandler);
  socketCleanupManager.registerHandler(socket.id, SOCKET_EVENTS.CHAT_TYPING_SEND, typingHandler);
  listenerCount++;

  const stopTypingHandler = async () => {
    if (!authSock.user) return;
    const uid = authSock.user.id;
    if (typingUsers.has(uid)) {
      typingUsers.delete(uid);
      await clearUserTyping(uid);
      const stopTypingPayload: ChatStopTypingPayload = { id: uid };
      await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, stopTypingPayload);
      if (typingTimeout.has(uid)) {
        clearTimeout(typingTimeout.get(uid));
        typingTimeout.delete(uid);
      }

      // Publish JSON rule achievement event for explicit typing stop
      try {
        await eventBus.publish(REDIS_CHANNELS.CHAT_TYPING_STOP, {
          key: 'chat:typing:stop',
          userId: uid,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `chat:typing:stop:${uid}:${Date.now()}`,
          payload: {
            roomId: CHAT_CONSTANTS.GLOBAL_ROOM_ID,
            explicit: true, // User explicitly stopped typing vs timeout
          },
        });
      } catch (achievementError) {
        console.error(
          '[chat] Error publishing explicit typing stop achievement event:',
          achievementError,
        );
      }
    }
  };
  socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING_SEND, stopTypingHandler);
  socketCleanupManager.registerHandler(
    socket.id,
    SOCKET_EVENTS.CHAT_STOP_TYPING_SEND,
    stopTypingHandler,
  );
  listenerCount++;

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Disconnect → leave logic
  // ────────────────────────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
    if (!authSock.user) return;
    const uidStr = String(authSock.user.id);
    const after = await redisClient.decr(CHAT_REDIS_KEYS.CONNECTIONS_PREFIX + uidStr);
    if (after <= 0) {
      await redisClient.del(CHAT_REDIS_KEYS.CONNECTIONS_PREFIX + uidStr);
      await redisClient.srem(CHAT_REDIS_KEYS.ONLINE_USERS_SET, uidStr);
      await redisClient.hdel(CHAT_REDIS_KEYS.USER_INFO_HASH, uidStr);
    }

    await publishOnlineUsers();

    const leavePayload: ChatLeavePayload = {
      id: authSock.user.id,
      name: authSock.user.name,
    };
    await eventBus.publish(REDIS_CHANNELS.CHAT_LEAVE, leavePayload);

    typingUsers.delete(authSock.user.id);
    if (typingTimeout.has(authSock.user.id)) {
      clearTimeout(typingTimeout.get(authSock.user.id));
      typingTimeout.delete(authSock.user.id);
    }
    await clearUserTyping(authSock.user.id);
    const disconnectStopTypingPayload: ChatStopTypingPayload = { id: authSock.user.id };
    await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, disconnectStopTypingPayload);
  });

  // Log total registered listeners for monitoring
  console.log(
    `[chat] Registered ${listenerCount} listeners for socket ${socket.id} (heap monitoring)`,
  );
}

// Helper: broadcast current online list via Redis
// Exported for use in socket cleanup (apps/server/src/socket.ts)
export async function publishOnlineUsers(connectionUserId?: string) {
  const ids = await redisClient.smembers(CHAT_REDIS_KEYS.ONLINE_USERS_SET);
  const infoArr = ids.length ? await redisClient.hmget(CHAT_REDIS_KEYS.USER_INFO_HASH, ...ids) : [];
  const onlineUsers: ChatUsersOnlinePayload = ids.map((id, i) => {
    const info = infoArr[i] ? JSON.parse(infoArr[i]!) : {};
    return {
      id: Number(id),
      name: info.name ?? `User ${id}`,
      avatarUrl: info.avatarUrl ?? null,
      role: info.role ?? 'USER',
    };
  });
  await refreshPresenceTTL(connectionUserId, ids);
  await eventBus.publish(REDIS_CHANNELS.CHAT_USERS_ONLINE, onlineUsers);
}

async function refreshPresenceTTL(connectionUserId?: string, allConnectionIds: string[] = []) {
  const ttlMs = CACHE_TTL.CHAT_PRESENCE * 1000;
  const tasks: Array<Promise<unknown>> = [
    redisClient.pexpire(CHAT_REDIS_KEYS.ONLINE_USERS_SET, ttlMs),
    redisClient.pexpire(CHAT_REDIS_KEYS.USER_INFO_HASH, ttlMs),
  ];

  const idsToRefresh = new Set<string>();
  if (connectionUserId) {
    idsToRefresh.add(connectionUserId);
  }
  for (const id of allConnectionIds) {
    if (id) idsToRefresh.add(id);
  }

  for (const id of idsToRefresh) {
    tasks.push(redisClient.pexpire(CHAT_REDIS_KEYS.CONNECTIONS_PREFIX + id, ttlMs));
  }

  await Promise.all(tasks);
}

async function markUserTyping(userId: number) {
  await redisClient.zadd(
    CHAT_REDIS_KEYS.TYPING_STATE,
    Date.now() + CHAT_CONSTANTS.TYPING_TTL_MS,
    String(userId),
  );
}

async function clearUserTyping(userId: number) {
  await redisClient.zrem(CHAT_REDIS_KEYS.TYPING_STATE, String(userId));
}

function ensureTypingSweep() {
  if (typingSweepInitialized) return;
  typingSweepInitialized = true;

  setInterval(() => {
    sweepExpiredTypingStates().catch((err) =>
      console.error('[chat] Failed to sweep typing state:', err),
    );
  }, CHAT_CONSTANTS.TYPING_SWEEP_INTERVAL_MS);
}

function ensurePresenceHeartbeat() {
  if (presenceHeartbeatInitialized) return;
  presenceHeartbeatInitialized = true;

  const runHeartbeat = () => {
    refreshAllPresenceTTLs().catch((err) =>
      console.error('[chat] Failed to refresh presence TTL:', err),
    );
  };

  runHeartbeat();
  setInterval(runHeartbeat, PRESENCE_HEARTBEAT_INTERVAL_MS);
}

async function refreshAllPresenceTTLs() {
  const ids = await redisClient.smembers(CHAT_REDIS_KEYS.ONLINE_USERS_SET);
  if (!ids.length) {
    await refreshPresenceTTL();
    return;
  }

  await refreshPresenceTTL(undefined, ids);
}

async function sweepExpiredTypingStates() {
  const now = Date.now();

  while (true) {
    const entry = (await redisClient.zpopmin(CHAT_REDIS_KEYS.TYPING_STATE)) as
      | [string, string]
      | [];
    if (!entry || entry.length === 0) {
      break;
    }

    const [member, scoreStr] = entry;
    const score = Number(scoreStr);

    if (!member) {
      continue;
    }

    if (Number.isNaN(score) || score > now) {
      // Not yet expired – reinsert and exit loop until next sweep
      if (!Number.isNaN(score)) {
        await redisClient.zadd(CHAT_REDIS_KEYS.TYPING_STATE, score, member);
      }
      break;
    }

    const expiredStopTypingPayload: ChatStopTypingPayload = { id: Number(member), expired: true };
    await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, expiredStopTypingPayload);
  }
}
