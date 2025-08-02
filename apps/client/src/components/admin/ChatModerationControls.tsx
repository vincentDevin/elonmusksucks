// apps/client/src/components/admin/ChatModerationControls.tsx
import React from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../hooks/useAuth';

interface ChatModerationControlsProps {
  messageId?: number;
  userId?: number;
  userName?: string;
  onAction?: () => void;
}

const ChatModerationControls: React.FC<ChatModerationControlsProps> = ({
  messageId,
  userId,
  userName,
  onAction,
}) => {
  const socket = useSocket();
  const { user } = useAuth();

  // Only show for admins
  if (user?.role !== 'ADMIN') {
    return null;
  }

  const handleDeleteMessage = () => {
    if (!messageId || !socket) return;

    const reason = prompt('Enter reason for deleting this message:');
    if (!reason) return;

    socket.emit(
      'admin:deleteMessage',
      {
        messageId,
        reason,
      },
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          onAction?.();
        } else {
          alert(`Failed to delete message: ${response.error}`);
        }
      },
    );
  };

  const handleMuteUser = () => {
    if (!userId || !socket) return;

    const durationStr = prompt('Enter mute duration in minutes:', '60');
    if (!durationStr) return;

    const duration = parseInt(durationStr);
    if (isNaN(duration) || duration <= 0) {
      alert('Invalid duration');
      return;
    }

    const reason = prompt('Enter reason for muting this user:');
    if (!reason) return;

    socket.emit(
      'admin:muteUser',
      {
        userId,
        duration,
        reason,
      },
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          alert(`User ${userName} muted for ${duration} minutes`);
          onAction?.();
        } else {
          alert(`Failed to mute user: ${response.error}`);
        }
      },
    );
  };

  const handleKickUser = () => {
    if (!userId || !socket) return;

    const reason = prompt('Enter reason for kicking this user:');
    if (!reason) return;

    socket.emit(
      'admin:kickUser',
      {
        userId,
        reason,
      },
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          alert(`User ${userName} kicked`);
          onAction?.();
        } else {
          alert(`Failed to kick user: ${response.error}`);
        }
      },
    );
  };

  const handleBanUser = (banType: 'TEMPORARY' | 'PERMANENT') => {
    if (!userId || !socket) return;

    let duration;
    if (banType === 'TEMPORARY') {
      const durationStr = prompt('Enter ban duration in minutes:', '1440'); // 24 hours default
      if (!durationStr) return;
      duration = parseInt(durationStr);
      if (isNaN(duration) || duration <= 0) {
        alert('Invalid duration');
        return;
      }
    }

    const reason = prompt(`Enter reason for ${banType.toLowerCase()} ban:`);
    if (!reason) return;

    const confirmMessage =
      banType === 'PERMANENT'
        ? `Are you sure you want to permanently ban ${userName}?`
        : `Are you sure you want to ban ${userName} for ${duration} minutes?`;

    if (!confirm(confirmMessage)) return;

    socket.emit(
      'admin:banUser',
      {
        userId,
        banType,
        reason,
        duration,
      },
      (response: { success: boolean; error?: string }) => {
        if (response.success) {
          alert(`User ${userName} banned`);
          onAction?.();
        } else {
          alert(`Failed to ban user: ${response.error}`);
        }
      },
    );
  };

  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {messageId && (
        <button
          onClick={handleDeleteMessage}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          title="Delete Message"
        >
          🗑️
        </button>
      )}

      {userId && (
        <>
          <button
            onClick={handleMuteUser}
            className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            title="Mute User"
          >
            🔇
          </button>

          <button
            onClick={handleKickUser}
            className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            title="Kick User"
          >
            👢
          </button>

          <button
            onClick={() => handleBanUser('TEMPORARY')}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            title="Temporary Ban"
          >
            ⏰
          </button>

          <button
            onClick={() => handleBanUser('PERMANENT')}
            className="px-2 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
            title="Permanent Ban"
          >
            🔨
          </button>
        </>
      )}
    </div>
  );
};

export default ChatModerationControls;
