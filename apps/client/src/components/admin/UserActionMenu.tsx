import React, { useState, useRef, useEffect } from 'react';
import type { DetailedUser, BulkUserOperation } from '../../api/admin';
import type { Role, PublicBadge } from '@ems/types';
import { bulkUpdateUsers, getUserDetails } from '../../api/admin';

interface UserActionMenuProps {
  user: DetailedUser;
  badges: PublicBadge[];
  onUserUpdate: (userId: number) => void;
}

interface ActionMenuItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  variant?: 'default' | 'warning' | 'danger';
  disabled?: boolean;
}

const UserActionMenu: React.FC<UserActionMenuProps> = ({
  user,
  badges,
  onUserUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | null>(null);
  const [balanceAmount, setBalanceAmount] = useState(user.muskBucks);
  const [newRole, setNewRole] = useState<Role>(user.role);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<'permanent' | '1d' | '7d' | '30d'>('1d');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performAction = async (operation: BulkUserOperation) => {
    setLoading(true);
    try {
      await bulkUpdateUsers(operation);
      onUserUpdate(user.id);
      setShowModal(null);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = () => {
    performAction({
      userIds: [user.id],
      operation: 'changeRole',
      params: { role: newRole }
    });
  };

  const handleBalanceAdjust = () => {
    performAction({
      userIds: [user.id],
      operation: 'adjustBalance',
      params: { amount: balanceAmount }
    });
  };

  const handleBadgeAssign = () => {
    if (!selectedBadgeId) return;
    performAction({
      userIds: [user.id],
      operation: 'assignBadge',
      params: { badgeId: selectedBadgeId }
    });
  };

  const handleBadgeRevoke = () => {
    if (!selectedBadgeId) return;
    performAction({
      userIds: [user.id],
      operation: 'revokeBadge',
      params: { badgeId: selectedBadgeId }
    });
  };

  const handleActivateToggle = () => {
    performAction({
      userIds: [user.id],
      operation: user.active ? 'deactivate' : 'activate'
    });
  };

  const handleViewDetails = async () => {
    try {
      const details = await getUserDetails(user.id);
      console.log('User details:', details);
      // This would typically open a detailed view modal
      alert(`User Details:\nName: ${details.name}\nEmail: ${details.email}\nTotal Bets: ${details.stats?.totalBets || 0}\nWin Rate: ${((details.stats?.winRate || 0) * 100).toFixed(1)}%`);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
    setIsOpen(false);
  };

  const formatUserBadges = () => {
    if (!user.badges || user.badges.length === 0) return 'No badges';
    return user.badges.map(b => b.name).join(', ');
  };

  const menuItems: ActionMenuItem[] = [
    {
      id: 'view-details',
      label: 'View Details',
      icon: '👤',
      action: handleViewDetails,
    },
    {
      id: 'change-role',
      label: 'Change Role',
      icon: '🔑',
      action: () => setShowModal('role'),
    },
    {
      id: 'adjust-balance',
      label: 'Adjust Balance',
      icon: '💰',
      action: () => setShowModal('balance'),
    },
    {
      id: 'toggle-active',
      label: user.active ? 'Deactivate' : 'Activate',
      icon: user.active ? '🔒' : '🔓',
      action: handleActivateToggle,
      variant: user.active ? 'warning' : 'default',
    },
    {
      id: 'assign-badge',
      label: 'Assign Badge',
      icon: '🏆',
      action: () => setShowModal('assign-badge'),
    },
    {
      id: 'revoke-badge',
      label: 'Revoke Badge',
      icon: '❌',
      action: () => setShowModal('revoke-badge'),
      disabled: !user.badges || user.badges.length === 0,
    },
    {
      id: 'ban-user',
      label: user.banStatus?.isBanned ? 'Unban User' : 'Ban User',
      icon: '🚫',
      action: () => setShowModal('ban'),
      variant: 'danger',
    },
  ];

  const getVariantStyles = (variant: ActionMenuItem['variant']) => {
    switch (variant) {
      case 'warning':
        return 'text-warning hover:bg-warning hover:text-surface';
      case 'danger':
        return 'text-error hover:bg-error hover:text-surface';
      default:
        return 'text-content hover:bg-muted';
    }
  };

  const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({
    title,
    children,
    onClose
  }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border border-muted rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content">{title}</h3>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content p-1 rounded hover:bg-muted"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-tertiary hover:text-content rounded-lg hover:bg-muted transition-colors"
          title="User actions"
        >
          ⋮
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-muted rounded-lg shadow-lg z-10">
            <div className="p-2 border-b border-muted">
              <div className="text-sm font-medium text-content truncate">{user.name}</div>
              <div className="text-xs text-tertiary truncate">{user.email}</div>
            </div>
            
            <div className="py-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      item.action();
                      if (item.id !== 'view-details') setIsOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-2 ${
                    item.disabled 
                      ? 'text-tertiary cursor-not-allowed' 
                      : `${getVariantStyles(item.variant)} cursor-pointer`
                  } transition-colors`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showModal === 'role' && (
        <Modal title="Change User Role" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Select new role for {user.name}
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="text-sm text-tertiary">
              Current role: <span className="font-medium">{user.role}</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRoleChange}
                disabled={loading || newRole === user.role}
                className="flex-1 px-4 py-2 bg-primary text-surface rounded-lg disabled:opacity-50 hover:opacity-90 transition"
              >
                {loading ? 'Updating...' : 'Update Role'}
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Balance Adjustment Modal */}
      {showModal === 'balance' && (
        <Modal title="Adjust User Balance" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                New balance for {user.name}
              </label>
              <input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
                placeholder="Enter new balance"
              />
            </div>
            <div className="text-sm text-tertiary">
              Current balance: <span className="font-medium">{user.muskBucks} MuskBucks</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBalanceAdjust}
                disabled={loading || balanceAmount === user.muskBucks}
                className="flex-1 px-4 py-2 bg-primary text-surface rounded-lg disabled:opacity-50 hover:opacity-90 transition"
              >
                {loading ? 'Updating...' : 'Update Balance'}
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Badge Assignment Modal */}
      {showModal === 'assign-badge' && (
        <Modal title="Assign Badge" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Select badge to assign to {user.name}
              </label>
              <select
                value={selectedBadgeId || ''}
                onChange={(e) => setSelectedBadgeId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
              >
                <option value="">Select a badge...</option>
                {badges.filter(badge => !user.badges?.some(ub => ub.id === badge.id)).map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-tertiary">
              Current badges: {formatUserBadges()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBadgeAssign}
                disabled={loading || !selectedBadgeId}
                className="flex-1 px-4 py-2 bg-primary text-surface rounded-lg disabled:opacity-50 hover:opacity-90 transition"
              >
                {loading ? 'Assigning...' : 'Assign Badge'}
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Badge Revocation Modal */}
      {showModal === 'revoke-badge' && (
        <Modal title="Revoke Badge" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                Select badge to revoke from {user.name}
              </label>
              <select
                value={selectedBadgeId || ''}
                onChange={(e) => setSelectedBadgeId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
              >
                <option value="">Select a badge...</option>
                {user.badges?.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBadgeRevoke}
                disabled={loading || !selectedBadgeId}
                className="flex-1 px-4 py-2 bg-error text-surface rounded-lg disabled:opacity-50 hover:opacity-90 transition"
              >
                {loading ? 'Revoking...' : 'Revoke Badge'}
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ban User Modal */}
      {showModal === 'ban' && (
        <Modal title={user.banStatus?.isBanned ? "Unban User" : "Ban User"} onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            {!user.banStatus?.isBanned ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-content mb-2">
                    Ban reason
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content h-20 resize-none"
                    placeholder="Enter reason for banning this user..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-2">
                    Ban duration
                  </label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value as any)}
                    className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
                  >
                    <option value="1d">1 Day</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="text-sm text-content">
                <p className="mb-2">This user is currently banned.</p>
                <p className="text-tertiary">Reason: {user.banStatus.reason || 'No reason provided'}</p>
                <p className="text-tertiary">Type: {user.banStatus.banType || 'Unknown'}</p>
                {user.banStatus.expiresAt && (
                  <p className="text-tertiary">Expires: {new Date(user.banStatus.expiresAt).toLocaleDateString()}</p>
                )}
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // This would need implementation in the backend
                  console.log(user.banStatus?.isBanned ? 'Unbanning user' : 'Banning user', { banReason, banDuration });
                  setShowModal(null);
                }}
                disabled={loading || (!user.banStatus?.isBanned && !banReason.trim())}
                className="flex-1 px-4 py-2 bg-error text-surface rounded-lg disabled:opacity-50 hover:opacity-90 transition"
              >
                {loading ? 'Processing...' : (user.banStatus?.isBanned ? 'Unban User' : 'Ban User')}
              </button>
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default UserActionMenu;