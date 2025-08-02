import { useState, useEffect, useMemo } from 'react';
import {
  searchBadges,
  getBadgeDetails,
  createBadgeWithCategories,
  updateBadge,
  deleteBadge,
  getBadgeAnalytics,
  bulkBadgeOperation,
  getBadgeCategories,
  createBadgeCategory,
  type BadgeSearchParams,
  type PaginatedBadges,
  type DetailedBadge,
  type BadgeAnalytics,
  type CreateBadgeData,
  type UpdateBadgeData,
  type BadgeCategory,
  type CreateBadgeCategoryData,
} from '../../api/admin';

interface FilterState {
  search: string;
  categoryId?: number;
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

export default function AdvancedBadgeManager() {
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'analytics' | 'categories'>(
    'overview',
  );
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Data states
  const [badgeData, setBadgeData] = useState<PaginatedBadges | null>(null);
  const [analytics, setAnalytics] = useState<BadgeAnalytics | null>(null);
  const [categories, setCategories] = useState<BadgeCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection and operations
  const [selectedBadges, setSelectedBadges] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal states
  const [showCreateBadge, setShowCreateBadge] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingBadge, setEditingBadge] = useState<DetailedBadge | null>(null);
  const [selectedBadgeDetails, setSelectedBadgeDetails] = useState<DetailedBadge | null>(null);

