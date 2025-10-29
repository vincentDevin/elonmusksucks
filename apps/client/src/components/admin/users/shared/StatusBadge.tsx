import React from 'react';

interface StatusBadgeProps {
  active?: boolean;
  banned?: boolean;
  verified?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  active = true,
  banned = false,
  verified = false,
}) => {
  if (banned) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
        🚫 Banned
      </span>
    );
  }

  if (!active) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
        ⏸️ Inactive
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
        ✓ Active
      </span>
      {verified && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
          ✓ Verified
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
