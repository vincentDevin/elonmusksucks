// apps/client/src/components/dashboard/AchievementManager/HistoryView.tsx
import { memo, useMemo } from 'react';

interface Achievement {
  id: string;
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity?: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

interface RecentAchievement {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  iconUrl?: string | null;
  completedAt: string;
}

interface HistoryViewProps {
  completedAchievements: Achievement[];
  recentAchievements: RecentAchievement[];
  categoryStats: Record<string, { total: number; completed: number }>;
  completionRate: number;
}

const HistoryView = memo(function HistoryView({
  completedAchievements,
  recentAchievements,
  categoryStats,
  completionRate,
}: HistoryViewProps) {
  // Group achievements by month
  const achievementsByMonth = useMemo(() => {
    const grouped: Record<string, (Achievement | RecentAchievement)[]> = {};

    [...completedAchievements, ...recentAchievements].forEach((achievement) => {
      const date = new Date(achievement.completedAt || '');
      if (!isNaN(date.getTime())) {
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(achievement);
      }
    });

    // Sort months descending
    const sortedMonths = Object.keys(grouped).sort(
      (a, b) => new Date(`${b} 1, 2000`).getTime() - new Date(`${a} 1, 2000`).getTime(),
    );

    return sortedMonths.map((month) => ({
      month,
      achievements: grouped[month].sort(
        (a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime(),
      ),
    }));
  }, [completedAchievements, recentAchievements]);

  // Rarity distribution
  const rarityDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    completedAchievements.forEach((achievement) => {
      const rarity = achievement.rarity || 'common';
      distribution[rarity] = (distribution[rarity] || 0) + 1;
    });
    return distribution;
  }, [completedAchievements]);

  const categoryIcons: Record<string, string> = {
    betting: '🎯',
    pong: '🏓',
    leaderboard: '🏆',
    chat: '💬',
    prediction: '🔮',
    participation: '👥',
    event: '🎉',
    secret: '🔒',
    shame: '💀',
  };

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Completion Stats */}
        <div className="bg-background/50 rounded-lg p-4 border border-muted">
          <h3 className="font-semibold text-content mb-4 flex items-center">📊 Overall Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-tertiary">Completion Rate</span>
              <span className="font-bold text-primary">{(completionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-3 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(completionRate * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-tertiary">
              <span>{completedAchievements.length} completed</span>
              <span>Keep going!</span>
            </div>
          </div>
        </div>

        {/* Rarity Breakdown */}
        <div className="bg-background/50 rounded-lg p-4 border border-muted">
          <h3 className="font-semibold text-content mb-4 flex items-center">
            💎 Rarity Collection
          </h3>
          <div className="space-y-2">
            {Object.entries(rarityDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([rarity, count]) => (
                <div key={rarity} className="flex justify-between items-center">
                  <span className="text-sm text-content capitalize">{rarity}</span>
                  <span className="font-medium text-content">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Category Progress */}
        <div className="bg-background/50 rounded-lg p-4 border border-muted">
          <h3 className="font-semibold text-content mb-4 flex items-center">🏷️ Categories</h3>
          <div className="space-y-2">
            {Object.entries(categoryStats)
              .sort(
                ([, a], [, b]) =>
                  b.completed / Math.max(b.total, 1) - a.completed / Math.max(a.total, 1),
              )
              .slice(0, 5)
              .map(([category, stats]) => {
                const percentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-lg">{categoryIcons[category] || '🏅'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-content capitalize">{category}</span>
                        <span className="text-tertiary">
                          {stats.completed}/{stats.total}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-primary rounded-full h-1 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Achievement Timeline */}
      <div>
        <h2 className="text-xl font-bold text-content mb-6 flex items-center">
          📅 Achievement Timeline
        </h2>

        {achievementsByMonth.length > 0 ? (
          <div className="space-y-6">
            {achievementsByMonth.map(({ month, achievements }) => (
              <div key={month} className="relative">
                {/* Month header */}
                <div className="sticky top-0 bg-surface/90 backdrop-blur-sm border-b border-muted pb-2 mb-4">
                  <h3 className="text-lg font-semibold text-content">
                    {month}
                    <span className="ml-2 text-sm font-normal text-tertiary">
                      ({achievements.length} achievement{achievements.length !== 1 ? 's' : ''})
                    </span>
                  </h3>
                </div>

                {/* Achievement cards for the month */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-background/50 rounded-lg p-4 border border-muted hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {categoryIcons[achievement.category] || '🏅'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-content text-sm leading-tight mb-1">
                            {achievement.title || achievement.name}
                          </h4>
                          <p className="text-xs text-tertiary mb-2 line-clamp-2">
                            {achievement.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                              {achievement.rarity || 'common'}
                            </span>
                            <span className="text-xs text-tertiary">
                              {new Date(achievement.completedAt || '').toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-content mb-2">
              No completed achievements yet
            </h3>
            <p className="text-tertiary">
              Start participating in activities to begin your achievement journey!
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default HistoryView;
