import React from 'react';
import type { AchievementAnalytics } from '../../../api/admin';

interface AdminAchievementOverviewProps {
  analytics: AchievementAnalytics | null;
  loading: boolean;
  lastUpdateTime: string;
  realtimeEnabled: boolean;
  onRealtimeToggle: (enabled: boolean) => void;
  onCreateNew: () => void;
  className?: string;
}

const AdminAchievementOverview: React.FC<AdminAchievementOverviewProps> = ({
  analytics,
  loading,
  lastUpdateTime,
  realtimeEnabled,
  onRealtimeToggle,
  onCreateNew,
  className = '',
}) => {
  if (loading || !analytics) {
    return (
      <div className={`bg-surface rounded-lg border border-muted p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-background p-4 rounded-lg border border-muted">
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRarityStyles = (rarity: string) => {
    const styles = {
      common: {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        text: 'text-gray-600',
        icon: '🥉',
        gradient: 'from-gray-400 to-gray-600',
      },
      uncommon: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-600',
        icon: '🥈',
        gradient: 'from-green-400 to-green-600',
      },
      rare: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-600',
        icon: '🏅',
        gradient: 'from-blue-400 to-blue-600',
      },
      epic: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-600',
        icon: '🎖️',
        gradient: 'from-purple-400 to-purple-600',
      },
      legendary: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-600',
        icon: '🏆',
        gradient: 'from-yellow-400 to-yellow-600',
      },
      secret: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-600',
        icon: '💎',
        gradient: 'from-red-400 to-red-600',
      },
    };
    return styles[rarity as keyof typeof styles] || styles.common;
  };

  const completionRate = analytics.overview.averageCompletion || 0;

  return (
    <div className={`bg-surface rounded-lg border border-muted p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-content flex items-center">
            <span className="mr-3">🏆</span>
            Achievement Analytics
          </h2>
          <p className="text-tertiary mt-1">Platform-wide achievement metrics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Real-time toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRealtimeToggle(!realtimeEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                realtimeEnabled
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-muted text-tertiary border-muted'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-success animate-pulse' : 'bg-tertiary'}`}
              ></span>
              <span className="text-sm font-medium">Live Updates</span>
            </button>
            {lastUpdateTime && (
              <span className="text-xs text-tertiary">Last: {lastUpdateTime}</span>
            )}
          </div>

          {/* Create new button */}
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <span>+</span>
            Create Achievement
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-background p-4 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">
            {formatNumber(analytics.overview.totalAchievements)}
          </div>
          <div className="text-sm text-tertiary">Total Achievements</div>
          <div className="text-xs text-primary mt-1">
            {analytics.overview.totalAchievements} total
          </div>
        </div>

        <div className="bg-background p-4 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">
            {formatNumber(analytics.overview.totalUnlocks)}
          </div>
          <div className="text-sm text-tertiary">Total Unlocks</div>
          <div className="text-xs text-success mt-1">All-time achievements earned</div>
        </div>

        <div className="bg-background p-4 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">{analytics.overview.activeUsers}</div>
          <div className="text-sm text-tertiary">Active Users</div>
          <div className="text-xs text-info mt-1">With achievements unlocked</div>
        </div>

        <div className="bg-background p-4 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">
            {(completionRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-tertiary">Avg Completion</div>
          <div className="text-xs text-warning mt-1">Platform completion rate</div>
        </div>
      </div>

      {/* Category Distribution */}
      {analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-background/50 rounded-lg p-4 border border-muted">
            <h3 className="font-semibold text-content mb-3 flex items-center">
              <span className="mr-2">📊</span>
              Category Distribution
            </h3>
            <div className="space-y-3">
              {analytics.categoryBreakdown.slice(0, 5).map((category: any) => (
                <div key={category.categoryName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-content capitalize">{category.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-tertiary">
                      {category.badgeCount} achievements
                    </span>
                    <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary rounded-full h-2 transition-all duration-500"
                        style={{
                          width: `${
                            analytics.overview.totalAchievements > 0
                              ? (category.badgeCount / analytics.overview.totalAchievements) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-background/50 rounded-lg p-4 border border-muted">
            <h3 className="font-semibold text-content mb-3 flex items-center">
              <span className="mr-2">🎉</span>
              Recent Activity
            </h3>
            {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-content truncate">{activity.userName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-tertiary text-xs truncate">
                        {activity.achievementTitle}
                      </div>
                      <div className="text-tertiary text-xs">
                        {new Date(activity.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-tertiary text-center py-4">No recent activity</div>
            )}
          </div>
        </div>
      )}

      {/* Top Achievements */}
      {analytics.topAchievements && analytics.topAchievements.length > 0 && (
        <div className="mt-6 bg-background/50 rounded-lg p-4 border border-muted">
          <h3 className="font-semibold text-content mb-3 flex items-center">
            <span className="mr-2">🏆</span>
            Top Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.topAchievements.slice(0, 3).map((achievement: any, index: number) => {
              const rarityStyle = getRarityStyles(achievement.rarity || 'common');
              const rankIcons = ['🥇', '🥈', '🥉'];

              return (
                <div
                  key={achievement.id}
                  className={`relative overflow-hidden p-4 rounded-lg border-2 transition-all hover:scale-105 ${rarityStyle.bg} ${rarityStyle.border}`}
                >
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${rarityStyle.gradient} opacity-5`}
                  ></div>

                  {/* Rank badge */}
                  <div className="absolute -top-1 -right-1 text-2xl">
                    {rankIcons[index] || '🏅'}
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-2xl mr-2">{rarityStyle.icon}</span>
                      <span className={`text-lg font-bold ${rarityStyle.text}`}>#{index + 1}</span>
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-semibold text-content truncate mb-1">
                        {achievement.title || achievement.name}
                      </div>

                      <div className={`text-xs font-medium capitalize ${rarityStyle.text} mb-2`}>
                        {achievement.rarity || 'common'}
                      </div>

                      <div className="text-xs text-tertiary mb-1">
                        {achievement.completedUsers || 0} unlocks
                      </div>

                      <div className={`text-xs font-medium ${rarityStyle.text}`}>
                        {((achievement.completionRate || 0) * 100).toFixed(1)}% rate
                      </div>
                    </div>
                  </div>

                  {/* Shine effect for legendary and secret */}
                  {(achievement.rarity === 'legendary' || achievement.rarity === 'secret') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-pulse"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAchievementOverview;
