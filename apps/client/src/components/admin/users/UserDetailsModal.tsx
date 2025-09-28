import React, { useState, useEffect } from 'react';
import { getUserDetails, bulkUpdateUsers } from '../../../api/admin';
import type { DetailedUser, BulkUserOperation } from '../../../api/admin';
import type { Role, PublicBadge } from '@ems/types';
import { banUser, unbanUser } from '../../../api/moderation';

interface UserDetailsModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (userId: number) => void;
  badges?: PublicBadge[];
}

interface UserProfileTab {
  id: string;
  label: string;
  icon: string;
}

const tabs: UserProfileTab[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'financial', label: 'Financial', icon: '💰' },
  { id: 'activity', label: 'Activity', icon: '📊' },
  { id: 'admin', label: 'Admin', icon: '⚙️' },
];

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onUserUpdate,
  badges,
}) => {
  const [user, setUser] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Form states
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    role: 'USER' as Role,
    muskBucks: 0,
    active: true,
  });

  // Load user details when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUserDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  const loadUserDetails = async () => {
    setLoading(true);
    try {
      const userDetails = await getUserDetails(userId);
      setUser(userDetails);
      setFormData({
        role: userDetails.role,
        muskBucks: userDetails.muskBucks,
        active: userDetails.active,
      });
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const operations: BulkUserOperation[] = [];

      if (formData.role !== user.role) {
        operations.push({
          userIds: [userId],
          operation: 'changeRole',
          params: { role: formData.role },
        });
      }

      if (formData.muskBucks !== user.muskBucks) {
        operations.push({
          userIds: [userId],
          operation: 'adjustBalance',
          params: { amount: formData.muskBucks },
        });
      }

      if (formData.active !== user.active) {
        operations.push({
          userIds: [userId],
          operation: formData.active ? 'activate' : 'deactivate',
        });
      }

      for (const operation of operations) {
        await bulkUpdateUsers(operation);
      }

      onUserUpdate(userId);
      setEditMode(false);
      await loadUserDetails(); // Refresh data
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBanToggle = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (user.banStatus?.isBanned) {
        await unbanUser(userId);
      } else {
        await banUser(userId, 'Banned by admin', undefined);
      }
      onUserUpdate(userId);
      await loadUserDetails();
    } catch (error) {
      console.error('Failed to toggle ban status:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-muted rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-surface font-bold text-lg">
                {user?.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-content">
                {loading ? 'Loading...' : user?.name}
              </h2>
              <p className="text-tertiary">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-muted">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-tertiary hover:text-content'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-tertiary">Loading user details...</div>
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && user && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-content mb-4">Basic Information</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-tertiary">Full Name</label>
                          <div className="text-content">{user.name}</div>
                        </div>
                        <div>
                          <label className="text-sm text-tertiary">Email</label>
                          <div className="text-content">{user.email}</div>
                        </div>
                        <div>
                          <label className="text-sm text-tertiary">User ID</label>
                          <div className="text-content">#{user.id}</div>
                        </div>
                        <div>
                          <label className="text-sm text-tertiary">Joined</label>
                          <div className="text-content">{formatDate(user.createdAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-content mb-4">Account Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-3 h-3 rounded-full ${user.active ? 'bg-success' : 'bg-warning'}`}
                          />
                          <span className="text-content">
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {user.banStatus?.isBanned && (
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-error" />
                            <span className="text-error">Banned</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.role === 'ADMIN'
                                ? 'bg-primary text-surface'
                                : 'bg-muted text-content'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  {user.badges && user.badges.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-content mb-4">
                        Badges & Achievements
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {user.badges.map((badge) => (
                          <span
                            key={badge.id}
                            className="px-3 py-1 bg-accent text-surface rounded-full text-sm font-medium"
                          >
                            {badge.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Tab */}
              {activeTab === 'financial' && user && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(user.muskBucks)}
                      </div>
                      <div className="text-sm text-tertiary">Current Balance</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-success">
                        {user.stats?.totalBets || 0}
                      </div>
                      <div className="text-sm text-tertiary">Total Bets</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-info">
                        {((user.stats?.winRate || 0) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-tertiary">Win Rate</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-content mb-4">Financial Summary</h3>
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-tertiary">Total Wagered:</span>
                        <span className="text-content">
                          {formatCurrency(user.stats?.totalWagered || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tertiary">Total Won:</span>
                        <span className="text-success">
                          {formatCurrency(user.stats?.totalWon || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tertiary">Net Profit:</span>
                        <span
                          className={`${(user.stats?.totalWon || 0) - (user.stats?.totalWagered || 0) >= 0 ? 'text-success' : 'text-error'}`}
                        >
                          {formatCurrency(
                            (user.stats?.totalWon || 0) - (user.stats?.totalWagered || 0),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && user && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-content mb-4">Login Activity</h3>
                      <div className="space-y-2">
                        {user.recentActivity?.lastLogin && (
                          <div className="flex justify-between">
                            <span className="text-tertiary">Last Login:</span>
                            <span className="text-content">
                              {formatDate(user.recentActivity.lastLogin)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-tertiary">Account Created:</span>
                          <span className="text-content">{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-content mb-4">Platform Activity</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-tertiary">Predictions Made:</span>
                          <span className="text-content">{user.stats?.totalPredictions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-tertiary">Comments Posted:</span>
                          <span className="text-content">{user.stats?.totalComments || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Tab */}
              {activeTab === 'admin' && user && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-content">Admin Controls</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditMode(!editMode)}
                        className="px-4 py-2 bg-primary text-surface rounded-lg hover:opacity-90 transition-opacity"
                      >
                        {editMode ? 'Cancel' : 'Edit User'}
                      </button>
                      {editMode && (
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 bg-success text-surface rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-content mb-2">Role</label>
                        {editMode ? (
                          <select
                            value={formData.role}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, role: e.target.value as Role }))
                            }
                            className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <div className="text-content">{user.role}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content mb-2">
                          Balance
                        </label>
                        {editMode ? (
                          <input
                            type="number"
                            value={formData.muskBucks}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                muskBucks: Number(e.target.value),
                              }))
                            }
                            className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
                          />
                        ) : (
                          <div className="text-content">{formatCurrency(user.muskBucks)}</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-content mb-2">
                          Account Status
                        </label>
                        {editMode ? (
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.active}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, active: e.target.checked }))
                              }
                              className="rounded border-muted"
                            />
                            <span className="text-content">Active</span>
                          </label>
                        ) : (
                          <div className="text-content">{user.active ? 'Active' : 'Inactive'}</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-md font-medium text-content mb-2">Quick Actions</h4>
                        <div className="space-y-2">
                          <button
                            onClick={handleBanToggle}
                            disabled={saving}
                            className={`w-full px-4 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50 ${
                              user.banStatus?.isBanned
                                ? 'bg-success text-surface hover:opacity-90'
                                : 'bg-error text-surface hover:opacity-90'
                            }`}
                          >
                            {saving
                              ? 'Processing...'
                              : user.banStatus?.isBanned
                                ? 'Unban User'
                                : 'Ban User'}
                          </button>
                        </div>
                      </div>

                      {user.banStatus?.isBanned && (
                        <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                          <div className="text-sm font-medium text-error mb-1">Banned User</div>
                          <div className="text-xs text-tertiary">
                            Reason: {user.banStatus.reason || 'No reason provided'}
                          </div>
                          {user.banStatus.expiresAt && (
                            <div className="text-xs text-tertiary">
                              Expires: {formatDate(user.banStatus.expiresAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
