// apps/client/src/components/pong/GameRoomChat.tsx
// -----------------------------------------------------------------------------
// Game-specific chat component for pong matches
// Supports players and spectators in unified chat with ephemeral messages
// Features: system messages, role badges, rate limiting feedback
// -----------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { GameChatMessage } from '@ems/types';

const FALLBACK_AVATAR =
  'https://ui-avatars.com/api/?name=Unknown&background=64748b&color=fff&size=48';

interface GameRoomChatProps {
  messages: GameChatMessage[];
  onSendMessage: (message: string) => void;
  gameId: string;
  className?: string;
}

export default function GameRoomChat({
  messages,
  onSendMessage,
  gameId: _gameId,
  className,
}: GameRoomChatProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollBoxRef.current;
    if (el && messages.length > lastMessageCountRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      lastMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // Group consecutive messages from the same user
  const grouped = React.useMemo(() => {
    const groups: Array<{
      userId: number;
      username: string;
      role: 'player1' | 'player2' | 'spectator';
      isSystem: boolean;
      msgs: GameChatMessage[];
    }> = [];

    for (const msg of messages) {
      const last = groups[groups.length - 1];
      if (
        last &&
        last.userId === msg.userId &&
        !msg.isSystem &&
        !last.isSystem &&
        msg.timestamp - last.msgs[last.msgs.length - 1].timestamp < 60000 // Group if within 1 minute
      ) {
        last.msgs.push(msg);
      } else {
        groups.push({
          userId: msg.userId,
          username: msg.username,
          role: msg.userRole,
          isSystem: msg.isSystem,
          msgs: [msg],
        });
      }
    }

    return groups;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Simple rate limiting check (client-side)
    // Server enforces 3 messages per 5 seconds
    onSendMessage(trimmed);
    setInput('');

    // Show rate limit feedback briefly
    setRateLimited(true);
    setTimeout(() => setRateLimited(false), 1700); // ~2s between messages recommended
  };

  const getRoleBadge = (role: 'player1' | 'player2' | 'spectator') => {
    switch (role) {
      case 'player1':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
            P1
          </span>
        );
      case 'player2':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-500/20 text-green-400">
            P2
          </span>
        );
      case 'spectator':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">
            SPEC
          </span>
        );
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`flex flex-col h-full bg-surface border border-border ${className || 'rounded-lg'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Game Chat</span>
          <span className="text-xs text-tertiary">({messages.length} messages)</span>
        </div>
      </div>

      {/* Messages list */}
      <div ref={scrollBoxRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-tertiary mt-4">
            No messages yet. Start the conversation!
          </p>
        )}

        {grouped.map((g, groupIndex) => {
          // System messages (negotiation updates, joins, etc.)
          if (g.isSystem) {
            return (
              <div key={`system-${groupIndex}`} className="flex justify-center">
                <div className="text-xs text-tertiary italic bg-muted px-3 py-1.5 rounded-full max-w-md text-center">
                  {g.msgs[0].message}
                </div>
              </div>
            );
          }

          // Regular user messages
          return (
            <div key={`user-${g.userId}-${groupIndex}`} className="flex items-start gap-3">
              {/* Avatar */}
              <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-accent">
                <img
                  src={FALLBACK_AVATAR.replace('Unknown', g.username)}
                  alt={g.username}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Messages */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-content">{g.username}</span>
                  {getRoleBadge(g.role)}
                  <span className="text-xs text-tertiary">{formatTime(g.msgs[0].timestamp)}</span>
                </div>

                {g.msgs.map((msg, msgIndex) => (
                  <div
                    key={`msg-${msg.timestamp}-${msgIndex}`}
                    className="text-sm text-secondary mb-1 break-words"
                  >
                    {msg.message}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 flex-shrink-0">
        {user ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              disabled={rateLimited}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-content placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || rateLimited}
              className="px-4 py-2 bg-primary text-primary-contrast rounded-lg text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        ) : (
          <div className="text-center text-xs text-tertiary py-2">
            Sign in to participate in chat
          </div>
        )}

        {rateLimited && (
          <p className="text-xs text-warning mt-1">
            Please wait a moment before sending another message
          </p>
        )}

        <p className="text-xs text-tertiary mt-1">
          Chat is ephemeral and cleared when the game ends
        </p>
      </div>
    </div>
  );
}
