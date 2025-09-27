// apps/client/src/components/achievements/AchievementManager.tsx
// Consolidated Achievement Manager - User and Admin views
import { useState, memo, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAchievements } from '../../contexts/AchievementContext';
import { useAchievementTheme } from '../../theme/hooks/useAchievementTheme';
import type { AchievementRarity } from '../../theme/utils/achievement-colors';
import { calculateProgressPercentage } from '../../utils/achievementDataTransform';

import AchievementList from './AchievementList';

// Admin-specific imports (only loaded when needed)
import { RuleBuilder } from '../admin/achievements/AchievementRuleBuilder/RuleBuilder';
import type { JsonRuleAchievementData, RuleValidationResult } from '@ems/types';
import {
  getAllAchievements,
  getAchievementAnalytics,
  type AchievementWithStats,
  type AchievementAnalytics,
} from '../../api/admin';

type SortBy = 'progress' | 'rarity' | 'category' | 'name';
type ViewMode = 'user' | 'admin';

interface FilterState {
  categories: string[];
  status: ('completed' | 'in-progress' | 'locked')[];
  searchQuery: string;
}

const AchievementManager = memo(function AchievementManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // View mode state - admins can switch between user and admin views
  const [viewMode, setViewMode] = useState<ViewMode>('user');
  const showAdminView = isAdmin && viewMode === 'admin';

  // Achievement data
  const {
    achievements: progressToNext,
    recentAchievements,
    totalBadges,
    totalAvailable,
    completionRate,
    loading,
  } = useAchievements();

  // Theme integration
  const { getRarityClasses, getCategoryIcon, getCardClasses, utils } = useAchievementTheme();

  // UI state
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);
  const [isBrowseExpanded, setIsBrowseExpanded] = useState(false);

  // Filter and sort state (for browse section)
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    status: ['completed', 'in-progress', 'locked'],
    searchQuery: '',
  });

  const [sortBy, setSortBy] = useState<SortBy>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // User preferences (could be moved to context/localStorage later)
  const [pinnedAchievements, setPinnedAchievements] = useState<string[]>([]);

  // Admin state (only used when in admin mode)
  const [adminActiveTab, setAdminActiveTab] = useState<'overview' | 'rule-builder'>('overview');
  const [adminData, setAdminData] = useState<AchievementWithStats[]>([]);
  const [analytics, setAnalytics] = useState<AchievementAnalytics | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<JsonRuleAchievementData>>({
    eventKeys: [],
    progress: { kind: 'count' },
    unlockWhen: {},
    counters: [],
  });
  const [ruleValidation, setRuleValidation] = useState<RuleValidationResult>({
    isValid: false,
    errors: ['Rule is incomplete'],
    warnings: [],
    estimatedComplexity: 'low',
  });

  // Load admin data when switching to admin view
  useEffect(() => {
    if (showAdminView) {
      setAdminLoading(true);
      Promise.all([getAllAchievements(), getAchievementAnalytics()])
        .then(([achievements, analyticsData]) => {
          setAdminData(achievements);
          setAnalytics(analyticsData);
          setAdminLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load admin data:', err);
          setAdminLoading(false);
        });
    }
  }, [showAdminView]);

  // Computed achievement categories
  const achievementCategories = useMemo(() => {
    const completed = progressToNext.filter((a) => a.isCompleted);
    const inProgress = progressToNext.filter((a) => !a.isCompleted && a.progress > 0);
    const locked = progressToNext.filter((a) => !a.isCompleted && a.progress === 0);

    return {
      completed,
      inProgress,
      locked,
      all: progressToNext,
    };
  }, [progressToNext]);

  // Category and rarity statistics
  const stats = useMemo(() => {
    const categoryStats: Record<string, { total: number; completed: number }> = {};
    const rarityStats: Record<string, number> = {};
    const completedAchievements = progressToNext.filter((a) => a.isCompleted);

    progressToNext.forEach((achievement) => {
      const category = achievement.category || 'general';
      const rarity = achievement.rarity;

      // Category stats
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, completed: 0 };
      }
      categoryStats[category].total++;
      if (achievement.isCompleted) {
        categoryStats[category].completed++;
      }

      // Rarity stats (only for completed)
      if (achievement.isCompleted) {
        rarityStats[rarity] = (rarityStats[rarity] || 0) + 1;
      }
    });

    // Find rarest achievement (highest rarity in order)
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'shame', 'legendary', 'secret'];
    const rarestAchievement = completedAchievements.sort((a, b) => {
      const aRarityIndex = rarityOrder.indexOf(a.rarity);
      const bRarityIndex = rarityOrder.indexOf(b.rarity);
      return bRarityIndex - aRarityIndex; // Descending order (rarest first)
    })[0];

    return { categoryStats, rarityStats, rarestAchievement };
  }, [progressToNext]);

  // Filter functions
  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const togglePinnedAchievement = (achievementId: string) => {
    setPinnedAchievements(
      (prev) =>
        prev.includes(achievementId)
          ? prev.filter((id) => id !== achievementId)
          : [...prev, achievementId].slice(0, 5), // Max 5 pinned
    );
  };

  if (loading || (showAdminView && adminLoading)) {
    return (
      <div className="min-h-[600px] bg-surface border border-muted rounded-2xl p-6">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="ml-3 text-tertiary">Loading Achievement Manager...</span>
        </div>
      </div>
    );
  }

  // Admin View
  if (showAdminView) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6 min-h-[600px]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content flex items-center">
              <span className="mr-3">🏆</span>
              Achievement Manager (Admin)
            </h1>
            <p className="text-tertiary mt-1">Manage and configure platform achievements</p>
          </div>
          <button
            onClick={() => setViewMode('user')}
            className="px-4 py-2 bg-background border border-muted rounded-lg hover:bg-surface transition-colors text-sm font-medium text-content"
          >
            Switch to User View
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-muted">
          <button
            onClick={() => setAdminActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              adminActiveTab === 'overview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-tertiary hover:text-content'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setAdminActiveTab('rule-builder')}
            className={`px-4 py-2 font-medium transition-colors ${
              adminActiveTab === 'rule-builder'
                ? 'text-primary border-b-2 border-primary'
                : 'text-tertiary hover:text-content'
            }`}
          >
            Rule Builder
          </button>
        </div>

        {adminActiveTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border border-muted">
                <div className="text-2xl font-bold text-content">{adminData.length}</div>
                <div className="text-sm text-tertiary">Total Achievements</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-muted">
                <div className="text-2xl font-bold text-content">
                  {adminData.filter((a) => a.isActive).length}
                </div>
                <div className="text-sm text-tertiary">Active</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-muted">
                <div className="text-2xl font-bold text-content">
                  {analytics?.totalUnlocks || 0}
                </div>
                <div className="text-sm text-tertiary">Total Unlocks</div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-muted">
                <div className="text-2xl font-bold text-content">
                  {analytics?.averageCompletionRate
                    ? `${(analytics.averageCompletionRate * 100).toFixed(1)}%`
                    : '0%'}
                </div>
                <div className="text-sm text-tertiary">Avg Completion</div>
              </div>
            </div>
          </div>
        )}

        {adminActiveTab === 'rule-builder' && (
          <div className="space-y-6">
            <RuleBuilder
              rule={currentRule}
              onChange={setCurrentRule}
              onValidation={setRuleValidation}
            />
          </div>
        )}
      </div>
    );
  }

  // User View (original styling preserved)
  return (
    <div className="bg-surface border border-muted rounded-2xl p-6 min-h-[600px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content flex items-center">
              <span className="mr-3">🏆</span>
              Achievement Manager
            </h1>
            <p className="text-tertiary mt-1">
              Track your progress and celebrate your accomplishments
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setViewMode('admin')}
              className="px-4 py-2 bg-background border border-muted rounded-lg hover:bg-surface transition-colors text-sm font-medium text-content"
            >
              Admin View
            </button>
          )}
        </div>
      </div>

      {/* Achievement Stats Overview */}
      <div className="space-y-6 mb-8">
        {/* Overall Progress */}
        <div className="bg-background/50 rounded-lg p-6 border border-muted">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-content">Overall Progress</h2>
            <span className="text-2xl font-bold text-primary">
              {(completionRate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden mb-3">
            <div
              className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-3 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(completionRate * 100, 100)}%` }}
            />
          </div>
          <div className="text-sm text-tertiary text-center">
            {totalBadges} of {totalAvailable} achievements unlocked
          </div>
        </div>

        {/* Rarest Achievement Showcase */}
        {stats.rarestAchievement && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-content mb-4 flex items-center">
              <span className="mr-2">👑</span>
              Crown Achievement
            </h2>
            {(() => {
              const achievement = stats.rarestAchievement;
              const rarity = achievement.rarity;
              const rarityClasses = utils.isValidRarity(rarity)
                ? getRarityClasses(rarity as AchievementRarity)
                : getRarityClasses('common');
              const cardClasses = utils.isValidRarity(rarity)
                ? getCardClasses(rarity as AchievementRarity, achievement.category)
                : getCardClasses('common', achievement.category);

              return (
                <div
                  className={`group relative overflow-hidden transition-all duration-300 ${cardClasses.container} ${rarityClasses.celebration} shadow-xl`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
                  <div className="relative p-6">
                    <div className="flex items-center gap-6">
                      {/* Hero Icon */}
                      <div className="relative">
                        <div
                          className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${rarityClasses.card} shadow-2xl ring-4 ${rarityClasses.leftBorder} transform rotate-3`}
                        >
                          {cardClasses.categoryIcon}
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          ✓
                        </div>
                      </div>

                      {/* Achievement Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-content">
                            {achievement.title || achievement.name}
                          </h3>
                          <span
                            className={`${cardClasses.badge} uppercase tracking-wide shadow-sm`}
                          >
                            {rarity}
                          </span>
                        </div>
                        <p className="text-content/80 mb-3 leading-relaxed">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-tertiary capitalize">
                            {achievement.category}
                          </span>
                          <span className="text-sm text-success font-medium">
                            🏆 Unlocked{' '}
                            {achievement.completedAt
                              ? new Date(achievement.completedAt).toLocaleDateString()
                              : 'Recently'}
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

        {/* Recent & Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Achievements Showcase */}
          <div className="bg-background/50 rounded-lg p-4 border border-muted">
            <h3 className="font-semibold text-content mb-4 flex items-center">
              <span className="mr-2">🎉</span>
              Recent Unlocks
            </h3>
            {recentAchievements.length > 0 ? (
              <div className="space-y-3">
                {recentAchievements.slice(0, 4).map((achievement) => {
                  const rarity = achievement.rarity;
                  const rarityClasses = utils.isValidRarity(rarity)
                    ? getRarityClasses(rarity as AchievementRarity)
                    : getRarityClasses('common');
                  const cardClasses = utils.isValidRarity(rarity)
                    ? getCardClasses(rarity as AchievementRarity, achievement.category)
                    : getCardClasses('common', achievement.category);

                  return (
                    <div
                      key={achievement.id}
                      className={`relative overflow-hidden rounded-lg p-3 border transition-all duration-200 ${cardClasses.container} ${rarityClasses.celebration}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/5 to-transparent animate-pulse" />
                      <div className="relative flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${rarityClasses.card} shadow-md ring-2 ${rarityClasses.leftBorder}`}
                        >
                          {cardClasses.categoryIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-content text-sm truncate">
                              {achievement.title || achievement.name}
                            </span>
                            <span className="text-xs bg-gradient-to-r from-success to-success/80 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                              NEW!
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs ${cardClasses.badge.replace('px-2 py-1', 'px-1.5 py-0.5')}`}
                            >
                              {rarity}
                            </span>
                            <span className="text-xs text-tertiary capitalize">
                              {achievement.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-tertiary text-center py-8">
                <div className="text-2xl mb-2">🎯</div>
                Start completing activities to see your recent achievements here!
              </div>
            )}
          </div>

          {/* Combined Stats Panel */}
          <div className="bg-background/50 rounded-lg p-4 border border-muted">
            <h3 className="font-semibold text-content mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Achievement Stats
            </h3>

            {/* Category Breakdown */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-content/80 mb-2">Top Categories</h4>
              <div className="space-y-2">
                {Object.entries(stats.categoryStats)
                  .sort(([, a], [, b]) => b.completed - a.completed)
                  .slice(0, 4)
                  .map(([category, categoryData]) => (
                    <div key={category} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(category)}</span>
                        <span className="text-tertiary capitalize">{category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-content">
                          {categoryData.completed}/{categoryData.total}
                        </span>
                        <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all duration-500"
                            style={{
                              width: `${categoryData.total > 0 ? (categoryData.completed / categoryData.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Rarity Collection */}
            <div>
              <h4 className="text-sm font-medium text-content/80 mb-2">Rarity Collection</h4>
              <div className="space-y-1">
                {Object.keys(stats.rarityStats).length > 0 ? (
                  Object.entries(stats.rarityStats)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([rarity, count]) => (
                      <div key={rarity} className="flex justify-between items-center text-sm">
                        <span className="text-tertiary capitalize">{rarity}</span>
                        <span className="text-content font-medium">{count}</span>
                      </div>
                    ))
                ) : (
                  <div className="text-sm text-tertiary">
                    Complete achievements to collect rarities
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Achievements */}
        {pinnedAchievements.length > 0 && (
          <div className="bg-background/50 rounded-lg p-4 border border-muted">
            <h3 className="font-semibold text-content mb-3 flex items-center">
              <span className="mr-2">📌</span>
              Pinned Goals ({pinnedAchievements.length}/5)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedAchievements.slice(0, 6).map((pinnedId) => {
                const achievement = achievementCategories.all.find(
                  (a) => a.id.toString() === pinnedId,
                );
                if (!achievement) return null;

                const progressPercent = calculateProgressPercentage(
                  achievement.progress,
                  achievement.targetValue,
                );

                return (
                  <div
                    key={achievement.id}
                    className="bg-surface rounded-lg p-3 border border-muted"
                  >
                    <div className="text-sm font-medium text-content mb-1">
                      {achievement.title || achievement.name}
                    </div>
                    <div className="text-xs text-tertiary mb-2 capitalize">
                      {achievement.category}
                    </div>
                    {!achievement.isCompleted ? (
                      <>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-content">
                            {achievement.progress.toLocaleString()}/
                            {achievement.targetValue.toLocaleString()}
                          </span>
                          <span className="text-tertiary">{progressPercent.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-success flex items-center">
                        <span className="mr-1">✅</span>
                        Completed!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Browse Achievements Section */}
      <div className="border-t border-muted pt-6">
        <button
          onClick={() => setIsBrowseExpanded(!isBrowseExpanded)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-background border border-muted rounded-lg hover:bg-surface transition-colors"
        >
          <span className="font-medium text-content">Browse All Achievements</span>
          <span className="text-tertiary">{isBrowseExpanded ? '▲' : '▼'}</span>
        </button>

        {isBrowseExpanded && (
          <div className="mt-6 space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search achievements..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 bg-background border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary text-sm"
                />
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-tertiary">
                  🔍
                </div>
                {filters.searchQuery && (
                  <button
                    onClick={() => updateFilters({ searchQuery: '' })}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-tertiary hover:text-content"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as SortBy);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2 bg-background border border-muted rounded-lg text-content focus:outline-none focus:border-primary text-sm"
              >
                <option value="progress-desc">Progress (High to Low)</option>
                <option value="progress-asc">Progress (Low to High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="category-asc">Category (A-Z)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-content">Categories:</span>
              <button
                onClick={() => updateFilters({ categories: [] })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.categories.length === 0
                    ? 'bg-primary text-white'
                    : 'bg-background text-tertiary border border-muted hover:text-content'
                }`}
              >
                All
              </button>
              {Object.entries(stats.categoryStats).map(([category, categoryData]) => (
                <button
                  key={category}
                  onClick={() => {
                    const newCategories = filters.categories.includes(category)
                      ? filters.categories.filter((c) => c !== category)
                      : [...filters.categories, category];
                    updateFilters({ categories: newCategories });
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.categories.includes(category)
                      ? 'bg-primary text-white'
                      : 'bg-background text-tertiary border border-muted hover:text-content'
                  }`}
                >
                  <span className="capitalize">{category}</span>
                  <span className="opacity-75">
                    ({categoryData.completed}/{categoryData.total})
                  </span>
                </button>
              ))}
            </div>

            {/* Achievement List */}
            <AchievementList
              achievements={achievementCategories.all}
              recentAchievements={recentAchievements}
              filters={filters}
              sortBy={sortBy}
              sortOrder={sortOrder}
              pinnedAchievements={pinnedAchievements}
              onTogglePin={togglePinnedAchievement}
              selectedAchievementId={selectedAchievementId}
              onSelectAchievement={setSelectedAchievementId}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default AchievementManager;
