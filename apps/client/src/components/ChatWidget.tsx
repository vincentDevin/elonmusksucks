// apps/client/src/components/ChatWidget.tsx
// -----------------------------------------------------------------------------
// Compact live-chat widget that consumes ChatContext.
// Scroll-to-bottom is implemented with `scrollTo` on the scroll-container
// itself so the main page never moves.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

const FALLBACK_AVATAR =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=48';

/* ───────────── small helper for fading join/leave toasts ───────────── */
function useTimedQueue<T>(ttlMs: number) {
  const [items, set] = useState<T[]>([]);
  const push = (item: T) => {
    set((curr) => [...curr, item]);
    setTimeout(() => set((curr) => curr.slice(1)), ttlMs);
  };
  return [items, push] as const;
}

/* ────────────────────────────────────────────────────────────────────── */

export default function ChatWidget() {
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    typingUsers,
    userEvents,
    sendMessage,
    sendTyping,
    sendStopTyping,
  } = useChat();

  /* ---------- local state ---------- */
  const [input, setInput] = useState('');
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const [recent, pushRecent] = useTimedQueue<{
    type: 'joined' | 'left';
    name: string;
    timestamp: number;
  }>(3800);

  /* ---------- scroll to bottom INSIDE chat pane ---------- */
  useEffect(() => {
    const el = scrollBoxRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]); // runs on every new message / toast

  /* ---------- join / leave toast queue ---------- */
  useEffect(() => {
    if (userEvents.length) pushRecent(userEvents[userEvents.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEvents]);

  /* ---------- group consecutive messages by user ---------- */
  const grouped = useMemo(() => {
    const out: {
      avatar: string;
      userName: string;
      userRole: string;
      userId: number;
      msgs: { text: string; ts: string | number; id?: number }[];
    }[] = [];

    let lastId = -1;
    for (const m of messages) {
      if (m.user.id !== lastId) {
        out.push({
          avatar: m.user.avatarUrl ?? FALLBACK_AVATAR,
          userName: m.user.name ?? `User ${m.user.id}`,
          userRole: m.user.role,
          userId: m.user.id,
          msgs: [{ text: m.message, ts: m.timestamp, id: m.id }],
        });
        lastId = m.user.id;
      } else {
        out[out.length - 1].msgs.push({ text: m.message, ts: m.timestamp, id: m.id });
      }
    }
    return out;
  }, [messages]);

  /* ---------- input helpers ---------- */
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    v.trim() ? sendTyping() : sendStopTyping();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    sendStopTyping();
  };

  /* ---------- render ---------- */
  return (
    <div className="relative flex flex-col h-[28rem] bg-transparent">
      {/* ephemeral join/leave toasts */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex flex-col items-center">
        {recent.map((ev) => (
          <div
            key={ev.timestamp}
            className={`mb-2 px-3 py-1 rounded text-xs font-semibold shadow-md
              ${
                ev.type === 'joined'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-red-100 text-red-700   dark:bg-red-900/50  dark:text-red-300'
              }`}
            style={{ animation: 'fadeInOut 3.2s ease', maxWidth: 240 }}
          >
            {ev.name} {ev.type === 'joined' ? 'joined' : 'left'} the chat
          </div>
        ))}
      </div>

      {/* message list */}
      <div ref={scrollBoxRef} className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-center text-xs text-gray-400">Loading…</p>}
        {error && <p className="text-center text-xs text-red-500">{error}</p>}

        {typingUsers.length > 0 && (
          <p className="mb-2 pl-2 text-xs text-tertiary">
            {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
            typing…
            <span className="ml-1 animate-bounce">…</span>
          </p>
        )}

        {grouped.map((g) => (
          <div key={g.msgs[0].id ?? `${g.userId}-${g.msgs.length}`} className="mb-5">
            <div className="flex items-start gap-3">
              <img
                src={g.avatar}
                alt={g.userName}
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover border border-accent"
              />
              <div className="flex-1">
                <Link
                  to={`/profile/${g.userId}`}
                  className="font-bold hover:underline"
                  style={{ color: g.userRole === 'ADMIN' ? '#dc2626' : 'var(--color-primary)' }}
                >
                  {g.userName}
                  {g.userRole === 'ADMIN' && (
                    <span className="ml-1 rounded border border-red-600 bg-red-100 px-1.5 py-0.5 text-xs font-bold uppercase text-red-700">
                      admin
                    </span>
                  )}
                </Link>
                {g.msgs.map((m) => (
                  <div key={m.id ?? m.ts} className="flex justify-between">
                    <span className="break-words">{m.text}</span>
                    <span className="ml-3 min-w-[70px] text-right text-xs text-tertiary">
                      {new Date(m.ts).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-muted" />

      {/* input (only if logged-in) */}
      {user && (
        <form onSubmit={onSubmit} className="flex items-center gap-2 px-3 py-2">
          <input
            value={input}
            onChange={onChange}
            onBlur={sendStopTyping}
            className="flex-1 rounded-lg border border-muted bg-background px-3 py-2 focus:outline-none"
            placeholder="Type your message…"
            maxLength={1000}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-surface disabled:opacity-60"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
