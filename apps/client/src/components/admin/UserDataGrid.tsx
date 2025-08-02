import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { DetailedUser, BulkUserOperation } from '../../api/admin';
import type { Role, PublicBadge } from '@ems/types';
import { bulkUpdateUsers } from '../../api/admin';

interface UserDataGridProps {
  users: DetailedUser[];
  badges: PublicBadge[];
  onUserUpdate: (userId: number) => void;
  onBulkUpdate: () => void;
  loading?: boolean;
  className?: string;
}

interface UserRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    users: DetailedUser[];
    badges: PublicBadge[];
    selectedUsers: Set<number>;
    onUserSelect: (userId: number, selected: boolean) => void;
    onUserUpdate: (userId: number) => void;
  };
}

const UserRow: React.FC<UserRowProps> = ({ index, style, data }) => {
  const { users, badges, selectedUsers, onUserSelect, onUserUpdate } = data;
  const user = users[index];
  const [balance, setBalance] = useState(user.muskBucks);
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);

  const isSelected = selectedUsers.has(user.id);
  const isEven = index % 2 === 0;

  const handleRoleChange = async (newRole: Role) => {
    try {
      await bulkUpdateUsers({
        userIds: [user.id],
        operation: 'changeRole',
        params: { role: newRole },
      });
      onUserUpdate(user.id);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleActiveToggle = async (active: boolean) => {
    try {
      await bulkUpdateUsers({
        userIds: [user.id],
        operation: active ? 'activate' : 'deactivate',
      });
      onUserUpdate(user.id);
    } catch (error) {
      console.error('Failed to update active status:', error);
    }
  };

  const handleBalanceUpdate = async () => {
    if (balance === user.muskBucks) return;

    try {
      await bulkUpdateUsers({
        userIds: [user.id],
        operation: 'adjustBalance',
        params: { amount: balance },
      });
      onUserUpdate(user.id);
    } catch (error) {
      console.error('Failed to update balance:', error);
      setBalance(user.muskBucks); // Reset on error
    }
  };

  const handleBadgeAction = async (action: 'assign' | 'revoke') => {
    if (!selectedBadgeId) return;

    try {
      await bulkUpdateUsers({
        userIds: [user.id],
        operation: action === 'assign' ? 'assignBadge' : 'revokeBadge',
        params: { badgeId: selectedBadgeId },
      });
      onUserUpdate(user.id);
      setSelectedBadgeId(null);
    } catch (error) {
      console.error(`Failed to ${action} badge:`, error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (active: boolean, banStatus?: { isBanned: boolean }) => {
    if (banStatus?.isBanned) return 'text-error';
    return active ? 'text-success' : 'text-warning';
  };

  return (
    <div
      style={style}
      className={`grid grid-cols-12 gap-2 px-4 py-2 border-b border-muted text-sm items-center ${
        isEven ? 'bg-surface' : 'bg-muted'
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onUserSelect(user.id, e.target.checked)}
          className="rounded border-muted"
        />
      </div>

      {/* User Info */}
      <div className="col-span-2">
        <div className="font-medium text-content truncate">{user.name}</div>
        <div className="text-xs text-tertiary truncate">{user.email}</div>
      </div>

      {/* Role */}
      <div className="col-span-1">
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(e.target.value as Role)}
          className="w-full px-2 py-1 text-xs border border-muted rounded bg-surface"
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      {/* Status */}
      <div className="col-span-1 text-center">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={user.active}
            onChange={(e) => handleActiveToggle(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-2 h-2 rounded-full ${getStatusColor(user.active, user.banStatus)}`}>
            ●
          </div>
        </label>
      </div>

      {/* Balance */}
      <div className="col-span-1">
        <div className="flex items-center space-x-1">
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value))}
            onBlur={handleBalanceUpdate}
            onKeyPress={(e) => e.key === 'Enter' && handleBalanceUpdate()}
            className="w-16 px-1 py-1 text-xs border border-muted rounded bg-surface"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="col-span-2 text-xs text-tertiary">
        <div>Bets: {user.stats?.totalBets || 0}</div>
        <div>Win Rate: {((user.stats?.winRate || 0) * 100).toFixed(1)}%</div>
      </div>

      {/* Recent Activity */}
      <div className="col-span-1 text-xs text-tertiary">
        <div>Joined: {formatDate(user.createdAt.toString())}</div>
        {user.recentActivity?.lastLogin && (
          <div>Last: {formatDate(user.recentActivity.lastLogin)}</div>
        )}
      </div>

      {/* Badges */}
      <div className="col-span-2">
        <div className="flex items-center space-x-1">
          <select
            value={selectedBadgeId || ''}
            onChange={(e) => setSelectedBadgeId(Number(e.target.value) || null)}
            className="flex-1 px-2 py-1 text-xs border border-muted rounded bg-surface"
          >
            <option value="">Select badge...</option>
            {badges.map((badge) => (
              <option key={badge.id} value={badge.id}>
                {badge.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleBadgeAction('assign')}
            disabled={!selectedBadgeId}
            className="px-2 py-1 text-xs bg-primary text-surface rounded disabled:opacity-50 hover:opacity-90 transition"
          >
            +
          </button>
          <button
            onClick={() => handleBadgeAction('revoke')}
            disabled={!selectedBadgeId}
            className="px-2 py-1 text-xs bg-error text-surface rounded disabled:opacity-50 hover:opacity-90 transition"
          >
            -
          </button>
        </div>
        {user.badges && user.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {user.badges.slice(0, 3).map((badge) => (
              <span
                key={badge.id}
                className="px-1 py-0.5 text-xs bg-accent text-surface rounded truncate"
                title={badge.name}
              >
                {badge.name.slice(0, 8)}
              </span>
            ))}
            {user.badges.length > 3 && (
              <span className="text-xs text-tertiary">+{user.badges.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions Menu Trigger */}
      <div className="col-span-1 flex justify-center">
        <button
          className="p-1 text-tertiary hover:text-content rounded hover:bg-muted transition"
          title="More actions"
        >
          ⋮
        </button>
      </div>
    </div>
  );
};

const UserDataGrid: React.FC<UserDataGridProps> = ({
  users,
  badges,
  onUserUpdate,
  onBulkUpdate,
  loading = false,
  className = '',
}) => {
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [bulkOperation, setBulkOperation] = useState<BulkUserOperation['operation'] | ''>('');
  const [bulkParams, setBulkParams] = useState<any>({});

  const handleUserSelect = useCallback((userId: number, selected: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkOperation = async () => {
    if (selectedUsers.size === 0 || !bulkOperation) return;

    try {
      await bulkUpdateUsers({
        userIds: Array.from(selectedUsers),
        operation: bulkOperation,
        params: bulkParams,
      });

      setSelectedUsers(new Set());
      setBulkOperation('');
      setBulkParams({});
      onBulkUpdate();
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const rowData = useMemo(
    () => ({
      users,
      badges,
      selectedUsers,
      onUserSelect: handleUserSelect,
      onUserUpdate,
    }),
    [users, badges, selectedUsers, handleUserSelect, onUserUpdate],
  );

  return (
    <div className={`bg-surface border border-muted rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-muted">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content">
            Users ({users.length})
            {selectedUsers.size > 0 && (
              <span className="ml-2 text-sm text-primary">{selectedUsers.size} selected</span>
            )}
          </h3>

          {loading && <div className="text-sm text-tertiary">Loading...</div>}
        </div>

        {/* Bulk Operations */}
        {selectedUsers.size > 0 && (
          <div className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value as any)}
              className="px-3 py-2 border border-muted rounded bg-surface"
            >
              <option value="">Select action...</option>
              <option value="activate">Activate Users</option>
              <option value="deactivate">Deactivate Users</option>
              <option value="changeRole">Change Role</option>
              <option value="adjustBalance">Adjust Balance</option>
              <option value="assignBadge">Assign Badge</option>
              <option value="revokeBadge">Revoke Badge</option>
            </select>

            {bulkOperation === 'changeRole' && (
              <select
                value={bulkParams.role || ''}
                onChange={(e) => setBulkParams({ role: e.target.value })}
                className="px-3 py-2 border border-muted rounded bg-surface"
              >
                <option value="">Select role...</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            )}

            {bulkOperation === 'adjustBalance' && (
              <input
                type="number"
                placeholder="New balance"
                value={bulkParams.amount || ''}
                onChange={(e) => setBulkParams({ amount: Number(e.target.value) })}
                className="px-3 py-2 border border-muted rounded bg-surface w-32"
              />
            )}

            {(bulkOperation === 'assignBadge' || bulkOperation === 'revokeBadge') && (
              <select
                value={bulkParams.badgeId || ''}
                onChange={(e) => setBulkParams({ badgeId: Number(e.target.value) })}
                className="px-3 py-2 border border-muted rounded bg-surface"
              >
                <option value="">Select badge...</option>
                {badges.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleBulkOperation}
              disabled={
                !bulkOperation ||
                (bulkOperation !== 'activate' &&
                  bulkOperation !== 'deactivate' &&
                  !Object.keys(bulkParams).length)
              }
              className="px-4 py-2 bg-primary text-surface rounded disabled:opacity-50 hover:opacity-90 transition"
            >
              Apply to {selectedUsers.size} users
            </button>
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-secondary text-surface text-sm font-medium border-b border-muted">
        <div className="col-span-1 flex justify-center">
          <input
            type="checkbox"
            checked={users.length > 0 && selectedUsers.size === users.length}
            onChange={handleSelectAll}
            className="rounded border-muted"
          />
        </div>
        <div className="col-span-2">User</div>
        <div className="col-span-1">Role</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Balance</div>
        <div className="col-span-2">Stats</div>
        <div className="col-span-1">Activity</div>
        <div className="col-span-2">Badges</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Virtual Scrolling List */}
      <div className="h-96">
        {users.length > 0 ? (
          <List height={384} width="100%" itemCount={users.length} itemSize={64} itemData={rowData}>
            {UserRow}
          </List>
        ) : (
          <div className="flex items-center justify-center h-full text-tertiary">
            {loading ? 'Loading users...' : 'No users found'}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDataGrid;
