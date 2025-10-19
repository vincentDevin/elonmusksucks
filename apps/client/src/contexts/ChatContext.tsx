// apps/client/src/contexts/ChatContext.tsx
// -----------------------------------------------------------------------------
// React context for real-time chat, aligned with server event names.
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSocketEvent } from './EventBusCoreContext';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { REDIS_CHANNELS, SOCKET_EVENTS, type ChatErrorPayload } from '@ems/types';
import type {
  ChatMessageDTO,
  ChatTypingPayload,
  ChatStopTypingPayload,
  ChatUserOnlineInfo,
  ChatUsersOnlinePayload,
  ChatJoinPayload,
  ChatLeavePayload,
  ModerationMessageDeletePayload,
} from '@ems/types';

/* ---------- Types ---------- */
// Type aliases for backwards compatibility
export type ChatMessage = ChatMessageDTO;
export type TypingUser = ChatTypingPayload;
export type OnlineUser = ChatUserOnlineInfo;

interface ChatCtx {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;

  typingUsers: TypingUser[];
  onlineUsers: OnlineUser[];
  userEvents: { type: 'joined' | 'left'; id: number; name: string; timestamp: number }[];

  sendMessage: (msg: string) => void;
  sendTyping: () => void;
  sendStopTyping: () => void;
}

const ChatContext = createContext<ChatCtx | undefined>(undefined);

