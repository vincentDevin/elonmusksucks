import React from 'react';

interface RoleBadgeProps {
  role?: 'USER' | 'ADMIN';
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role = 'USER' }) => {
  const badgeClasses =
    role === 'ADMIN'
      ? 'bg-purple-100 text-purple-800 border-purple-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClasses}`}
    >
      {role === 'ADMIN' ? '👑 Admin' : '👤 User'}
    </span>
  );
};

export default RoleBadge;
