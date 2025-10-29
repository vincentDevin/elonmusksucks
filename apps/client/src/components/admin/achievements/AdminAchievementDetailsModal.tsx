import React from 'react';
import type { AchievementWithStats } from '../../../api/admin';

interface AdminAchievementDetailsModalProps {
  achievement: AchievementWithStats;
  onClose: () => void;
  className?: string;
}

const AdminAchievementDetailsModal: React.FC<AdminAchievementDetailsModalProps> = ({
  achievement,
  onClose,
  className = '',
}) => {
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'No date';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-tertiary bg-tertiary/10',
      uncommon: 'text-info bg-info/10',
      rare: 'text-primary bg-primary/10',
      epic: 'text-secondary bg-secondary/10',
      legendary: 'text-warning bg-warning/10',
      secret: 'text-error bg-error/10',
    };
    return colors[rarity as keyof typeof colors] || 'text-tertiary bg-tertiary/10';
  };

  const getStatusBadge = () => {
    if (achievement.isActive) {
      return (
        <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">Active</span>
      );
    }
    return (
      <span className="px-2 py-1 bg-tertiary/10 text-tertiary text-xs rounded-full">Inactive</span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-surface rounded-lg border border-muted max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-content">Achievement Details</h2>
            {getStatusBadge()}
          </div>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-tertiary">Name</label>
                      <p className="text-content font-medium">{achievement.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-tertiary">Description</label>
                      <p className="text-content">
                        {achievement.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-tertiary">Category</label>
                        <p className="text-content capitalize">
                          {achievement.category || 'General'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-tertiary">Rarity</label>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(achievement.rarity)}`}
                        >
                          {achievement.rarity || 'Common'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Configuration</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-tertiary">Status</label>
                      <p
                        className={`text-sm ${achievement.isActive ? 'text-success' : 'text-tertiary'}`}
                      >
                        {achievement.isActive
                          ? 'Active - Available for users to unlock'
                          : 'Inactive - Hidden from users'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-tertiary">Achievement ID</label>
                      <p className="text-content font-mono text-sm">#{achievement.id}</p>
                    </div>
                    {achievement.iconUrl && (
                      <div>
                        <label className="text-sm font-medium text-tertiary">Icon</label>
                        <div className="flex items-center gap-2">
                          <img
                            src={achievement.iconUrl}
                            alt="Achievement icon"
                            className="w-8 h-8 rounded"
                          />
                          <p className="text-content text-sm">{achievement.iconUrl}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-tertiary">Created</label>
                      <p className="text-content">{formatDate(achievement.createdAt)}</p>
                    </div>
                    {achievement.updatedAt && (
                      <div>
                        <label className="text-sm font-medium text-tertiary">Last Updated</label>
                        <p className="text-content">{formatDate(achievement.updatedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background p-3 rounded-lg border border-muted">
                      <div className="text-sm font-medium text-tertiary">Total Unlocks</div>
                      <div className="text-xl font-bold text-content">
                        {achievement.completedUsers || 0}
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg border border-muted">
                      <div className="text-sm font-medium text-tertiary">Unique Users</div>
                      <div className="text-xl font-bold text-content">
                        {achievement.totalUsers || 0}
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg border border-muted">
                      <div className="text-sm font-medium text-tertiary">Completion Rate</div>
                      <div className="text-xl font-bold text-content">
                        {achievement.completionRate
                          ? `${(achievement.completionRate * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg border border-muted">
                      <div className="text-sm font-medium text-tertiary">Avg Time to Unlock</div>
                      <div className="text-xl font-bold text-content">N/A</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule Data - Not available in current schema */}
            <div className="bg-info/10 border border-info/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-info text-lg">ℹ️</span>
                <div className="text-sm">
                  <div className="font-medium text-info mb-1">Achievement Rules</div>
                  <div className="text-content">
                    Rule configuration will be available when the Rule Builder is connected.
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Unlocks */}
            {achievement.recentUnlocks && achievement.recentUnlocks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-content mb-3">Recent Unlocks</h3>
                <div className="bg-background rounded-lg border border-muted">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-muted">
                          <th className="text-left py-3 px-4 text-tertiary font-medium">User</th>
                          <th className="text-left py-3 px-4 text-tertiary font-medium">Date</th>
                          <th className="text-left py-3 px-4 text-tertiary font-medium">Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {achievement.recentUnlocks.slice(0, 10).map((unlock, index) => (
                          <tr key={index} className="border-b border-muted/50">
                            <td className="py-2 px-4 text-content">
                              {unlock.userName || `User #${unlock.userId}`}
                            </td>
                            <td className="py-2 px-4 text-content">
                              {formatDate(unlock.completedAt)}
                            </td>
                            <td className="py-2 px-4 text-tertiary">Automatic</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {achievement.recentUnlocks.length > 10 && (
                      <div className="text-center py-3 text-tertiary text-sm">
                        Showing 10 of {achievement.recentUnlocks.length} recent unlocks
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Metrics - Not available in current schema */}
            <div className="bg-info/10 border border-info/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-info text-lg">📊</span>
                <div className="text-sm">
                  <div className="font-medium text-info mb-1">Performance Analytics</div>
                  <div className="text-content">
                    Advanced performance metrics will be available when the analytics system is
                    integrated.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-muted bg-background">
          <button
            onClick={onClose}
            className="px-4 py-2 text-tertiary hover:text-content transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAchievementDetailsModal;
