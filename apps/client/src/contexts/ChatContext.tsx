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
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

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
  useEffect(() => {
    const fetchHistory = () => socket.emit('chat:history');
    socket.on('connect', fetchHistory);
    fetchHistory();

    const handleHistory = (hist: ChatMessage[]) => {
      setMessages(hist.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)));
      setLoading(false);
    };
    socket.on('chat:history', handleHistory);

    return () => {
      socket.off('connect', fetchHistory);
      socket.off('chat:history', handleHistory);
    };
  }, [socket]);

  /* ---------------------------------------------------------------------- */
  /* 2. Live message stream                                                 */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const onMsg = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
    socket.on('chatMessage', onMsg);
    socket.on('chat:error', (e) => setError(e.message || 'Chat error'));
    return () => {
      socket.off('chatMessage', onMsg);
      socket.off('chat:error');
    };
  }, [socket]);

  /* ---------------------------------------------------------------------- */
  /* 3. Typing indicators                                                   */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const addTyper = ({ id, name }: TypingUser) =>
      setTypingUsers((prev) => (prev.some((u) => u.id === id) ? prev : [...prev, { id, name }]));
    const removeTyper = ({ id }: { id: number }) =>
      setTypingUsers((prev) => prev.filter((u) => u.id !== id));
    socket.on('chatTyping', addTyper);
    socket.on('chatStopTyping', removeTyper);
    return () => {
      socket.off('chatTyping', addTyper);
      socket.off('chatStopTyping', removeTyper);
    };
  }, [socket]);

  /* ---------------------------------------------------------------------- */
  /* 4. Online-users list                                                   */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const update = (users: OnlineUser[]) => setOnlineUsers(users);
    socket.on('chatUsersOnline', update);
    return () => {
      socket.off('chatUsersOnline', update);
    };
  }, [socket]);

  /* ---------------------------------------------------------------------- */
  /* 5. Join / leave toast events                                           */
  /*      – deduplicated with seenEventsRef                                 */
  /* ---------------------------------------------------------------------- */
  const seenEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const maybePush = (ev: { type: 'joined' | 'left'; id: number; name: string }) => {
      const key = `${ev.type}-${ev.id}`;
      if (seenEventsRef.current.has(key)) return;
      seenEventsRef.current.add(key);
      if (!user || ev.id !== user.id) {
        setUserEvents((prev) => [...prev, { ...ev, timestamp: Date.now() }]);
      }
    };

    const joined = ({ id, name }: { id: number; name: string }) =>
      maybePush({ type: 'joined', id, name });
    const left = ({ id, name }: { id: number; name: string }) =>
      maybePush({ type: 'left', id, name });

    socket.on('chatUserJoined', joined);
    socket.on('chatUserLeft', left);
    return () => {
      socket.off('chatUserJoined', joined);
      socket.off('chatUserLeft', left);
    };
  }, [socket, user?.id]);

  /* ---------------------------------------------------------------------- */
  /* 6. Emit helpers                                                        */
  /* ---------------------------------------------------------------------- */
  const sendTyping = useCallback(() => {
    socket.emit('chat:typing');
    if (localStopTimer.current) clearTimeout(localStopTimer.current);
    localStopTimer.current = setTimeout(() => socket.emit('chat:stopTyping'), 3000);
  }, [socket]);

  const sendStopTyping = useCallback(() => {
    socket.emit('chat:stopTyping');
    if (localStopTimer.current) clearTimeout(localStopTimer.current);
  }, [socket]);

  const sendMessage = useCallback(
    (msg: string) => {
      if (!msg.trim()) return;
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
