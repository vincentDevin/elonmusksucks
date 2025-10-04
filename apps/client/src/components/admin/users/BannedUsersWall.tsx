// apps/client/src/components/admin/BannedUsersWall.tsx
import React, { useState, useEffect } from 'react';
import { SOCKET_EVENTS } from '@ems/types';
import { useSocket } from '../../../contexts/SocketContext';
import * as moderationApi from '../../../api/moderation';
import type { UserBan } from '../../../api/moderation';

const BannedUsersWall: React.FC = () => {
  const [bans, setBans] = useState<UserBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  // Load banned users
  const loadBannedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const bannedUsers = await moderationApi.getActiveBans();
      setBans(bannedUsers);
    } catch (err) {
      setError('Failed to load banned users');
      console.error('Error loading banned users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle unban action
  const handleUnban = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to unban ${userName}?`)) {
      return;
    }

    try {
      if (socket) {
        // Use WebSocket for immediate response
        socket.emit(
          'admin:unbanUser',
          { userId },
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              setBans((prev) => prev.filter((ban) => ban.userId !== userId));
            } else {
              alert(`Failed to unban user: ${response.error}`);
            }
          },
        );
      } else {
        // Fallback to HTTP API
        await moderationApi.unbanUser(userId);
        setBans((prev) => prev.filter((ban) => ban.userId !== userId));
      }
    } catch (err) {
      alert('Failed to unban user');
      console.error('Error unbanning user:', err);
    }
  };

  // Format duration for display
  const formatDuration = (ban: UserBan) => {
    if (ban.banType === 'permanent') {
      return 'Permanent';
    }

    if (ban.expiresAt) {
      const expiryDate = new Date(ban.expiresAt);
      const now = new Date();

      if (expiryDate <= now) {
        return 'Expired';
      }

      const diffMs = expiryDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `${diffDays} day(s)`;
      } else if (diffHours > 0) {
        return `${diffHours} hour(s)`;
      } else {
        return `${diffMins} minute(s)`;
      }
    }

    return 'Unknown';
  };

  // Format ban date
  const formatBanDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      const handleUserBan = () => {
        loadBannedUsers(); // Reload the list
      };

      const handleUserUnban = (data: { targetUserId: number }) => {
        setBans((prev) => prev.filter((ban) => ban.userId !== data.targetUserId));
      };

      socket.on(SOCKET_EVENTS.ADMIN_MODERATION_USER_BAN, handleUserBan);
      socket.on(SOCKET_EVENTS.ADMIN_MODERATION_USER_UNBAN, handleUserUnban);

      return () => {
        socket.off(SOCKET_EVENTS.ADMIN_MODERATION_USER_BAN, handleUserBan);
        socket.off(SOCKET_EVENTS.ADMIN_MODERATION_USER_UNBAN, handleUserUnban);
      };
    }
  }, [socket]);

  // Load banned users on mount
  useEffect(() => {
    loadBannedUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--color-accent)] mb-4">{error}</p>
        <button
          onClick={loadBannedUsers}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--color-primary)]">
          Banned Users ({bans.length})
        </h2>
        <button
          onClick={loadBannedUsers}
          className="px-3 py-1 text-sm bg-[var(--color-muted)] text-[var(--color-content)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {bans.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-muted)]">No banned users</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bans.map((ban) => (
            <div
              key={ban.id}
              className="border border-[var(--color-muted)] rounded-lg p-4 bg-[var(--color-background)] shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--color-content)]">{ban.user.name}</h3>
                  <p className="text-sm text-[var(--color-muted)]">{ban.user.email}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    ban.banType === 'permanent'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {ban.banType}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-[var(--color-content)]">Reason:</span>
                  <p className="text-[var(--color-muted)] break-words">{ban.reason}</p>
                </div>

                <div>
                  <span className="font-medium text-[var(--color-content)]">Duration:</span>
                  <span className="ml-2 text-[var(--color-muted)]">{formatDuration(ban)}</span>
                </div>

                <div>
                  <span className="font-medium text-[var(--color-content)]">Banned:</span>
                  <span className="ml-2 text-[var(--color-muted)]">
                    {formatBanDate(ban.createdAt)}
                  </span>
                </div>

                {ban.expiresAt && (
                  <div>
                    <span className="font-medium text-[var(--color-content)]">Expires:</span>
                    <span className="ml-2 text-[var(--color-muted)]">
                      {formatBanDate(ban.expiresAt)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--color-muted)]">
                <button
                  onClick={() => handleUnban(ban.userId, ban.user.name)}
                  className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Unban User
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BannedUsersWall;
