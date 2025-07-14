import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

// ---- Types ----
export type ChatMessage = {
  user: {
    id: number;
    name: string;
    role: string;
    avatarUrl?: string | null;
  };
  message: string;
  timestamp: number | string;
  id?: number;
};

type TypingUser = { id: number; name: string };
type OnlineUser = { id: number; name: string; avatarUrl: string | null; role: string };

type ChatContextType = {
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  loading: boolean;
  error: string | null;
  typingUsers: TypingUser[];
  onlineUsers: OnlineUser[];
  userEvents: { type: 'joined' | 'left'; id: number; name: string; timestamp: number }[];
  sendTyping: () => void;
  sendStopTyping: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ---- Provider ----
export function ChatProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- New State for Real-Time Features ---
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [userEvents, setUserEvents] = useState<
    { type: 'joined' | 'left'; id: number; name: string; timestamp: number }[]
  >([]);

  // Used to debounce typing notifications
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat history on mount or reconnect
  useEffect(() => {
    function fetchHistory() {
      setLoading(true);
      socket.emit('chat:history');
    }
    fetchHistory();
    socket.on('connect', fetchHistory);
    return () => {
      socket.off('connect', fetchHistory);
    };
  }, [socket]);

  // Listen for history
  useEffect(() => {
    function handleHistory(history: ChatMessage[]) {
      setMessages(
        history
          .slice()
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      );
      setLoading(false);
    }
    socket.on('chat:history', handleHistory);
    return () => {
      socket.off('chat:history', handleHistory);
    };
  }, [socket]);

  // Listen for live messages
  useEffect(() => {
    function handleNewMessage(msg: ChatMessage) {
      setMessages((prev) => [...prev, msg]);
    }
    socket.on('chat:newMessage', handleNewMessage);

    socket.on('chat:error', (err) => setError(err.message || 'Chat error'));

    return () => {
      socket.off('chat:newMessage', handleNewMessage);
      socket.off('chat:error');
    };
  }, [socket]);

  // --- Typing Events ---
  useEffect(() => {
    function handleTyping({ id, name }: { id: number; name: string }) {
      setTypingUsers((prev) => (prev.some((u) => u.id === id) ? prev : [...prev, { id, name }]));
    }
    function handleStopTyping({ id }: { id: number }) {
      setTypingUsers((prev) => prev.filter((u) => u.id !== id));
    }
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stopTyping', handleStopTyping);
    return () => {
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stopTyping', handleStopTyping);
    };
  }, [socket]);

  // --- Online Users (on join/leave/online change) ---
  useEffect(() => {
    function handleUsersOnline(users: OnlineUser[] | number[]) {
      if (Array.isArray(users) && users.length > 0 && typeof users[0] === 'object') {
        setOnlineUsers(users as OnlineUser[]);
      } else if (Array.isArray(users) && users.length > 0 && typeof users[0] === 'number') {
        setOnlineUsers(
          (users as number[]).map((id) => ({
            id,
            name: `User ${id}`,
            avatarUrl: null,
            role: 'USER',
          })),
        );
      } else {
        setOnlineUsers([]);
      }
    }
    socket.on('chat:usersOnline', handleUsersOnline);
    return () => {
      socket.off('chat:usersOnline', handleUsersOnline);
    };
  }, [socket]);

  // --- User Joined/Left Events (for toasts/UX if desired) ---
  useEffect(() => {
    function handleUserJoined({ id, name }: { id: number; name: string }) {
      // Only show if it's not the current user
      if (!user || id !== user.id) {
        setUserEvents((prev) => [...prev, { type: 'joined', id, name, timestamp: Date.now() }]);
      }
    }
    function handleUserLeft({ id, name }: { id: number; name: string }) {
      if (!user || id !== user.id) {
        setUserEvents((prev) => [...prev, { type: 'left', id, name, timestamp: Date.now() }]);
      }
    }
    socket.on('chat:userJoined', handleUserJoined);
    socket.on('chat:userLeft', handleUserLeft);
    return () => {
      socket.off('chat:userJoined', handleUserJoined);
      socket.off('chat:userLeft', handleUserLeft);
    };
  }, [socket, user?.id]);

  // --- Send typing/stopTyping events ---
  const sendTyping = () => {
    socket.emit('chat:typing');
    // Debounce: send stopTyping after 3s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stopTyping');
    }, 3000);
  };
  const sendStopTyping = () => {
    socket.emit('chat:stopTyping');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // --- Send messages ---
  const sendMessage = (msg: string) => {
    if (msg.trim()) {
      socket.emit('chat:sendMessage', { message: msg });
      sendStopTyping();
    }
  };

  const value = {
    messages,
    sendMessage,
    loading,
    error,
    typingUsers,
    onlineUsers,
    userEvents,
    sendTyping,
    sendStopTyping,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ---- Hook ----
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
