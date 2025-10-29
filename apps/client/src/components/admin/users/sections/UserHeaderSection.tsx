import React from 'react';
import RoleBadge from '../shared/RoleBadge';
import StatusBadge from '../shared/StatusBadge';
import type { DetailedUser } from '../../../../api/admin';

interface UserHeaderSectionProps {
  user: DetailedUser | null;
  onRefresh: () => void;
}

const UserHeaderSection: React.FC<UserHeaderSectionProps> = ({ user, onRefresh }) => {
  if (!user) {
    return (
      <div className="flex items-center justify-center p-6 border-b border-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between p-6 border-b border-muted bg-surface">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl text-white font-bold">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-content">{user.name}</h2>
          <p className="text-tertiary">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadge role={user.role} />
            <StatusBadge
              active={user.active}
              banned={user.banStatus?.isBanned}
              verified={user.emailVerified}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-accent transition-colors font-medium text-sm"
        >
          🔄 Refresh Data
        </button>
        <div className="text-xs text-tertiary">ID: {user.id}</div>
        <div className="text-xs text-tertiary">
          Joined: {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default UserHeaderSection;
