import React, { useState } from 'react';
import BanUserModal from '../modals/BanUserModal';
import { banUser, unbanUser } from '../../../../api/moderation';
import type { UserBan } from '../../../../api/moderation';

interface BanManagementSectionProps {
  userId: number;
  userName?: string;
  currentBan: UserBan | null;
  onUpdate: () => void;
}

const BanManagementSection: React.FC<BanManagementSectionProps> = ({
  userId,
  userName,
  currentBan,
  onUpdate,
}) => {
  const [showBanModal, setShowBanModal] = useState(false);

  const handleBan = async (banData: any) => {
    await banUser(banData);
    setShowBanModal(false);
    onUpdate();
  };

  const handleUnban = async () => {
    if (confirm(`Are you sure you want to unban ${userName}?`)) {
      await unbanUser(userId);
      onUpdate();
    }
  };

  const formatDuration = () => {
    if (!currentBan || currentBan.banType === 'permanent') return null;

    if (currentBan.expiresAt) {
      const expiryDate = new Date(currentBan.expiresAt);
      const now = new Date();

      if (expiryDate <= now) {
        return 'Expired';
      }

      const diffMs = expiryDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `${diffDays} day(s) remaining`;
      } else if (diffHours > 0) {
        return `${diffHours} hour(s) remaining`;
      } else {
        return `${diffMins} minute(s) remaining`;
      }
    }

    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content">Ban Management</h3>
        {!currentBan && (
          <button
            onClick={() => setShowBanModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Issue Ban
          </button>
        )}
      </div>

      {currentBan ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🚫</div>
              <div>
                <h4 className="text-lg font-semibold text-red-900">Currently Banned</h4>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                    currentBan.banType === 'permanent'
                      ? 'bg-red-600 text-white'
                      : currentBan.banType === 'shadow'
                        ? 'bg-purple-600 text-white'
                        : 'bg-orange-600 text-white'
                  }`}
                >
                  {currentBan.banType} BAN
                </span>
              </div>
            </div>
            <button
              onClick={handleUnban}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              Lift Ban
            </button>
          </div>

          <div className="space-y-3 bg-white rounded-lg p-4">
            <div>
              <span className="text-sm font-medium text-red-900">Reason:</span>
              <p className="text-sm text-red-700 mt-1">{currentBan.reason}</p>
            </div>

            {currentBan.expiresAt && (
              <>
                <div>
                  <span className="text-sm font-medium text-red-900">Expires:</span>
                  <p className="text-sm text-red-700 mt-1">
                    {new Date(currentBan.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-red-900">Time Remaining:</span>
                  <p className="text-sm text-red-700 mt-1">{formatDuration()}</p>
                </div>
              </>
            )}

            <div>
              <span className="text-sm font-medium text-red-900">Banned On:</span>
              <p className="text-sm text-red-700 mt-1">
                {new Date(currentBan.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h4 className="font-semibold text-green-900 mb-2">User is not banned</h4>
          <p className="text-sm text-green-700 mb-4">This user has full access to the platform</p>
          <button
            onClick={() => setShowBanModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Issue Ban
          </button>
        </div>
      )}

      <div className="bg-background rounded-lg p-4 border border-muted">
        <h4 className="font-medium text-content mb-3">Ban Types Explained</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
              PERMANENT
            </span>
            <p className="text-tertiary flex-1">
              User is permanently banned and cannot access the platform
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
              TEMPORARY
            </span>
            <p className="text-tertiary flex-1">
              User is banned for a specific duration and can return after expiration
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
              SHADOW
            </span>
            <p className="text-tertiary flex-1">
              User can interact but their content is hidden from others (stealth ban)
            </p>
          </div>
        </div>
      </div>

      {showBanModal && (
        <BanUserModal
          userId={userId}
          userName={userName}
          onSubmit={handleBan}
          onClose={() => setShowBanModal(false)}
        />
      )}
    </div>
  );
};

export default BanManagementSection;
