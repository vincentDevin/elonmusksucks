import { useState } from 'react';
import { useAchievements } from '../../contexts/AchievementContext';

interface Achievement {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  iconUrl?: string;
  completedAt?: string;
  awardedAt?: string;
}

interface ProfileAchievementsProps {
  achievements?: Achievement[]; // Now optional, will fall back to context
}

export function ProfileAchievements({ achievements: propAchievements }: ProfileAchievementsProps) {
  const { recentAchievements, loading } = useAchievements();

  // Use context achievements if no props provided, or filter context for completed ones
  const achievements = propAchievements || recentAchievements || [];
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');

  // Get unique categories and rarities
  const categories = [
    'all',
    ...Array.from(new Set(achievements.map((a) => a.category).filter(Boolean))),
  ];
  const rarities = [
    'all',
    ...Array.from(new Set(achievements.map((a) => a.rarity).filter(Boolean))),
  ];

  // Filter achievements
  const filteredAchievements = achievements.filter((achievement) => {
    const categoryMatch =
      selectedCategory === 'all' ||
      (achievement.category && achievement.category === selectedCategory);
    const rarityMatch =
      selectedRarity === 'all' || (achievement.rarity && achievement.rarity === selectedRarity);
    return categoryMatch && rarityMatch;
  });

  // Sort by rarity and date
  const sortedAchievements = filteredAchievements.sort((a, b) => {
    const rarityOrder = { legendary: 0, rare: 1, uncommon: 2, secret: 3, common: 4, shame: 5 };
    const aRarity = rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 6;
    const bRarity = rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 6;

    if (aRarity !== bRarity) return aRarity - bRarity;

    const aDate = new Date(a.completedAt || a.awardedAt || 0).getTime();
    const bDate = new Date(b.completedAt || b.awardedAt || 0).getTime();
    return bDate - aDate;
  });

  const getCategoryIcon = (category: string | undefined) => {
    if (!category) return '🏅';

    switch (category.toLowerCase()) {
      case 'betting':
        return '💰';
      case 'leaderboard':
        return '🏆';
      case 'pong':
        return '🏓';
      case 'chat':
        return '💬';
      case 'participation':
        return '🎯';
      case 'event':
        return '🎪';
      case 'secret':
        return '🔮';
      case 'shame':
        return '😱';
      default:
        return '🏅';
    }
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30 shadow-sm';
      case 'rare':
        return 'bg-gradient-to-br from-secondary/10 to-secondary/20 border-secondary/30 shadow-sm';
      case 'uncommon':
        return 'bg-gradient-to-br from-success/10 to-success/20 border-success/30 shadow-sm';
      case 'secret':
        return 'bg-gradient-to-br from-accent/10 to-accent/20 border-accent/30 shadow-sm';
      case 'shame':
        return 'bg-gradient-to-br from-error/10 to-error/20 border-error/30 shadow-sm';
      default:
        return 'bg-gradient-to-br from-muted/10 to-muted/20 border-muted/30 shadow-sm';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-primary text-surface';
      case 'rare':
        return 'bg-secondary text-surface';
      case 'uncommon':
        return 'bg-success text-surface';
      case 'secret':
        return 'bg-accent text-surface';
      case 'shame':
        return 'bg-error text-surface';
      default:
        return 'bg-muted text-content';
    }
  };

  const getStats = () => {
    const stats = achievements.reduce(
      (acc, achievement) => {
        acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return stats;
  };

  const stats = getStats();

  // Show loading state if using context and still loading
  if (!propAchievements && loading) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            🏆 Achievements
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-tertiary">Loading achievements...</span>
        </div>
      </div>
    );
  }

  // Get newest achievement
  const newestAchievement =
    achievements.length > 0
      ? sortedAchievements.reduce((newest, current) => {
          const newestDate = new Date(newest.completedAt || newest.awardedAt || 0).getTime();
          const currentDate = new Date(current.completedAt || current.awardedAt || 0).getTime();
          return currentDate > newestDate ? current : newest;
        })
      : null;

  return (
    <div className="bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header with expand/collapse button */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-content flex items-center gap-2">
          🏆 Achievements
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <span className="text-sm font-medium">{expanded ? 'Collapse' : 'Expand'}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Achievement Summary - always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/10 rounded-xl">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{achievements.length}</div>
          <div className="text-xs text-tertiary">Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-content">{Object.keys(stats).length}</div>
          <div className="text-xs text-tertiary">Rarities</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-content">{categories.length - 1}</div>
          <div className="text-xs text-tertiary">Categories</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-content">{stats.legendary || 0}</div>
          <div className="text-xs text-tertiary">Legendary</div>
        </div>
      </div>

      {/* Newest Achievement - only visible when collapsed */}
      {!expanded && newestAchievement && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-tertiary mb-2">Latest Achievement</h4>
          <div className={`p-4 rounded-xl border-2 ${getRarityStyles(newestAchievement.rarity)}`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {newestAchievement.iconUrl ? (
                  <img
                    src={newestAchievement.iconUrl}
                    alt={newestAchievement.name}
                    className="w-8 h-8 rounded-lg"
                  />
                ) : (
                  getCategoryIcon(newestAchievement.category)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-content">
                    {newestAchievement.title || newestAchievement.name}
                  </h5>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${getRarityBadgeColor(newestAchievement.rarity)}`}
                  >
                    {newestAchievement.rarity}
                  </span>
                </div>
                <p className="text-xs text-tertiary">{newestAchievement.description}</p>
                <div className="text-xs text-tertiary mt-1">
                  🗓️ Unlocked{' '}
                  {new Date(
                    newestAchievement.completedAt || newestAchievement.awardedAt || '',
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Achievement Collection */}
      {expanded && achievements.length > 0 && (
        <div className="mt-6 space-y-6">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-tertiary mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm px-3 py-1 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all'
                      ? 'All Categories'
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-tertiary mb-1">Rarity</label>
              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value)}
                className="text-sm px-3 py-1 border border-muted rounded-lg bg-background text-content focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {rarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity === 'all'
                      ? 'All Rarities'
                      : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Achievement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`relative p-4 rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] ${getRarityStyles(achievement.rarity)}`}
              >
                {/* Rarity Badge */}
                <div
                  className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${getRarityBadgeColor(achievement.rarity)}`}
                >
                  {achievement.rarity}
                </div>

                <div className="space-y-3">
                  {/* Icon and Category */}
                  <div className="flex items-center justify-between">
                    <div className="text-3xl">
                      {achievement.iconUrl ? (
                        <img
                          src={achievement.iconUrl}
                          alt={achievement.name}
                          className="w-8 h-8 rounded-lg"
                        />
                      ) : (
                        getCategoryIcon(achievement.category)
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-muted/20 rounded-full text-tertiary font-medium capitalize">
                      {achievement.category || 'general'}
                    </span>
                  </div>

                  {/* Achievement Info */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-content leading-tight">
                      {achievement.title || achievement.name}
                    </h3>
                    <p className="text-xs text-tertiary leading-relaxed">
                      {achievement.description}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between text-xs text-tertiary">
                    <span className="flex items-center gap-1">📅 Unlocked</span>
                    <span className="font-medium">
                      {new Date(
                        achievement.completedAt || achievement.awardedAt || '',
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-8 text-tertiary">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-medium">No achievements match your filters</p>
              <p className="text-xs mt-1">Try adjusting your category or rarity selection</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {achievements.length === 0 && expanded && (
        <div className="text-center py-8 text-tertiary">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-base font-semibold text-content mb-2">No achievements yet</h3>
          <p className="text-sm text-tertiary max-w-md mx-auto">
            Start placing bets, engaging with the community, playing Pong, and climbing the
            leaderboard to unlock your first achievements!
          </p>
        </div>
      )}
    </div>
  );
}
