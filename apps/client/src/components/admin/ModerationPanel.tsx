// Rollback: Remove useCallback import and unwrap all socket handlers from useCallback
// apps/client/src/components/admin/ModerationPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import * as moderationApi from '../../api/moderation';
import type { ModerationLogEntry } from '../../api/moderation';
import { AdminSocketEvents } from '@ems/types';

interface QuickActionForm {
  userId: number;
  reason: string;
  duration?: number;
}

const ModerationPanel: React.FC = () => {
  const [recentActions, setRecentActions] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAction, setShowQuickAction] = useState<string | null>(null);
  const [quickActionForm, setQuickActionForm] = useState<QuickActionForm>({
    userId: 0,
    reason: '',
    duration: 60,
  });
  const socket = useSocket();

  // Load recent moderation actions
  const loadRecentActions = async () => {
    try {
      setLoading(true);
      const actions = await moderationApi.getRecentModerationActions(20);
      setRecentActions(actions);
    } catch (err) {
      console.error('Error loading recent actions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle quick actions
  const handleQuickAction = async (action: string) => {
    if (!quickActionForm.userId || !quickActionForm.reason.trim()) {
      alert('Please provide user ID and reason');
      return;
    }

    try {
      if (socket) {
        switch (action) {
          case 'ban':
            socket.emit(
              'admin:banUser',
              {
                userId: quickActionForm.userId,
                banType: 'PERMANENT',
                reason: quickActionForm.reason,
              },
              (response: { success: boolean; error?: string }) => {
                if (response.success) {
                  alert('User banned successfully');
                  setShowQuickAction(null);
                  setQuickActionForm({ userId: 0, reason: '', duration: 60 });
                  loadRecentActions();
                } else {
                  alert(`Failed to ban user: ${response.error}`);
                }
              },
            );
            break;

          case 'tempban':
            socket.emit(
              'admin:banUser',
              {
                userId: quickActionForm.userId,
                banType: 'TEMPORARY',
                reason: quickActionForm.reason,
                duration: quickActionForm.duration || 60,
              },
              (response: { success: boolean; error?: string }) => {
                if (response.success) {
                  alert('User temporarily banned successfully');
                  setShowQuickAction(null);
                  setQuickActionForm({ userId: 0, reason: '', duration: 60 });
                  loadRecentActions();
                } else {
                  alert(`Failed to ban user: ${response.error}`);
                }
              },
            );
            break;

          case 'mute':
            socket.emit(
              'admin:muteUser',
              {
                userId: quickActionForm.userId,
                duration: quickActionForm.duration || 60,
                reason: quickActionForm.reason,
              },
              (response: { success: boolean; error?: string }) => {
                if (response.success) {
                  alert('User muted successfully');
                  setShowQuickAction(null);
                  setQuickActionForm({ userId: 0, reason: '', duration: 60 });
                  loadRecentActions();
                } else {
                  alert(`Failed to mute user: ${response.error}`);
                }
              },
            );
            break;

          case 'kick':
            socket.emit(
              'admin:kickUser',
              {
                userId: quickActionForm.userId,
                reason: quickActionForm.reason,
              },
              (response: { success: boolean; error?: string }) => {
                if (response.success) {
                  alert('User kicked successfully');
                  setShowQuickAction(null);
                  setQuickActionForm({ userId: 0, reason: '', duration: 60 });
                  loadRecentActions();
                } else {
                  alert(`Failed to kick user: ${response.error}`);
                }
              },
            );
            break;
        }
      }
    } catch (err) {
      alert('Error performing moderation action');
      console.error('Moderation action error:', err);
    }
  };

  // Format action display
  const formatAction = (action: string) => {
    switch (action) {
      case 'USER_BAN':
        return 'Banned';
      case 'USER_UNBAN':
        return 'Unbanned';
      case 'USER_MUTE':
        return 'Muted';
      case 'USER_KICK':
        return 'Kicked';
      case 'MESSAGE_DELETE':
        return 'Deleted Message';
      case 'POST_DELETE':
        return 'Deleted Post';
      default:
        return action;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Stable handler for socket events
  const handleModerationAction = useCallback(() => {
    loadRecentActions(); // Reload recent actions
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on(AdminSocketEvents.ModerationUserBan, handleModerationAction);
      socket.on(AdminSocketEvents.ModerationUserUnban, handleModerationAction);
      socket.on(AdminSocketEvents.ModerationUserMute, handleModerationAction);
      socket.on(AdminSocketEvents.ModerationUserKick, handleModerationAction);
      socket.on(AdminSocketEvents.ModerationMessageDelete, handleModerationAction);
      socket.on(AdminSocketEvents.ModerationPostDelete, handleModerationAction);

      return () => {
        socket.off(AdminSocketEvents.ModerationUserBan, handleModerationAction);
        socket.off(AdminSocketEvents.ModerationUserUnban, handleModerationAction);
        socket.off(AdminSocketEvents.ModerationUserMute, handleModerationAction);
        socket.off(AdminSocketEvents.ModerationUserKick, handleModerationAction);
        socket.off(AdminSocketEvents.ModerationMessageDelete, handleModerationAction);
        socket.off(AdminSocketEvents.ModerationPostDelete, handleModerationAction);
      };
    }
  }, [socket, handleModerationAction]);

  // Load on mount
  useEffect(() => {
    loadRecentActions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-[var(--color-background)] border border-[var(--color-muted)] rounded-lg p-4">
        <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
          Quick Moderation Actions
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => setShowQuickAction('ban')}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Ban User
          </button>
          <button
            onClick={() => setShowQuickAction('tempban')}
            className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Temp Ban
          </button>
          <button
            onClick={() => setShowQuickAction('mute')}
            className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Mute User
          </button>
          <button
            onClick={() => setShowQuickAction('kick')}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Kick User
          </button>
        </div>

        {/* Quick Action Form */}
        {showQuickAction && (
          <div className="border-t border-[var(--color-muted)] pt-4">
            <h4 className="font-medium text-[var(--color-content)] mb-3">
              {showQuickAction === 'ban'
                ? 'Permanent Ban'
                : showQuickAction === 'tempban'
                  ? 'Temporary Ban'
                  : showQuickAction === 'mute'
                    ? 'Mute User'
                    : 'Kick User'}
            </h4>

            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-content)] mb-1">
                  User ID
                </label>
                <input
                  type="number"
                  value={quickActionForm.userId || ''}
                  onChange={(e) =>
                    setQuickActionForm((prev) => ({
                      ...prev,
                      userId: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-[var(--color-muted)] rounded bg-[var(--color-background)] text-[var(--color-content)]"
                  placeholder="Enter user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-content)] mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={quickActionForm.reason}
                  onChange={(e) =>
                    setQuickActionForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-[var(--color-muted)] rounded bg-[var(--color-background)] text-[var(--color-content)]"
                  placeholder="Enter reason"
                />
              </div>

              {(showQuickAction === 'tempban' || showQuickAction === 'mute') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-content)] mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={quickActionForm.duration || ''}
                    onChange={(e) =>
                      setQuickActionForm((prev) => ({
                        ...prev,
                        duration: parseInt(e.target.value) || 60,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[var(--color-muted)] rounded bg-[var(--color-background)] text-[var(--color-content)]"
                    placeholder="Duration in minutes"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleQuickAction(showQuickAction)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:opacity-80 transition-opacity"
                >
                  Execute
                </button>
                <button
                  onClick={() => setShowQuickAction(null)}
                  className="px-4 py-2 bg-[var(--color-muted)] text-[var(--color-content)] rounded hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Actions */}
      <div className="bg-[var(--color-background)] border border-[var(--color-muted)] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-primary)]">
            Recent Moderation Actions
          </h3>
          <button
            onClick={loadRecentActions}
            className="px-3 py-1 text-sm bg-[var(--color-muted)] text-[var(--color-content)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : recentActions.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-muted)]">
            No recent moderation actions
          </div>
        ) : (
          <div className="space-y-2">
            {recentActions.map((action) => (
              <div
                key={action.id}
                className="flex justify-between items-center py-2 px-3 bg-[var(--color-muted)] bg-opacity-20 rounded"
              >
                <div className="flex-1">
                  <span className="font-medium text-[var(--color-content)]">
                    {action.moderator.name}
                  </span>
                  <span className="mx-2 text-[var(--color-muted)]">
                    {formatAction(action.action)}
                  </span>
                  {action.targetUser && (
                    <span className="font-medium text-[var(--color-content)]">
                      {action.targetUser.name}
                    </span>
                  )}
                  {action.reason && (
                    <span className="ml-2 text-sm text-[var(--color-muted)]">
                      - {action.reason}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--color-muted)]">
                  {formatTimestamp(action.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModerationPanel;
