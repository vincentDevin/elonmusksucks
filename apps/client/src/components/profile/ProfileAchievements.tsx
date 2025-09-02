import { useState } from 'react';
import { useAchievements } from '../../contexts/AchievementContext';
import { useAchievementTheme } from '../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../theme/utils/achievement-colors';

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
  embedded?: boolean; // When true, removes container hover effects for embedded usage
}

export function ProfileAchievements({
  achievements: propAchievements,
  embedded = false,
}: ProfileAchievementsProps) {
  const { recentAchievements, loading } = useAchievements();
  const { getRarityClasses, getCategoryIcon, getCardClasses, utils } = useAchievementTheme();

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

  // Helper to get themed styling for achievements
  const getAchievementThemeClasses = (rarity: string, category: string) => {
    const validRarity = utils.isValidRarity(rarity) ? (rarity as AchievementRarity) : 'common';
    return {
      rarityClasses: getRarityClasses(validRarity),
      cardClasses: getCardClasses(validRarity, category),
    };
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
    <div
      className={`${
        embedded
          ? ''
          : 'bg-surface border border-muted rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]'
      }`}
    >
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
          <h4 className="text-sm font-medium text-tertiary mb-2 flex items-center gap-1">
            <span>✨</span>
            Latest Achievement
          </h4>
          {(() => {
            const { rarityClasses, cardClasses } = getAchievementThemeClasses(
              newestAchievement.rarity,
              newestAchievement.category,
            );

            return (
              <div
                className={`relative overflow-hidden transition-all duration-300 ${cardClasses.container} ${rarityClasses.celebration} shadow-lg hover:shadow-xl`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/5 to-transparent animate-pulse" />
                <div className="relative p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl ${rarityClasses.card} shadow-lg ring-2 ${rarityClasses.leftBorder} transform rotate-3`}
                    >
                      {newestAchievement.iconUrl ? (
                        <img
                          src={newestAchievement.iconUrl}
                          alt={newestAchievement.name}
                          className="w-8 h-8 rounded-lg"
                        />
                      ) : (
                        cardClasses.categoryIcon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-content">
                          {newestAchievement.title || newestAchievement.name}
                        </h5>
                        <span className={`${cardClasses.badge} uppercase tracking-wide shadow-sm`}>
                          {newestAchievement.rarity}
                        </span>
                      </div>
                      <p className="text-sm text-content/80 mb-2">
                        {newestAchievement.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-tertiary capitalize">
                          {newestAchievement.category}
                        </span>
                        <span className="text-success font-medium">
                          🏆 Unlocked{' '}
                          {new Date(
                            newestAchievement.completedAt || newestAchievement.awardedAt || '',
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
            {sortedAchievements.map((achievement) => {
              const { rarityClasses, cardClasses } = getAchievementThemeClasses(
                achievement.rarity,
                achievement.category,
              );

              return (
                <div
                  key={achievement.id}
                  className={`group relative overflow-hidden transition-all duration-300 ${cardClasses.container} ${rarityClasses.celebration} hover:shadow-xl hover:scale-[1.02]`}
                >
                  <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-transparent via-white/10 to-transparent" />

                  <div className="relative p-4 space-y-3">
                    {/* Icon and Category */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center text-2xl ${rarityClasses.card} shadow-lg ring-2 ${rarityClasses.leftBorder} transform rotate-3`}
                      >
                        {achievement.iconUrl ? (
                          <img
                            src={achievement.iconUrl}
                            alt={achievement.name}
                            className="w-8 h-8 rounded-lg"
                          />
                        ) : (
                          cardClasses.categoryIcon
                        )}
                        {/* Completion Checkmark */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                          ✓
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-md font-medium capitalize border bg-muted/50 text-content/70`}
                      >
                        {achievement.category || 'general'}
                      </span>
                    </div>

                    {/* Achievement Info */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <h3 className="font-bold text-content leading-tight flex-1">
                          {achievement.title || achievement.name}
                        </h3>
                        <span
                          className={`${cardClasses.badge} text-xs uppercase tracking-wide shadow-sm`}
                        >
                          {achievement.rarity}
                        </span>
                      </div>
                      <p className="text-sm text-content/80 leading-relaxed">
                        {achievement.description}
                      </p>
                    </div>

                    {/* Completion Info */}
                    <div className="flex items-center justify-center py-2 border-t border-muted/30">
                      <div className="flex items-center gap-2 text-success font-medium text-sm">
                        <span>🏆</span>
                        <span>
                          Unlocked{' '}
                          {new Date(
                            achievement.completedAt || achievement.awardedAt || '',
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
