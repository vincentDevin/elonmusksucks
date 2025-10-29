import React, { useState } from 'react';
import AssignBadgeModal from '../modals/AssignBadgeModal';
import { assignBadge, revokeBadge } from '../../../../api/admin';
import type { PublicBadge } from '@ems/types';

interface BadgeManagementSectionProps {
  userId: number;
  userName?: string;
  currentBadges: PublicBadge[];
  onUpdate: () => void;
}

const BadgeManagementSection: React.FC<BadgeManagementSectionProps> = ({
  userId,
  userName,
  currentBadges,
  onUpdate,
}) => {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleAssign = async (badgeId: number) => {
    await assignBadge(userId, badgeId);
    setShowAssignModal(false);
    onUpdate();
  };

  const handleRevoke = async (badgeId: number) => {
    if (confirm('Are you sure you want to revoke this badge?')) {
      await revokeBadge(userId, badgeId);
      onUpdate();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content">Badge Management</h3>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
        >
          + Assign Badge
        </button>
      </div>

      {currentBadges.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-lg border border-muted">
          <div className="text-4xl mb-3">🏅</div>
          <p className="text-tertiary">No badges assigned yet</p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            Assign First Badge
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentBadges.map((badge) => (
            <div
              key={badge.id}
              className="bg-background rounded-lg p-4 border border-muted hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-content mb-1">{badge.name}</h4>
                  <p className="text-sm text-tertiary mb-2">{badge.description}</p>
                </div>
                <button
                  onClick={() => handleRevoke(badge.id)}
                  className="ml-2 px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors font-medium"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <AssignBadgeModal
          userId={userId}
          userName={userName}
          currentBadges={currentBadges}
          onSubmit={handleAssign}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};

export default BadgeManagementSection;
