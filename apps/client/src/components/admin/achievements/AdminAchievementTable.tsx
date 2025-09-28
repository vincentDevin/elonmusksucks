import React from 'react';
import type { AchievementWithStats } from '../../../api/admin';
import type { TabType } from './AdminAchievementDashboard';

interface AdminAchievementTableProps {
  achievements: AchievementWithStats[];
  selectedAchievements: Set<number>;
  currentTab: TabType;
  onAchievementSelect: (achievementId: number, selected: boolean) => void;
  onAchievementAction: (achievementId: number, action: string) => void;
  onSelectAll: () => void;
  loading?: boolean;
  isLoadingDetails?: boolean;
  className?: string;
}

const AdminAchievementTable: React.FC<AdminAchievementTableProps> = ({
  achievements,
  selectedAchievements,
  currentTab,
  onAchievementSelect,
  onAchievementAction,
  onSelectAll,
  loading = false,
  isLoadingDetails = false,
  className = '',
}) => {
  // Prevent unused variable warning
  void isLoadingDetails;

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'No date';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-tertiary',
      uncommon: 'text-info',
      rare: 'text-primary',
      epic: 'text-secondary',
      legendary: 'text-warning',
      secret: 'text-error',
    };
    return colors[rarity as keyof typeof colors] || 'text-tertiary';
  };

  const getRarityBadge = (rarity: string) => {
    const badges = {
      common: 'bg-tertiary/10 text-tertiary',
      uncommon: 'bg-info/10 text-info',
      rare: 'bg-primary/10 text-primary',
      epic: 'bg-secondary/10 text-secondary',
      legendary: 'bg-warning/10 text-warning',
      secret: 'bg-error/10 text-error',
    };
    return badges[rarity as keyof typeof badges] || 'bg-tertiary/10 text-tertiary';
  };

  const getActionButtons = (achievement: AchievementWithStats) => {
    const baseActions = [
      { key: 'details', label: 'Details', icon: '👁️' },
      { key: 'edit', label: 'Edit', icon: '✏️' },
    ];

    if (achievement.isActive) {
      baseActions.push({ key: 'deactivate', label: 'Deactivate', icon: '⏸️' });
    } else {
      baseActions.push({ key: 'activate', label: 'Activate', icon: '▶️' });
    }

    baseActions.push({ key: 'delete', label: 'Delete', icon: '🗑️' });

    return baseActions;
  };

  if (loading) {
    return (
      <div className={`bg-surface rounded-lg border border-muted p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className={`bg-surface rounded-lg border border-muted p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold text-content mb-2">No achievements found</h3>
          <p className="text-tertiary">
            {currentTab === 'active'
              ? 'No active achievements match your current filters.'
              : currentTab === 'inactive'
                ? 'No inactive achievements match your current filters.'
                : 'No achievements match your current filters.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg border border-muted ${className}`}>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-muted">
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">
                <input
                  type="checkbox"
                  checked={
                    selectedAchievements.size === achievements.length && achievements.length > 0
                  }
                  onChange={onSelectAll}
                  className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary"
                />
              </th>
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">Achievement</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">Category</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">Rarity</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">Status</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">Unlocks</th>
              <th className="text-left py-4 px-6 text-sm font-medium text-tertiary">Created</th>
              <th className="text-right py-4 px-6 text-sm font-medium text-tertiary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {achievements.map((achievement) => (
              <tr
                key={achievement.id}
                className="border-b border-muted/50 hover:bg-background/50 transition-colors"
              >
                <td className="py-4 px-6">
                  <input
                    type="checkbox"
                    checked={selectedAchievements.has(achievement.id)}
                    onChange={(e) => onAchievementSelect(achievement.id, e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary"
                  />
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      🏆
                    </div>
                    <div>
                      <div className="font-medium text-content">{achievement.name}</div>
                      <div className="text-sm text-tertiary truncate max-w-xs">
                        {achievement.description || 'No description'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-content capitalize">
                    {achievement.category || 'General'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityBadge(achievement.rarity)}`}
                  >
                    {achievement.rarity || 'Common'}{' '}
                    {process.env.NODE_ENV === 'development' &&
                      achievement.rarity === null &&
                      '(null)'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`flex items-center gap-1 ${achievement.isActive ? 'text-success' : 'text-tertiary'}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${achievement.isActive ? 'bg-success' : 'bg-tertiary'}`}
                    ></div>
                    {achievement.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-content font-medium">
                    {achievement.completedUsers || 0}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-tertiary">{formatDate(achievement.createdAt)}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-1 justify-end">
                    {getActionButtons(achievement).map((action) => (
                      <button
                        key={action.key}
                        onClick={() => onAchievementAction(achievement.id, action.key)}
                        className="p-2 text-tertiary hover:text-content hover:bg-background rounded-lg transition-colors"
                        title={action.label}
                      >
                        <span className="text-sm">{action.icon}</span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden p-4 space-y-4">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-background rounded-lg border border-muted p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedAchievements.has(achievement.id)}
                  onChange={(e) => onAchievementSelect(achievement.id, e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border border-muted rounded focus:ring-1 focus:ring-primary mt-1"
                />
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  🏆
                </div>
                <div className="flex-1">
                  <div className="font-medium text-content">{achievement.name}</div>
                  <div className="text-sm text-tertiary">
                    {achievement.description || 'No description'}
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center gap-1 ${achievement.isActive ? 'text-success' : 'text-tertiary'}`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${achievement.isActive ? 'bg-success' : 'bg-tertiary'}`}
                ></div>
                <span className="text-xs">{achievement.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
              <div>
                <span className="text-tertiary">Category:</span>
                <span className="text-content ml-1 capitalize">
                  {achievement.category || 'General'}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Rarity:</span>
                <span className={`ml-1 ${getRarityColor(achievement.rarity)}`}>
                  {achievement.rarity || 'Common'}{' '}
                  {process.env.NODE_ENV === 'development' &&
                    achievement.rarity === null &&
                    '(null)'}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Unlocks:</span>
                <span className="text-content ml-1 font-medium">
                  {achievement.completedUsers || 0}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Created:</span>
                <span className="text-content ml-1">{formatDate(achievement.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-muted">
              {getActionButtons(achievement).map((action) => (
                <button
                  key={action.key}
                  onClick={() => onAchievementAction(achievement.id, action.key)}
                  className="flex items-center gap-1 px-3 py-1 text-xs text-tertiary hover:text-content hover:bg-surface rounded-lg transition-colors"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-muted px-6 py-3 text-sm text-tertiary">
        Showing {achievements.length} achievement{achievements.length !== 1 ? 's' : ''}
        {selectedAchievements.size > 0 && (
          <span className="ml-2">• {selectedAchievements.size} selected</span>
        )}
      </div>
    </div>
  );
};

export default AdminAchievementTable;