/* ---------- Provider ---------- */
export function ChatProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [userEvents, setUserEvents] = useState<
    { type: 'joined' | 'left'; id: number; name: string; timestamp: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localStopTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------------------------------------------------------------------- */
  /* 1. History bootstrap                                                   */
  /* ---------------------------------------------------------------------- */
  const handleHistory = useCallback((hist: ChatMessage[]) => {
    console.log('[ChatContext] Received chat history:', hist.length, 'messages');
    setMessages(hist.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)));
    setLoading(false);
  }, []);

  // CRITICAL FIX: Use direct socket listener to bypass hydration watermark
  // Chat history is request-response, not broadcast, so it should process immediately
  useEffect(() => {
    if (!socket) return;

    console.log('[ChatContext] Setting up chat history direct listener and request');

    // 1. Set up direct socket listener FIRST (bypasses EventBusCore hydration queue)
    socket.on(SOCKET_EVENTS.CHAT_HISTORY_RESPONSE, handleHistory);

    // 2. Request history AFTER listener is set up
    const requestHistory = () => {
      console.log('[ChatContext] Requesting chat history...');
      socket.emit(SOCKET_EVENTS.CHAT_HISTORY_REQUEST, {});
    };

    if (socket.connected) {
      // Socket already connected - request immediately
      requestHistory();
    } else {
      // Socket not connected - wait for connection then request
      console.log('[ChatContext] Socket not connected, waiting for connection...');
      const onConnect = () => {
        console.log('[ChatContext] Socket connected, requesting chat history...');
        socket.emit(SOCKET_EVENTS.CHAT_HISTORY_REQUEST, {});
      };
      socket.once('connect', onConnect);
    }

    // 3. Cleanup - remove direct listener
    return () => {
      console.log('[ChatContext] Cleaning up chat history direct listener');
      socket.off(SOCKET_EVENTS.CHAT_HISTORY_RESPONSE, handleHistory);
    };
  }, [socket, handleHistory]);

  /* ---------------------------------------------------------------------- */
  /* 2. Live message stream                                                 */
  /* ---------------------------------------------------------------------- */
  const handleMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      // Prevent duplicate messages (deduplicate by message ID)
      if (m.id && prev.some((msg) => msg.id === m.id)) {
        console.warn('[ChatContext] Duplicate message detected, skipping:', m.id);
        return prev;
      }
      return [...prev, m];
    });
  }, []);

  const handleChatError = useCallback((e: ChatErrorPayload) => {
    setError(e.error || 'Chat error');
  }, []);

  // Set up direct socket listener for chat errors (not a Redis channel)
  // Migrated to EventBusCore: Chat error handling
  useSocketEvent(REDIS_CHANNELS.CHAT_ERROR, handleChatError);

  // Use EventBus for incoming chat messages (Redis channel)
  useSocketEvent(REDIS_CHANNELS.CHAT_MESSAGE, handleMessage);

  /* ---------------------------------------------------------------------- */
  /* 3. Typing indicators                                                   */
  /* ---------------------------------------------------------------------- */
  const addTyper = useCallback((payload: ChatTypingPayload) => {
    setTypingUsers((prev) =>
      prev.some((u) => u.id === payload.id)
        ? prev
        : [...prev, { id: payload.id, name: payload.name }],
    );
  }, []);

  const removeTyper = useCallback((payload: ChatStopTypingPayload) => {
    setTypingUsers((prev) => prev.filter((u) => u.id !== payload.id));
  }, []);

  useSocketEvent(REDIS_CHANNELS.CHAT_TYPING, addTyper);
  useSocketEvent(REDIS_CHANNELS.CHAT_STOP_TYPING, removeTyper);

  /* ---------------------------------------------------------------------- */
  /* 4. Online-users list                                                   */
  /* ---------------------------------------------------------------------- */
  const updateOnlineUsers = useCallback((users: ChatUsersOnlinePayload) => {
    setOnlineUsers(users);
  }, []);

  useSocketEvent(REDIS_CHANNELS.CHAT_USERS_ONLINE, updateOnlineUsers);

  /* ---------------------------------------------------------------------- */
  /* 5. Join / leave toast events                                           */
  /*      – deduplicated with seenEventsRef                                 */
  /* ---------------------------------------------------------------------- */
  const seenEventsRef = useRef<Set<string>>(new Set());

  const handleUserJoined = useCallback(
    (payload: ChatJoinPayload) => {
      const key = `joined-${payload.id}`;
      if (seenEventsRef.current.has(key)) return;
      seenEventsRef.current.add(key);
      if (!user || payload.id !== user.id) {
        setUserEvents((prev) => [
          ...prev,
          { type: 'joined', id: payload.id, name: payload.name, timestamp: Date.now() },
        ]);
      }
    },
    [user],
  );

  const handleUserLeft = useCallback(
    (payload: ChatLeavePayload) => {
      const key = `left-${payload.id}`;
      if (seenEventsRef.current.has(key)) return;
      seenEventsRef.current.add(key);
      if (!user || payload.id !== user.id) {
        setUserEvents((prev) => [
          ...prev,
          { type: 'left', id: payload.id, name: payload.name, timestamp: Date.now() },
        ]);
      }
    },
    [user],
  );

  useSocketEvent(REDIS_CHANNELS.CHAT_JOIN, handleUserJoined);
  useSocketEvent(REDIS_CHANNELS.CHAT_LEAVE, handleUserLeft);

  /* ---------------------------------------------------------------------- */
  /* 6. Message deletion (moderation)                                       */
  /* ---------------------------------------------------------------------- */
  const handleMessageDelete = useCallback((payload: ModerationMessageDeletePayload) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== payload.messageId));
  }, []);

  useSocketEvent(REDIS_CHANNELS.MODERATION_MESSAGE_DELETE, handleMessageDelete);

  /* ---------------------------------------------------------------------- */
  /* 7. Emit helpers                                                        */
  /* ---------------------------------------------------------------------- */
  const sendTyping = useCallback(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.CHAT_TYPING_SEND, {});
    if (localStopTimer.current) clearTimeout(localStopTimer.current);
    localStopTimer.current = setTimeout(
      () => socket.emit(SOCKET_EVENTS.CHAT_STOP_TYPING_SEND, {}),
      3000,
    );
  }, [socket]);

  const sendStopTyping = useCallback(() => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.CHAT_STOP_TYPING_SEND, {});
    if (localStopTimer.current) clearTimeout(localStopTimer.current);
  }, [socket]);

  const sendMessage = useCallback(
    (msg: string) => {
      if (!msg.trim() || !socket) return;
      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE_SEND, { message: msg });
      sendStopTyping(); // stop indicator for myself immediately
    },
    [socket, sendStopTyping],
  );

  /* ---------------------------------------------------------------------- */
  /* 8. Context value                                                       */
  /* ---------------------------------------------------------------------- */
  const value = useMemo<ChatCtx>(
    () => ({
      messages,
      loading,
      error,
      typingUsers,
      onlineUsers,
      userEvents,
      sendMessage,
      sendTyping,
      sendStopTyping,
    }),
    [
      messages,
      loading,
      error,
      typingUsers,
      onlineUsers,
      userEvents,
      sendMessage,
      sendTyping,
      sendStopTyping,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/* ---------- Hook ---------- */
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
