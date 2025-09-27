// apps/client/src/components/dashboard/AchievementManager/AchievementList.tsx
import { memo, useState, useMemo } from 'react';
import { useAchievementTheme } from '../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../theme/utils/achievement-colors';

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

interface FilterState {
  categories: string[];
  status: ('completed' | 'in-progress' | 'locked')[];
  searchQuery: string;
}

interface AchievementListProps {
  achievements: Achievement[];
  recentAchievements: any[];
  filters: FilterState;
  sortBy: 'progress' | 'rarity' | 'category' | 'name';
  sortOrder: 'asc' | 'desc';
  pinnedAchievements: string[];
  onTogglePin: (achievementId: string) => void;
  selectedAchievementId: string | null;
  onSelectAchievement: (achievementId: string | null) => void;
}

const AchievementList = memo(function AchievementList({
  achievements,
  recentAchievements,
  filters,
  sortBy,
  sortOrder,
  pinnedAchievements,
  onTogglePin,
  selectedAchievementId,
  onSelectAchievement,
}: AchievementListProps) {
  const { getRarityClasses, getCategoryIcon, getCardClasses, utils } = useAchievementTheme();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort achievements
  const filteredAndSorted = useMemo(() => {
    let filtered = achievements.filter((achievement) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText =
          `${achievement.title} ${achievement.name} ${achievement.description} ${achievement.category}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      // Category filter
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(achievement.category)) return false;
      }

      // Status filter
      const status = achievement.isCompleted
        ? 'completed'
        : achievement.progress > 0
          ? 'in-progress'
          : 'locked';

      if (!filters.status.includes(status)) return false;

      return true;
    });

    // Sort achievements
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'progress':
          const aProgress = a.targetValue > 0 ? a.progress / a.targetValue : 0;
          const bProgress = b.targetValue > 0 ? b.progress / b.targetValue : 0;
          comparison = aProgress - bProgress;
          break;
        case 'rarity':
          const rarityOrder = [
            'common',
            'uncommon',
            'rare',
            'epic',
            'legendary',
            'secret',
            'shame',
          ];
          const aRarityIndex = rarityOrder.indexOf(a.rarity || 'common');
          const bRarityIndex = rarityOrder.indexOf(b.rarity || 'common');
          comparison = aRarityIndex - bRarityIndex;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'name':
          comparison = (a.title || a.name).localeCompare(b.title || b.name);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [achievements, filters, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAchievements = filteredAndSorted.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const resetPage = useMemo(() => {
    setCurrentPage(1);
  }, [filters, sortBy, sortOrder]);

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

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-success';
    if (progress >= 70) return 'bg-warning';
    if (progress >= 50) return 'bg-error';
    return 'bg-primary';
  };

  const isRecentlyUnlocked = (achievementId: string) => {
    return recentAchievements.some((recent) => recent.id === achievementId);
  };

  const selectedAchievement = selectedAchievementId
    ? achievements.find((a) => a.id === selectedAchievementId)
    : null;

  return (
    <div className="space-y-4">
      {/* Achievement List */}
      <div className="space-y-2">
        {paginatedAchievements.map((achievement) => {
          const {
            id,
            name,
            title,
            description,
            category,
            rarity = 'common',
            progress,
            targetValue,
            isCompleted,
            completedAt,
          } = achievement;

          const progressPercent =
            targetValue > 0 ? Math.min((progress / targetValue) * 100, 100) : 0;
          const isPinned = pinnedAchievements.includes(id.toString());
          const isRecent = isRecentlyUnlocked(id);
          const isSelected = selectedAchievementId === id;

          // Get theme-aware styling
          const rarityClasses = utils.isValidRarity(rarity)
            ? getRarityClasses(rarity as AchievementRarity)
            : getRarityClasses('common');

          const cardClasses = utils.isValidRarity(rarity)
            ? getCardClasses(rarity as AchievementRarity, category)
            : getCardClasses('common', category);

          return (
            <div
              key={id}
              className={`group relative overflow-hidden transition-all duration-300 cursor-pointer ${
                isCompleted
                  ? `${cardClasses.container} ${rarityClasses.celebration} hover:shadow-xl`
                  : `${cardClasses.container} bg-surface border-muted hover:border-muted/80 hover:shadow-md`
              } ${isSelected ? 'ring-2 ring-primary/50 shadow-lg transform scale-[1.02]' : rarityClasses.cardHover}`}
              onClick={() => onSelectAchievement(isSelected ? null : id)}
            >
              {/* Achievement Badge Background Pattern */}
              <div
                className={`absolute inset-0 opacity-5 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-transparent via-white/10 to-transparent'
                    : ''
                }`}
              />

              {/* Recent Achievement Shine Effect */}
              {isRecent && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/10 to-transparent animate-pulse" />
              )}

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  {/* Achievement Icon Badge */}
                  <div
                    className={`relative flex-shrink-0 ${isCompleted ? 'transform rotate-3' : ''}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                        isCompleted
                          ? `${rarityClasses.card} shadow-lg ring-2 ${rarityClasses.leftBorder}`
                          : 'bg-muted/50 text-tertiary group-hover:bg-muted group-hover:text-content'
                      }`}
                    >
                      {cardClasses.categoryIcon}
                    </div>

                    {/* Completion Checkmark */}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                        ✓
                      </div>
                    )}

                    {/* Recent Badge */}
                    {isRecent && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md animate-bounce">
                        ✨
                      </div>
                    )}
                  </div>

                  {/* Achievement Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`font-bold text-base leading-tight ${
                              isCompleted ? 'text-content' : 'text-content/80'
                            }`}
                          >
                            {title || name}
                          </h3>
                          {isRecent && (
                            <span className="text-xs bg-gradient-to-r from-success to-success/80 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                              NEW!
                            </span>
                          )}
                        </div>

                        {/* Achievement Description */}
                        <p
                          className={`text-sm leading-relaxed mb-3 ${
                            isCompleted ? 'text-content/70' : 'text-tertiary'
                          }`}
                        >
                          {description}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-start gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(id.toString());
                          }}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            isPinned
                              ? 'bg-yellow-500/20 text-yellow-600 shadow-sm'
                              : 'text-tertiary hover:text-content hover:bg-muted/50'
                          }`}
                          title={isPinned ? 'Unpin achievement' : 'Pin achievement'}
                        >
                          <span className="text-lg">📌</span>
                        </button>

                        {/* Expand indicator */}
                        <div className="text-tertiary group-hover:text-content transition-colors">
                          <span className="text-lg">{isSelected ? '▼' : '▶'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Achievement Meta Info */}
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Rarity Badge */}
                        <span className={`${cardClasses.badge} uppercase tracking-wide shadow-sm`}>
                          {rarity}
                        </span>

                        {/* Category Badge */}
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium capitalize border ${cardClasses.categoryAccent || 'text-content/70'} bg-muted/50`}
                        >
                          {category}
                        </span>
                      </div>

                      {/* Completion Status */}
                      {isCompleted && completedAt ? (
                        <div className="flex items-center gap-1 text-sm text-success font-medium">
                          <span>🏆</span>
                          <span>Unlocked {new Date(completedAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-content font-medium">
                            {progress.toLocaleString()}/{targetValue.toLocaleString()}
                          </span>
                          <span className="text-tertiary">({progressPercent.toFixed(0)}%)</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {!isCompleted && (
                      <div className="space-y-1">
                        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className={`${cardClasses.progress} rounded-full h-2 shadow-sm`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        {progressPercent >= 90 && (
                          <div className="text-xs text-warning font-medium flex items-center gap-1">
                            <span>⚡</span>
                            <span>
                              Almost there! {(targetValue - progress).toLocaleString()} more to go!
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completed Achievement Shine */}
                    {isCompleted && (
                      <div className="flex items-center justify-center py-2">
                        <div className="flex items-center gap-2 text-success font-medium">
                          <span className="text-lg">🎉</span>
                          <span className="text-sm uppercase tracking-wide font-bold">
                            Achievement Unlocked!
                          </span>
                          <span className="text-lg">🎉</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isSelected && selectedAchievement && (
                <div className="mt-4 pt-4 border-t border-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-content mb-2">Details</h4>
                      <p className="text-sm text-content mb-2">{selectedAchievement.description}</p>

                      {!selectedAchievement.isCompleted && (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-tertiary">Progress: </span>
                            <span className="font-medium text-content">
                              {selectedAchievement.progress.toLocaleString()} /{' '}
                              {selectedAchievement.targetValue.toLocaleString()}
                            </span>
                          </div>
                          {progressPercent >= 90 && (
                            <div className="text-sm text-success">
                              ⚡ Almost there!{' '}
                              {(
                                selectedAchievement.targetValue - selectedAchievement.progress
                              ).toLocaleString()}{' '}
                              more to go!
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-content mb-2">Info</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-tertiary">Category: </span>
                          <span className="text-content capitalize">
                            {selectedAchievement.category}
                          </span>
                        </div>
                        <div>
                          <span className="text-tertiary">Rarity: </span>
                          <span className={`capitalize ${rarityClasses.badge}`}>
                            {selectedAchievement.rarity}
                          </span>
                        </div>
                        {selectedAchievement.completedAt && (
                          <div>
                            <span className="text-tertiary">Completed: </span>
                            <span className="text-content">
                              {new Date(selectedAchievement.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-muted">
          <div className="text-sm text-tertiary">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSorted.length)} of{' '}
            {filteredAndSorted.length} achievements
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-background border border-muted rounded hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis between page ranges
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-2 text-tertiary">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 text-sm rounded transition-colors ${
                      page === currentPage
                        ? 'bg-primary text-white'
                        : 'bg-background border border-muted hover:bg-surface'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-background border border-muted rounded hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {filteredAndSorted.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-content mb-2">No achievements found</h3>
          <p className="text-tertiary">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
});

export default AchievementList;
