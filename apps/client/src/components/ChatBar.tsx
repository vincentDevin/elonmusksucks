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
      className="fixed left-0 right-0 z-40 transition-all duration-200"
      style={{
        bottom: expanded ? 20 : 0,
      }}
    >
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-6 py-2 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 shadow-md cursor-pointer"
        style={{
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: expanded ? 0 : 14,
          borderBottomRightRadius: expanded ? 0 : 14,
          maxWidth: 700,
          margin: '0 auto',
          marginBottom: expanded ? 0 : 20,
          width: '100%',
          minHeight: 48,
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-base select-none">Live Chat</span>
          {/* --- Connected users --- */}
          <span
            className="ml-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded"
            title="Number of logged-in users online"
          >
            {loggedInUserCount} user{loggedInUserCount === 1 ? '' : 's'} online
          </span>
          {/* Show hint only if minimized and not logged in */}
          {!user && !expanded && (
            <span className="ml-3 text-xs text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-medium">
              Sign in to join the chat
            </span>
          )}
        </div>
        {expanded ? <MinusIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
      </div>
      {/* Chat content */}
      <div
        className="transition-all duration-200 overflow-hidden"
        style={{
          maxHeight: expanded ? 520 : 0,
          minHeight: expanded ? 380 : 0,
          background: 'var(--color-surface)',
          boxShadow: expanded ? '0 -6px 24px 0 rgb(0 0 0 / 0.14)' : undefined,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          maxWidth: 700,
          margin: '0 auto',
        }}
      >
        {expanded && (
          <div className="relative h-full flex flex-col">
            <ChatWidget />
            {!user && (
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white dark:from-neutral-900 via-transparent p-5 flex flex-col items-center justify-end z-10">
                <div className="text-center text-sm mb-2 text-gray-700 dark:text-gray-200">
                  <span>Sign up or log in to join the conversation!</span>
                </div>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 transition"
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
