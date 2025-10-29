import React, { useState, useEffect } from 'react';
import { getUserDetails, getUserStats } from '../../../api/admin';
import { getUserBanStatus } from '../../../api/moderation';
import type { DetailedUser } from '../../../api/admin';
import type { UserStatsDTO } from '@ems/types';
import type { UserBan } from '../../../api/moderation';

// Section Components
import UserHeaderSection from './sections/UserHeaderSection';
import QuickStatsBar from './sections/QuickStatsBar';
import PerformanceSection from './sections/PerformanceSection';
import BadgeManagementSection from './sections/BadgeManagementSection';
import AchievementSection from './sections/AchievementSection';
import BalanceSection from './sections/BalanceSection';
import BanManagementSection from './sections/BanManagementSection';
import ModerationHistorySection from './sections/ModerationHistorySection';
import AvatarManagementSection from './sections/AvatarManagementSection';

interface UserDetailsModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (userId: number) => void;
}

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'performance', label: 'Performance', icon: '📊' },
  { id: 'badges', label: 'Badges', icon: '🏅' },
  { id: 'achievements', label: 'Achievements', icon: '🏆' },
  { id: 'balance', label: 'Balance', icon: '💰' },
  { id: 'avatar', label: 'Avatar', icon: '🖼️' },
  { id: 'moderation', label: 'Moderation', icon: '🔨' },
];

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  userId,
  isOpen,
  onClose,
  onUserUpdate,
}) => {
  const [userData, setUserData] = useState<DetailedUser | null>(null);
  const [userStats, setUserStats] = useState<UserStatsDTO | null>(null);
  const [banStatus, setBanStatus] = useState<UserBan | null>(null);
  const [moderationHistory, setModerationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance');

  // Load all user data
  const loadAllUserData = async (uid: number) => {
    setLoading(true);
    try {
      const [details, stats, ban] = await Promise.all([
        getUserDetails(uid),
        getUserStats(uid).catch(() => null), // Stats might not exist
        getUserBanStatus(uid).catch(() => null), // Ban status might not exist
      ]);

      setUserData(details);
      setUserStats(stats);
      setBanStatus(ban);

      // Moderation history would be fetched here if endpoint exists
      setModerationHistory([]);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when modal opens or userId changes
  useEffect(() => {
    if (isOpen && userId) {
      loadAllUserData(userId);
    }
  }, [isOpen, userId]);

  // Handle update callback
  const handleUpdate = () => {
    loadAllUserData(userId);
    onUserUpdate(userId);
  };

  // Close handler with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header Section */}
        <div className="relative">
          <UserHeaderSection user={userData} onRefresh={() => loadAllUserData(userId)} />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-accent transition-colors text-content"
          >
            ✕
          </button>
        </div>

        {/* Quick Stats Bar */}
        <QuickStatsBar
          stats={userStats}
          balance={userData?.muskBucks ? Number(userData.muskBucks) : 0}
        />

        {/* Tab Navigation */}
        <div className="border-b border-muted bg-surface sticky top-0 z-10">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-background'
                    : 'border-transparent text-tertiary hover:text-content hover:bg-background'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'performance' && (
                <PerformanceSection stats={userStats} userId={userId} />
              )}

              {activeTab === 'badges' && (
                <BadgeManagementSection
                  userId={userId}
                  userName={userData?.name}
                  currentBadges={userData?.badges || []}
                  onUpdate={handleUpdate}
                />
              )}

              {activeTab === 'achievements' && (
                <AchievementSection
                  userId={userId}
                  userName={userData?.name}
                  onUpdate={handleUpdate}
                />
              )}

              {activeTab === 'balance' && (
                <BalanceSection
                  userId={userId}
                  userName={userData?.name}
                  currentBalance={userData?.muskBucks ? Number(userData.muskBucks) : 0}
                  onUpdate={handleUpdate}
                />
              )}

              {activeTab === 'avatar' && (
                <AvatarManagementSection
                  userId={userId}
                  userName={userData?.name}
                  currentAvatarUrl={userData?.avatarUrl}
                  onUpdate={handleUpdate}
                />
              )}

              {activeTab === 'moderation' && (
                <>
                  <BanManagementSection
                    userId={userId}
                    userName={userData?.name}
                    currentBan={banStatus}
                    onUpdate={handleUpdate}
                  />
                  <ModerationHistorySection history={moderationHistory} />
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-muted p-4 bg-surface flex items-center justify-between">
          <div className="text-sm text-tertiary">
            User ID: {userId} • Last Updated: {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-muted text-content rounded-lg hover:bg-accent transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
