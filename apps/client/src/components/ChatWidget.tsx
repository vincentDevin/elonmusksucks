import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Link } from 'react-router-dom';

const fallbackAvatar =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=48';
const AVATAR_SIZE = 48;

// Optional: For animating system notifications
function useTimedQueue<T>(ttlMs: number) {
  const [items, setItems] = useState<T[]>([]);
  function push(item: T) {
    setItems((curr) => [...curr, item]);
    setTimeout(() => setItems((curr) => curr.slice(1)), ttlMs);
  }
  return [items, push] as const;
}

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { messages, sendMessage, loading, error, typingUsers, userEvents } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- System events as ephemeral popups above the input ---
  const [recentEvents, pushRecentEvent] = useTimedQueue<{
    type: 'joined' | 'left';
    name: string;
    timestamp: number;
  }>(3800);

  // Listen for new userEvents and show as popups
  useEffect(() => {
    if (!userEvents.length) return;
    const latest = userEvents[userEvents.length - 1];
    pushRecentEvent({
      type: latest.type,
      name: latest.name,
      timestamp: latest.timestamp,
    });
    // eslint-disable-next-line
  }, [userEvents.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  // Group consecutive messages by user
  const grouped: {
    avatarUrl: string | null;
    userName: string;
    userRole: string;
    userId: number;
    messages: { message: string; timestamp: string | number; id?: number }[];
  }[] = [];
  let lastUserId: number | null = null;
  messages.forEach((msg) => {
    if (msg.user.id !== lastUserId) {
      grouped.push({
        avatarUrl: msg.user.avatarUrl ?? fallbackAvatar,
        userName: msg.user.name ?? `User ${msg.user.id}`,
        userRole: msg.user.role,
        userId: msg.user.id,
        messages: [{ message: msg.message, timestamp: msg.timestamp, id: msg.id }],
      });
      lastUserId = msg.user.id;
    } else {
      grouped[grouped.length - 1].messages.push({
        message: msg.message,
        timestamp: msg.timestamp,
        id: msg.id,
      });
    }
  });

  return (
    <div className="flex flex-col h-[28rem] bg-transparent w-full relative">
      {/* --- System join/leave notifications above input --- */}
      <div className="absolute left-0 right-0 bottom-20 z-20 flex flex-col items-center pointer-events-none">
        {recentEvents.map((ev, idx) => (
          <div
            key={ev.timestamp + idx}
            className={`px-3 py-1 mb-2 rounded shadow-md bg-neutral-200 dark:bg-neutral-700 text-xs font-semibold
              ${ev.type === 'joined' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}
            `}
            style={{
              animation: 'fadeInOut 3.2s ease',
              maxWidth: 240,
              textAlign: 'center',
            }}
          >
            {ev.type === 'joined' ? `${ev.name} joined the chat` : `${ev.name} left the chat`}
          </div>
        ))}
      </div>

      {/* --- Chat Messages --- */}
      <div className="flex-1 overflow-y-auto py-3 px-4">
        {loading && <div className="text-center text-xs text-gray-400">Loading…</div>}
        {error && <div className="text-center text-xs text-red-500">{error}</div>}

        {/* --- Typing notification above the message box, below the messages --- */}
        {typingUsers.length > 0 && (
          <div className="mb-2 text-xs text-tertiary flex items-center gap-1 pl-2">
            <span>
              {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
              typing…
            </span>
            <span className="animate-bounce text-[18px] pb-1">…</span>
          </div>
        )}

        {grouped.map((group, idx) => (
          <div key={group.messages[0].id ?? `${group.userId}-${idx}`} className="mb-5">
            <div className="flex items-start gap-3" style={{ minHeight: AVATAR_SIZE }}>
              <div className="flex flex-col items-start flex-shrink-0">
                <img
                  src={group.avatarUrl || fallbackAvatar}
                  alt={group.userName}
                  className="w-12 h-12 rounded-full object-cover border border-accent"
                  style={{
                    background: 'var(--color-muted)',
                    borderColor: 'var(--color-accent)',
                    marginBottom: 0,
                  }}
                />
              </div>
              <div className="flex flex-col flex-1">
                <div style={{ marginBottom: 0 }}>
                  <Link
                    to={`/profile/${group.userId}`}
                    className="font-bold text-base flex items-center gap-1 hover:underline focus:outline-none"
                    style={{
                      color: group.userRole === 'ADMIN' ? '#dc2626' : 'var(--color-primary)',
                    }}
                  >
                    {group.userName}
                    {group.userRole === 'ADMIN' && (
                      <span
                        className="ml-1 px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: '#b34a4aff',
                          color: '#000',
                          border: '1px solid #dc2626',
                        }}
                      >
                        admin
                      </span>
                    )}
                  </Link>
                </div>
                <div className="flex flex-col gap-1">
                  {group.messages.map((m, i) => (
                    <div key={m.id ?? i} className="flex items-end" style={{ minHeight: 22 }}>
                      <span
                        className="flex-1 text-[15px] leading-snug"
                        style={{
                          color: 'var(--color-content)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.message}
                      </span>
                      <span
                        className="ml-3 text-xs font-normal"
                        style={{
                          color: 'var(--color-tertiary)',
                          minWidth: 70,
                          textAlign: 'right',
                        }}
                      >
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-muted" />
      {/* --- Only show the input if logged in --- */}
      {user && (
        <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2">
          <input
            className="flex-1 rounded-lg px-3 py-2 text-base focus:outline-none bg-background border border-muted"
            style={{
              color: 'var(--color-content)',
            }}
            type="text"
            value={input}
            placeholder="Type your message…"
            maxLength={1000}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            // Optionally: onKeyDown={() => sendTyping()}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg font-semibold bg-primary text-surface transition disabled:opacity-60"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-surface)',
            }}
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatWidget;
