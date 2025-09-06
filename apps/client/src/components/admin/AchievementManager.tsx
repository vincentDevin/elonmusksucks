// TODO: This admin component could be updated to use the achievement theme system
// from /theme/hooks/useAchievementTheme for consistency, but it uses hardcoded
// colors that are acceptable for admin interfaces.
import { useState, useEffect, useMemo } from 'react';
import {
  getAllAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getAchievementAnalytics,
  type AchievementWithStats,
  type AchievementAnalytics,
  type CreateAchievementData,
} from '../../api/admin';
import { RuleBuilder } from './achievements/AchievementRuleBuilder/RuleBuilder';
import type { JsonRuleAchievementData, RuleValidationResult } from '@ems/types';

interface FilterState {
  search: string;
  category?: string;
  isActive?: boolean;
  rarity: string[];
  userCountMin?: number;
  userCountMax?: number;
  sortBy: 'name' | 'createdAt' | 'userCount' | 'category';
  sortOrder: 'asc' | 'desc';
}

const initialFilters: FilterState = {
  search: '',
  rarity: [],
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export default function AchievementManager() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'achievements' | 'rule-builder' | 'analytics' | 'categories'
  >('overview');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);

  // Data states
  const [achievementData, setAchievementData] = useState<AchievementWithStats[]>([]);
  const [analytics, setAnalytics] = useState<AchievementAnalytics | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection and operations
  const [selectedAchievements, setSelectedAchievements] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal states
  const [showCreateAchievement, setShowCreateAchievement] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementWithStats | null>(null);
  const [selectedAchievementDetails, setSelectedAchievementDetails] =
    useState<AchievementWithStats | null>(null);

  // Rule Builder state
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

  // Load achievement data
  const loadAchievementData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAllAchievements();
      let filteredData = data;

      // Apply client-side filtering
      if (filters.search) {
        filteredData = filteredData.filter(
          (achievement) =>
            achievement.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            achievement.description?.toLowerCase().includes(filters.search.toLowerCase()),
        );
      }

      if (filters.category) {
        filteredData = filteredData.filter(
          (achievement) => achievement.category === filters.category,
        );
      }

      if (filters.rarity.length > 0) {
        filteredData = filteredData.filter((achievement) =>
          filters.rarity.includes(achievement.rarity),
        );
      }

      if (filters.userCountMin !== undefined) {
        filteredData = filteredData.filter(
          (achievement) => achievement.totalUsers >= filters.userCountMin!,
        );
      }

      if (filters.userCountMax !== undefined) {
        filteredData = filteredData.filter(
          (achievement) => achievement.totalUsers <= filters.userCountMax!,
        );
      }

      // Apply sorting
      filteredData.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (filters.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'userCount':
            aValue = a.totalUsers;
            bValue = b.totalUsers;
            break;
          case 'category':
            aValue = a.category.toLowerCase();
            bValue = b.category.toLowerCase();
            break;
          default:
            return 0;
        }

        if (filters.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        }
      });

      setAchievementData(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievement data');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const analyticsData = await getAchievementAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  // Load categories from achievements
  const loadCategories = async () => {
    try {
      const data = await getAllAchievements();
      const uniqueCategories = [...new Set(data.map((achievement) => achievement.category))];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Load data on filter changes
  useEffect(() => {
    loadAchievementData();
  }, [filters, currentPage]);

  // Load analytics and categories on tab change
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'overview') {
      loadAnalytics();
    }
    if (activeTab === 'categories' || activeTab === 'achievements') {
      loadCategories();
    }
  }, [activeTab]);

  // Handle filter changes
  const updateFilters = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(0);
  };

  // Handle achievement operations
  const handleCreateAchievement = async (data: CreateAchievementData) => {
    try {
      await createAchievement(data);
      setShowCreateAchievement(false);
      loadAchievementData();
    } catch (err) {
      alert(
        'Failed to create achievement: ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  };

  const handleUpdateAchievement = async (achievementId: number, data: CreateAchievementData) => {
    try {
      await updateAchievement(achievementId, data);
      setEditingAchievement(null);
      loadAchievementData();
    } catch (err) {
      alert(
        'Failed to update achievement: ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  };

  const handleDeleteAchievement = async (achievementId: number) => {
    if (
      !confirm(
        'Are you sure you want to delete this achievement? This will remove it from all users.',
      )
    ) {
      return;
    }

    try {
      await deleteAchievement(achievementId);
      loadAchievementData();
    } catch (err) {
      alert(
        'Failed to delete achievement: ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (operation: 'activate' | 'deactivate' | 'delete' | 'grant') => {
    if (selectedAchievements.size === 0) return;

    let confirmMessage = '';
    switch (operation) {
      case 'delete':
        confirmMessage = `Are you sure you want to delete ${selectedAchievements.size} achievements? This will remove them from all users.`;
        break;
      case 'activate':
        confirmMessage = `Activate ${selectedAchievements.size} achievements?`;
        break;
      case 'deactivate':
        confirmMessage = `Deactivate ${selectedAchievements.size} achievements?`;
        break;
      case 'grant':
        confirmMessage = `Grant ${selectedAchievements.size} achievements to users?`;
        break;
    }

    if (!confirm(confirmMessage)) return;

    setBulkLoading(true);
    try {
      // For now, just show that the operation was attempted
      // In a real implementation, you'd need specific bulk operations
      alert(`Bulk ${operation} operation attempted for ${selectedAchievements.size} achievements`);
      setSelectedAchievements(new Set());
      loadAchievementData();
    } catch (err) {
      alert('Bulk operation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBulkLoading(false);
    }
  };

  // Categories are now derived from achievements, no separate creation needed

  // Handle achievement details view
  const handleViewAchievementDetails = async (achievementId: number) => {
    try {
      const details = await getAchievementById(achievementId);
      setSelectedAchievementDetails(details);
    } catch (err) {
      alert(
        'Failed to load achievement details: ' +
          (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  };

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    if (!achievementData || achievementData.length === 0 || !analytics) return null;

    return {
      totalAchievements: achievementData.length,
      totalAwards: analytics.overview.totalUnlocks,
      activeUsers: analytics.overview.activeUsers,
      mostPopular: achievementData.reduce((prev, current) =>
        current.totalUsers > prev.totalUsers ? current : prev,
      ),
      categories: categories.length,
    };
  }, [achievementData, analytics, categories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-content">Advanced Achievement Manager</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateAchievement(true)}
            className="px-3 py-1 bg-primary text-surface rounded hover:opacity-90 text-sm"
          >
            Create Achievement
          </button>
          <button
            onClick={loadAchievementData}
            disabled={loading}
            className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-muted">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'achievements', label: 'Achievement Management' },
          { key: 'rule-builder', label: 'Rule Builder' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'categories', label: 'Categories' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-tertiary hover:text-content'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      {activeTab === 'achievements' && (
        <div className="bg-surface p-4 rounded-lg border border-muted">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                placeholder="Achievement name or description..."
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilters({ category: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Rarity Filter */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Rarity</label>
              <select
                multiple
                value={filters.rarity}
                onChange={(e) =>
                  updateFilters({
                    rarity: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="secret">Secret</option>
                <option value="shame">Shame</option>
              </select>
            </div>

            {/* User Count Range */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Min User Count</label>
              <input
                type="number"
                value={filters.userCountMin || ''}
                onChange={(e) =>
                  updateFilters({
                    userCountMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="0"
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-1">Max User Count</label>
              <input
                type="number"
                value={filters.userCountMax || ''}
                onChange={(e) =>
                  updateFilters({
                    userCountMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="∞"
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              />
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              >
                <option value="createdAt">Created Date</option>
                <option value="name">Name</option>
                <option value="userCount">User Count</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-muted text-content rounded hover:opacity-80 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'overview' && overviewStats && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-primary">
                {overviewStats.totalAchievements}
              </div>
              <div className="text-sm text-tertiary">Total Achievements</div>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-primary">{overviewStats.totalAwards}</div>
              <div className="text-sm text-tertiary">Total Awards</div>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-primary">{overviewStats.activeUsers}</div>
              <div className="text-sm text-tertiary">Active Users</div>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-primary">{overviewStats.categories}</div>
              <div className="text-sm text-tertiary">Categories</div>
            </div>
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <div className="text-lg font-bold text-primary">{overviewStats.mostPopular.name}</div>
              <div className="text-sm text-tertiary">
                Most Popular ({overviewStats.mostPopular.totalUsers} users)
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {analytics && analytics.recentActivity && analytics.recentActivity.length > 0 && (
            <div className="bg-surface p-6 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-4">
                Recent Achievement Unlocks
              </h3>
              <div className="space-y-2">
                {analytics.recentActivity.slice(0, 10).map((activity: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-muted last:border-b-0"
                  >
                    <div>
                      <span className="font-medium text-content">{activity.userName}</span>
                      <span className="text-tertiary mx-2">unlocked</span>
                      <span className="font-medium text-primary">{activity.achievementTitle}</span>
                    </div>
                    <div className="text-sm text-tertiary">
                      {new Date(activity.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && achievementData && (
        <div className="space-y-4">
          {/* Bulk Actions */}
          {selectedAchievements.size > 0 && (
            <div className="bg-surface p-4 rounded-lg border border-muted flex items-center justify-between">
              <span className="text-content">
                {selectedAchievements.size} achievements selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkOperation('grant')}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-green-500 text-surface rounded hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  Grant to Users
                </button>
                <button
                  onClick={() => handleBulkOperation('deactivate')}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-yellow-500 text-surface rounded hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkOperation('delete')}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-red-500 text-surface rounded hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  {bulkLoading ? 'Processing...' : 'Delete'}
                </button>
                <button
                  onClick={() => setSelectedAchievements(new Set())}
                  className="px-4 py-2 bg-muted text-content rounded hover:opacity-80 text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Achievement Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {achievementData.map((achievement: AchievementWithStats) => (
              <div
                key={achievement.id}
                className="bg-surface p-4 rounded-lg border border-muted hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedAchievements.has(achievement.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedAchievements);
                      if (e.target.checked) {
                        newSelected.add(achievement.id);
                      } else {
                        newSelected.delete(achievement.id);
                      }
                      setSelectedAchievements(newSelected);
                    }}
                    className="mt-1"
                  />
                  <div className="flex items-center gap-2">
                    {achievement.iconUrl && (
                      <img
                        src={achievement.iconUrl}
                        alt={achievement.name}
                        className="w-6 h-6 rounded"
                      />
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        achievement.rarity === 'legendary'
                          ? 'bg-purple-100 text-purple-800'
                          : achievement.rarity === 'rare'
                            ? 'bg-blue-100 text-blue-800'
                            : achievement.rarity === 'secret'
                              ? 'bg-indigo-100 text-indigo-800'
                              : achievement.rarity === 'shame'
                                ? 'bg-red-100 text-red-800'
                                : achievement.rarity === 'uncommon'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {achievement.rarity}
                    </span>
                  </div>
                </div>

                <h4 className="font-semibold text-content mb-2">{achievement.name}</h4>
                <p className="text-sm text-tertiary mb-3 line-clamp-2">
                  {achievement.description || 'No description'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Users:</span>
                    <span className="text-content">{achievement.totalUsers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Completed:</span>
                    <span className="text-content">{achievement.completedUsers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Rate:</span>
                    <span className="text-content">{achievement.completionRate.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewAchievementDetails(achievement.id)}
                    className="flex-1 px-3 py-1 bg-primary text-surface rounded hover:opacity-90 text-sm"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setEditingAchievement(achievement)}
                    className="flex-1 px-3 py-1 bg-secondary text-surface rounded hover:opacity-90 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAchievement(achievement.id)}
                    className="px-3 py-1 bg-red-500 text-surface rounded hover:opacity-90 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-surface px-4 py-3 rounded-lg border border-muted">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-content">
                Showing {achievementData.length} achievements
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rule Builder Tab */}
      {activeTab === 'rule-builder' && (
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-lg border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Achievement Rule Builder</h3>
            <p className="text-tertiary mb-6">
              Create sophisticated achievement rules using the visual rule builder. Build complex
              conditions, track progress, and test your rules with the integrated simulation engine.
            </p>

            <RuleBuilder
              initialRule={currentRule}
              onChange={(rule: JsonRuleAchievementData, validation: RuleValidationResult) => {
                setCurrentRule(rule);
                setRuleValidation(validation);
              }}
            />
          </div>

          {/* Rule Status Panel */}
          <div className="bg-surface p-4 rounded-lg border border-muted">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-content">Current Rule Status</h4>
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 rounded-full ${ruleValidation.isValid ? 'bg-success' : 'bg-error'}`}
                ></div>
                <span
                  className={`text-sm font-medium ${ruleValidation.isValid ? 'text-success' : 'text-error'}`}
                >
                  {ruleValidation.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-tertiary">Event Keys:</span>
                <span className="ml-2 font-mono text-primary">
                  {currentRule.eventKeys?.length || 0}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Progress Type:</span>
                <span className="ml-2 font-mono text-primary">
                  {currentRule.progress?.kind || 'none'}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Complexity:</span>
                <span
                  className={`ml-2 font-mono ${
                    ruleValidation.estimatedComplexity === 'low'
                      ? 'text-success'
                      : ruleValidation.estimatedComplexity === 'medium'
                        ? 'text-warning'
                        : 'text-error'
                  }`}
                >
                  {ruleValidation.estimatedComplexity}
                </span>
              </div>
            </div>

            {ruleValidation.errors.length > 0 && (
              <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg">
                <h5 className="text-sm font-medium text-error mb-2">Validation Errors:</h5>
                <ul className="text-xs text-error space-y-1">
                  {ruleValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {ruleValidation.warnings.length > 0 && (
              <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <h5 className="text-sm font-medium text-warning mb-2">Warnings:</h5>
                <ul className="text-xs text-warning space-y-1">
                  {ruleValidation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setCurrentRule({
                  eventKeys: [],
                  progress: { kind: 'count' },
                  unlockWhen: {},
                  counters: [],
                });
              }}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/80 transition-colors"
            >
              🔄 Reset Rule
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(currentRule, null, 2));
              }}
              disabled={!ruleValidation.isValid}
              className="px-4 py-2 bg-info text-white rounded-lg hover:bg-info/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📋 Copy JSON
            </button>

            <button
              onClick={() => {
                // TODO: Implement save functionality
                alert('Save functionality will be implemented in the next phase');
              }}
              disabled={!ruleValidation.isValid}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              💾 Save Achievement
            </button>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Overview Analytics */}
          <div className="bg-surface p-6 rounded-lg border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Achievement System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.totalAchievements || 0}
                </div>
                <div className="text-sm text-tertiary">Total Achievements</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.totalUnlocks || 0}
                </div>
                <div className="text-sm text-tertiary">Total Unlocks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.activeUsers || 0}
                </div>
                <div className="text-sm text-tertiary">Active Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{categories.length}</div>
                <div className="text-sm text-tertiary">Categories</div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-surface p-6 rounded-lg border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {analytics.categoryBreakdown &&
                analytics.categoryBreakdown.map((category: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-primary"></div>
                      <span className="capitalize font-medium text-content">
                        {category.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-content">{category.achievementCount}</div>
                      <div className="text-sm text-tertiary">{category.totalUnlocks} unlocks</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Achievements */}
          {analytics.topAchievements && analytics.topAchievements.length > 0 && (
            <div className="bg-surface p-6 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-4">Most Popular Achievements</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="text-left py-2 text-sm font-medium text-content">
                        Achievement
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-content">
                        Completed Users
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-content">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topAchievements.map((achievement: any, index: number) => (
                      <tr key={index} className="border-b border-muted">
                        <td className="py-2 text-sm text-content">{achievement.title}</td>
                        <td className="py-2 text-sm text-content">{achievement.completedUsers}</td>
                        <td className="py-2 text-sm text-content">
                          {achievement.completionRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const categoryAchievements = achievementData.filter((a) => a.category === category);
              return (
                <div key={category} className="bg-surface p-4 rounded-lg border border-muted">
                  <div className="flex items-center gap-3 mb-3">
                    <div>
                      <h4 className="font-semibold text-content">{category}</h4>
                      <p className="text-sm text-tertiary">
                        {categoryAchievements.length} achievements
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-tertiary mb-3">
                    Total unlocks:{' '}
                    {categoryAchievements.reduce((sum, a) => sum + a.completedUsers, 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Achievement Modal */}
      {showCreateAchievement && (
        <CreateAchievementModal
          categories={categories}
          onSubmit={handleCreateAchievement}
          onClose={() => setShowCreateAchievement(false)}
        />
      )}

      {/* Edit Achievement Modal */}
      {editingAchievement && (
        <EditAchievementModal
          achievement={editingAchievement}
          categories={categories}
          onSubmit={(data) => handleUpdateAchievement(editingAchievement.id, data)}
          onClose={() => setEditingAchievement(null)}
        />
      )}

      {/* Achievement Details Modal */}
      {selectedAchievementDetails && (
        <AchievementDetailsModal
          achievement={selectedAchievementDetails}
          onClose={() => setSelectedAchievementDetails(null)}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}

// Modal Components (simplified for brevity)
function CreateAchievementModal({
  categories: _categories,
  onSubmit,
  onClose,
}: {
  categories: string[];
  onSubmit: (data: CreateAchievementData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateAchievementData>({
    name: '',
    title: '',
    description: '',
    category: 'betting',
    rarity: 'common',
    iconUrl: '',
    targetValue: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-content mb-4">Create New Achievement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Icon URL</label>
            <input
              type="url"
              value={formData.iconUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, iconUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            >
              {_categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData((prev) => ({ ...prev, rarity: e.target.value as any }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            >
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="secret">Secret</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Target Value</label>
            <input
              type="number"
              value={formData.targetValue}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, targetValue: Number(e.target.value) }))
              }
              min="1"
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-surface rounded hover:opacity-90"
            >
              Create Achievement
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-content rounded hover:opacity-80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAchievementModal({
  achievement,
  categories: _categories,
  onSubmit,
  onClose,
}: {
  achievement: AchievementWithStats;
  categories: string[];
  onSubmit: (data: CreateAchievementData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateAchievementData>({
    name: achievement.name,
    title: achievement.title || achievement.name,
    description: achievement.description || '',
    category: achievement.category,
    rarity: achievement.rarity,
    iconUrl: achievement.iconUrl || '',
    targetValue: achievement.targetValue,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-content mb-4">Edit Achievement</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Icon URL</label>
            <input
              type="url"
              value={formData.iconUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, iconUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            >
              {_categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData((prev) => ({ ...prev, rarity: e.target.value as any }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            >
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="secret">Secret</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Target Value</label>
            <input
              type="number"
              value={formData.targetValue}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, targetValue: Number(e.target.value) }))
              }
              min="1"
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-surface rounded hover:opacity-90"
            >
              Update Achievement
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-content rounded hover:opacity-80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AchievementDetailsModal({
  achievement,
  onClose,
}: {
  achievement: AchievementWithStats;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content">Achievement Details</h3>
          <button onClick={onClose} className="text-tertiary hover:text-content">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            {achievement.iconUrl && (
              <img src={achievement.iconUrl} alt={achievement.name} className="w-16 h-16 rounded" />
            )}
            <div>
              <h4 className="text-xl font-bold text-content">{achievement.name}</h4>
              <p className="text-tertiary">{achievement.description}</p>
              <span
                className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                  achievement.rarity === 'legendary'
                    ? 'bg-purple-100 text-purple-800'
                    : achievement.rarity === 'rare'
                      ? 'bg-blue-100 text-blue-800'
                      : achievement.rarity === 'secret'
                        ? 'bg-indigo-100 text-indigo-800'
                        : achievement.rarity === 'shame'
                          ? 'bg-red-100 text-red-800'
                          : achievement.rarity === 'uncommon'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                }`}
              >
                {achievement.rarity}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{achievement.totalUsers}</div>
              <div className="text-sm text-tertiary">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{achievement.completedUsers}</div>
              <div className="text-sm text-tertiary">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {achievement.completionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-tertiary">Completion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-content">
                {new Date(achievement.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-tertiary">Created</div>
            </div>
          </div>

          {achievement.recentUnlocks.length > 0 && (
            <div>
              <h5 className="font-semibold text-content mb-3">Recent Unlocks</h5>
              <div className="space-y-2">
                {achievement.recentUnlocks.map((unlock, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-muted last:border-b-0"
                  >
                    <span className="font-medium text-content">{unlock.userName}</span>
                    <div className="text-right">
                      <div className="text-sm text-content">
                        {new Date(unlock.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