  // Load badge data
  const loadBadgeData = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams: BadgeSearchParams = {
        search: filters.search || undefined,
        categoryId: filters.categoryId,
        isActive: filters.isActive,
        rarity:
          filters.rarity.length > 0
            ? (filters.rarity as ('common' | 'rare' | 'epic' | 'legendary')[])
            : undefined,
        userCount: {
          min: filters.userCountMin,
          max: filters.userCountMax,
        },
        page: currentPage,
        limit: pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const data = await searchBadges(searchParams);
      setBadgeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge data');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const analyticsData = await getBadgeAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const categoryData = await getBadgeCategories();
      setCategories(categoryData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Load data on filter changes
  useEffect(() => {
    loadBadgeData();
  }, [filters, currentPage, pageSize]);

  // Load analytics and categories on tab change
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'overview') {
      loadAnalytics();
    }
    if (activeTab === 'categories' || activeTab === 'badges') {
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

  // Handle badge operations
  const handleCreateBadge = async (data: CreateBadgeData) => {
    try {
      await createBadgeWithCategories(data);
      setShowCreateBadge(false);
      loadBadgeData();
    } catch (err) {
      alert('Failed to create badge: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdateBadge = async (badgeId: number, data: UpdateBadgeData) => {
    try {
      await updateBadge(badgeId, data);
      setEditingBadge(null);
      loadBadgeData();
    } catch (err) {
      alert('Failed to update badge: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (
      !confirm('Are you sure you want to delete this badge? This will remove it from all users.')
    ) {
      return;
    }

    try {
      await deleteBadge(badgeId);
      loadBadgeData();
    } catch (err) {
      alert('Failed to delete badge: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (
    operation: 'activate' | 'deactivate' | 'delete' | 'changeCategory',
  ) => {
    if (selectedBadges.size === 0) return;

    let confirmMessage = '';
    switch (operation) {
      case 'delete':
        confirmMessage = `Are you sure you want to delete ${selectedBadges.size} badges? This will remove them from all users.`;
        break;
      case 'activate':
        confirmMessage = `Activate ${selectedBadges.size} badges?`;
        break;
      case 'deactivate':
        confirmMessage = `Deactivate ${selectedBadges.size} badges?`;
        break;
      case 'changeCategory':
        confirmMessage = `Change category for ${selectedBadges.size} badges?`;
        break;
    }

    if (!confirm(confirmMessage)) return;

    setBulkLoading(true);
    try {
      const result = await bulkBadgeOperation({
        badgeIds: Array.from(selectedBadges),
        operation,
        params: { reason: `Bulk ${operation} operation` },
      });

      alert(`Operation completed. Success: ${result.successCount}, Failed: ${result.failureCount}`);
      setSelectedBadges(new Set());
      loadBadgeData();
    } catch (err) {
      alert('Bulk operation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle category creation
  const handleCreateCategory = async (data: CreateBadgeCategoryData) => {
    try {
      await createBadgeCategory(data);
      setShowCreateCategory(false);
      loadCategories();
    } catch (err) {
      alert('Failed to create category: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle badge details view
  const handleViewBadgeDetails = async (badgeId: number) => {
    try {
      const details = await getBadgeDetails(badgeId);
      setSelectedBadgeDetails(details);
    } catch (err) {
      alert(
        'Failed to load badge details: ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  };

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    if (!badgeData || !analytics) return null;

    return {
      totalBadges: analytics.overview.totalBadges,
      totalAwards: analytics.overview.totalAwards,
      activeUsers: analytics.overview.activeUsers,
      mostPopular: analytics.overview.mostPopularBadge,
      categories: analytics.overview.totalCategories,
    };
  }, [badgeData, analytics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-content">Advanced Badge Manager</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateCategory(true)}
            className="px-3 py-1 bg-secondary text-surface rounded hover:opacity-90 text-sm"
          >
            New Category
          </button>
          <button
            onClick={() => setShowCreateBadge(true)}
            className="px-3 py-1 bg-primary text-surface rounded hover:opacity-90 text-sm"
          >
            Create Badge
          </button>
          <button
            onClick={loadBadgeData}
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
          { key: 'badges', label: 'Badge Management' },
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
      {activeTab === 'badges' && (
        <div className="bg-surface p-4 rounded-lg border border-muted">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                placeholder="Badge name or description..."
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-content mb-1">Category</label>
              <select
                value={filters.categoryId || ''}
                onChange={(e) =>
                  updateFilters({ categoryId: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
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
              <div className="text-2xl font-bold text-primary">{overviewStats.totalBadges}</div>
              <div className="text-sm text-tertiary">Total Badges</div>
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
                Most Popular ({overviewStats.mostPopular.userCount} users)
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {analytics && analytics.recentActivity.length > 0 && (
            <div className="bg-surface p-6 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-4">Recent Badge Awards</h3>
              <div className="space-y-2">
                {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-muted last:border-b-0"
                  >
                    <div>
                      <span className="font-medium text-content">{activity.userName}</span>
                      <span className="text-tertiary mx-2">earned</span>
                      <span className="font-medium text-primary">{activity.badgeName}</span>
                    </div>
                    <div className="text-sm text-tertiary">
                      {new Date(activity.awardedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && badgeData && (
        <div className="space-y-4">
          {/* Bulk Actions */}
          {selectedBadges.size > 0 && (
            <div className="bg-surface p-4 rounded-lg border border-muted flex items-center justify-between">
              <span className="text-content">{selectedBadges.size} badges selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkOperation('activate')}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-green-500 text-surface rounded hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  Activate
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
                  onClick={() => setSelectedBadges(new Set())}
                  className="px-4 py-2 bg-muted text-content rounded hover:opacity-80 text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Badge Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {badgeData.badges.map((badge: DetailedBadge) => (
              <div
                key={badge.id}
                className="bg-surface p-4 rounded-lg border border-muted hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedBadges.has(badge.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedBadges);
                      if (e.target.checked) {
                        newSelected.add(badge.id);
                      } else {
                        newSelected.delete(badge.id);
                      }
                      setSelectedBadges(newSelected);
                    }}
                    className="mt-1"
                  />
                  <div className="flex items-center gap-2">
                    {badge.iconUrl && (
                      <img src={badge.iconUrl} alt={badge.name} className="w-6 h-6 rounded" />
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        badge.analytics.rarityLevel === 'legendary'
                          ? 'bg-purple-100 text-purple-800'
                          : badge.analytics.rarityLevel === 'epic'
                            ? 'bg-orange-100 text-orange-800'
                            : badge.analytics.rarityLevel === 'rare'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {badge.analytics.rarityLevel}
                    </span>
                  </div>
                </div>

                <h4 className="font-semibold text-content mb-2">{badge.name}</h4>
                <p className="text-sm text-tertiary mb-3 line-clamp-2">
                  {badge.description || 'No description'}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Users:</span>
                    <span className="text-content">{badge.analytics.totalUsers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">This month:</span>
                    <span className="text-content">{badge.analytics.awardedThisMonth}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tertiary">Popularity:</span>
                    <span className="text-content">{badge.analytics.popularityScore}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewBadgeDetails(badge.id)}
                    className="flex-1 px-3 py-1 bg-primary text-surface rounded hover:opacity-90 text-sm"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setEditingBadge(badge)}
                    className="flex-1 px-3 py-1 bg-secondary text-surface rounded hover:opacity-90 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBadge(badge.id)}
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
              <span className="text-sm text-tertiary">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-muted rounded text-sm bg-background text-content"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
              <span className="text-sm text-tertiary">per page</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-content">
                Page {currentPage + 1} of {badgeData.totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(badgeData.totalPages - 1, prev + 1))
                }
                disabled={!badgeData.hasNextPage}
                className="px-3 py-1 bg-muted text-content rounded hover:opacity-80 disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Overview Analytics */}
          <div className="bg-surface p-6 rounded-lg border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Badge System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.totalBadges}
                </div>
                <div className="text-sm text-tertiary">Total Badges</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.totalAwards}
                </div>
                <div className="text-sm text-tertiary">Total Awards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.activeUsers}
                </div>
                <div className="text-sm text-tertiary">Active Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {analytics.overview.totalCategories}
                </div>
                <div className="text-sm text-tertiary">Categories</div>
              </div>
            </div>
          </div>

          {/* Rarity Distribution */}
          <div className="bg-surface p-6 rounded-lg border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Rarity Distribution</h3>
            <div className="space-y-3">
              {analytics.rarityDistribution.map((rarity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded ${
                        rarity.rarity === 'legendary'
                          ? 'bg-purple-500'
                          : rarity.rarity === 'epic'
                            ? 'bg-orange-500'
                            : rarity.rarity === 'rare'
                              ? 'bg-blue-500'
                              : 'bg-gray-500'
                      }`}
                    ></div>
                    <span className="capitalize font-medium text-content">{rarity.rarity}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-content">{rarity.count}</div>
                    <div className="text-sm text-tertiary">{rarity.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performers */}
          {analytics.topPerformers.length > 0 && (
            <div className="bg-surface p-6 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-4">Top Badge Collectors</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="text-left py-2 text-sm font-medium text-content">User</th>
                      <th className="text-left py-2 text-sm font-medium text-content">
                        Total Badges
                      </th>
                      <th className="text-left py-2 text-sm font-medium text-content">
                        Rare Badges
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topPerformers.map((performer, index) => (
                      <tr key={index} className="border-b border-muted">
                        <td className="py-2 text-sm text-content">{performer.userName}</td>
                        <td className="py-2 text-sm text-content">{performer.badgeCount}</td>
                        <td className="py-2 text-sm text-content">{performer.rareCount}</td>
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
            {categories.map((category) => (
              <div key={category.id} className="bg-surface p-4 rounded-lg border border-muted">
                <div className="flex items-center gap-3 mb-3">
                  {category.iconUrl && (
                    <img src={category.iconUrl} alt={category.name} className="w-8 h-8 rounded" />
                  )}
                  <div>
                    <h4 className="font-semibold text-content">{category.name}</h4>
                    <p className="text-sm text-tertiary">{category.badgeCount} badges</p>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-tertiary mb-3">{category.description}</p>
                )}
                <div className="text-xs text-tertiary">
                  Created: {new Date(category.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Badge Modal */}
      {showCreateBadge && (
        <CreateBadgeModal
          categories={categories}
          onSubmit={handleCreateBadge}
          onClose={() => setShowCreateBadge(false)}
        />
      )}

      {/* Edit Badge Modal */}
      {editingBadge && (
        <EditBadgeModal
          badge={editingBadge}
          categories={categories}
          onSubmit={(data) => handleUpdateBadge(editingBadge.id, data)}
          onClose={() => setEditingBadge(null)}
        />
      )}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <CreateCategoryModal
          onSubmit={handleCreateCategory}
          onClose={() => setShowCreateCategory(false)}
        />
      )}

      {/* Badge Details Modal */}
      {selectedBadgeDetails && (
        <BadgeDetailsModal
          badge={selectedBadgeDetails}
          onClose={() => setSelectedBadgeDetails(null)}
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
function CreateBadgeModal({
  categories: _categories,
  onSubmit,
  onClose,
}: {
  categories: BadgeCategory[];
  onSubmit: (data: CreateBadgeData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateBadgeData>({
    name: '',
    description: '',
    iconUrl: '',
    rarity: 'common',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-content mb-4">Create New Badge</h3>
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
            <label className="block text-sm font-medium text-content mb-1">Rarity</label>
            <select
              value={formData.rarity}
              onChange={(e) => setFormData((prev) => ({ ...prev, rarity: e.target.value as any }))}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            >
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-surface rounded hover:opacity-90"
            >
              Create Badge
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

function EditBadgeModal({
  badge,
  categories: _categories,
  onSubmit,
  onClose,
}: {
  badge: DetailedBadge;
  categories: BadgeCategory[];
  onSubmit: (data: UpdateBadgeData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<UpdateBadgeData>({
    name: badge.name,
    description: badge.description || '',
    iconUrl: badge.iconUrl || '',
    rarity: badge.analytics.rarityLevel,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-content mb-4">Edit Badge</h3>
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
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-surface rounded hover:opacity-90"
            >
              Update Badge
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

function CreateCategoryModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: CreateBadgeCategoryData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateBadgeCategoryData>({
    name: '',
    description: '',
    color: '#3B82F6',
    iconUrl: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-content mb-4">Create Category</h3>
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
            <label className="block text-sm font-medium text-content mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-content"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
              className="w-full h-10 px-1 border border-muted rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-surface rounded hover:opacity-90"
            >
              Create Category
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

function BadgeDetailsModal({ badge, onClose }: { badge: DetailedBadge; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-lg border border-muted max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content">Badge Details</h3>
          <button onClick={onClose} className="text-tertiary hover:text-content">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            {badge.iconUrl && (
              <img src={badge.iconUrl} alt={badge.name} className="w-16 h-16 rounded" />
            )}
            <div>
              <h4 className="text-xl font-bold text-content">{badge.name}</h4>
              <p className="text-tertiary">{badge.description}</p>
              <span
                className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                  badge.analytics.rarityLevel === 'legendary'
                    ? 'bg-purple-100 text-purple-800'
                    : badge.analytics.rarityLevel === 'epic'
                      ? 'bg-orange-100 text-orange-800'
                      : badge.analytics.rarityLevel === 'rare'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {badge.analytics.rarityLevel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{badge.analytics.totalUsers}</div>
              <div className="text-sm text-tertiary">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {badge.analytics.awardedThisMonth}
              </div>
              <div className="text-sm text-tertiary">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {badge.analytics.popularityScore}
              </div>
              <div className="text-sm text-tertiary">Popularity</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-content">
                {new Date(badge.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-tertiary">Created</div>
            </div>
          </div>

          {badge.recentAwards.length > 0 && (
            <div>
              <h5 className="font-semibold text-content mb-3">Recent Awards</h5>
              <div className="space-y-2">
                {badge.recentAwards.map((award, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-muted last:border-b-0"
                  >
                    <span className="font-medium text-content">{award.userName}</span>
                    <div className="text-right">
                      <div className="text-sm text-content">
                        {new Date(award.awardedAt).toLocaleDateString()}
                      </div>
                      {award.reason && <div className="text-xs text-tertiary">{award.reason}</div>}
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
