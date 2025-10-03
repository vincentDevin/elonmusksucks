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
import { InputSizeLimits, REDIS_CHANNELS } from '@ems/types';
import { eventBus } from '../lib/EventBus';
import { CACHE_TTL } from '../lib/cacheTTL';

const GLOBAL_CHAT_ROOM = 'global';
const GLOBAL_ROOM_ID = 1;

// Redis keys for online tracking
const ONLINE_USERS_SET_KEY = 'global:chat:onlineUsers';
const CONNECTIONS = 'global:chat:connections';
const USER_INFO_HASH_KEY = 'global:chat:userInfo';

// Per‑process typing debounce maps
const typingUsers = new Set<number>();
const typingTimeout = new Map<number, NodeJS.Timeout>();
const TYPING_STATE_KEY = 'global:chat:typingUsers';
const TYPING_TTL_MS = 4000;
const TYPING_SWEEP_INTERVAL_MS = 2000;
let typingSweepInitialized = false;
const PRESENCE_HEARTBEAT_INTERVAL_MS = CACHE_TTL.USER_ONLINE_STATUS * 1000;
let presenceHeartbeatInitialized = false;

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
  const authSock = socket as AuthenticatedSocket;
  socket.join(GLOBAL_CHAT_ROOM);

  ensureTypingSweep();
  ensurePresenceHeartbeat();

  // Track listeners for memory leak prevention
  let listenerCount = 0;

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Presence handling (join)
  // ────────────────────────────────────────────────────────────────────────────
  if (authSock.user) {
    const uid = String(authSock.user.id);
    const after = await redisClient.incr(CONNECTIONS + uid);
    if (after === 1) {
      await redisClient.sadd(ONLINE_USERS_SET_KEY, uid);
      await redisClient.hset(
        USER_INFO_HASH_KEY,
        uid,
        JSON.stringify({
          name: authSock.user.name,
          avatarUrl: authSock.user.avatarUrl ?? null,
          role: authSock.user.role ?? 'USER',
        }),
      );
    }
    await publishOnlineUsers(uid);

    await eventBus.publish(REDIS_CHANNELS.CHAT_JOIN, {
      id: authSock.user.id,
      name: authSock.user.name,
      avatarUrl: authSock.user.avatarUrl ?? null,
      role: authSock.user.role ?? 'USER',
    });
  } else {
    await publishOnlineUsers(); // guest connects
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. History request (no Redis needed)
  // ────────────────────────────────────────────────────────────────────────────
  const historyHandler = async () => {
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
              /* ignore */
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
  };
  socket.on('chat:history', historyHandler);
  socketCleanupManager.registerHandler(socket.id, 'chat:history', historyHandler);
  listenerCount++;

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Send message → publish `chat:message`
  // ────────────────────────────────────────────────────────────────────────────
  const messageHandler = async (payload: { message: string }) => {
    try {
      if (!authSock.user) return socket.emit('chat:error', { message: 'NOT_AUTHENTICATED' });

      // Apply rate limiting
      const rateLimitCheck = createRateLimitMiddleware(chatRateLimiter, 'chat:message');
      await new Promise<void>((resolve, reject) => {
        rateLimitCheck(authSock.user!.id, (error?: string) => {
          if (error) {
            console.warn(`[chat] Rate limit exceeded for user ${authSock.user!.id}: ${error}`);
            socket.emit('chat:error', { message: error });
            reject(new Error(error));
          } else {
            resolve();
          }
        });
      });

      if (!payload.message || typeof payload.message !== 'string') {
        return socket.emit('chat:error', { message: 'INVALID_MESSAGE' });
      }

      // Input size validation
      if (payload.message.length > InputSizeLimits.ChatMessage) {
        console.warn(
          `[input-caps] Chat message rejected: ${payload.message.length} chars (limit: ${InputSizeLimits.ChatMessage})`,
        );
        return socket.emit('chat:error', {
          message: 'MESSAGE_TOO_LONG',
          limit: InputSizeLimits.ChatMessage,
          actual: payload.message.length,
        });
      }

      const saved = await createMessage(authSock.user.id, GLOBAL_ROOM_ID, payload.message);
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
      await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, { id: authSock.user.id });
    } catch (err) {
      console.error('[chat] send error:', err);
      socket.emit('chat:error', { message: 'SEND_FAILED' });
    }
  };
  socket.on('chat:message', messageHandler);
  socketCleanupManager.registerHandler(socket.id, 'chat:message', messageHandler);
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
      await eventBus.publish(REDIS_CHANNELS.CHAT_TYPING, { id: uid, name: authSock.user.name });

      // Publish JSON rule achievement event for typing start
      try {
        await eventBus.publish('chat:typing:start', {
          key: 'chat:typing:start',
          userId: uid,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `chat:typing:${uid}:${Date.now()}`,
          payload: {
            roomId: GLOBAL_ROOM_ID,
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
        await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, { id: uid });

        // Publish JSON rule achievement event for typing stop
        try {
          await eventBus.publish('chat:typing:stop', {
            key: 'chat:typing:stop',
            userId: uid,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `chat:typing:stop:${uid}:${Date.now()}`,
            payload: {
              roomId: GLOBAL_ROOM_ID,
            },
          });
        } catch (achievementError) {
          console.error('[chat] Error publishing typing stop achievement event:', achievementError);
        }
      })();
    }, TYPING_TTL_MS);

    typingTimeout.set(uid, t);
  };
  socket.on('chat:typing', typingHandler);
  socketCleanupManager.registerHandler(socket.id, 'chat:typing', typingHandler);
  listenerCount++;

  const stopTypingHandler = async () => {
    if (!authSock.user) return;
    const uid = authSock.user.id;
    if (typingUsers.has(uid)) {
      typingUsers.delete(uid);
      await clearUserTyping(uid);
      await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, { id: uid });
      if (typingTimeout.has(uid)) {
        clearTimeout(typingTimeout.get(uid));
        typingTimeout.delete(uid);
      }

      // Publish JSON rule achievement event for explicit typing stop
      try {
        await eventBus.publish('chat:typing:stop', {
          key: 'chat:typing:stop',
          userId: uid,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `chat:typing:stop:${uid}:${Date.now()}`,
          payload: {
            roomId: GLOBAL_ROOM_ID,
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
  socket.on('chat:stopTyping', stopTypingHandler);
  socketCleanupManager.registerHandler(socket.id, 'chat:stopTyping', stopTypingHandler);
  listenerCount++;

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Disconnect → leave logic
  // ────────────────────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    if (!authSock.user) return;
    const uidStr = String(authSock.user.id);
    const after = await redisClient.decr(CONNECTIONS + uidStr);
    if (after <= 0) {
      await redisClient.del(CONNECTIONS + uidStr);
      await redisClient.srem(ONLINE_USERS_SET_KEY, uidStr);
      await redisClient.hdel(USER_INFO_HASH_KEY, uidStr);
    }

    await publishOnlineUsers();
    await eventBus.publish(REDIS_CHANNELS.CHAT_LEAVE, {
      id: authSock.user.id,
      name: authSock.user.name,
    });

    typingUsers.delete(authSock.user.id);
    if (typingTimeout.has(authSock.user.id)) {
      clearTimeout(typingTimeout.get(authSock.user.id));
      typingTimeout.delete(authSock.user.id);
    }
    await clearUserTyping(authSock.user.id);
    await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, { id: authSock.user.id });
  });

  // Log total registered listeners for monitoring
  console.log(
    `[chat] Registered ${listenerCount} listeners for socket ${socket.id} (heap monitoring)`,
  );
}

// Helper: broadcast current online list via Redis
async function publishOnlineUsers(connectionUserId?: string) {
  const ids = await redisClient.smembers(ONLINE_USERS_SET_KEY);
  const infoArr = ids.length ? await redisClient.hmget(USER_INFO_HASH_KEY, ...ids) : [];
  const parsed = ids.map((id, i) => {
    const info = infoArr[i] ? JSON.parse(infoArr[i]!) : {};
    return {
      id: Number(id),
      name: info.name ?? `User ${id}`,
      avatarUrl: info.avatarUrl ?? null,
      role: info.role ?? 'USER',
    };
  });
  await refreshPresenceTTL(connectionUserId, ids);
  await eventBus.publish(REDIS_CHANNELS.CHAT_USERS_ONLINE, parsed);
}

async function refreshPresenceTTL(connectionUserId?: string, allConnectionIds: string[] = []) {
  const ttlMs = CACHE_TTL.CHAT_PRESENCE * 1000;
  const tasks: Array<Promise<unknown>> = [
    redisClient.pexpire(ONLINE_USERS_SET_KEY, ttlMs),
    redisClient.pexpire(USER_INFO_HASH_KEY, ttlMs),
  ];

  const idsToRefresh = new Set<string>();
  if (connectionUserId) {
    idsToRefresh.add(connectionUserId);
  }
  for (const id of allConnectionIds) {
    if (id) idsToRefresh.add(id);
  }

  for (const id of idsToRefresh) {
    tasks.push(redisClient.pexpire(CONNECTIONS + id, ttlMs));
  }

  await Promise.all(tasks);
}

async function markUserTyping(userId: number) {
  await redisClient.zadd(TYPING_STATE_KEY, Date.now() + TYPING_TTL_MS, String(userId));
}

async function clearUserTyping(userId: number) {
  await redisClient.zrem(TYPING_STATE_KEY, String(userId));
}

function ensureTypingSweep() {
  if (typingSweepInitialized) return;
  typingSweepInitialized = true;

  setInterval(() => {
    sweepExpiredTypingStates().catch((err) =>
      console.error('[chat] Failed to sweep typing state:', err),
    );
  }, TYPING_SWEEP_INTERVAL_MS);
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
  const ids = await redisClient.smembers(ONLINE_USERS_SET_KEY);
  if (!ids.length) {
    await refreshPresenceTTL();
    return;
  }

  await refreshPresenceTTL(undefined, ids);
}

async function sweepExpiredTypingStates() {
  const now = Date.now();

  while (true) {
    const entry = (await redisClient.zpopmin(TYPING_STATE_KEY)) as [string, string] | [];
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
        await redisClient.zadd(TYPING_STATE_KEY, score, member);
      }
      break;
    }

    await eventBus.publish(REDIS_CHANNELS.CHAT_STOP_TYPING, { id: Number(member), expired: true });
  }
}
