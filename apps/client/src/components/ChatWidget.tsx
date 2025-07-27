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
import { useSocket } from '../contexts/SocketContext';

const FALLBACK_AVATAR =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=48';

// Moderation API functions
const moderationAPI = {
  banUser: async (userId: number, reason: string, duration?: number) => {
    const response = await fetch('/api/moderation/ban', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ userId, reason, duration }),
    });
    return response.json();
  },
  muteUser: async (userId: number, reason: string, duration?: number) => {
    const response = await fetch('/api/moderation/mute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ userId, reason, duration }),
    });
    return response.json();
  },
  kickUser: async (userId: number, reason: string) => {
    const response = await fetch('/api/moderation/kick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ userId, reason }),
    });
    return response.json();
  },
  deleteMessage: async (messageId: number) => {
    const response = await fetch(`/api/moderation/message/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return response.json();
  },
};

/* ───────────── small helper for fading join/leave toasts ───────────── */
function useTimedQueue<T>(ttlMs: number) {
  const [items, set] = useState<T[]>([]);
  const push = (item: T) => {
    set((curr) => [...curr, item]);
    setTimeout(() => set((curr) => curr.slice(1)), ttlMs);
  };
  return [items, push] as const;
}

/* ───────────── moderation event types ───────────── */
interface ModerationEvent {
  type: 'ban' | 'unban' | 'mute' | 'kick' | 'messageDeleted';
  targetUser: string;
  moderator: string;
  reason?: string;
  duration?: number;
  timestamp: number;
}

/* ────────────────────────────────────────────────────────────────────── */

export default function ChatWidget() {
  const { user } = useAuth();
  const socket = useSocket();
  const {
    messages,
    loading,
    error,
    typingUsers,
    userEvents,
    onlineUsers,
    sendMessage,
    sendTyping,
    sendStopTyping,
  } = useChat();

  /* ---------- local state ---------- */
  const [input, setInput] = useState('');
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const [recent, pushRecent] = useTimedQueue<{
    type: 'joined' | 'left';
    name: string;
    timestamp: number;
  }>(3800);
  const [moderationEvents, pushModerationEvent] = useTimedQueue<ModerationEvent>(5000);

  const isAdmin = user?.role === 'ADMIN';

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

  /* ---------- moderation events listener ---------- */
  useEffect(() => {
    if (!socket) return;

    const handleModerationEvent = (event: any) => {
      let moderationEvent: ModerationEvent;
      
      switch (event.type) {
        case 'userBan':
          moderationEvent = {
            type: 'ban',
            targetUser: event.targetUser || 'Unknown User',
            moderator: event.moderator || 'System',
            reason: event.reason,
            duration: event.duration,
            timestamp: Date.now(),
          };
          break;
        case 'userUnban':
          moderationEvent = {
            type: 'unban',
            targetUser: event.targetUser || 'Unknown User',
            moderator: event.moderator || 'System',
            timestamp: Date.now(),
          };
          break;
        case 'userMute':
          moderationEvent = {
            type: 'mute',
            targetUser: event.targetUser || 'Unknown User',
            moderator: event.moderator || 'System',
            reason: event.reason,
            duration: event.duration,
            timestamp: Date.now(),
          };
          break;
        case 'userKick':
          moderationEvent = {
            type: 'kick',
            targetUser: event.targetUser || 'Unknown User',
            moderator: event.moderator || 'System',
            reason: event.reason,
            timestamp: Date.now(),
          };
          break;
        case 'messageDeleted':
          moderationEvent = {
            type: 'messageDeleted',
            targetUser: event.targetUser || 'Unknown User',
            moderator: event.moderator || 'System',
            timestamp: Date.now(),
          };
          break;
        default:
          return;
      }
      
      pushModerationEvent(moderationEvent);
    };

    // Listen for moderation events
    socket.on('moderationUserBan', (data) => handleModerationEvent({ ...data, type: 'userBan' }));
    socket.on('moderationUserUnban', (data) => handleModerationEvent({ ...data, type: 'userUnban' }));
    socket.on('moderationUserMute', (data) => handleModerationEvent({ ...data, type: 'userMute' }));
    socket.on('moderationUserKick', (data) => handleModerationEvent({ ...data, type: 'userKick' }));
    socket.on('moderationMessageDelete', (data) => handleModerationEvent({ ...data, type: 'messageDeleted' }));

    return () => {
      socket.off('moderationUserBan');
      socket.off('moderationUserUnban');
      socket.off('moderationUserMute');
      socket.off('moderationUserKick');
      socket.off('moderationMessageDelete');
    };
  }, [socket, pushModerationEvent]);

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

  /* ---------- moderation helpers ---------- */
  const handleQuickModeration = async (action: 'ban' | 'mute' | 'kick', userId: number, userName: string) => {
    const reason = prompt(`Enter reason for ${action}ing ${userName}:`);
    if (!reason) return;

    try {
      switch (action) {
        case 'ban':
          await moderationAPI.banUser(userId, reason);
          break;
        case 'mute':
          await moderationAPI.muteUser(userId, reason);
          break;
        case 'kick':
          await moderationAPI.kickUser(userId, reason);
          break;
      }
      setShowModerationPanel(false);
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      alert(`Failed to ${action} user. Please try again.`);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await moderationAPI.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="relative flex flex-col h-[28rem] bg-transparent">
      {/* chat header with user count and admin controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-muted bg-surface">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Live Chat</span>
          <span className="text-xs text-tertiary">
            ({onlineUsers.length} online)
          </span>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModerationPanel(!showModerationPanel)}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            {showModerationPanel ? 'Hide' : 'Moderate'}
          </button>
        )}
      </div>

      {/* ephemeral join/leave and moderation toasts */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex flex-col items-center">
        {recent.map((ev, index) => (
          <div
            key={`recent-${ev.timestamp}-${index}`}
            className={`mb-2 px-3 py-1 rounded text-xs font-semibold shadow-md
              ${
                ev.type === 'joined'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200'
              }`}
            style={{ animation: 'fadeInOut 3.2s ease', maxWidth: 240 }}
          >
            {ev.name} {ev.type === 'joined' ? 'joined' : 'left'} the chat
          </div>
        ))}
        {moderationEvents.map((ev, index) => {
          const formatDuration = (ms?: number) => {
            if (!ms) return 'permanently';
            if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
            if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
            return `${Math.floor(ms / 3600000)}h`;
          };

          let message = '';
          let bgColor = '';
          
          switch (ev.type) {
            case 'ban':
              message = `${ev.targetUser} was banned ${formatDuration(ev.duration)} by ${ev.moderator}`;
              bgColor = 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200';
              break;
            case 'unban':
              message = `${ev.targetUser} was unbanned by ${ev.moderator}`;
              bgColor = 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-200';
              break;
            case 'mute':
              message = `${ev.targetUser} was muted ${formatDuration(ev.duration)} by ${ev.moderator}`;
              bgColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-200';
              break;
            case 'kick':
              message = `${ev.targetUser} was kicked by ${ev.moderator}`;
              bgColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-200';
              break;
            case 'messageDeleted':
              message = `Message from ${ev.targetUser} was deleted by ${ev.moderator}`;
              bgColor = 'bg-surface text-tertiary border border-muted';
              break;
          }

          return (
            <div
              key={`moderation-${ev.timestamp}-${index}`}
              className={`mb-2 px-3 py-1 rounded text-xs font-semibold shadow-md ${bgColor}`}
              style={{ animation: 'fadeInOut 4.5s ease', maxWidth: 280 }}
            >
              {message}
              {ev.reason && <div className="text-xs opacity-75 text-tertiary">Reason: {ev.reason}</div>}
            </div>
          );
        })}
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
          <div key={g.msgs[0].id ?? `${g.userId}-${g.msgs.length}`} className="mb-5 group">
            <div className="flex items-start gap-3">
              <div
                className={`h-12 w-12 flex-shrink-0 rounded-full overflow-hidden border border-accent cursor-pointer hover:ring-2 hover:ring-primary transition ${
                  selectedUserId === g.userId ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => isAdmin && setSelectedUserId(selectedUserId === g.userId ? null : g.userId)}
              >
                <img
                  src={g.avatar}
                  alt={g.userName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
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
                  {isAdmin && g.userRole !== 'ADMIN' && selectedUserId === g.userId && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickModeration('ban', g.userId, g.userName)}
                        className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Ban
                      </button>
                      <button
                        onClick={() => handleQuickModeration('mute', g.userId, g.userName)}
                        className="text-xs px-2 py-0.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => handleQuickModeration('kick', g.userId, g.userName)}
                        className="text-xs px-2 py-0.5 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                      >
                        Kick
                      </button>
                    </div>
                  )}
                </div>
                {g.msgs.map((m) => (
                  <div key={m.id ?? m.ts} className="flex justify-between group/message">
                    <span className="break-words">{m.text}</span>
                    <div className="flex items-center gap-2">
                      {isAdmin && m.id && (
                        <button
                          onClick={() => handleDeleteMessage(m.id!)}
                          className="opacity-0 group-hover/message:opacity-100 text-xs text-red-600 hover:text-red-800 transition"
                          title="Delete message"
                        >
                          ✗
                        </button>
                      )}
                      <span className="min-w-[70px] text-right text-xs text-tertiary">
                        {new Date(m.ts).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* moderation panel (admin only) */}
      {isAdmin && showModerationPanel && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800">
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Moderation Panel</h4>
          <div className="space-y-2">
            <div className="text-xs text-red-700 dark:text-red-400">
              <strong>Online Users ({onlineUsers.length}):</strong>
            </div>
            <div className="max-h-24 overflow-y-auto">
              {onlineUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={user.avatarUrl || FALLBACK_AVATAR}
                      alt={user.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs text-content">
                      {user.name}
                      {user.role === 'ADMIN' && (
                        <span className="ml-1 text-red-600 dark:text-red-400 font-bold">(ADMIN)</span>
                      )}
                    </span>
                  </div>
                  {user.role !== 'ADMIN' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickModeration('ban', user.id, user.name)}
                        className="text-xs px-1 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Ban
                      </button>
                      <button
                        onClick={() => handleQuickModeration('mute', user.id, user.name)}
                        className="text-xs px-1 py-0.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => handleQuickModeration('kick', user.id, user.name)}
                        className="text-xs px-1 py-0.5 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
                      >
                        Kick
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-2">
              Click on user avatars in chat for quick moderation, or hover over messages to delete them.
            </div>
          </div>
        </div>
      )}

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
