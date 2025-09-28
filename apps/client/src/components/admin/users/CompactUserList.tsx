import React, { useState } from 'react';
import { bulkUpdateUsers } from '../../../api/admin';
import type { Role } from '@ems/types';
import { banUser, unbanUser } from '../../../api/moderation';

// Minimal user data for list view
export interface CompactUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  banStatus?: {
    isBanned: boolean;
    reason?: string;
    expiresAt?: string;
  };
}

interface CompactUserListProps {
  users: CompactUser[];
  loading: boolean;
  onUserUpdate: (userId: number) => void;
  onShowDetails: (userId: number) => void;
  selectedUsers: Set<number>;
  onUserSelect: (userId: number, selected: boolean) => void;
  onSelectAll: () => void;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

interface UserRowProps {
  user: CompactUser;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: () => void;
  onShowDetails: () => void;
}

const UserRow: React.FC<UserRowProps> = ({
  user,
  isSelected,
  onSelect,
  onUpdate,
  onShowDetails,
}) => {
  const [actionLoading, setActionLoading] = useState(false);

  const handleRoleToggle = async () => {
    setActionLoading(true);
    try {
      const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
      await bulkUpdateUsers({
        userIds: [user.id],
        operation: 'changeRole',
        params: { role: newRole },
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanToggle = async () => {
    if (!window.confirm(user.banStatus?.isBanned ? `Unban ${user.name}?` : `Ban ${user.name}?`))
      return;

    setActionLoading(true);
    try {
      if (user.banStatus?.isBanned) {
        await unbanUser(user.id);
      } else {
        await banUser(user.id, 'Banned by admin', undefined);
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle ban:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (user.banStatus?.isBanned) return { icon: '🚫', color: 'text-error', label: 'Banned' };
    if (!user.active) return { icon: '⏸️', color: 'text-warning', label: 'Inactive' };
    return { icon: '✅', color: 'text-success', label: 'Active' };
  };

  const getRoleBadge = () => {
    return user.role === 'ADMIN'
      ? { label: 'ADMIN', className: 'bg-primary text-surface' }
      : { label: 'USER', className: 'bg-muted text-content' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  };

  const status = getStatusIcon();
  const roleBadge = getRoleBadge();

  return (
    <div
      className={`grid grid-cols-12 gap-3 px-4 py-3 border-b border-muted hover:bg-muted/50 transition-colors items-center ${
        isSelected ? 'bg-primary/5 border-primary/20' : ''
      }`}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded border-muted"
        />
      </div>

      {/* User Info */}
      <div className="col-span-4 flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-surface font-medium text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-content truncate">{user.name}</div>
          <div className="text-xs text-tertiary truncate">{user.email}</div>
        </div>
      </div>

      {/* Role */}
      <div className="col-span-1">
        <span className={`px-2 py-1 rounded text-xs font-medium ${roleBadge.className}`}>
          {roleBadge.label}
        </span>
      </div>

      {/* Status */}
      <div className="col-span-1 flex items-center justify-center">
        <span className={`text-lg ${status.color}`} title={status.label}>
          {status.icon}
        </span>
      </div>

      {/* Join Date */}
      <div className="col-span-2 text-sm text-tertiary">{formatDate(user.createdAt)}</div>

      {/* Actions */}
      <div className="col-span-3 flex items-center space-x-2">
        <button
          onClick={handleRoleToggle}
          disabled={actionLoading}
          className="px-2 py-1 text-xs bg-secondary text-surface rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          title={`Make ${user.role === 'ADMIN' ? 'User' : 'Admin'}`}
        >
          {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
        </button>

        <button
          onClick={handleBanToggle}
          disabled={actionLoading}
          className={`px-2 py-1 text-xs rounded hover:opacity-90 transition-opacity disabled:opacity-50 ${
            user.banStatus?.isBanned ? 'bg-success text-surface' : 'bg-error text-surface'
          }`}
        >
          {user.banStatus?.isBanned ? 'Unban' : 'Ban'}
        </button>

        <button
          onClick={onShowDetails}
          className="px-2 py-1 text-xs bg-accent text-surface rounded hover:opacity-90 transition-opacity"
        >
          Details
        </button>
      </div>
    </div>
  );
};

const CompactUserList: React.FC<CompactUserListProps> = ({
  users,
  loading,
  onUserUpdate,
  onShowDetails,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  totalCount,
  hasMore,
  onLoadMore,
}) => {
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'changeRole' | ''>('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    const confirmMessage = `Apply "${bulkAction}" to ${selectedUsers.size} selected users?`;
    if (!window.confirm(confirmMessage)) return;

    setBulkLoading(true);
    try {
      const operation = {
        userIds: Array.from(selectedUsers),
        operation: bulkAction,
        params: {} as { role?: Role },
      };

      if (bulkAction === 'changeRole') {
        const role = window.prompt('Enter new role (USER or ADMIN):');
        if (!role || !['USER', 'ADMIN'].includes(role.toUpperCase())) return;
        operation.params = { role: role.toUpperCase() as Role };
      }

      await bulkUpdateUsers(operation);

      // Notify parent to refresh
      selectedUsers.forEach((userId) => onUserUpdate(userId));
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-muted rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-muted bg-muted/30">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold text-content">Users ({totalCount.toLocaleString()})</h3>
          {selectedUsers.size > 0 && (
            <span className="text-sm text-primary">{selectedUsers.size} selected</span>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="flex items-center space-x-2">
            <select
              value={bulkAction}
              onChange={(e) =>
                setBulkAction(e.target.value as 'activate' | 'deactivate' | 'changeRole' | '')
              }
              className="px-3 py-1 text-sm border border-muted rounded bg-surface"
            >
              <option value="">Bulk Actions</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="changeRole">Change Role</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || bulkLoading}
              className="px-3 py-1 text-sm bg-primary text-surface rounded hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {bulkLoading ? 'Processing...' : 'Apply'}
            </button>
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-secondary text-surface text-sm font-medium border-b border-muted">
        <div className="col-span-1 flex justify-center">
          <input
            type="checkbox"
            checked={users.length > 0 && selectedUsers.size === users.length}
            onChange={onSelectAll}
            className="rounded border-muted"
          />
        </div>
        <div className="col-span-4">User</div>
        <div className="col-span-1">Role</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Joined</div>
        <div className="col-span-3">Actions</div>
      </div>

      {/* User Rows */}
      <div className="min-h-[400px]">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-tertiary">Loading users...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-tertiary">No users found</div>
          </div>
        ) : (
          <>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelected={selectedUsers.has(user.id)}
                onSelect={(selected) => onUserSelect(user.id, selected)}
                onUpdate={() => onUserUpdate(user.id)}
                onShowDetails={() => onShowDetails(user.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-4 border-t border-muted bg-muted/30">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-surface rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : `Load More (${(totalCount - users.length).toLocaleString()} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default CompactUserList;
