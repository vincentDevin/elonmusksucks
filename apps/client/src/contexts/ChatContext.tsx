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
import { REDIS_CHANNELS } from '../types/events';

/* ---------- Types ---------- */
export interface ChatMessage {
  user: { id: number; name: string; role: string; avatarUrl: string | null };
  message: string;
  timestamp: string | number;
  id?: number;
}
export interface TypingUser {
  id: number;
  name: string;
}
export interface OnlineUser {
  id: number;
  name: string;
  avatarUrl: string | null;
  role: string;
}

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
    setMessages(hist.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    // Set up direct socket listener for chat history (not a Redis channel)
    socket.on('chat:history', handleHistory);

    // Wait for socket to be connected before requesting history
    if (socket.connected) {
      console.log('[ChatContext] Requesting chat history...');
      socket.emit('chat:history', {});
    } else {
      // Wait for connection
      const onConnect = () => {
        console.log('[ChatContext] Socket connected, requesting chat history...');
        socket.emit('chat:history', {});
      };
      socket.on('connect', onConnect);

      return () => {
        socket.off('chat:history', handleHistory);
        socket.off('connect', onConnect);
      };
    }

    return () => {
      socket.off('chat:history', handleHistory);
    };
  }, [socket, user, handleHistory]);

  /* ---------------------------------------------------------------------- */
  /* 2. Live message stream                                                 */
  /* ---------------------------------------------------------------------- */
  const handleMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const handleChatError = useCallback((e: any) => {
    setError(e.message || 'Chat error');
  }, []);

  // Set up direct socket listener for chat errors (not a Redis channel)
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:error', handleChatError);
    return () => {
      socket.off('chat:error', handleChatError);
    };
  }, [socket, handleChatError]);

  // Use EventBus for incoming chat messages (Redis channel)
  useSocketEvent(REDIS_CHANNELS.CHAT_MESSAGE, handleMessage);

  /* ---------------------------------------------------------------------- */
  /* 3. Typing indicators                                                   */
  /* ---------------------------------------------------------------------- */
  const addTyper = useCallback(({ id, name }: TypingUser) => {
    setTypingUsers((prev) => (prev.some((u) => u.id === id) ? prev : [...prev, { id, name }]));
  }, []);

  const removeTyper = useCallback(({ id }: { id: number }) => {
    setTypingUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  useSocketEvent(REDIS_CHANNELS.CHAT_TYPING, addTyper);
  useSocketEvent(REDIS_CHANNELS.CHAT_STOP_TYPING, removeTyper);

  /* ---------------------------------------------------------------------- */
  /* 4. Online-users list                                                   */
  /* ---------------------------------------------------------------------- */
  const updateOnlineUsers = useCallback((users: OnlineUser[]) => {
    setOnlineUsers(users);
  }, []);

  useSocketEvent(REDIS_CHANNELS.CHAT_USERS_ONLINE, updateOnlineUsers);

  /* ---------------------------------------------------------------------- */
  /* 5. Join / leave toast events                                           */
  /*      – deduplicated with seenEventsRef                                 */
  /* ---------------------------------------------------------------------- */
  const seenEventsRef = useRef<Set<string>>(new Set());

  const handleUserJoined = useCallback(
    ({ id, name }: { id: number; name: string }) => {
      const key = `joined-${id}`;
      if (seenEventsRef.current.has(key)) return;
      seenEventsRef.current.add(key);
      if (!user || id !== user.id) {
        setUserEvents((prev) => [...prev, { type: 'joined', id, name, timestamp: Date.now() }]);
      }
    },
    [user],
  );

  const handleUserLeft = useCallback(
    ({ id, name }: { id: number; name: string }) => {
      const key = `left-${id}`;
      if (seenEventsRef.current.has(key)) return;
      seenEventsRef.current.add(key);
      if (!user || id !== user.id) {
        setUserEvents((prev) => [...prev, { type: 'left', id, name, timestamp: Date.now() }]);
      }
    },
    [user],
  );

  useSocketEvent(REDIS_CHANNELS.CHAT_JOIN, handleUserJoined);
  useSocketEvent(REDIS_CHANNELS.CHAT_LEAVE, handleUserLeft);

  /* ---------------------------------------------------------------------- */
  /* 6. Emit helpers                                                        */
  /* ---------------------------------------------------------------------- */
  const sendTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('chat:typing', {});
    if (localStopTimer.current) clearTimeout(localStopTimer.current);
    localStopTimer.current = setTimeout(() => socket.emit('chat:stopTyping', {}), 3000);
  }, [socket]);

  const sendStopTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('chat:stopTyping', {});
    if (localStopTimer.current) clearTimeout(localStopTimer.current);
  }, [socket]);

  const sendMessage = useCallback(
    (msg: string) => {
      if (!msg.trim() || !socket) return;
      socket.emit('chat:message', { message: msg });
      sendStopTyping(); // stop indicator for myself immediately
    },
    [socket, sendStopTyping],
  );

  /* ---------------------------------------------------------------------- */
  /* 7. Context value                                                       */
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
