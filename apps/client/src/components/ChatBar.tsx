import React, { useState } from 'react';
import ChatWidget from './ChatWidget';
import { ChatBubbleLeftRightIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Link } from 'react-router-dom';

const ChatBar: React.FC = () => {
  const { user } = useAuth();
  const { onlineUsers } = useChat();
  const [expanded, setExpanded] = useState(false);

  // --- This is the logged-in user count, always shown ---
  const loggedInUserCount = onlineUsers.length;

  return (
    <div
      className="fixed left-4 right-4 sm:left-auto sm:right-auto z-40 transition-all duration-200 sm:w-full sm:max-w-none md:max-w-md lg:max-w-2xl sm:mx-auto"
      style={{
        bottom: expanded ? 10 : 0,
      }}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-2 bg-surface border-t border-muted shadow-md cursor-pointer"
        style={{
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: expanded ? 0 : 14,
          borderBottomRightRadius: expanded ? 0 : 14,
          marginBottom: expanded ? 0 : 10,
          width: '100%',
          minHeight: 48,
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <ChatBubbleLeftRightIcon className="w-5 h-5 sm:w-6 sm:h-6 text-info flex-shrink-0" />
          <span className="font-semibold text-sm sm:text-base select-none">Live Chat</span>
          {/* --- Connected users --- */}
          <span
            className="ml-1 sm:ml-2 text-xs font-semibold text-info bg-info/10 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0"
            title="Number of logged-in users online"
          >
            <span className="hidden sm:inline">
              {loggedInUserCount} user{loggedInUserCount === 1 ? '' : 's'} online
            </span>
            <span className="sm:hidden">{loggedInUserCount}</span>
          </span>
          {/* Show hint only if minimized and not logged in - hide on very small screens */}
          {!user && !expanded && (
            <span className="hidden md:inline ml-3 text-xs text-tertiary bg-muted px-2 py-0.5 rounded font-medium">
              Sign in to join the chat
            </span>
          )}
        </div>
        {expanded ? (
          <MinusIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        ) : (
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        )}
      </div>
      {/* Chat content */}
      <div
        className="transition-all duration-200 overflow-hidden"
        style={{
          maxHeight: expanded ? 420 : 0,
          minHeight: expanded ? 320 : 0,
          background: 'var(--color-surface)',
          boxShadow: expanded ? '0 -6px 24px 0 rgb(0 0 0 / 0.14)' : undefined,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          width: '100%',
        }}
      >
        {expanded && (
          <div className="relative h-full flex flex-col">
            <ChatWidget />
            {!user && (
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-surface via-transparent p-5 flex flex-col items-center justify-end z-10">
                <div className="text-center text-sm mb-2 text-content">
                  <span>Sign up or log in to join the conversation!</span>
                </div>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded bg-info text-surface font-semibold text-base shadow hover:bg-info/90 transition"
                >
                  Sign up to chat
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBar;
