import React, { useState } from 'react';
import GrantAchievementModal from '../modals/GrantAchievementModal';
import { grantAchievement, revokeAchievement } from '../../../../api/admin';

interface AchievementSectionProps {
  userId: number;
  userName?: string;
  onUpdate: () => void;
}

const AchievementSection: React.FC<AchievementSectionProps> = ({ userId, userName, onUpdate }) => {
  const [showGrantModal, setShowGrantModal] = useState(false);

  const handleGrant = async (achievementId: number) => {
    await grantAchievement(achievementId, userId);
    setShowGrantModal(false);
    onUpdate();
  };

  // TODO: Implement achievement revocation UI
  // const handleRevoke = async (achievementId: number) => {
  //   if (confirm('Are you sure you want to revoke this achievement?')) {
  //     await revokeAchievement(achievementId, userId);
  //     onUpdate();
  //   }
  // };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content">Achievement Management</h3>
        <button
          onClick={() => setShowGrantModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
        >
          + Grant Achievement
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Achievement System</h4>
            <p className="text-sm text-blue-700">
              Achievements are typically earned automatically based on user actions and progress.
              Manual grants should be used for special circumstances or rewards.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center py-8 bg-background rounded-lg border border-muted">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-tertiary mb-4">
          Achievement tracking and display will be implemented based on user achievement data
        </p>
        <button
          onClick={() => setShowGrantModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
        >
          Grant Achievement
        </button>
      </div>

      {showGrantModal && (
        <GrantAchievementModal
          userId={userId}
          userName={userName}
          onSubmit={handleGrant}
          onClose={() => setShowGrantModal(false)}
        />
      )}
    </div>
  );
};

export default AchievementSection;
